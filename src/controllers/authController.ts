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

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError('Email already registered', 409);

    const user = await User.create({ name, email, password });
    const token = signToken(user._id.toString(), user.role, tokenTypeForRole(user.role));
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
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

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function activatePatient(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, pinCode, password } = req.body;

    const mother = await Mother.findOne({ phone }).select('+pinCode +password');
    if (!mother) throw new ApiError('Invalid phone or PIN', 401);
    if (mother.isActive) throw new ApiError('Account already activated', 409);

    const pinOk = await mother.comparePin(pinCode);
    if (!pinOk) throw new ApiError('Invalid phone or PIN', 401);

    mother.password = password; // pre-save hook hashes it
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
      patient: { id: mother._id, firstName: mother.firstName, lastName: mother.lastName, phone: mother.phone },
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
    phone: z.string().min(5),
    pinCode: z.string().length(6),
    password: passwordSchema,
  }),
});
