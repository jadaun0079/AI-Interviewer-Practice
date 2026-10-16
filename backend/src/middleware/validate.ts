import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../lib/errors';

export const validate =
  (schema: ZodTypeAny, part: 'body' | 'query' | 'params' = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(part === 'params' ? new AppError(400, 'INVALID_ID', 'Invalid id.') : result.error);
    }
    (req as any)[part] = result.data;
    next();
  };
