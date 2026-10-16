import './types';
import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import mongoose from 'mongoose';
import { logger } from './lib/logger';
import { errorHandler, notFound } from './middleware/errorHandler';
import { aiLimiter, authLimiter, globalLimiter } from './middleware/rateLimit';
import authRouter from './modules/auth/auth.routes';
import interviewsRouter from './modules/interviews/interviews.routes';
import resumesRouter from './modules/resumes/resumes.routes';
import usersRouter from './modules/users/users.routes';

void aiLimiter;

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.locals.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', res.locals.requestId);
    next();
  });
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      customProps: (_req, res) => ({ requestId: (res as any).locals?.requestId }),
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });
  app.get('/ready', async (_req, res) => {
    try {
      await mongoose.connection.db!.command({ ping: 1 });
      res.json({ db: 'up' });
    } catch {
      res.status(503).json({ failing: ['db'] });
    }
  });

  const v1 = express.Router();
  v1.use('/auth', authLimiter, authRouter);
  v1.use('/users', usersRouter);
  v1.use('/resumes', resumesRouter);
  v1.use('/interviews', interviewsRouter);
  app.use('/api/v1', globalLimiter, v1);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
