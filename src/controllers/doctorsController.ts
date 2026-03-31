import { Response, NextFunction } from 'express';
import { Mother } from '../models/Mother';
import { Appointment } from '../models/Appointment';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/error';

export async function getMyMothers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) throw new ApiError('Unauthorized', 401);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const mothers = await Mother.find({ assignedDoctor: doctorId, status: 'active' })
      .skip(skip)
      .limit(limit);
    res.status(200).json(mothers);
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
    if (!doctorId) throw new ApiError('Unauthorized', 401);

    const myMothers = await Mother.find({ assignedDoctor: doctorId });
    const motherIds = myMothers.map(m => m._id);

    const [missedCount, highRiskCount] = await Promise.all([
      Appointment.countDocuments({
        mother: { $in: motherIds },
        status: 'missed'
      }),
      Mother.countDocuments({
        assignedDoctor: doctorId,
        riskFlags: { $not: { $size: 0 } },
        status: 'active'
      })
    ]);

    res.status(200).json({
      summary: {
        myTotalPatients: myMothers.length,
        myHighRiskPatients: highRiskCount,
        myMissedAppointments: missedCount,
      },
      timestamp: new Date()
    });
  } catch (err) {
    next(err);
  }
}
