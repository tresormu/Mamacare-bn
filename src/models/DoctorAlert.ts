import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDoctorAlert extends Document {
  doctor: Types.ObjectId;
  mother: Types.ObjectId;
  motherName: string;
  motherPhone: string;
  pinCode: string;
  dismissed: boolean;
  createdAt: Date;
}

const DoctorAlertSchema = new Schema<IDoctorAlert>(
  {
    doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mother: { type: Schema.Types.ObjectId, ref: 'Mother', required: true },
    motherName: { type: String, required: true },
    motherPhone: { type: String, required: true },
    pinCode: { type: String, required: true },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DoctorAlertSchema.index({ doctor: 1, dismissed: 1 });

export const DoctorAlert = mongoose.model<IDoctorAlert>('DoctorAlert', DoctorAlertSchema);
