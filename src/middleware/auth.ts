import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';
import { User, UserRole } from '../models/User';
import { Mother } from '../models/Mother';

export type TokenType = 'mother' | 'doctor' | 'admin';
export type AppRole = UserRole | 'mother';

export interface AuthRequest extends Request {
  user?: { id: string; role: AppRole; tokenType: TokenType };
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
    const payload = jwt.verify(token, jwtSecret) as { id: string; role: AppRole; tokenType: TokenType };

    if (payload.tokenType === 'mother') {
      const mother = await Mother.findById(payload.id).select('_id');
      if (!mother) return next(Object.assign(new Error('Invalid token user'), { statusCode: 401 }));

      req.user = { id: mother._id.toString(), role: 'mother', tokenType: 'mother' };
      return next();
    }

    const user = await User.findById(payload.id);
    if (!user) return next(Object.assign(new Error('Invalid token user'), { statusCode: 401 }));

    req.user = { id: user._id.toString(), role: user.role, tokenType: payload.tokenType };
    next();
  } catch {
    next(Object.assign(new Error('Unauthorized'), { statusCode: 401 }));
  }
}

export function requireRole(...roles: AppRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(Object.assign(new Error('Forbidden'), { statusCode: 403 }));
    }
    next();
  };
}
