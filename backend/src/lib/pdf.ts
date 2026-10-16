/** Extracts plain text from a PDF buffer using pdf.js (first 10 pages). */
export async function extractPdfText(data: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  });
  const doc = await task.promise;

  let out = '';
  try {
    const pages = Math.min(doc.numPages, 10);
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let line = '';
      let lastY: number | null = null;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5] as number;
        if (lastY !== null && Math.abs(y - lastY) > 2) line += '\n';
        line += item.str + ' ';
        lastY = y;
      }
      out += line + '\n';
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return out;
}
