/**
 * PDF Import/Export
 * Portable Document Format support
 */

import { DocumentSchema } from './types';
import { createProject } from './document';

// ---------------------------------------------------------------------------
// PDF Export Options & renderDocumentToPDF
// ---------------------------------------------------------------------------

export interface PDFExportOptions {
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Tabloid';
  orientation?: 'portrait' | 'landscape';
  /** units per mm */
  scale?: number;
  title?: string;
  includeGrid?: boolean;
  includeTitleBlock?: boolean;
}

/**
 * Page dimensions in PDF points (1 pt = 1/72 inch).
 * Values are [width, height] in portrait orientation.
 */
const PAGE_SIZES: Record<NonNullable<PDFExportOptions['pageSize']>, [number, number]> = {
  A4: [595, 842],
  A3: [842, 1191],
  Letter: [612, 792],
  Tabloid: [792, 1224],
};

/**
 * Build a minimal but valid PDF 1.4 document that embeds the current
 * viewport canvas as a JPEG image (or a blank page when canvas is null).
 */
export function renderDocumentToPDF(
  doc: DocumentSchema,
  canvas: HTMLCanvasElement | null,
  options: PDFExportOptions = {}
): Blob {
  const { pageSize = 'A4', orientation = 'portrait', title } = options;

  const [pw, ph] = PAGE_SIZES[pageSize];
  const [pageW, pageH] =
    orientation === 'landscape' ? [Math.max(pw, ph), Math.min(pw, ph)] : [pw, ph];

  const docTitle = title ?? doc.name ?? 'OpenCAD Export';

  let imageBytes: Uint8Array | null = null;
  let imgW = 0;
  let imgH = 0;

  if (canvas !== null) {
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
      imageBytes = base64ToUint8Array(base64);
      imgW = canvas.width || pageW;
      imgH = canvas.height || pageH;
    } catch {
      // Canvas may be tainted — fall through to text-only PDF.
    }
  }

  const parts: string[] = [];
  const offsets: number[] = [];
  let byteOffset = 0;

  function appendPart(s: string): void {
    parts.push(s);
    byteOffset += s.length;
  }

  appendPart('%PDF-1.4\n');

  offsets[1] = byteOffset;
  appendPart('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = byteOffset;
  appendPart('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  let contentStream: string;
  let resourcesDict: string;

  if (imageBytes !== null) {
    contentStream = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im1 Do Q\n`;
    resourcesDict = '<< /XObject << /Im1 5 0 R >> >>';
  } else {
    contentStream = '';
    resourcesDict = '<< >>';
  }

  offsets[3] = byteOffset;
  appendPart(
    `3 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      `/Contents 4 0 R /Resources ${resourcesDict} >>\n` +
      `endobj\n`
  );

  offsets[4] = byteOffset;
  appendPart(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
  );

  if (imageBytes !== null) {
    offsets[5] = byteOffset;
    appendPart(
      `5 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\n` +
        `stream\n`
    );
  }

  const infoObjNum = imageBytes !== null ? 6 : 5;
  const imageEndStr = 'endstream\nendobj\n';
  offsets[infoObjNum] =
    byteOffset + (imageBytes !== null ? imageBytes.length + imageEndStr.length : 0);

  const infoStr =
    `${infoObjNum} 0 obj\n` +
    `<< /Title (${escapePdfString(docTitle)}) /Producer (OpenCAD) >>\n` +
    `endobj\n`;

  const xrefObjCount = infoObjNum + 1;

  let xrefOffset: number;
  if (imageBytes !== null) {
    xrefOffset =
      byteOffset + imageBytes.length + imageEndStr.length + infoStr.length;
  } else {
    xrefOffset = byteOffset + infoStr.length;
  }

  const xrefLines: string[] = ['xref', `0 ${xrefObjCount}`];
  xrefLines.push('0000000000 65535 f \n');
  for (let i = 1; i < xrefObjCount; i++) {
    xrefLines.push(`${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  const xrefStr = xrefLines.join('\n') + '\n';

  const trailerStr =
    `trailer\n` +
    `<< /Size ${xrefObjCount} /Root 1 0 R /Info ${infoObjNum} 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  const textBefore = parts.join('');
  const textAfterImage = infoStr + xrefStr + trailerStr;

  if (imageBytes !== null) {
    const encoder = new TextEncoder();
    const before = encoder.encode(textBefore);
    const imageEnd = encoder.encode(imageEndStr);
    const after = encoder.encode(textAfterImage);

    const total = new Uint8Array(
      before.length + imageBytes.length + imageEnd.length + after.length
    );
    let pos = 0;
    total.set(before, pos);
    pos += before.length;
    total.set(imageBytes, pos);
    pos += imageBytes.length;
    total.set(imageEnd, pos);
    pos += imageEnd.length;
    total.set(after, pos);

    return new Blob([total], { type: 'application/pdf' });
  }

  return new Blob([textBefore + textAfterImage], { type: 'application/pdf' });
}

/**
 * T-IO-004: Export a DocumentSchema to a base64 data URL of a minimal PDF.
 *
 * Generates a content stream from 2D line/wall elements in the document
 * and embeds it inside a minimal PDF 1.4 file.
 * Returns `data:application/pdf;base64,...`.
 */
export function exportToPDFDataURL(doc: DocumentSchema): string {
  const pageW = 595;
  const pageH = 842;

  const elements = Object.values(doc.content.elements);
  const streamLines: string[] = [];
  streamLines.push('q');

  for (const el of elements) {
    const t = el.transform?.translation ?? { x: 0, y: 0, z: 0 };

    if (el.type === 'line' || el.type === 'wall') {
      const sx = (el.properties['StartX']?.value as number) ?? t.x;
      const sy = (el.properties['StartY']?.value as number) ?? t.y;
      const ex = (el.properties['EndX']?.value as number) ?? (el.boundingBox?.max.x ?? sx + 100);
      const ey = (el.properties['EndY']?.value as number) ?? (el.boundingBox?.max.y ?? sy);
      const scale = 0.2;
      streamLines.push(`${(sx * scale).toFixed(3)} ${(pageH - sy * scale).toFixed(3)} m`);
      streamLines.push(`${(ex * scale).toFixed(3)} ${(pageH - ey * scale).toFixed(3)} l`);
      streamLines.push('S');
    } else if (el.type === 'circle') {
      const cx = (el.properties['CenterX']?.value as number) ?? t.x;
      const cy = (el.properties['CenterY']?.value as number) ?? t.y;
      const r  = (el.properties['Radius']?.value as number) ?? 25;
      const scale = 0.2;
      const pcx = cx * scale;
      const pcy = pageH - cy * scale;
      const pr  = r * scale;
      const k   = 0.5523 * pr;
      streamLines.push(`${(pcx - pr).toFixed(3)} ${pcy.toFixed(3)} m`);
      streamLines.push(`${(pcx - pr).toFixed(3)} ${(pcy + k).toFixed(3)} ${(pcx - k).toFixed(3)} ${(pcy + pr).toFixed(3)} ${pcx.toFixed(3)} ${(pcy + pr).toFixed(3)} c`);
      streamLines.push(`${(pcx + k).toFixed(3)} ${(pcy + pr).toFixed(3)} ${(pcx + pr).toFixed(3)} ${(pcy + k).toFixed(3)} ${(pcx + pr).toFixed(3)} ${pcy.toFixed(3)} c`);
      streamLines.push(`${(pcx + pr).toFixed(3)} ${(pcy - k).toFixed(3)} ${(pcx + k).toFixed(3)} ${(pcy - pr).toFixed(3)} ${pcx.toFixed(3)} ${(pcy - pr).toFixed(3)} c`);
      streamLines.push(`${(pcx - k).toFixed(3)} ${(pcy - pr).toFixed(3)} ${(pcx - pr).toFixed(3)} ${(pcy - k).toFixed(3)} ${(pcx - pr).toFixed(3)} ${pcy.toFixed(3)} c`);
      streamLines.push('S');
    }
  }

  streamLines.push('Q');
  const contentStream = streamLines.join('\n') + '\n';

  const parts: string[] = [];
  const offsets: number[] = [];
  let byteOffset = 0;

  function append(s: string): void {
    parts.push(s);
    byteOffset += s.length;
  }

  append('%PDF-1.4\n');
  offsets[1] = byteOffset;
  append('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  offsets[2] = byteOffset;
  append('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  offsets[3] = byteOffset;
  append(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
    `/Contents 4 0 R /Resources << >> >>\nendobj\n`,
  );
  offsets[4] = byteOffset;
  append(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);
  offsets[5] = byteOffset;
  const docTitle = doc.name || 'OpenCAD Export';
  const infoStr = `5 0 obj\n<< /Title (${_pdfEscape(docTitle)}) /Producer (OpenCAD) >>\nendobj\n`;
  append(infoStr);

  const xrefOffset = byteOffset;
  const objCount = 6;
  const xrefLines = ['xref', `0 ${objCount}`, '0000000000 65535 f \n'];
  for (let i = 1; i < objCount; i++) {
    xrefLines.push(`${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  const xrefStr = xrefLines.join('\n') + '\n';
  const trailerStr =
    `trailer\n<< /Size ${objCount} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const pdfStr = parts.join('') + xrefStr + trailerStr;

  let base64: string;
  if (typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(pdfStr);
    let binaryStr = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryStr += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binaryStr);
  } else {
    base64 = Buffer.from(pdfStr, 'utf-8').toString('base64');
  }

  return `data:application/pdf;base64,${base64}`;
}

function _pdfEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  // Node.js fallback
  return Buffer.from(base64, 'base64');
}

function escapePdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// ---------------------------------------------------------------------------
// Multi-page sheet-set export (PRD §7.3.1)
// ---------------------------------------------------------------------------

export interface SheetPage {
  /** Display name for the sheet (e.g. "A-101 Floor Plan"). */
  title: string;
  /** Optional page size override; defaults to A3 landscape for sheets. */
  pageSize?: NonNullable<PDFExportOptions['pageSize']>;
  orientation?: NonNullable<PDFExportOptions['orientation']>;
  /** Pre-rendered canvas for this sheet. Null pages render blank. */
  canvas: HTMLCanvasElement | null;
}

/**
 * Render a multi-page PDF from an ordered list of sheet pages. Each page
 * embeds its own JPEG-encoded canvas and is labelled via a PDF /Title-style
 * page-level /UserUnit attribute is skipped in favour of explicit title
 * objects on the page so PDF viewers that surface page labels show the
 * sheet number. Pages are concatenated into a single PDF object graph.
 */
export function renderSheetSetToPDF(
  doc: DocumentSchema,
  sheets: readonly SheetPage[],
  options: Pick<PDFExportOptions, 'title'> = {},
): Blob {
  if (sheets.length === 0) {
    // Delegate to the single-page renderer for an empty-canvas blank page.
    return renderDocumentToPDF(doc, null, { title: options.title ?? doc.name });
  }

  type Page = {
    pageW: number;
    pageH: number;
    imageBytes: Uint8Array | null;
    imgW: number;
    imgH: number;
    label: string;
  };

  const pages: Page[] = sheets.map((s) => {
    const pageSize = s.pageSize ?? 'A3';
    const orientation = s.orientation ?? 'landscape';
    const [rw, rh] = PAGE_SIZES[pageSize];
    const [pageW, pageH] = orientation === 'landscape'
      ? [Math.max(rw, rh), Math.min(rw, rh)]
      : [rw, rh];

    let imageBytes: Uint8Array | null = null;
    let imgW = 0, imgH = 0;
    if (s.canvas) {
      try {
        const dataUrl = s.canvas.toDataURL('image/jpeg', 0.88);
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
        imageBytes = base64ToUint8Array(base64);
        imgW = s.canvas.width || pageW;
        imgH = s.canvas.height || pageH;
      } catch { /* canvas tainted — blank page */ }
    }
    return { pageW, pageH, imageBytes, imgW, imgH, label: s.title };
  });

  // ── Object layout ─────────────────────────────────────────────────────────
  // 1 /Catalog   → /Pages 2 0 R
  // 2 /Pages     → /Kids [...] /Count N
  // For each page i (0-based):
  //   pageObj   = 3 + 3*i         (Page)
  //   contents  = 3 + 3*i + 1     (content stream)
  //   image     = 3 + 3*i + 2     (only when canvas present)
  // Info object  = last slot
  //
  // To keep indexing simple we always allocate 3 slots per page even when no
  // image — the unused slot is filled with an empty placeholder object.

  const N = pages.length;
  const objsPerPage = 3;
  const firstPageObj = 3;
  const infoObjNum = firstPageObj + objsPerPage * N;
  const xrefObjCount = infoObjNum + 1;

  const parts: (string | Uint8Array)[] = [];
  const offsets: number[] = new Array(xrefObjCount);
  let byteOffset = 0;

  const encoder = new TextEncoder();
  const push = (chunk: string | Uint8Array): void => {
    parts.push(chunk);
    byteOffset += typeof chunk === 'string' ? chunk.length : chunk.byteLength;
  };

  push('%PDF-1.4\n');

  // 1 — Catalog
  offsets[1] = byteOffset;
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2 — Pages
  offsets[2] = byteOffset;
  const kidRefs = pages.map((_p, i) => `${firstPageObj + objsPerPage * i} 0 R`).join(' ');
  push(`2 0 obj\n<< /Type /Pages /Kids [${kidRefs}] /Count ${N} >>\nendobj\n`);

  // Pages — three objects each
  for (let i = 0; i < N; i++) {
    const p = pages[i]!;
    const pageObjNum = firstPageObj + objsPerPage * i;
    const contentsObjNum = pageObjNum + 1;
    const imageObjNum = pageObjNum + 2;

    const contentStream = p.imageBytes
      ? `q ${p.pageW} 0 0 ${p.pageH} 0 0 cm /Im${i} Do Q\n`
      : '';
    const resources = p.imageBytes
      ? `<< /XObject << /Im${i} ${imageObjNum} 0 R >> >>`
      : '<< >>';

    offsets[pageObjNum] = byteOffset;
    push(
      `${pageObjNum} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.pageW} ${p.pageH}] ` +
      `/Contents ${contentsObjNum} 0 R /Resources ${resources} >>\nendobj\n`,
    );

    offsets[contentsObjNum] = byteOffset;
    push(`${contentsObjNum} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

    offsets[imageObjNum] = byteOffset;
    if (p.imageBytes) {
      push(
        `${imageObjNum} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${p.imgW} /Height ${p.imgH} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.imageBytes.length} >>\n` +
        `stream\n`,
      );
      push(p.imageBytes);
      push('endstream\nendobj\n');
    } else {
      // Empty placeholder — keeps indexing stable.
      push(`${imageObjNum} 0 obj\n<< >>\nendobj\n`);
    }
  }

  // Info object
  const docTitle = options.title ?? doc.name ?? 'OpenCAD Sheet Set';
  offsets[infoObjNum] = byteOffset;
  push(`${infoObjNum} 0 obj\n<< /Title (${escapePdfString(docTitle)}) /Producer (OpenCAD) >>\nendobj\n`);

  // xref + trailer
  const xrefOffset = byteOffset;
  const xrefLines = ['xref', `0 ${xrefObjCount}`, '0000000000 65535 f \n'];
  for (let i = 1; i < xrefObjCount; i++) {
    xrefLines.push(`${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  push(xrefLines.join('\n') + '\n');
  push(`trailer\n<< /Size ${xrefObjCount} /Root 1 0 R /Info ${infoObjNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  // Concatenate to one Blob — merge everything into a single Uint8Array
  // with ArrayBuffer backing (Blob constructor is picky about SAB-typed
  // TypedArrays in strict lib.dom.d.ts).
  let totalLen = 0;
  const encoded: Uint8Array[] = parts.map((p) => {
    const u8 = typeof p === 'string' ? encoder.encode(p) : p;
    totalLen += u8.byteLength;
    return u8;
  });
  const merged = new Uint8Array(totalLen);
  let pos = 0;
  for (const u8 of encoded) { merged.set(u8, pos); pos += u8.byteLength; }
  return new Blob([merged], { type: 'application/pdf' });
}

// ---------------------------------------------------------------------------
// PDF Import (existing functionality)
// ---------------------------------------------------------------------------

export interface PDFPage {
  id: string;
  number: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PDFAnnotation {
  id: string;
  pageId: string;
  type: 'text' | 'link' | 'highlight' | 'underline';
  content: string;
  rectangle: { x: number; y: number; width: number; height: number };
}

export function parsePDF(content: string): DocumentSchema {
  const parser = new PDFParser(content);
  const { pages, annotations, metadata } = parser.parse();

  const doc = createProject(metadata.title || 'Imported PDF', 'pdf-import');
  doc.content.elements = {};
  doc.presentation.annotations = {};
  doc.presentation.views = {};

  for (const p of pages) {
    doc.presentation.views[p.id] = {
      id: p.id,
      name: `Page ${p.number}`,
      type: '2d',
      camera: {
        position: { x: 0, y: 0, z: 1000 },
        target: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        fov: 60,
        near: 1,
        far: 10000,
      },
    };
  }

  for (const annot of annotations) {
    const annotId = crypto.randomUUID();
    doc.presentation.annotations[annotId] = {
      type: annot.type as 'text',
      content: annot.content,
      position: { x: annot.rectangle.x, y: annot.rectangle.y, z: 0, _type: 'Point3D' },
    };
  }

  (doc.metadata as { importReport?: { elements: number; warnings: number } }).importReport = {
    elements: pages.length,
    warnings: 0,
  };

  return doc;
}

export function serializePDF(doc: DocumentSchema): string {
  const lines: string[] = [];

  lines.push('%PDF-1.4');
  lines.push(`%Title ${doc.name}`);

  const pages = Object.values(doc.presentation.views);

  let objectNum = 1;
  lines.push(`${objectNum} 0 obj`);
  lines.push('<< /Type /Catalog /Pages 2 0 R >>');
  lines.push('endobj');
  objectNum++;

  for (const _p of pages) {
    lines.push(`${objectNum} 0 obj`);
    lines.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>`);
    lines.push('endobj');
    objectNum++;
  }

  lines.push('xref');
  lines.push(`0 ${objectNum}`);
  lines.push('0000000000 65535 f ');
  for (let i = 1; i < objectNum; i++) {
    lines.push(`${String(i * 1000000000).padStart(10, '0')} 00000 n `);
  }

  lines.push('trailer');
  lines.push(`<< /Size ${objectNum} /Root 1 0 R >>`);
  lines.push('startxref');
  lines.push(`${(objectNum + 1) * 40}`);
  lines.push('%%EOF');

  return lines.join('\n');
}

interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
}

class PDFParser {
  private content: string;

  constructor(content: string) {
    this.content = content;
  }

  parse(): {
    pages: PDFPage[];
    annotations: PDFAnnotation[];
    metadata: PDFMetadata;
  } {
    const pages: PDFPage[] = [];
    const annotations: PDFAnnotation[] = [];
    const metadata: PDFMetadata = {};

    const pageRegex = /\/Type\s*\/Page[^]*?(?=\/Type|\s*endobj)/g;
    let match;
    let pageNum = 1;

    while ((match = pageRegex.exec(this.content)) !== null) {
      const pageContent = match[0];
      const id = crypto.randomUUID();

      let width = 612;
      let height = 792;

      const mediaBoxMatch = pageContent.match(
        /\/MediaBox\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/
      );
      if (mediaBoxMatch) {
        width = parseInt(mediaBoxMatch[3]) - parseInt(mediaBoxMatch[1]);
        height = parseInt(mediaBoxMatch[4]) - parseInt(mediaBoxMatch[2]);
      }

      pages.push({ id, number: pageNum++, width, height, rotation: 0 });
    }

    if (pages.length === 0) {
      pages.push({
        id: crypto.randomUUID(),
        number: 1,
        width: 612,
        height: 792,
        rotation: 0,
      });
    }

    const annotRegex =
      /\/Type\s*\/Annot[^]*?\/Subtype\s*\/(Text|Link|Highlight|Underline)[^]*?(?=\/Type|\s*endobj)/g;
    while ((match = annotRegex.exec(this.content)) !== null) {
      const annotContent = match[0];
      const annotType = match[1].toLowerCase() as 'text' | 'link' | 'highlight' | 'underline';
      const pageId = pages[0]?.id || crypto.randomUUID();

      let content = '';
      const rectMatch = annotContent.match(
        /\/Rect\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/
      );
      const rect = rectMatch
        ? {
            x: parseFloat(rectMatch[1]),
            y: parseFloat(rectMatch[2]),
            width: parseFloat(rectMatch[3]) - parseFloat(rectMatch[1]),
            height: parseFloat(rectMatch[4]) - parseFloat(rectMatch[2]),
          }
        : { x: 0, y: 0, width: 0, height: 0 };

      const contentMatch = annotContent.match(/\/Contents\s*\(([^)]+)\)/);
      if (contentMatch) {
        content = contentMatch[1];
      }

      annotations.push({
        id: crypto.randomUUID(),
        pageId,
        type: annotType,
        content,
        rectangle: rect,
      });
    }

    const infoRegex = /\/Title\s*\(([^)]+)\)/;
    const titleMatch = this.content.match(infoRegex);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }

    return { pages, annotations, metadata };
  }
}
