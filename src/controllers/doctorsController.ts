import { Response, NextFunction } from 'express';
import { Mother } from '../models/Mother';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/error';

export async function getMyMothers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) throw new ApiError('Unauthorized', 401);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { assignedDoctor: doctorId, status: 'active' };

    const [mothers, total] = await Promise.all([
      Mother.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Mother.countDocuments(filter),
    ]);

    res.status(200).json({ data: mothers, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getMyAppointments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) throw new ApiError('Unauthorized', 401);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Find all mothers assigned to this doctor
    const myMothers = await Mother.find({ assignedDoctor: doctorId }).select('_id');
    const motherIds = myMothers.map(m => m._id);

    const appointments = await Appointment.find({
      mother: { $in: motherIds },
      status: 'scheduled'
    })
      .populate('mother', 'firstName lastName phone')
      .sort({ scheduledFor: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
}

export async function getDoctorSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doctorId = req.user?.id;
    const filter: Record<string, any> = { assignedDoctor: doctorId };

    const myMothers = await Mother.find(filter).select('_id riskFlags');
    const motherIds = myMothers.map(m => m._id);

    const { FollowUp } = await import('../models/FollowUp');
    const [missedCount, highRiskCount, chwTasks] = await Promise.all([
      Appointment.countDocuments({ mother: { $in: motherIds }, status: 'missed' }),
      myMothers.filter(m => m.riskFlags.length > 0).length,
      FollowUp.countDocuments({ mother: { $in: motherIds }, status: 'open' }),
    ]);

    res.status(200).json({
      summary: {
        myTotalPatients: myMothers.length,
        myHighRiskPatients: highRiskCount,
        myMissedAppointments: missedCount,
        myChwTasks: chwTasks,
      },
      timestamp: new Date()
    });
  } catch (err) {
    next(err);
  }
}

export async function getChws(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const chws = await User.find({ role: 'chw' }).select('-password');
    res.status(200).json(chws);
  } catch (err) {
    next(err);
  }
}
