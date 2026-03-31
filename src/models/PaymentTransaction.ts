import mongoose, { Schema, Document, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface IPaymentTransaction extends Document {
  user: Types.ObjectId;
  plan: Types.ObjectId;
  txRef: string;
  flwId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: 'flutterwave';
  metadata?: Record<string, any>;
  raw?: Record<string, any>;
  paidAt?: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'PaymentPlan', required: true },
    txRef: { type: String, required: true, unique: true },
    flwId: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'RWF' },
    provider: { type: String, enum: ['flutterwave'], default: 'flutterwave' },
    metadata: { type: Schema.Types.Mixed },
    raw: { type: Schema.Types.Mixed },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     PaymentTransaction:
 *       type: object
 *       required:
 *         - user
 *         - plan
 *         - txRef
 *         - status
 *         - amount
 *         - currency
 *         - provider
 *       properties:
 *         user:
 *           type: string
 *         plan:
 *           type: string
 *         txRef:
 *           type: string
 *         flwId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         provider:
 *           type: string
 *           enum: [flutterwave]
 *         metadata:
 *           type: object
 *         paidAt:
 *           type: string
 *           format: date-time
 */

export const PaymentTransaction = mongoose.model<IPaymentTransaction>(
  'PaymentTransaction',
  PaymentTransactionSchema
);
