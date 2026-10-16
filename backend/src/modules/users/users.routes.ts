import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { ok, wrap } from '../../lib/http';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { Interview, User } from '../../models';
import { toUser } from '../auth/auth.routes';

const router = Router();
router.use(authenticate);

export const startOfMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

async function usage(userId: string) {
  const used = await Interview.countDocuments({ userId, createdAt: { $gte: startOfMonth() } });
  return { interviewsThisMonth: used, interviewsLimit: env.FREE_INTERVIEWS_PER_MONTH };
}

router.get(
  '/me',
  wrap(async (req, res) => {
    const user = await User.findById(req.user!.id);
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Account not found.');
    ok(res, { ...toUser(user), usage: await usage(req.user!.id) });
  }),
);

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    college: z.string().trim().max(120).optional(),
    targetRole: z.string().trim().max(80).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

router.patch(
  '/me',
  validate(patchSchema),
  wrap(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user!.id, { $set: req.body }, { new: true });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Account not found.');
    ok(res, toUser(user));
  }),
);

export default router;
