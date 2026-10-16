
import { ZodType } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  // First, try parsing the complete response.
  try {
    return JSON.parse(cleaned);
  } catch {
    // The response may contain extra text around the JSON.
  }

  // Try extracting a JSON object or array.
  const startObject = cleaned.indexOf('{');
  const startArray = cleaned.indexOf('[');

  let start = -1;

  if (startObject === -1) start = startArray;
  else if (startArray === -1) start = startObject;
  else start = Math.min(startObject, startArray);

  if (start === -1) {
    throw new Error('AI response does not contain valid JSON');
  }

  const opening = cleaned[start];
  const closing = opening === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === opening) {
      depth++;
    } else if (char === closing) {
      depth--;

      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }

  throw new Error('AI response contains incomplete JSON');
}


const clientPromise = import('@google/genai').then(
  ({ GoogleGenAI }) =>
    new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: {
        timeout: 45_000,
      },
    }),
);

export async function askJson<T>(
  system: string,
  user: string,
  schema: ZodType<T, any, any>,
): Promise<T> {
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const started = Date.now();

    try {
      const client = await clientPromise;

      const response = await client.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: user,
        config: {
          systemInstruction:
            `${system}\n\n` +
            'Return only valid JSON. Do not use Markdown fences. ' +
            'Follow the requested output structure exactly.',
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 1800,
        },
      });

      const text = response.text ?? '';
      const parsed = schema.safeParse(extractJson(text));

      logger.info(
        {
          model: env.GEMINI_MODEL,
          ms: Date.now() - started,
          in: response.usageMetadata?.promptTokenCount,
          out: response.usageMetadata?.candidatesTokenCount,
        },
        'ai call',
      );

      if (parsed.success) {
        return parsed.data;
      }

      logger.warn(
        { attempt: attempt + 1 },
        'Gemini returned invalid JSON',
      );
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }

      const error = err as {
        status?: number;
        message?: string;
      };

      const message =
        err instanceof Error ? err.message : 'Unknown error';

      const status = error.status;
      const isTimeout =
        /timeout|timed out|abort|deadline/i.test(message);

      const retryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        isTimeout;

      logger.error(
        {
          err,
          status,
          attempt: attempt + 1,
          model: env.GEMINI_MODEL,
        },
        'Gemini provider error',
      );

      if (retryable && attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1500),
        );
        continue;
      }

      if (isTimeout || status === 504) {
        throw new AppError(
          504,
          'AI_TIMEOUT',
          'The AI took too long to respond. Please try again.',
        );
      }

      throw new AppError(
        status === 429 ? 429 : 502,
        'AI_PROVIDER_ERROR',
        'The AI service is unavailable right now. Please try again.',
      );
    }
  }

  throw new AppError(
    502,
    'AI_INVALID_OUTPUT',
    'The AI returned an unexpected response. Please try again.',
  );
}
