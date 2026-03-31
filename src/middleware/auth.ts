import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';
import { User, UserRole } from '../models/User';

export type TokenType = 'mother' | 'doctor' | 'admin';

export interface AuthRequest extends Request {
  user?: { id: string; role: UserRole; tokenType: TokenType };
}

export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    // Support token via Authorization header OR ?token= query param (needed for SSE/EventSource)
    const header = req.headers.authorization;
    const queryToken = req.query.token as string | undefined;
    const raw = header?.startsWith('Bearer ') ? header.split(' ')[1] : queryToken;

    if (!raw) {
      return next(Object.assign(new Error('Missing or invalid Authorization header'), { statusCode: 401 }));
    }

    const token = raw;
    const payload = jwt.verify(token, jwtSecret) as { id: string; role: UserRole; tokenType: TokenType };

    const user = await User.findById(payload.id);
    if (!user) return next(Object.assign(new Error('Invalid token user'), { statusCode: 401 }));

    req.user = { id: user._id.toString(), role: user.role, tokenType: payload.tokenType };
    next();
  } catch {
    next(Object.assign(new Error('Unauthorized'), { statusCode: 401 }));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(Object.assign(new Error('Forbidden'), { statusCode: 403 }));
    }
    next();
  };
}
