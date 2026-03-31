import request from 'supertest';
import { createApp } from '../app';
import { User } from '../models/User';
import { PaymentPlan } from '../models/PaymentPlan';
import { PaymentTransaction } from '../models/PaymentTransaction';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';

process.env.FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY || 'test-public';
process.env.FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || 'test-secret';
process.env.FLW_SECRET_HASH = process.env.FLW_SECRET_HASH || 'test-hash';
process.env.FLW_REDIRECT_URL = process.env.FLW_REDIRECT_URL || 'http://localhost/callback';

const app = createApp();

async function createAdminToken() {
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Password123!',
    role: 'admin',
  });

  return jwt.sign({ id: admin._id, role: 'admin', tokenType: 'admin' }, jwtSecret);
}

describe('Payment Routes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should list default payment plans', async () => {
    const res = await request(app).get('/api/payment/plans');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('price');
  });

  it('should create a Flutterwave checkout session', async () => {
    const token = await createAdminToken();
    await request(app).get('/api/payment/plans');

    jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: { link: 'https://flutterwave.test/pay' } }),
      } as any);

    const res = await request(app)
      .post('/api/payment/checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .send({
        planSlug: 'health-center',
        hospitalName: 'Test Clinic',
        contactName: 'Owner One',
        contactEmail: 'owner@example.com',
        contactPhone: '+250700000000',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('paymentUrl');
    expect(res.body).toHaveProperty('txRef');
    expect(res.body).toHaveProperty('transactionId');

    const transaction = await PaymentTransaction.findOne({ txRef: res.body.txRef });
    expect(transaction).toBeTruthy();
  });

  it('should verify a Flutterwave payment and update status', async () => {
    await request(app).get('/api/payment/plans');
    const plan = await PaymentPlan.findOne({ slug: 'health-center' });
    const user = await User.create({
      name: 'Verifier',
      email: 'verify@example.com',
      password: 'Password123!',
      role: 'admin',
    });
    const token = jwt.sign({ id: user._id, role: 'admin', tokenType: 'admin' }, jwtSecret);

    const txRef = 'MC-TEST-VERIFY';
    await PaymentTransaction.create({
      user: user._id,
      plan: plan!._id,
      txRef,
      status: 'pending',
      amount: plan!.price,
      currency: plan!.currency,
      provider: 'flutterwave',
    });

    jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: 12345,
            tx_ref: txRef,
            status: 'successful',
            amount: plan!.price,
          },
        }),
      } as any);

    const res = await request(app)
      .get(`/api/payment/verify/${txRef}?flwId=12345`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');

    const updated = await PaymentTransaction.findOne({ txRef });
    expect(updated?.status).toBe('completed');
  });

  it('should process Flutterwave webhook callback', async () => {
    await request(app).get('/api/payment/plans');
    const plan = await PaymentPlan.findOne({ slug: 'health-center' });
    const user = await User.create({
      name: 'Webhook Admin',
      email: 'webhook@example.com',
      password: 'Password123!',
      role: 'admin',
    });

    const txRef = 'MC-TEST-WEBHOOK';
    await PaymentTransaction.create({
      user: user._id,
      plan: plan!._id,
      txRef,
      status: 'pending',
      amount: plan!.price,
      currency: plan!.currency,
      provider: 'flutterwave',
    });

    const res = await request(app)
      .post('/api/payment/flutterwave/webhook')
      .set('verif-hash', process.env.FLW_SECRET_HASH as string)
      .send({
        event: 'charge.completed',
        data: {
          tx_ref: txRef,
          status: 'successful',
          id: 98765,
        },
      });

    expect(res.status).toBe(200);
    const updated = await PaymentTransaction.findOne({ txRef });
    expect(updated?.status).toBe('completed');
  });
});
