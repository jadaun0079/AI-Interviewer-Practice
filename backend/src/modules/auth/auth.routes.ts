import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router, type Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { noContent, ok, wrap } from '../../lib/http';
import { RefreshToken, User, type IUser } from '../../models';
import { validate } from '../../middleware/validate';

export const toUser = (u: IUser) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  plan: u.plan,
  college: u.college ?? null,
  targetRole: u.targetRole ?? null,
  createdAt: u.createdAt,
});

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12); // equalises timing for unknown emails
const COOKIE = 'refresh_token';
const cookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: 30 * 864e5,
};

const signAccess = (u: IUser) =>
  jwt.sign({ role: u.role }, env.JWT_ACCESS_SECRET, { subject: String(u._id), expiresIn: 900 });

async function issueTokens(res: Response, u: IUser, userAgent?: string) {
  const token = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({
    userId: u._id,
    tokenHash: sha(token),
    userAgent: userAgent?.slice(0, 200),
    expiresAt: new Date(Date.now() + 30 * 864e5),
  });
  res.cookie(COOKIE, token, cookieOpts);
  return { accessToken: signAccess(u), expiresIn: 900, user: toUser(u) };
}

const password = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72, 'At most 72 characters')
  .regex(/[a-z]/, 'Needs a lower case letter')
  .regex(/[A-Z]/, 'Needs an upper case letter')
  .regex(/\d/, 'Needs a number');

const signupSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(200),
    password,
    college: z.string().trim().max(120).optional(),
    targetRole: z.string().trim().max(80).optional(),
  })
  .strict();

const loginSchema = z
  .object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(72) })
  .strict();

const router = Router();

router.post(
  '/signup',
  validate(signupSchema),
  wrap(async (req, res) => {
    const b = req.body as z.infer<typeof signupSchema>;
    if (await User.exists({ email: b.email })) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
    }
    const user = await User.create({
      name: b.name,
      email: b.email,
      passwordHash: await bcrypt.hash(b.password, 12),
      college: b.college,
      targetRole: b.targetRole,
    });
    ok(res, await issueTokens(res, user, req.headers['user-agent']), 201);
  }),
);

router.post(
  '/login',
  validate(loginSchema),
  wrap(async (req, res) => {
    const b = req.body as z.infer<typeof loginSchema>;
    const user = await User.findOne({ email: b.email });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(403, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again in a few minutes.', {
        lockedUntil: user.lockedUntil,
      });
    }
    const valid = await bcrypt.compare(b.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      if (user) {
        const attempts = user.failedAttempts + 1;
        user.failedAttempts = attempts >= 5 ? 0 : attempts;
        user.lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : user.lockedUntil;
        await user.save();
      }
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    }
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await user.save();
    ok(res, await issueTokens(res, user, req.headers['user-agent']));
  }),
);

router.post(
  '/refresh',
  wrap(async (req, res) => {
    const token = req.cookies?.[COOKIE] as string | undefined;
    if (!token) throw new AppError(401, 'TOKEN_INVALID', 'Please log in.');
    const hash = sha(token);

    // Atomically claim (rotate) the token so it can only be used once.
    const claimed = await RefreshToken.findOneAndUpdate({ tokenHash: hash, revokedAt: null }, { revokedAt: new Date() });
    if (!claimed) {
      const old = await RefreshToken.findOne({ tokenHash: hash });
      if (old) {
        // A revoked token was presented again: assume theft and end every session of this user.
        await RefreshToken.updateMany({ userId: old.userId, revokedAt: null }, { revokedAt: new Date() });
        res.clearCookie(COOKIE, { path: cookieOpts.path });
        throw new AppError(403, 'TOKEN_REUSE_DETECTED', 'Security alert: please log in again.');
      }
      throw new AppError(401, 'TOKEN_INVALID', 'Please log in.');
    }
    if (claimed.expiresAt < new Date()) throw new AppError(401, 'TOKEN_EXPIRED', 'Your session expired. Please log in.');
    const user = await User.findById(claimed.userId);
    if (!user) throw new AppError(401, 'TOKEN_INVALID', 'Please log in.');
    ok(res, await issueTokens(res, user, req.headers['user-agent']));
  }),
);

router.post(
  '/logout',
  wrap(async (req, res) => {
    const token = req.cookies?.[COOKIE] as string | undefined;
    if (token) await RefreshToken.updateOne({ tokenHash: sha(token), revokedAt: null }, { revokedAt: new Date() });
    res.clearCookie(COOKIE, { path: cookieOpts.path });
    noContent(res);
  }),
);

export default router;
