import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export const notFound: RequestHandler = (_req, _res, next) =>
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found.'));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again.';
  let details: unknown;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = 'Some fields are invalid.';
    details = err.issues.map((i) => ({ field: i.path.join('.'), issue: i.message }));
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'BAD_REQUEST';
    message = 'Malformed JSON body.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large.';
  } else if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    status = tooBig ? 413 : 422;
    code = tooBig ? 'PAYLOAD_TOO_LARGE' : 'VALIDATION_ERROR';
    message = tooBig ? 'File is too large (max 5 MB).' : 'Invalid file upload.';
  } else if (err?.code === 11000) {
    status = 409;
    code = 'CONFLICT';
    message = 'This record already exists.';
  } else if (err?.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = 'Invalid id.';
  } else if (
    ['MongooseServerSelectionError', 'MongoNetworkError', 'MongoServerSelectionError'].includes(err?.name) ||
    /buffering timed out/i.test(err?.message ?? '')
  ) {
    status = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'The database is temporarily unavailable. Please try again.';
  }

  if (status >= 500) logger.error({ err, requestId: res.locals.requestId }, 'request failed');
  res.status(status).json({
    success: false,
    error: { code, message, details },
    meta: { requestId: res.locals.requestId },
  });
};
