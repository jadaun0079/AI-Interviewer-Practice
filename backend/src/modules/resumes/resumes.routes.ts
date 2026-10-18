
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { AppError } from '../../lib/errors';
import { idParam } from '../../lib/ids';
import { logger } from '../../lib/logger';
import { extractPdfText } from '../../lib/pdf';
import { noContent, ok, wrap } from '../../lib/http';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { Resume } from '../../models';

const MAX_RESUMES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_RESUME_TEXT_LENGTH = 80;
const MAX_RESUME_TEXT_LENGTH = 15000;

const router = Router();

router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(
        new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Only PDF files are accepted.',
        ),
      );
    }

    cb(null, true);
  },
});

const normalize = (text: string) =>
  text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_RESUME_TEXT_LENGTH);

async function assertCapacity(userId: string): Promise<void> {
  const count = await Resume.countDocuments({ userId });

  if (count >= MAX_RESUMES) {
    throw new AppError(
      402,
      'PLAN_LIMIT_REACHED',
      `You can store up to ${MAX_RESUMES} resumes. Delete one first.`,
    );
  }
}

async function save(
  userId: string,
  fileName: string,
  text: string,
) {
  const normalizedText = normalize(text);

  if (normalizedText.length < MIN_RESUME_TEXT_LENGTH) {
    throw new AppError(
      422,
      'RESUME_UNREADABLE',
      'Not enough text could be extracted. If your PDF is scanned, paste the resume text instead.',
    );
  }

  const resume = await Resume.create({
    userId,
    fileName: fileName.slice(0, 200),
    text: normalizedText,
    characters: normalizedText.length,
  });

  return {
    id: String(resume._id),
    fileName: resume.fileName,
    characters: normalizedText.length,
    preview: normalizedText.slice(0, 300),
    createdAt: resume.createdAt,
  };
}

/* ---------- Upload PDF ---------- */

router.post(
  '/',
  upload.single('file'),
  wrap(async (req, res) => {
    const file = req.file;

    if (!file) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'Attach a PDF file in the "file" field.',
      );
    }

    // Basic PDF signature check.
    if (
      !file.buffer
        .subarray(0, 1024)
        .toString('latin1')
        .includes('%PDF-')
    ) {
      throw new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'This file does not appear to be a valid PDF.',
      );
    }

    await assertCapacity(req.user!.id);

    let extractedText: string;

    try {
      extractedText = await extractPdfText(file.buffer);
    } catch (err: unknown) {
      logger.error(
        {
          fileName: file.originalname,
          bytes: file.size,
          mimeType: file.mimetype,
          error:
            err instanceof Error
              ? {
                  name: err.name,
                  message: err.message,
                  stack: err.stack,
                }
              : String(err),
        },
        'Failed to extract PDF text',
      );

      throw new AppError(
        422,
        'RESUME_UNREADABLE',
        'This PDF could not be read. Try another file or paste the text.',
      );
    }

    const normalizedText = normalize(extractedText);

    logger.info(
      {
        fileName: file.originalname,
        bytes: file.size,
        extractedCharacters: normalizedText.length,
      },
      'Resume PDF processed',
    );

    const result = await save(
      req.user!.id,
      file.originalname,
      normalizedText,
    );

    ok(res, result, 201);
  }),
);

/* ---------- Save pasted resume text ---------- */

const textSchema = z
  .object({
    fileName: z
      .string()
      .trim()
      .max(120)
      .default('Pasted resume'),
    text: z
      .string()
      .min(MIN_RESUME_TEXT_LENGTH)
      .max(30000),
  })
  .strict();

router.post(
  '/text',
  validate(textSchema),
  wrap(async (req, res) => {
    const body = req.body as z.infer<typeof textSchema>;

    await assertCapacity(req.user!.id);

    const result = await save(
      req.user!.id,
      body.fileName,
      body.text,
    );

    ok(res, result, 201);
  }),
);

/* ---------- List resumes ---------- */

router.get(
  '/',
  wrap(async (req, res) => {
    const rows = await Resume.find({
      userId: req.user!.id,
    })
      .select('fileName characters createdAt')
      .sort({ createdAt: -1 })
      .lean();

    ok(
      res,
      rows.map((resume) => ({
        id: String(resume._id),
        fileName: resume.fileName,
        characters: resume.characters,
        createdAt: resume.createdAt,
      })),
    );
  }),
);

/* ---------- Get one resume ---------- */

router.get(
  '/:id',
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user!.id,
    }).lean();

    if (!resume) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Resume not found.',
      );
    }

    ok(res, {
      id: String(resume._id),
      fileName: resume.fileName,
      text: resume.text,
      createdAt: resume.createdAt,
    });
  }),
);

/* ---------- Delete resume ---------- */

router.delete(
  '/:id',
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const result = await Resume.deleteOne({
      _id: req.params.id,
      userId: req.user!.id,
    });

    if (!result.deletedCount) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Resume not found.',
      );
    }

    noContent(res);
  }),
);

export default router;
