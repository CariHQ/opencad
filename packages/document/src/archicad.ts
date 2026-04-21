/**
 * ArchiCAD PLN/PLA Import
 * Graphisoft ArchiCAD file format support
 */

import { DocumentSchema, ElementType } from './types';
import { createProject } from './document';

const AC_CATEGORY_MAP: Record<string, ElementType> = {
  Wall: 'wall',
  Column: 'column',
  Beam: 'beam',
  Door: 'door',
  Window: 'window',
  Slab: 'slab',
  Roof: 'roof',
  Stair: 'stair',
  Railing: 'railing',
};

export interface PLAObject {
  name: string;
  category: string;
  parameters: Record<string, string | number>;
}

export function parsePLN(content: string): DocumentSchema {
  const parser = new PLNParser(content);
  const { name, elements, layers, drawings } = parser.parse();

  const doc = createProject(name, 'archicad-import');
  doc.name = name;
  doc.content.elements = {};
  doc.organization.layers = {};
  doc.presentation.views = {};

  for (const layer of layers) {
    doc.organization.layers[layer.id] = {
      id: layer.id,
      name: layer.name,
      color: '#808080',
      visible: layer.visible,
      locked: false,
      order: Object.keys(doc.organization.layers).length,
    };
  }

  for (const elem of elements) {
    const elementType = AC_CATEGORY_MAP[elem.type] || 'annotation';
    const elementId = elem.id;

    doc.content.elements[elementId] = {
      id: elementId,
      type: elementType,
      properties: {
        Name: { type: 'string', value: elem.type },
        Type: { type: 'string', value: elem.type },
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: layers[0]?.id || Object.keys(doc.organization.layers)[0] || '',
      levelId: '',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 0, y: 0, z: 0, _type: 'Point3D' },
      },
      metadata: {
        id: elementId,
        createdBy: 'archicad-import',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };
  }

  let _viewIdx = 0;
  for (const drawing of drawings) {
    doc.presentation.views[drawing.id] = {
      id: drawing.id,
      name: drawing.name,
      type: '2d',
      camera: {
        position: { x: 0, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 },
        fov: 60,
        near: 0.1,
        far: 1000,
      },
    };
    _viewIdx++;
  }

  const errorElements = elements.filter((e) => e.status === 'Error');
  (doc.metadata as { importReport?: { elements: number; warnings: number } }).importReport = {
    elements: elements.length,
    warnings: errorElements.length,
  };

  return doc;
}

export function parsePLA(content: string): { objects: PLAObject[] } {
  const objects: PLAObject[] = [];

  const objectRegex = /<Object\s+([^>]+)>/g;
  let match;
  while ((match = objectRegex.exec(content)) !== null) {
    const attrs = match[1];
    const nameMatch = attrs.match(/Name="([^"]*)"/);
    const catMatch = attrs.match(/Category="([^"]*)"/);
    const name = nameMatch ? nameMatch[1] : 'Unnamed';
    const category = catMatch ? catMatch[1] : 'Generic';

    objects.push({ name, category, parameters: {} });
  }

  return { objects };
}

export function parseGDL(content: string): PLAObject[] {
  const objects: PLAObject[] = [];
  const lines = content.split('\n');

  let currentObject: PLAObject | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('! ') || trimmed.startsWith('!')) {
      if (currentObject) {
        objects.push(currentObject);
      }
      const name = trimmed.replace(/^!\s*/, '').replace(/^NAME\s+/, '');
      currentObject = { name, category: 'Generic', parameters: {} };
    } else if (trimmed.startsWith('NAME ')) {
      if (currentObject) {
        objects.push(currentObject);
      }
      currentObject = {
        name: trimmed.replace('NAME ', ''),
        category: 'Generic',
        parameters: {},
      };
    } else if (trimmed.startsWith('PARAM ')) {
      const parts = trimmed.replace('PARAM ', '').split(' ');
      if (currentObject && parts.length >= 2) {
        currentObject.parameters[parts[0]] = parseFloat(parts[1]) || parts[1];
      }
    }
  }

  if (currentObject) {
    objects.push(currentObject);
  }

  return objects;
}

interface PLNElement {
  id: string;
  type: string;
  status?: string;
}

interface PLNLayer {
  id: string;
  name: string;
  visible: boolean;
}

interface PLNDrawing {
  id: string;
  name: string;
  type: string;
}

class PLNParser {
  private content: string;

  constructor(content: string) {
    this.content = content;
  }

