import { z } from 'zod';

const str = (max = 600) => z.string().trim().max(max);

export const questionsOut = z.object({
  summary: str(500).default(''),
  skills: z.array(str(60)).max(12).default([]),
  questions: z
    .array(z.object({ q: str(500).min(5), topic: str(80).default('General'), ref: str(200).optional() }))
    .min(1),
});

export const evalOut = z.object({
  score: z.coerce.number().transform((n) => Math.max(1, Math.min(10, Math.round(n)))),
  strengths: str(600),
  improve: str(900),
  ideal: str(1200),
});

export const reportOut = z.object({
  verdict: str(800),
  strengths: z.array(str(300)).max(6),
  weak_topics: z.array(str(120)).max(6),
  plan: z.array(str(300)).max(10),
  resume_tips: z.array(str(300)).max(6),
});
