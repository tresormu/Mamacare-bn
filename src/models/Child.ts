import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChild extends Document {
  mother: Types.ObjectId;
  name?: string;
  dateOfBirth: Date;
  sex?: 'female' | 'male';
  archivedAt?: Date;
}

const ChildSchema = new Schema<IChild>(
  {
    mother: { type: Schema.Types.ObjectId, ref: 'Mother', required: true },
    name: { type: String, trim: true },
    dateOfBirth: { type: Date, required: true },
    sex: { type: String, enum: ['female', 'male'] },
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Child:
 *       type: object
 *       required:
 *         - mother
 *         - dateOfBirth
 *       properties:
 *         mother:
 *           type: string
 *           description: ObjectId of the mother
 *         name:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         sex:
 *           type: string
 *           enum: [female, male]
 */

ChildSchema.index({ mother: 1 });

export const Child = mongoose.model<IChild>('Child', ChildSchema);
