import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentPlan extends Document {
  name: string;
  slug: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
  maxActiveMothers?: number | null;
  isActive: boolean;
}

const PaymentPlanSchema = new Schema<IPaymentPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'RWF' },
    description: { type: String, required: true },
    features: { type: [String], default: [] },
    maxActiveMothers: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     PaymentPlan:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *         - price
 *         - currency
 *         - description
 *       properties:
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         price:
 *           type: number
 *         currency:
 *           type: string
 *         description:
 *           type: string
 *         features:
 *           type: array
 *           items:
 *             type: string
 *         maxActiveMothers:
 *           type: number
 *           nullable: true
 *         isActive:
 *           type: boolean
 */

export const PaymentPlan = mongoose.model<IPaymentPlan>('PaymentPlan', PaymentPlanSchema);
