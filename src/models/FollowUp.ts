import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFollowUp extends Document {
  mother: Types.ObjectId;
  status: 'open' | 'closed';
  triggeredAt: Date;
  reason: string;
  assignedTo?: string;
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
}

const FollowUpSchema = new Schema<IFollowUp>(
  {
    mother: { type: Schema.Types.ObjectId, ref: 'Mother', required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    triggeredAt: { type: Date, default: Date.now },
    reason: { type: String, required: true },
    assignedTo: { type: String, trim: true },
    notes: { type: String, trim: true },
    resolvedBy: { type: String, trim: true },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     FollowUp:
 *       type: object
 *       required:
 *         - mother
 *         - reason
 *       properties:
 *         mother:
 *           type: string
 *         reason:
 *           type: string
 *         status:
 *           type: string
 *           enum: [open, closed]
 *         assignedTo:
 *           type: string
 *         notes:
 *           type: string
 *         resolvedBy:
 *           type: string
 *         resolvedAt:
 *           type: string
 *           format: date-time
 */

FollowUpSchema.index({ mother: 1, status: 1 });


export const FollowUp = mongoose.model<IFollowUp>('FollowUp', FollowUpSchema);
