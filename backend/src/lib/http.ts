import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 4 does not catch async errors; this forwards them to the error handler. */
export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function ok(res: Response, data: unknown, status = 200, meta: Record<string, unknown> = {}) {
  res.status(status).json({ success: true, data, meta: { requestId: res.locals.requestId, ...meta } });
}

export const noContent = (res: Response) => {
  res.status(204).end();
};
