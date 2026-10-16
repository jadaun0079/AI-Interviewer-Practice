import { Router } from 'express';
import { z } from 'zod';
import { askJson } from '../../ai/llm';
import { evaluatePrompt, questionsPrompt, reportPrompt, SYSTEM } from '../../ai/prompts';
import { evalOut, questionsOut, reportOut } from '../../ai/schemas';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { idParam, objectId } from '../../lib/ids';
import { noContent, ok, wrap } from '../../lib/http';
import { authenticate } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { Interview, Resume, User, type IInterview } from '../../models';
import { startOfMonth } from '../users/users.routes';

const router = Router();
router.use(authenticate);

async function getOwned(id: string, userId: string) {
  const iv = await Interview.findOne({ _id: id, userId });
  if (!iv) throw new AppError(404, 'NOT_FOUND', 'Interview not found.');
  return iv;
}

const toDto = (iv: IInterview) => ({
  id: String(iv._id),
  role: iv.role,
  difficulty: iv.difficulty,
  type: iv.type,
  language: iv.language,
  status: iv.status,
  summary: iv.summary,
  skills: iv.skills,
  questions: iv.questions.map((q) => ({ index: q.index, q: q.q, topic: q.topic, ref: q.ref })),
  answers: iv.answers.map((a) => ({ index: a.index, answer: a.answer, evaluation: a.evaluation })),
  overallScore: iv.overallScore ?? null,
  createdAt: iv.createdAt,
});

/* ---------- create: the AI reads the resume and writes the questions ---------- */
const createSchema = z
  .object({
    resumeId: objectId,
    role: z.string().trim().min(2).max(80),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    type: z.enum(['TECHNICAL', 'HR', 'MIXED']),
    numQuestions: z.coerce.number().int().min(3).max(10).default(5),
    language: z.enum(['en-IN', 'en-US', 'hi-IN']).default('en-IN'),
  })
  .strict();

router.post(
  '/',
  aiLimiter,
  validate(createSchema),
  wrap(async (req, res) => {
    const b = req.body as z.infer<typeof createSchema>;
    const userId = req.user!.id;

    const user = await User.findById(userId);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Account not found.');
    if (user.plan === 'FREE') {
      const used = await Interview.countDocuments({ userId, createdAt: { $gte: startOfMonth() } });
      if (used >= env.FREE_INTERVIEWS_PER_MONTH) {
        throw new AppError(402, 'PLAN_LIMIT_REACHED', `The free plan includes ${env.FREE_INTERVIEWS_PER_MONTH} interviews per month.`);
      }
    }

    const resume = await Resume.findOne({ _id: b.resumeId, userId }).lean();
    if (!resume) throw new AppError(404, 'NOT_FOUND', 'Resume not found.');

    const out = await askJson(SYSTEM, questionsPrompt(b, resume.text), questionsOut);
    const questions = out.questions.slice(0, b.numQuestions).map((q, index) => ({ index, ...q }));

    const iv = await Interview.create({
      userId,
      resumeId: b.resumeId,
      role: b.role,
      difficulty: b.difficulty,
      type: b.type,
      language: b.language,
      summary: out.summary,
      skills: out.skills,
      questions,
    });
    ok(res, toDto(iv), 201);
  }),
);

/* ---------- list ---------- */
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/',
  validate(listSchema, 'query'),
  wrap(async (req, res) => {
    const { page, limit } = req.query as unknown as z.infer<typeof listSchema>;
    const userId = req.user!.id;
    const [rows, total] = await Promise.all([
      Interview.find({ userId }).select('role difficulty type status overallScore createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Interview.countDocuments({ userId }),
    ]);
    ok(
      res,
      rows.map((r) => ({ id: String(r._id), role: r.role, difficulty: r.difficulty, type: r.type, status: r.status, overallScore: r.overallScore ?? null, createdAt: r.createdAt })),
      200,
      { page, limit, total },
    );
  }),
);

