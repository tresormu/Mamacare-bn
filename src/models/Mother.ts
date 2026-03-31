import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMother extends Document {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  user?: Types.ObjectId;
  dateOfBirth?: Date;
  registrationDate: Date;
  pregnancyWeeks?: number;
  parity?: number;
  riskFlags: string[];
  missedAppointmentsCount: number;
  preferredLanguage: string;
  notificationChannel: 'app' | 'sms' | 'voice';
  appOptIn: boolean;
  babyNickname?: string;
  hasChildUnderTwo: boolean;
  status: 'active' | 'archived';
  archivedAt?: Date;
  assignedDoctor?: Types.ObjectId;
  assignedCHW?: Types.ObjectId;
}

const MotherSchema = new Schema<IMother>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    email: { type: String, trim: true, lowercase: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    dateOfBirth: { type: Date },
    registrationDate: { type: Date, default: Date.now },
    pregnancyWeeks: { type: Number, min: 0 },
    parity: { type: Number, min: 0 },
    riskFlags: { type: [String], default: [] },
    missedAppointmentsCount: { type: Number, default: 0 },
    preferredLanguage: { type: String, default: 'rw' },
    notificationChannel: { type: String, enum: ['app', 'sms', 'voice'], default: 'app' },
    appOptIn: { type: Boolean, default: false },
    babyNickname: { type: String, trim: true },
    hasChildUnderTwo: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    archivedAt: { type: Date },
    assignedDoctor: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedCHW: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Mother:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - phone
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         user:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         pregnancyWeeks:
 *           type: integer
 *         parity:
 *           type: integer
 *         riskFlags:
 *           type: array
 *           items:
 *             type: string
 *         preferredLanguage:
 *           type: string
 *         notificationChannel:
 *           type: string
 *           enum: [app, sms, voice]
 *         appOptIn:
 *           type: boolean
 *         babyNickname:
 *           type: string
 *         hasChildUnderTwo:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [active, archived]
 *         assignedDoctor:
 *           type: string
 *         assignedCHW:
 *           type: string
 */

MotherSchema.index({ assignedDoctor: 1 });
MotherSchema.index({ assignedCHW: 1 });

export const Mother = mongoose.model<IMother>('Mother', MotherSchema);
