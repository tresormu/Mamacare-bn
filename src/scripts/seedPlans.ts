import mongoose from 'mongoose';
import { mongoUri } from '../config/env';
import { PaymentPlan } from '../models/PaymentPlan';
import { DEFAULT_PLANS } from '../controllers/paymentController';

async function seed() {
  await mongoose.connect(mongoUri);

  await PaymentPlan.bulkWrite(
    DEFAULT_PLANS.map((plan) => ({
      updateOne: {
        filter: { slug: plan.slug },
        update: { $set: plan },
        upsert: true,
      },
    }))
  );

  console.log('✅ Payment plans seeded:', DEFAULT_PLANS.map((p) => p.name).join(', '));
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
