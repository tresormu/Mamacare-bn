import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChild extends Document {
  mother: Types.ObjectId;
  name?: string;
  dateOfBirth: Date;
  sex?: 'female' | 'male';
  weightKg?: number;
  lastWeightAt?: Date;
  vaccinations?: { vaccine: string; date?: Date; status?: 'scheduled' | 'given' | 'missed' }[];
  caregiverGuidanceNotes?: { topic: string; note: string; createdAt: Date }[];
  archivedAt?: Date;
}

const ChildSchema = new Schema<IChild>(
  {
    mother: { type: Schema.Types.ObjectId, ref: 'Mother', required: true },
    name: { type: String, trim: true },
    dateOfBirth: { type: Date, required: true },
    sex: { type: String, enum: ['female', 'male'] },
    weightKg: { type: Number, min: 0 },
    lastWeightAt: { type: Date },
    vaccinations: {
      type: [
        {
          vaccine: { type: String, required: true },
          date: { type: Date },
          status: { type: String, enum: ['scheduled', 'given', 'missed'], default: 'scheduled' },
        },
      ],
      default: [],
    },
    caregiverGuidanceNotes: {
      type: [
        {
          topic: { type: String, required: true, trim: true },
          note: { type: String, required: true, trim: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
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
 *         weightKg:
 *           type: number
 *         lastWeightAt:
 *           type: string
 *           format: date-time
 *         vaccinations:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               vaccine:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [scheduled, given, missed]
 */

ChildSchema.index({ mother: 1 });

export const Child = mongoose.model<IChild>('Child', ChildSchema);
