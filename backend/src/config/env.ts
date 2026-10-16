
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Always load backend/.env, regardless of the command's working directory.
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true,
});

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z
    .string()
    .min(1, 'is required')
    .refine(
      (value) =>
        value.startsWith('mongodb://') ||
        value.startsWith('mongodb+srv://'),
      'must start with mongodb:// or mongodb+srv://',
    ),

  MONGODB_DB: z.string().default('ai_interviewer'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters (run: npm run setup)'),

  
  // Gemini API configuration
  GEMINI_API_KEY: z.string().min(1, 'is required'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),


  FRONTEND_URL: z.string().default('http://localhost:5173'),

  FREE_INTERVIEWS_PER_MONTH: z.coerce.number().default(3),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\nInvalid environment configuration. Fix backend/.env:');

  for (const [key, messages] of Object.entries(
    parsed.error.flatten().fieldErrors,
  )) {
    console.error(`  - ${key}: ${(messages ?? []).join(', ')}`);
  }

  console.error(
    '\nTip: the file must be named exactly ".env" and live inside the backend folder.',
  );
  console.error('     Run "npm run setup" in the project root to create it.\n');

  process.exit(1);
}

export const env = parsed.data;