  parse(): {
    name: string;
    elements: PLNElement[];
    layers: PLNLayer[];
    drawings: PLNDrawing[];
  } {
    const name = this.extractProjectName() || 'Untitled Project';
    const elements: PLNElement[] = [];
    const layers: PLNLayer[] = [];
    const drawings: PLNDrawing[] = [];

    const elementRegex = /<(Wall|Column|Beam|Door|Window|Slab|Roof|Stair|Railing)\s+([^>]+)\/>/g;
    let match;

    while ((match = elementRegex.exec(this.content)) !== null) {
      const type = match[1];
      const attrs = match[2];
      const id = this.extractAttribute(attrs, 'Id') || crypto.randomUUID();
      const status = this.extractAttribute(attrs, 'Status');

      elements.push({ id, type, status });
    }

    const layerRegex = /<Layer\s+([^>]+)\/>/g;
    while ((match = layerRegex.exec(this.content)) !== null) {
      const attrs = match[1];
      const id = this.extractAttribute(attrs, 'Name') || crypto.randomUUID();
      const name = this.extractAttribute(attrs, 'Name') || 'Layer';
      const visible = this.extractAttribute(attrs, 'Visible') !== 'False';

      layers.push({ id, name, visible });
    }

    const drawingRegex = /<Drawing\s+([^>]+)\/>/g;
    while ((match = drawingRegex.exec(this.content)) !== null) {
      const attrs = match[1];
      const id = this.extractAttribute(attrs, 'Name') || crypto.randomUUID();
      const name = this.extractAttribute(attrs, 'Name') || 'Drawing';
      const type = this.extractAttribute(attrs, 'Type') || 'Plan';

      drawings.push({ id, name, type });
    }

    return { name, elements, layers, drawings };
  }

  private extractProjectName(): string | undefined {
    const nameRegex = /<Name>([^<]+)<\/Name>/;
    const match = this.content.match(nameRegex);
    return match ? match[1] : undefined;
  }

  private extractAttribute(attrs: string, name: string): string | undefined {
    const regex = new RegExp(`${name}="([^"]*)"`);
    const match = attrs.match(regex);
    return match ? match[1] : undefined;
  }
}

// ── Binary format detection ────────────────────────────────────────────────────

/** Returns true if the buffer starts with the ArchiCAD PLN magic bytes: "PLAN" */
export function detectFormat(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new Uint8Array(buffer);
  // "PLAN" = 0x50 0x4C 0x41 0x4E
  return view[0] === 0x50 && view[1] === 0x4c && view[2] === 0x41 && view[3] === 0x4e;
}

/** Returns true if the buffer looks like a ZIP container (PLN is ZIP-structured). */
function isZipContainer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const v = new Uint8Array(buffer);
  // Local file header magic: PK\x03\x04
  return v[0] === 0x50 && v[1] === 0x4b && v[2] === 0x03 && v[3] === 0x04;
}

interface PLNMetadata {
  version: string;
  projectName: string;
  generator: string;
}

/** Best-effort binary metadata scrape — no proprietary decoder required.
 *
 *  The PLN / PLA container exposes ASCII project name + generator strings
 *  in the first few KB. Pull them out with a bounded regex scan and
 *  surface them as document metadata so the import isn't entirely blind.
 */
function scrapeBinaryMetadata(buffer: ArrayBuffer): PLNMetadata {
  const slice = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 64 * 1024)));
  // Cheap latin1 decode — enough for ASCII metadata scraped from a binary.
  let text = '';
  for (let i = 0; i < slice.length; i++) text += String.fromCharCode(slice[i]!);

  const pickFirst = (re: RegExp): string => {
    const m = re.exec(text);
    return m ? m[1]!.trim() : '';
  };

  return {
    version:     pickFirst(/ArchiCAD\s+([\d.]+)/i) || pickFirst(/Archicad\s+([0-9]+)/i),
    projectName: pickFirst(/Project Name\s*[:=]\s*([^\x00\r\n]{1,120})/i),
    generator:   pickFirst(/Generator\s*[:=]\s*([^\x00\r\n]{1,120})/i) || 'Archicad',
  };
}

/** Binary import — hardened.
 *
 *  Real geometry extraction from a PLN container requires Graphisoft's
 *  internal format (GSM, GDL, encrypted project data) which isn't public
 *  without a proprietary SDK. Rather than fake geometry, this importer:
 *
 *  1. Confirms the buffer is actually PLN/PLA or ZIP-structured.
 *  2. Scrapes ASCII metadata (version / project name / generator).
 *  3. Returns an empty-but-labelled DocumentSchema so downstream UI
 *     doesn't show synthetic walls that don't exist in the source.
 *
 *  The canonical interop path remains IFC — users who need real geometry
 *  export PLN → IFC from Archicad and re-import here via parseIFC.
 */
export function importFile(
  buffer: ArrayBuffer,
  projectId: string,
): { schema: DocumentSchema; warnings: string[] } {
  const warnings: string[] = [];
  const schema = createProject(projectId, 'archicad-import');

  if (!detectFormat(buffer) && !isZipContainer(buffer)) {
    warnings.push('File does not look like an Archicad PLN/PLA container. No elements imported.');
    return { schema, warnings };
  }

  const meta = scrapeBinaryMetadata(buffer);
  if (meta.projectName) schema.name = meta.projectName;
  (schema.metadata as unknown as { source?: Record<string, string> }).source = {
    format: 'pln',
    version: meta.version || 'unknown',
    generator: meta.generator,
  };
  warnings.push(
    'Archicad PLN binary geometry is not decoded — only metadata survives. ' +
    'Export PLN → IFC from Archicad and re-import via IFC for full fidelity.',
  );
  return { schema, warnings };
}
