
import { extractText } from 'unpdf';
import { logger } from './logger';

/**
 * Extract readable text from a PDF buffer.
 * Only the first 10 pages are included.
 *
 * Note: This extracts embedded PDF text. Scanned PDFs that contain
 * only images require OCR, which is not implemented here.
 */
export async function extractPdfText(data: Buffer): Promise<string> {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error('The uploaded PDF buffer is empty or invalid.');
  }

  try {
    const result = await extractText(new Uint8Array(data));

    const pages = Array.isArray(result.text)
      ? result.text.slice(0, 10).join('\n')
      : String(result.text ?? '');

    const text = pages
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    logger.info(
      {
        bytes: data.length,
        totalPages: result.totalPages,
        extractedCharacters: text.length,
      },
      'PDF extraction completed',
    );

    return text;
  } catch (err: unknown) {
    logger.error(
      {
        bytes: data.length,
        error:
          err instanceof Error
            ? {
                name: err.name,
                message: err.message,
                stack: err.stack,
              }
            : String(err),
      },
      'PDF text extraction failed',
    );

    throw err;
  }
}