router.get(
  '/:id',
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    ok(res, toDto(await getOwned(req.params.id, req.user!.id)));
  }),
);

/* ---------- submit an answer: the AI listens (text from speech) and rates it ---------- */
const answerSchema = z
  .object({ index: z.number().int().min(0), answer: z.string().trim().min(10).max(5000) })
  .strict();

router.post(
  '/:id/answer',
  aiLimiter,
  validate(idParam, 'params'),
  validate(answerSchema),
  wrap(async (req, res) => {
    const { index, answer } = req.body as z.infer<typeof answerSchema>;
    const iv = await getOwned(req.params.id, req.user!.id);
    if (iv.status !== 'IN_PROGRESS') {
      throw new AppError(409, 'INVALID_STATE_TRANSITION', 'This interview is already finished.');
    }
    if (index >= iv.questions.length) throw new AppError(422, 'VALIDATION_ERROR', 'Question index is out of range.');
    const answered = iv.answers.length;
    if (index < answered) throw new AppError(409, 'ALREADY_ANSWERED', 'This question was already answered.');
    if (index > answered) throw new AppError(409, 'OUT_OF_ORDER', 'Please answer the questions in order.');

    const evaluation = await askJson(
      SYSTEM,
      evaluatePrompt({ role: iv.role, difficulty: iv.difficulty, language: iv.language, question: iv.questions[index].q, answer }),
      evalOut,
    );

    // Atomic guard: only succeeds if exactly `index` answers exist, so double submits cannot both win.
    const updated = await Interview.findOneAndUpdate(
      { _id: iv._id, userId: iv.userId, status: 'IN_PROGRESS', answers: { $size: index } },
      { $push: { answers: { index, answer, score: evaluation.score, evaluation } } },
      { new: true },
    );
    if (!updated) throw new AppError(409, 'ALREADY_ANSWERED', 'This question was already answered.');
    ok(res, { evaluation, answered: index + 1, total: iv.questions.length, done: index + 1 >= iv.questions.length }, 201);
  }),
);

/* ---------- finish: final report ---------- */
router.post(
  '/:id/finish',
  aiLimiter,
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const iv = await getOwned(req.params.id, req.user!.id);
    if (iv.status === 'COMPLETED' && iv.report) return ok(res, iv.report);
    if (!iv.answers.length) throw new AppError(409, 'NO_ANSWERS', 'Answer at least one question before finishing.');

    const breakdown = iv.answers.map((a) => ({
      index: a.index,
      topic: iv.questions[a.index]?.topic ?? '',
      question: iv.questions[a.index]?.q ?? '',
      score: a.score,
      improve: a.evaluation.improve,
    }));
    const out = await askJson(
      SYSTEM,
      reportPrompt({ role: iv.role, summary: iv.summary, language: iv.language, results: breakdown }),
      reportOut,
    );
    const overallScore = Math.round((breakdown.reduce((s, b) => s + b.score, 0) / breakdown.length) * 10) / 10;
    const report = { ...out, overallScore, breakdown };

    await Interview.updateOne({ _id: iv._id }, { status: 'COMPLETED', report, overallScore, completedAt: new Date() });
    ok(res, report);
  }),
);

router.get(
  '/:id/report',
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const iv = await getOwned(req.params.id, req.user!.id);
    if (iv.status !== 'COMPLETED' || !iv.report) {
      throw new AppError(409, 'SESSION_NOT_COMPLETED', 'Finish the interview to see its report.');
    }
    ok(res, { ...iv.report, role: iv.role, difficulty: iv.difficulty, createdAt: iv.createdAt });
  }),
);

router.delete(
  '/:id',
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const r = await Interview.deleteOne({ _id: req.params.id, userId: req.user!.id });
    if (!r.deletedCount) throw new AppError(404, 'NOT_FOUND', 'Interview not found.');
    noContent(res);
  }),
);

export default router;
