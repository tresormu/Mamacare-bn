import { Response, NextFunction } from 'express';
import { Mother } from '../models/Mother';
import { Child } from '../models/Child';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { DoctorAlert } from '../models/DoctorAlert';
import { sendToDoctor } from '../utils/sseManager';
import { fireWebhook } from '../utils/webhook';
import { ApiError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

function ensureMotherAccess(req: AuthRequest, motherId: string) {
  if (req.user?.role === 'mother' && req.user.id !== motherId) {
    throw new ApiError('Forbidden', 403);
  }
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createMother(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      firstName, lastName, phone, dateOfBirth, pregnancyWeeks, parity,
      riskFlags, preferredLanguage, notificationChannel, appOptIn,
      babyNickname, assignedDoctor, assignedCHW, hasChildUnderTwo, existingChildren,
    } = req.body;

    const plainPin = generatePin();

    const doctorId = assignedDoctor || req.user?.id;

    // Resolve hospital from the registering doctor
    const registrar = await User.findById(req.user?.id).select('hospitalName');
    const hospital = registrar?.hospitalName;

    const mother = await Mother.create({
      firstName, lastName, phone, dateOfBirth, pregnancyWeeks, parity,
      riskFlags, preferredLanguage, notificationChannel, appOptIn,
      babyNickname, assignedCHW,
      assignedDoctor: doctorId,
      hasChildUnderTwo: hasChildUnderTwo ?? (Array.isArray(existingChildren) && existingChildren.length > 0),
      pinCode: plainPin,
      isActive: false,
      hospital,
    });

    let children: any[] = [];
    if (Array.isArray(existingChildren) && existingChildren.length > 0) {
      children = await Child.insertMany(
        existingChildren.map((c: any) => ({ ...c, mother: mother._id }))
      );
    }

    if (doctorId) {
      const alert = await DoctorAlert.create({
        doctor: doctorId,
        mother: mother._id,
        motherName: `${firstName} ${lastName}`,
        motherPhone: phone,
        pinCode: plainPin,
      });

      const alertPayload = {
        alertId: alert._id,
        motherId: mother._id,
        motherName: `${firstName} ${lastName}`,
        motherPhone: phone,
        pinCode: plainPin,
        createdAt: alert.createdAt,
      };

      sendToDoctor(doctorId.toString(), 'pin_alert', alertPayload);
      fireWebhook({ event: 'pin_alert', ...alertPayload });
    }

    // Build clean response — exclude hashed pinCode from toObject(), return plain PIN separately
    const { pinCode: _hashed, password: _pw, ...motherData } = mother.toObject();
    res.status(201).json({ ...motherData, children, pinCode: plainPin });
  } catch (err) {
    next(err);
  }
}

export async function listMothers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const filter: Record<string, any> = {};
    if (status === 'active' || status === 'archived') filter.status = status;

    // Non-admins only see mothers from their hospital
    if (req.user?.role !== 'admin') {
      const doctor = await User.findById(req.user?.id).select('hospitalName');
      if (doctor?.hospitalName) filter.hospital = doctor.hospitalName;
    }

    const [mothers, total] = await Promise.all([
      Mother.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Mother.countDocuments(filter),
    ]);

    res.status(200).json({ data: mothers, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getMother(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    ensureMotherAccess(req, req.params.id);

    const mother = await Mother.findById(req.params.id);
    if (!mother) throw new ApiError('Mother not found', 404);

    if (req.user?.role !== 'admin') {
      const doctor = await User.findById(req.user?.id).select('hospitalName');
      if (doctor?.hospitalName && mother.hospital !== doctor.hospitalName) {
        throw new ApiError('Mother not found', 404);
      }
    }

    res.json(mother);
  } catch (err) {
    next(err);
  }
}

export async function addChild(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const mother = await Mother.findById(req.params.id);
    if (!mother) throw new ApiError('Mother not found', 404);

    const child = await Child.create({
      ...req.body,
      mother: mother._id,
    });

    res.status(201).json(child);
  } catch (err) {
    next(err);
  }
}

