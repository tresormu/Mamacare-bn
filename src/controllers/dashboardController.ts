import { Response, NextFunction } from 'express';
import { Mother } from '../models/Mother';
import { Appointment } from '../models/Appointment';
import { FollowUp } from '../models/FollowUp';
import { AuthRequest } from '../middleware/auth';

export async function getDashboardSummary(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [mothers, missedAppointments, openFollowUps] = await Promise.all([
      Mother.countDocuments({ status: 'active' }),
      Appointment.countDocuments({ status: 'missed' }),
      FollowUp.countDocuments({ status: 'open' }),
    ]);

    res.json({
      activeMothers: mothers,
      missedAppointments,
      openFollowUps,
    });
  } catch (err) {
    next(err);
  }
}
