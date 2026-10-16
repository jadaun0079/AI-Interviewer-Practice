import rateLimit from 'express-rate-limit';
import { AppError } from '../lib/errors';

const make = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.')),
  });

export const globalLimiter = make(15 * 60_000, 600);
export const authLimiter = make(15 * 60_000, 30);
export const aiLimiter = make(10 * 60_000, 40);
