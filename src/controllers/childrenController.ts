import { Response, NextFunction } from 'express';
import { Child } from '../models/Child';
import { Mother } from '../models/Mother';
import { Appointment } from '../models/Appointment';
import { ApiError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
// Standard WHO Vaccination Milestones (approximate weeks from birth)
const VACCINE_MILESTONES = [
  { slug: 'BCG, OPV-0', weeks: 0 },
  { slug: 'OPV-1, Pentavalent-1, Rotavirus-1, PCV-1', weeks: 6 },
  { slug: 'OPV-2, Pentavalent-2, Rotavirus-2, PCV-2', weeks: 10 },
  { slug: 'OPV-3, Pentavalent-3, Rotavirus-3, PCV-3, IPV-1', weeks: 14 },
  { slug: 'Vitamin A (6m)', weeks: 26 },
  { slug: 'Measles-Rubella 1, IPV-2', weeks: 39 }, // 9 months
  { slug: 'Vitamin A (12m)', weeks: 52 },
  { slug: 'Measles-Rubella 2', weeks: 78 }, // 18 months
  { slug: 'Deworming (2y)', weeks: 104 },
];

export async function listAllChildren(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const children = await Child.find()
      .populate('mother', 'firstName lastName phone missedAppointmentsCount riskFlags')
      .sort({ dateOfBirth: -1 })
      .skip(skip)
      .limit(limit);

    // Attach next scheduled vaccine appointment for each child
    const now = new Date();
    const enriched = await Promise.all(
      children.map(async (child) => {
        const nextAppt = await Appointment.findOne({
          child: child._id,
          status: 'scheduled',
          scheduledFor: { $gte: now },
        }).sort({ scheduledFor: 1 }).select('notes scheduledFor');
        return { ...child.toObject(), nextAppointment: nextAppt };
      })
    );

    res.status(200).json(enriched);
  } catch (err) {
    next(err);
  }
}

export async function registerChild(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { motherId, name, dateOfBirth, sex } = req.body;

    const mother = await Mother.findById(motherId);
    if (!mother) throw new ApiError('Mother not found', 404);

    const child = await Child.create({
      mother: mother._id,
      name,
      dateOfBirth: new Date(dateOfBirth),
      sex,
    });

    // Automatically generate vaccination appointments
    const birthDate = new Date(dateOfBirth);
    const appointments = VACCINE_MILESTONES.map((m) => {
      const scheduledDate = new Date(birthDate);
      scheduledDate.setDate(scheduledDate.getDate() + m.weeks * 7);

      return {
        mother: mother._id,
        child: child._id,
        type: 'VACCINE',
        scheduledFor: scheduledDate,
        notes: `Vaccination: ${m.slug}`,
        status: 'scheduled',
      };
    });

    await Appointment.insertMany(appointments);

    res.status(201).json({
      message: 'Child registered and vaccination schedule generated',
      child,
      appointmentsCount: appointments.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMotherChildren(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const children = await Child.find({ mother: req.params.motherId });
    res.status(200).json(children);
  } catch (err) {
    next(err);
  }
}
