import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentPlan } from '../models/PaymentPlan';
import { PaymentTransaction } from '../models/PaymentTransaction';
import { ApiError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { createFlutterwavePayment, getFlutterwaveConfig, verifyFlutterwaveTransaction } from '../utils/flutterwave';
import { generateTransactionRef } from '../utils/transactionRef';

export const DEFAULT_PLANS = [
  {
    name: 'Health Center',
    slug: 'health-center',
    price: 75000,
    currency: 'RWF',
    maxActiveMothers: 200,
    description: 'Basic access for small clinics',
    features: [
      'Basic dashboard',
      'SMS reminders (limited)',
      'Pregnancy + vaccination tracking',
    ],
    isActive: true,
  },
  {
    name: 'District Hospital',
    slug: 'district-hospital',
    price: 120000,
    currency: 'RWF',
    maxActiveMothers: 500,
    description: 'Full reminders and child tracking',
    features: [
      'Full reminder system',
      'Missed visit tracking',
      'Baby tracking (0-2 years)',
      'Staff dashboard (multi-user)',
    ],
    isActive: true,
  },
  {
    name: 'Referral / Private Hospital',
    slug: 'referral-hospital',
    price: 180000,
    currency: 'RWF',
    maxActiveMothers: null,
    description: 'Unlimited access with advanced analytics',
    features: [
      'Unlimited patients',
      'Full system access',
      'Advanced analytics dashboard',
      'Priority support',
    ],
    isActive: true,
  },
];

async function seedDefaultPlans() {
  const existing = await PaymentPlan.countDocuments();
  if (existing > 0) return;

  await PaymentPlan.insertMany(DEFAULT_PLANS);
}

export async function listPaymentPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    await seedDefaultPlans();
    const plans = await PaymentPlan.find({ isActive: true }).sort({ price: 1 });
    res.status(200).json(plans);
  } catch (err) {
    next(err);
  }
}

export async function seedPaymentPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError('Unauthorized', 401);
    await PaymentPlan.bulkWrite(
      DEFAULT_PLANS.map((plan) => ({
        updateOne: {
          filter: { slug: plan.slug },
          update: { $set: plan },
          upsert: true,
        },
      }))
    );
    const plans = await PaymentPlan.find().sort({ price: 1 });
    res.status(200).json({ message: 'Payment plans seeded', plans });
  } catch (err) {
    next(err);
  }
}

export async function createCheckoutSession(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError('Unauthorized', 401);

    const { planId, planSlug, callbackUrl, hospitalName, contactName, contactEmail, contactPhone } = req.body;

    const plan = await PaymentPlan.findOne(
      planId ? { _id: planId } : { slug: planSlug }
    );
    if (!plan || !plan.isActive) throw new ApiError('Payment plan not found', 404);

    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError('User not found', 404);

    const txRef = generateTransactionRef('MC-PAY');
    const config = getFlutterwaveConfig();
    const redirectUrl = callbackUrl || config.redirectUrl;
    if (!redirectUrl) throw new ApiError('Missing Flutterwave redirect URL', 500);

    const payload = {
      tx_ref: txRef,
      amount: plan.price,
      currency: plan.currency,
      redirect_url: redirectUrl,
      customer: {
        email: contactEmail || user.email,
        name: contactName || user.name,
        phonenumber: contactPhone,
      },
      meta: {
        planId: plan._id.toString(),
        planSlug: plan.slug,
        planName: plan.name,
        maxActiveMothers: plan.maxActiveMothers,
        userId: user._id.toString(),
        hospitalName: hospitalName || '',
      },
      customizations: {
        title: 'MamaCare+ Subscription',
        description: `Subscription for ${plan.name}`,
      },
    };

    const response = await createFlutterwavePayment(payload);
    const link = response?.data?.link;
    if (!link) throw new ApiError('Failed to create payment link', 502);

    const transaction = await PaymentTransaction.create({
      user: user._id,
      plan: plan._id,
      txRef,
      status: 'pending',
      amount: plan.price,
      currency: plan.currency,
      provider: 'flutterwave',
      metadata: payload.meta,
      raw: response,
    });

    res.status(201).json({
      paymentUrl: link,
      txRef,
      transactionId: transaction._id,
    });
  } catch (err) {
    next(err);
  }
}

export async function listTransactions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError('Unauthorized', 401);
    const status = req.query.status as string | undefined;
    const filter: Record<string, any> = req.user.role === 'admin' ? {} : { user: req.user.id };
    if (status) filter.status = status;
    const transactions = await PaymentTransaction.find(filter)
      .sort({ createdAt: -1 })
      .populate('plan', 'name slug price currency maxActiveMothers features description');
    res.status(200).json(transactions);
  } catch (err) {
    next(err);
  }
}

