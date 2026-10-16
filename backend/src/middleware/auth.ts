import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.'));
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    req.user = { id: String(payload.sub), role: String(payload.role) };
    next();
  } catch (err: any) {
    const code = err?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    next(new AppError(401, code, 'Your session has expired. Please log in again.'));
  }
};

export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) =>
    roles.includes(req.user?.role ?? '')
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do that.'));
