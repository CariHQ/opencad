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