export async function getSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError('Unauthorized', 401);

    // Get the latest completed transaction for this user
    const latest = await PaymentTransaction.findOne({ user: req.user.id, status: 'completed' })
      .sort({ paidAt: -1 })
      .populate('plan', 'name slug price currency maxActiveMothers features description');

    if (!latest || !latest.paidAt) {
      return res.status(200).json({ active: false, subscription: null });
    }

    // Subscription is monthly — expires 30 days after paidAt
    const expiresAt = new Date(latest.paidAt);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const active = daysLeft > 0;

    res.status(200).json({
      active,
      daysLeft: active ? daysLeft : 0,
      expiresAt,
      subscription: {
        txRef: latest.txRef,
        amount: latest.amount,
        currency: latest.currency,
        paidAt: latest.paidAt,
        plan: latest.plan,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function flutterwaveWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const config = getFlutterwaveConfig();
    const signature = req.headers['verif-hash'];
    if (!config.secretHash || signature !== config.secretHash) {
      throw new ApiError('Invalid Flutterwave signature', 400);
    }

    const { event, data } = req.body || {};
    if (event !== 'charge.completed') {
      return res.status(200).json({ received: true });
    }

    const txRef = data?.tx_ref;
    const flwId = data?.id;
    if (!txRef || !flwId) throw new ApiError('Missing transaction reference or id', 400);

    const transaction = await PaymentTransaction.findOne({ txRef });
    if (!transaction) throw new ApiError('Transaction not found', 404);

    // Skip if already finalised — webhooks can fire multiple times
    if (transaction.status === 'completed') {
      return res.status(200).json({ received: true });
    }

    // Verify with Flutterwave before trusting the webhook payload
    const verified = await verifyFlutterwaveTransaction(String(flwId));
    const verifiedData = verified?.data;

    if (verifiedData?.tx_ref !== txRef) {
      throw new ApiError('Transaction reference mismatch', 400);
    }

    const isSuccess =
      verifiedData?.status === 'successful' &&
      Number(verifiedData.amount) === transaction.amount &&
      verifiedData.currency === transaction.currency;

    transaction.status = isSuccess ? 'completed' : 'failed';
    transaction.flwId = String(flwId);
    transaction.paidAt = isSuccess ? new Date() : undefined;
    transaction.raw = verifiedData;
    await transaction.save();

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError('Unauthorized', 401);

    const txRef = req.params.txRef;
    const flwIdParam = req.query.flwId as string | undefined;

    const transaction = await PaymentTransaction.findOne({ txRef });
    if (!transaction) throw new ApiError('Transaction not found', 404);

    // Non-admins can only verify their own transactions
    if (req.user.role !== 'admin' && transaction.user.toString() !== req.user.id) {
      throw new ApiError('Forbidden', 403);
    }

    // If already completed, return immediately — no need to re-call Flutterwave
    if (transaction.status === 'completed') {
      return res.status(200).json({
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        flwId: transaction.flwId,
        txRef: transaction.txRef,
        providerStatus: 'successful',
      });
    }

    const flwId = flwIdParam || transaction.flwId;
    if (!flwId) throw new ApiError('Flutterwave transaction id required', 400);

    const response = await verifyFlutterwaveTransaction(flwId);
    const data = response?.data;

    if (data?.tx_ref && data.tx_ref !== txRef) {
      throw new ApiError('Transaction reference mismatch', 400);
    }

    if (data?.status === 'successful' && Number(data.amount) === transaction.amount && data.currency === transaction.currency) {
      transaction.status = 'completed';
      transaction.paidAt = new Date();
    } else if (data?.status === 'failed') {
      transaction.status = 'failed';
    }
    transaction.flwId = String(data?.id || flwId);
    transaction.raw = data;
    await transaction.save();

    res.status(200).json({
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      flwId: transaction.flwId,
      txRef: transaction.txRef,
      providerStatus: data?.status,
    });
  } catch (err) {
    next(err);
  }
}

export const createCheckoutSchema = z.object({
  body: z.object({
    planId: z.string().optional(),
    planSlug: z.string().optional(),
    callbackUrl: z.string().url().optional(),
    hospitalName: z.string().min(1).optional(),
    contactName: z.string().min(1).optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().min(6).optional(),
  }).refine((val) => val.planId || val.planSlug, {
    message: 'planId or planSlug is required',
  }),
});

export const listTransactionsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'completed', 'failed']).optional(),
  }),
});
