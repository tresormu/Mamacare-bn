import { Response, NextFunction } from 'express';
import { FollowUp } from '../models/FollowUp';
import { Mother } from '../models/Mother';
import { User } from '../models/User';
import { ApiError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

export async function getOpenFollowUps(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const followUps = await FollowUp.find({ status: 'open' }).populate('mother');
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
