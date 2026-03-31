import mongoose, { Schema, Document, Types } from 'mongoose';

export type AppointmentType = 'ANC' | 'PNC' | 'VACCINE' | 'OTHER';
export type AppointmentStatus = 'scheduled' | 'completed' | 'missed' | 'canceled';

export interface IAppointment extends Document {
  mother: Types.ObjectId;
  child?: Types.ObjectId;
  type: AppointmentType;
  scheduledFor: Date;
  status: AppointmentStatus;
  notes?: string;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    mother: { type: Schema.Types.ObjectId, ref: 'Mother', required: true },
    child: { type: Schema.Types.ObjectId, ref: 'Child' },
    type: { type: String, enum: ['ANC', 'PNC', 'VACCINE', 'OTHER'], required: true },
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'completed', 'missed', 'canceled'], default: 'scheduled' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       required:
 *         - mother
 *         - type
 *         - scheduledFor
 *       properties:
 *         mother:
 *           type: string
 *         child:
 *           type: string
 *         type:
 *           type: string
 *           enum: [ANC, PNC, VACCINE, OTHER]
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [scheduled, completed, missed, canceled]
 *         notes:
 *           type: string
 */

AppointmentSchema.index({ mother: 1, scheduledFor: 1 });
AppointmentSchema.index({ status: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
