import { Response, NextFunction } from 'express';
import { Appointment, AppointmentStatus } from '../models/Appointment';
import { Mother } from '../models/Mother';
import { FollowUp } from '../models/FollowUp';
import { ApiError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

const MISSED_THRESHOLD = 4;

export async function createAppointment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const mother = await Mother.findById(req.params.id);
    if (!mother) throw new ApiError('Mother not found', 404);

    const appointment = await Appointment.create({
      ...req.body,
      mother: mother._id,
    });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function updateAppointmentStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) throw new ApiError('Appointment not found', 404);

    const previousStatus = appointment.status;
    const nextStatus = req.body.status as AppointmentStatus;

    appointment.status = nextStatus;
    await appointment.save();

    let followUpTriggered = false;

    if (previousStatus === 'scheduled' && nextStatus === 'missed') {
      const mother = await Mother.findById(appointment.mother);
      if (mother) {
        mother.missedAppointmentsCount += 1;
        await mother.save();

        if (mother.missedAppointmentsCount >= MISSED_THRESHOLD) {
          const existing = await FollowUp.findOne({ mother: mother._id, status: 'open' });
          if (!existing) {
            await FollowUp.create({
              mother: mother._id,
              reason: `Missed ${mother.missedAppointmentsCount} appointments`,
            });
            followUpTriggered = true;
          }
        }
      }
    }

    res.status(200).json({ appointment, followUpTriggered });
  } catch (err) {
    next(err);
  }
}

export async function getMotherAppointments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const motherId = req.params.id;
    if (req.user?.role === 'mother' && req.user.id !== motherId) {
      throw new ApiError('Forbidden', 403);
    }

    const status = req.query.status as AppointmentStatus | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { mother: motherId };
    if (status) filter.status = status;

    const appointments = await Appointment.find(filter)
      .sort({ scheduledFor: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
}
