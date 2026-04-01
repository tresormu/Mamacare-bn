import { Response, NextFunction } from 'express';
import { Mother } from '../models/Mother';
import { Appointment } from '../models/Appointment';
import { FollowUp } from '../models/FollowUp';
import { DoctorAlert } from '../models/DoctorAlert';
import { ApiError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { addClient, removeClient } from '../utils/sseManager';

export function subscribePinAlerts(req: AuthRequest, res: Response) {
  const doctorId = req.user!.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // confirm connection
  res.write('event: connected\ndata: {}\n\n');

  addClient(doctorId, res);

  req.on('close', () => removeClient(doctorId, res));
}

export async function getPinAlerts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doctorId = req.user!.id;
    const alerts = await DoctorAlert.find({ doctor: doctorId, dismissed: false }).sort({ createdAt: -1 });
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
}

export async function dismissPinAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alert = await DoctorAlert.findOneAndUpdate(
      { _id: req.params.id, doctor: req.user!.id },
      { dismissed: true },
      { new: true }
    );
    if (!alert) throw new ApiError('Alert not found', 404);
    res.json({ dismissed: true });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user?.role === 'mother') {
      const mother = await Mother.findById(req.user.id).select('_id missedAppointmentsCount');
      if (!mother) throw new ApiError('Mother not found', 404);

      const openFollowUps = await FollowUp.countDocuments({ mother: mother._id, status: 'open' });

      return res.json({
        activeMothers: 1,
        missedAppointments: mother.missedAppointmentsCount,
        openFollowUps,
      });
    }

    const doctorId = req.user?.id;
    const myMothers = await Mother.find({ assignedDoctor: doctorId, status: 'active' }).select('_id');
    const motherIds = myMothers.map(m => m._id);

    const [missedAppointments, openFollowUps] = await Promise.all([
      Appointment.countDocuments({ mother: { $in: motherIds }, status: 'missed' }),
      FollowUp.countDocuments({ mother: { $in: motherIds }, status: 'open' }),
    ]);

    res.json({
      activeMothers: myMothers.length,
      missedAppointments,
      openFollowUps,
    });
  } catch (err) {
    next(err);
  }
}
