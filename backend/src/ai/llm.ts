import Groq from 'groq-sdk';
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

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting JSON from surrounding text.
  }

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
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;

      continue;
    }

    if (char === '"') inString = true;
    else if (char === opening) depth++;
    else if (char === closing) {
      depth--;

      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }

  throw new Error('AI response contains incomplete JSON');
}

const groqClient = new Groq({
  apiKey: env.GROQ_API_KEY,
  timeout: 20_000,
  maxRetries: 0,
});

const geminiClientPromise = env.GEMINI_API_KEY
  ? import('@google/genai').then(
      ({ GoogleGenAI }) =>
        new GoogleGenAI({
          apiKey: env.GEMINI_API_KEY!,
          httpOptions: {
            timeout: 20_000,
          },
        }),
    )
  : null;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function getErrorDetails(err: unknown) {
  const error = err as {
    status?: number;
    statusCode?: number;
    code?: string | number;
    message?: string;
  };

  const message =
    err instanceof Error ? err.message : 'Unknown provider error';

  const status = Number(error?.status ?? error?.statusCode ?? 0);

  const isTimeout =
    /timeout|timed out|abort|deadline|ETIMEDOUT|ECONNRESET/i.test(
      message,
    );

  return { status, message, isTimeout };
}

function validateOutput<T>(
  responseText: string,
  schema: ZodType<T, any, any>,
  provider: string,
): T {
  if (!responseText.trim()) {
    throw new Error(`${provider} returned an empty response`);
  }

  const parsed = schema.safeParse(extractJson(responseText));

  if (!parsed.success) {
    logger.warn(
      {
        provider,
        issues: parsed.error.issues,
      },
      'AI returned output that did not match the expected schema',
    );

    throw new Error(`${provider} returned invalid output`);
  }

  return parsed.data;
}

async function askGroq<T>(
  system: string,
  user: string,
  schema: ZodType<T, any, any>,
): Promise<T> {
  const started = Date.now();

  const completion = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content:
          `${system}\n\n` +
          'Return only valid JSON. Do not use Markdown fences. ' +
          'Follow the requested output structure exactly.',
      },
      {
        role: 'user',
        content: user,
      },
    ],
    temperature: 0.2,
    max_tokens: 1800,
    response_format: {
      type: 'json_object',
    },
  });

  const responseText =
    completion.choices[0]?.message?.content ?? '';

  const result = validateOutput(responseText, schema, 'Groq');

  logger.info(
    {
      provider: 'Groq',
      model: env.GROQ_MODEL,
      ms: Date.now() - started,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
    },
    'AI call completed',
  );

  return result;
}

async function askGemini<T>(
  system: string,
  user: string,
  schema: ZodType<T, any, any>,
): Promise<T> {
  if (!geminiClientPromise) {
    throw new Error('Gemini fallback is not configured');
  }

  const started = Date.now();
  const client = await geminiClientPromise;

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

  const result = validateOutput(
    response.text ?? '',
    schema,
    'Gemini',
  );

  logger.info(
    {
      provider: 'Gemini',
      model: env.GEMINI_MODEL,
      ms: Date.now() - started,
      promptTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    },
    'AI fallback call completed',
  );

  return result;
}

export async function askJson<T>(
  system: string,
  user: string,
  schema: ZodType<T, any, any>,
): Promise<T> {
  // First attempt: Groq
  try {
    return await askGroq(system, user, schema);
  } catch (groqError) {
    const details = getErrorDetails(groqError);

    logger.warn(
      {
        provider: 'Groq',
        model: env.GROQ_MODEL,
        status: details.status,
        message: details.message,
        isTimeout: details.isTimeout,
      },
      'Groq failed; trying Gemini fallback',
    );
  }

  // Second attempt: Gemini, only if configured
  if (geminiClientPromise) {
    try {
      return await askGemini(system, user, schema);
    } catch (geminiError) {
      const details = getErrorDetails(geminiError);

      logger.error(
        {
          provider: 'Gemini',
          model: env.GEMINI_MODEL,
          status: details.status,
          message: details.message,
          isTimeout: details.isTimeout,
        },
        'Gemini fallback also failed',
      );

      if (details.isTimeout || details.status === 408 || details.status === 504) {
        throw new AppError(
          504,
          'AI_TIMEOUT',
          'The AI took too long to respond. Please try again.',
        );
      }
    }
  }

  throw new AppError(
    502,
    'AI_PROVIDER_ERROR',
    'The AI service is temporarily unavailable. Please try again.',
  );
}