export async function updateMother(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    ensureMotherAccess(req, req.params.id);

    const mother = await Mother.findById(req.params.id);
    if (!mother) throw new ApiError('Mother not found', 404);

    const {
      firstName, lastName, phone, dateOfBirth, pregnancyWeeks, parity,
      riskFlags, preferredLanguage, notificationChannel, appOptIn,
      babyNickname, assignedDoctor, assignedCHW,
    } = req.body;
    const allowedUpdates =
      req.user?.role === 'mother'
        ? {
            ...(phone !== undefined && { phone }),
            ...(preferredLanguage !== undefined && { preferredLanguage }),
            ...(notificationChannel !== undefined && { notificationChannel }),
            ...(appOptIn !== undefined && { appOptIn }),
            ...(babyNickname !== undefined && { babyNickname }),
          }
        : {
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(phone !== undefined && { phone }),
            ...(dateOfBirth !== undefined && { dateOfBirth }),
            ...(pregnancyWeeks !== undefined && { pregnancyWeeks }),
            ...(parity !== undefined && { parity }),
            ...(riskFlags !== undefined && { riskFlags }),
            ...(preferredLanguage !== undefined && { preferredLanguage }),
            ...(notificationChannel !== undefined && { notificationChannel }),
            ...(appOptIn !== undefined && { appOptIn }),
            ...(babyNickname !== undefined && { babyNickname }),
            ...(assignedDoctor !== undefined && { assignedDoctor }),
            ...(assignedCHW !== undefined && { assignedCHW }),
          };

    Object.assign(mother, allowedUpdates);
    await mother.save();

    res.status(200).json(mother);
  } catch (err) {
    next(err);
  }
}

export async function archiveMotherIfEligible(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const mother = await Mother.findById(req.params.id);
    if (!mother) throw new ApiError('Mother not found', 404);

    const children = await Child.find({ mother: mother._id });
    const now = new Date();

    const hasUnderTwo = children.some((c) => {
      const ageMs = now.getTime() - c.dateOfBirth.getTime();
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
      return ageMonths < 24;
    });

    if (hasUnderTwo) {
      return res.status(200).json({ archived: false, reason: 'Child under two years' });
    }

    mother.status = 'archived';
    mother.archivedAt = new Date();
    await mother.save();

    res.status(200).json({ archived: true, mother });
  } catch (err) {
    next(err);
  }
}

export async function getGuidance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    ensureMotherAccess(req, req.params.id);

    const mother = await Mother.findById(req.params.id);
    if (!mother) throw new ApiError('Mother not found', 404);

    const children = await Child.find({ mother: mother._id });
    
    // Logic for pregnancy vs postpartum
    let stage = 'Pregnancy';
    let weekOrMonth = mother.pregnancyWeeks || 0;
    let message = 'Welcome to MamaCare+. Remember to eat a balanced diet and attend your ANC visits.';

    if (children.length > 0) {
      // Get youngest child
      const youngest = children.reduce((prev, curr) => 
        prev.dateOfBirth > curr.dateOfBirth ? prev : curr
      );
      
      const ageMs = new Date().getTime() - youngest.dateOfBirth.getTime();
      const ageMonths = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.4375));
      
      stage = 'Postpartum';
      weekOrMonth = ageMonths;
      message = `Your baby "${youngest.name || 'Little Star'}" is ${ageMonths} months old. Ensure they stay on track with their vaccination schedule.`;
    } else if (mother.pregnancyWeeks) {
      const weeks = mother.pregnancyWeeks;
      if (weeks < 13) {
        message = `You are in your first trimester (Week ${weeks}). Ensure you are taking your folic acid daily.`;
      } else if (weeks < 27) {
        message = `You are in your second trimester (Week ${weeks}). You might start feeling the baby kick.`;
      } else {
        message = `You are in your third trimester (Week ${weeks}). Time to finalize your birth plan and hospital bag.`;
      }
    }

    const nextAppointment = await Appointment.findOne({
      mother: mother._id,
      status: 'scheduled',
    }).sort({ scheduledFor: 1 }).select('type scheduledFor notes');

    res.status(200).json({
      stage,
      weekOrMonth,
      friendlyMessage: message,
      nextAppointment,
    });
  } catch (err) {
    next(err);
  }
}
