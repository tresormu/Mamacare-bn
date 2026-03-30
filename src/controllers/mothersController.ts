import { Response, NextFunction } from 'express';
import { Mother } from '../models/Mother';
import { Child } from '../models/Child';
import { ApiError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

export async function createMother(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const mother = await Mother.create(req.body);
    res.status(201).json(mother);
  } catch (err) {
    next(err);
  }
}

export async function getMother(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const mother = await Mother.findById(req.params.id);
    if (!mother) throw new ApiError('Mother not found', 404);
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
    const mother = await Mother.findById(req.params.id);
    if (!mother) throw new ApiError('Mother not found', 404);

    const children = await Child.find({ mother: mother._id });
    
    // Logic for pregnancy vs postpartum
    let stage = 'Pregnancy';
    let weekOrMonth = mother.pregnancyWeeks || 0;
    let message = 'Welcome to MamaCare+ 💛. Remember to eat a balanced diet and attend your ANC visits.';

    if (children.length > 0) {
      // Get youngest child
      const youngest = children.reduce((prev, curr) => 
        prev.dateOfBirth > curr.dateOfBirth ? prev : curr
      );
      
      const ageMs = new Date().getTime() - youngest.dateOfBirth.getTime();
      const ageMonths = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.4375));
      
      stage = 'Postpartum';
      weekOrMonth = ageMonths;
      message = `Your baby "${youngest.name || 'Little Star'}" is ${ageMonths} months old. 🛡️ Ensure they stars on track with their vaccination schedule.`;
    } else if (mother.pregnancyWeeks) {
      const weeks = mother.pregnancyWeeks;
      if (weeks < 13) {
        message = `You are in your first trimester (Week ${weeks}). 🥗 Ensure you are taking your folic acid daily.`;
      } else if (weeks < 27) {
        message = `You are in your second trimester (Week ${weeks}). 👶 You might start feeling the baby kick!`;
      } else {
        message = `You are in your third trimester (Week ${weeks}). 🏥 Time to finalize your birth plan and hospital bag.`;
      }
    }

    res.status(200).json({
      stage,
      weekOrMonth,
      friendlyMessage: message,
      nextAppointment: 'Coming soon', // Placeholder for next appointment logic
    });
  } catch (err) {
    next(err);
  }
}

