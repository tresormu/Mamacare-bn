import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Mother } from '../models/Mother';
import { Child } from '../models/Child';
import { Appointment } from '../models/Appointment';
import { ApiError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Return all doctors and CHWs, excluding the admin themselves
    const users = await User.find({
      _id: { $ne: req.user?.id },
      role: { $in: ['doctor', 'chw'] }
    }).select('-password');

    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUserDetails(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) throw new ApiError('User not found', 404);

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, email, role } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) throw new ApiError('User not found', 404);

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;

    await user.save();

    res.status(200).json({
      message: 'User updated successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError('User not found', 404);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getSystemSummary(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [mothersCount, childrenCount, doctorsCount, chwsCount, missedCount] = await Promise.all([
      Mother.countDocuments({ status: 'active' }),
      Child.countDocuments(),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'chw' }),
      Appointment.countDocuments({ status: 'missed' }),
    ]);

    res.status(200).json({
      summary: {
        totalActiveMothers: mothersCount,
        totalChildren: childrenCount,
        staff: {
          doctors: doctorsCount,
          chws: chwsCount,
          total: doctorsCount + chwsCount
        },
        missedAppointments: missedCount,
      },
      timestamp: new Date()
    });
  } catch (err) {
    next(err);
  }
}
