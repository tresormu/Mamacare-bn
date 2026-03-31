import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { jwtSecret } from '../config/env';
import { User, UserRole } from '../models/User';
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
  // JWT is stateless — logout is handled client-side by discarding the token.
  // This endpoint exists so the network tab shows a logout call.
  res.status(200).json({ message: 'Logged out successfully' });
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
