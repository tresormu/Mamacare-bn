import { Response, NextFunction } from 'express';
import { FollowUp } from '../models/FollowUp';
import { Mother } from '../models/Mother';
import { User } from '../models/User';
import { ApiError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

export async function getOpenFollowUps(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    let filter: Record<string, any> = { status: 'open' };

    if (req.user?.role === 'chw') {
      const chwId = req.user.id;
      const motherIds = await Mother.find({ assignedCHW: chwId }).select('_id');
      filter = {
        status: 'open',
        $or: [
          { assignedTo: chwId },
          { mother: { $in: motherIds.map((m) => m._id) } },
        ],
      };
    }

    const followUps = await FollowUp.find(filter)
      .populate('mother')
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(limit);
    res.status(200).json(followUps);
  } catch (err) {
    next(err);
  }
}

export async function resolveFollowUp(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body;
    const followUp = await FollowUp.findById(req.params.id);

    if (!followUp) throw new ApiError('Follow-up not found', 404);
    if (followUp.status === 'closed') throw new ApiError('Follow-up already closed', 400);

    const resolver = await User.findById(req.user!.id).select('name');

    followUp.status = 'closed';
    followUp.notes = notes;
    followUp.resolvedBy = resolver?.name ?? req.user!.id;
    followUp.resolvedAt = new Date();
    await followUp.save();

    const mother = await Mother.findById(followUp.mother);
    if (mother) {
      mother.missedAppointmentsCount = 0;
      await mother.save();
    }

    res.status(200).json({ message: 'Follow-up resolved and mother record updated', followUp });
  } catch (err) {
    next(err);
  }
}
