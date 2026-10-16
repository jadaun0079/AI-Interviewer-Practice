import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { idParam } from '../../lib/ids';
import { extractPdfText } from '../../lib/pdf';
import { noContent, ok, wrap } from '../../lib/http';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { Resume } from '../../models';

const MAX_RESUMES = 10;
const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only PDF files are accepted.')),
});

const normalize = (t: string) =>
  t.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 15000);

async function assertCapacity(userId: string) {
  if ((await Resume.countDocuments({ userId })) >= MAX_RESUMES) {
    throw new AppError(402, 'PLAN_LIMIT_REACHED', `You can store up to ${MAX_RESUMES} resumes. Delete one first.`);
  }
}

async function save(userId: string, fileName: string, text: string) {
  if (text.length < 80) {
    throw new AppError(422, 'RESUME_UNREADABLE', 'Could not read enough text. If your PDF is a scan, paste the text instead.');
  }
  const r = await Resume.create({ userId, fileName: fileName.slice(0, 200), text, characters: text.length });
  return { id: String(r._id), fileName: r.fileName, characters: r.characters, preview: text.slice(0, 300), createdAt: r.createdAt };
}

router.post(
  '/',
  upload.single('file'),
  wrap(async (req, res) => {
    if (!req.file) throw new AppError(422, 'VALIDATION_ERROR', 'Attach a PDF file in the "file" field.');
    if (req.file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'This file is not a valid PDF.');
    }
    await assertCapacity(req.user!.id);
    let text = '';
    try {
      text = normalize(await extractPdfText(req.file.buffer));
    } catch {
      throw new AppError(422, 'RESUME_UNREADABLE', 'This PDF could not be read. Try another file or paste the text.');
    }
    ok(res, await save(req.user!.id, req.file.originalname, text), 201);
  }),
);

const textSchema = z
  .object({ fileName: z.string().trim().max(120).default('Pasted resume'), text: z.string().min(80).max(30000) })
  .strict();

router.post(
  '/text',
  validate(textSchema),
  wrap(async (req, res) => {
    const b = req.body as z.infer<typeof textSchema>;
    await assertCapacity(req.user!.id);
    ok(res, await save(req.user!.id, b.fileName, normalize(b.text)), 201);
  }),
);

router.get(
  '/',
  wrap(async (req, res) => {
    const rows = await Resume.find({ userId: req.user!.id }).select('fileName characters createdAt').sort({ createdAt: -1 }).lean();
    ok(res, rows.map((r) => ({ id: String(r._id), fileName: r.fileName, characters: r.characters, createdAt: r.createdAt })));
  }),
);

router.get(
  '/:id',
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const r = await Resume.findOne({ _id: req.params.id, userId: req.user!.id }).lean();
    if (!r) throw new AppError(404, 'NOT_FOUND', 'Resume not found.');
    ok(res, { id: String(r._id), fileName: r.fileName, text: r.text, createdAt: r.createdAt });
  }),
);

router.delete(
  '/:id',
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const r = await Resume.deleteOne({ _id: req.params.id, userId: req.user!.id });
    if (!r.deletedCount) throw new AppError(404, 'NOT_FOUND', 'Resume not found.');
    noContent(res);
  }),
);

export default router;
