/**
 * PDF Import/Export
 * Portable Document Format support
 */

import { DocumentSchema } from './types';
import { createProject } from './document';

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
  doc.elements = {};
  doc.annotations = {};
  doc.views = {};

  for (const p of pages) {
    doc.views[p.id] = {
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
    doc.annotations[annotId] = {
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

  const pages = Object.values(doc.views);

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
