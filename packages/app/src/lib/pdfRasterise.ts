/**
 * Rasterise the first page of a PDF file to a data URL using pdfjs-dist.
 *
 * Kept in its own module so the ~1.5 MB pdfjs payload can be code-split
 * and only loaded when the user actually opens a PDF for tracing.
 */

export interface RasterisedPage {
  dataUrl: string;
  width: number;
  height: number;
  pageCount: number;
}

export async function rasterisePDFPage(
  file: File,
  pageIndex = 0,
  targetWidth = 2000,
): Promise<RasterisedPage> {
  // Dynamic import so pdfjs-dist only hits the network on demand.
  const pdfjs = await import('pdfjs-dist');
  // Worker is required; point at the bundled ESM worker entry. Vite will
  // resolve the `?url` suffix to a fingerprinted asset URL at build time.
  try {
    const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
      (workerUrl as unknown as { default: string }).default;
  } catch {
    // Worker URL unavailable in tests / SSR — pdfjs falls back to main-thread parsing.
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await doc.getPage(pageIndex + 1); // pdfjs pages are 1-indexed
  const viewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / viewport.width;
  const scaled = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(scaled.width);
  canvas.height = Math.ceil(scaled.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    pageCount: doc.numPages,
  };
}
