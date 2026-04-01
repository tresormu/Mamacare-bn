import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { jwtSecret } from '../config/env';
import { User, UserRole } from '../models/User';
import { Mother } from '../models/Mother';
import { ApiError } from '../middleware/error';
import { AuthRequest, TokenType } from '../middleware/auth';

const TTL: Record<TokenType, number> = {
  mother: 60 * 60 * 24 * 30,
  doctor: 60 * 60 * 12,
  admin: 60 * 60 * 8,
};

function signToken(id: string, role: UserRole, tokenType: TokenType) {
  return jwt.sign({ id, role, tokenType }, jwtSecret, { expiresIn: TTL[tokenType] });
}

function tokenTypeForRole(role: UserRole): TokenType {
  if (role === 'admin') return 'admin';
  if (role === 'doctor' || role === 'chw') return 'doctor';
  return 'mother';
}

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function findMotherByPinCode(pinCode: string) {
  const mothers = await Mother.find({ isActive: false }).select('+pinCode +password');

  for (const mother of mothers) {
    if (mother.pinCode && (await mother.comparePin(pinCode))) {
      return mother;
    }
  }

  return null;
}

function buildPatientActivationPayload(mother: Awaited<ReturnType<typeof findMotherByPinCode>>) {
  if (!mother) {
    return null;
  }

  return {
    id: mother._id,
    firstName: mother.firstName,
    lastName: mother.lastName,
    phone: mother.phone,
  };
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, hospitalName } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError('Email already registered', 409);

    const user = await User.create({ name, email, password, role: 'doctor', hospitalName });
    const token = signToken(user._id.toString(), user.role, tokenTypeForRole(user.role));
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, hospitalName: user.hospitalName },
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new ApiError('Invalid credentials', 401);

    const ok = await user.comparePassword(password);
    if (!ok) throw new ApiError('Invalid credentials', 401);

    const token = signToken(user._id.toString(), user.role, tokenTypeForRole(user.role));
    res.status(200).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new ApiError('Unauthorized', 401);

    const user = await User.findById(userId).select('-password');
    if (!user) throw new ApiError('User not found', 404);

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      hospitalName: user.hospitalName,
      specialization: user.specialization,
      licenseNumber: user.licenseNumber,
      bio: user.bio,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new ApiError('Unauthorized', 401);

    const { name, email, phone, hospitalName, specialization, licenseNumber, bio } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new ApiError('User not found', 404);

    if (name) user.name = name;
    if (email && email !== user.email) {
      const exists = await User.findOne({ email, _id: { $ne: userId } });
      if (exists) throw new ApiError('Email already in use', 409);
      user.email = email;
    }
    if (phone !== undefined) user.phone = phone;
    if (hospitalName !== undefined) user.hospitalName = hospitalName;
    if (specialization !== undefined) user.specialization = specialization;
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      hospitalName: user.hospitalName,
      specialization: user.specialization,
      licenseNumber: user.licenseNumber,
      bio: user.bio,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: AuthRequest, res: Response) {
  res.status(200).json({ message: 'Logged out successfully' });
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+passwordResetCode +passwordResetExpiresAt');

    if (user) {
      user.passwordResetCode = generateResetCode();
      user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
    }

    res.status(200).json({
      message: 'If an account exists for that email, a reset code has been prepared.',
      ...(process.env.NODE_ENV !== 'production' && user?.passwordResetCode
        ? { resetCode: user.passwordResetCode }
        : null),
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, resetCode, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordResetCode +passwordResetExpiresAt');
    if (!user) throw new ApiError('Invalid reset request', 400);

    const isExpired =
      !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now();

    if (!user.passwordResetCode || user.passwordResetCode !== resetCode || isExpired) {
      throw new ApiError('Invalid or expired reset code', 400);
    }

    user.password = password;
    user.passwordResetCode = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

export async function verifyPatientCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { pinCode } = req.body;
    const mother = await findMotherByPinCode(pinCode);

    if (!mother) throw new ApiError('Invalid access code. Please check the code shared by your clinic.', 404);

    res.status(200).json({
      message: 'Access code verified',
      patient: buildPatientActivationPayload(mother),
    });
  } catch (err) {
    next(err);
  }
}

export async function activatePatient(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, pinCode, password } = req.body;

    const mother = phone
      ? await Mother.findOne({ phone, isActive: false }).select('+pinCode +password')
      : await findMotherByPinCode(pinCode);
    if (!mother) throw new ApiError('Invalid access code', 401);
    if (mother.isActive) throw new ApiError('Account already activated', 409);
    if (phone) {
      const pinOk = await mother.comparePin(pinCode);
      if (!pinOk) throw new ApiError('Invalid access code', 401);
    }

    mother.password = password;
    mother.isActive = true;
    mother.pinCode = undefined;
    await mother.save();

    const token = jwt.sign(
      { id: mother._id, role: 'mother', tokenType: 'mother' },
      jwtSecret,
      { expiresIn: TTL.mother }
    );
    res.status(200).json({
      message: 'Account activated successfully',
      token,
      patient: buildPatientActivationPayload(mother),
    });
  } catch (err) {
    next(err);
  }
}

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: passwordSchema,
    hospitalName: z.string().min(1),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

export const activatePatientSchema = z.object({
  body: z.object({
    phone: z.string().min(5).optional(),
    pinCode: z.string().length(6),
    password: passwordSchema,
  }),
});

export const verifyPatientCodeSchema = z.object({
  body: z.object({
    pinCode: z.string().length(6),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    resetCode: z.string().length(6),
    password: passwordSchema,
  }),
});
