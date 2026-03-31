import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  createCheckoutSession,
  createCheckoutSchema,
  flutterwaveWebhook,
  listPaymentPlans,
  listTransactions,
  listTransactionsSchema,
  seedPaymentPlans,
  verifyPayment,
} from '../controllers/paymentController';

const router = Router();

/**
 * @openapi
 * /api/payment/plans:
 *   get:
 *     summary: List available payment plans
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Payment plans retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentPlan'
 */
router.get('/plans', listPaymentPlans);

/**
 * @openapi
 * /api/payment/plans/seed:
 *   post:
 *     summary: Seed default payment plans
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment plans seeded
 */
router.post('/plans/seed', requireAuth, requireRole('admin'), seedPaymentPlans);

/**
 * @openapi
 * /api/payment/checkout-session:
 *   post:
 *     summary: Create Flutterwave checkout session
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planId]
 *             properties:
 *               planId:
 *                 type: string
 *               planSlug:
 *                 type: string
 *               callbackUrl:
 *                 type: string
 *               hospitalName:
 *                 type: string
 *               contactName:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Checkout session created
 */
router.post(
  '/checkout-session',
  requireAuth,
  validate(createCheckoutSchema),
  createCheckoutSession
);

/**
 * @openapi
 * /api/payment/transactions:
 *   get:
 *     summary: List payment transactions
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *     responses:
 *       200:
 *         description: Transactions retrieved
 */
router.get(
  '/transactions',
  requireAuth,
  validate(listTransactionsSchema),
  listTransactions
);

/**
 * @openapi
 * /api/payment/verify/{txRef}:
 *   get:
 *     summary: Verify a Flutterwave payment
 *     tags: [Payment]
 *     parameters:
 *       - in: path
 *         name: txRef
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: flwId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
router.get('/verify/:txRef', requireAuth, verifyPayment);

/**
 * @openapi
 * /api/payment/flutterwave/webhook:
 *   post:
 *     summary: Flutterwave webhook
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/flutterwave/webhook', flutterwaveWebhook);

export default router;
