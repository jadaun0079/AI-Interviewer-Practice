import zlib from 'node:zlib';
import { extractText } from 'unpdf';
import { logger } from './logger';

/** Fallback extractor using zlib and stream parsing if standard parser fails */
function fallbackExtractPdf(buf: Buffer): string {
  let text = '';
  const str = buf.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(str)) !== null) {
    let content = match[1];
    try {
      const decompressed = zlib.inflateSync(Buffer.from(content, 'latin1')).toString('latin1');
      content = decompressed;
    } catch {
      // Stream is uncompressed or raw
    }

    const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(content)) !== null) {
      text += tjMatch[1] + ' ';
    }

    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tjArrMatch: RegExpExecArray | null;
    while ((tjArrMatch = tjArrayRegex.exec(content)) !== null) {
      const innerTj = /\(([\s\S]*?)\)/g;
      let innerMatch: RegExpExecArray | null;
      while ((innerMatch = innerTj.exec(tjArrMatch[1])) !== null) {
        text += innerMatch[1] + ' ';
      }
    }
    text += '\n';
  }
  return text.trim();
}

/** Extracts plain text from a PDF buffer (first 10 pages). */
export async function extractPdfText(data: Buffer): Promise<string> {
  try {
    const result = await extractText(new Uint8Array(data));
    const pages = Array.isArray(result.text) ? result.text.slice(0, 10).join('\n') : String(result.text || '');
    if (pages.trim().length > 0) {
      return pages;
    }
  } catch (err) {
    logger.warn({ err }, 'unpdf extraction failed, attempting fallback stream parsing');
  }

  // Fallback extraction
  const fallback = fallbackExtractPdf(data);
  if (fallback.length > 0) {
    return fallback;
  }

  return '';
}
