/**
 * Revit RVT Import
 * Autodesk Revit RVT file format support
 */

import { DocumentSchema, ElementType } from './types';
import { createProject } from './document';

const REVIT_CATEGORY_MAP: Record<string, ElementType> = {
  Walls: 'wall',
  Doors: 'door',
  Windows: 'window',
  Columns: 'column',
  Beams: 'beam',
  Floors: 'slab',
  Roofs: 'roof',
  Stairs: 'stair',
  Railings: 'railing',
  Spaces: 'space',
  Areas: 'space',
};

interface RevitElement {
  id: string;
  category: string;
  family?: string;
  type?: string;
  parameters: Record<string, string | number>;
  phase?: string;
  status?: string;
}

interface RevitLevel {
  id: string;
  name: string;
  elevation: number;
}

interface RevitFamily {
  id: string;
  name: string;
  category: string;
}

interface RevitPhase {
  id: string;
  name: string;
}

class RevitParser {
  private content: string;

  constructor(content: string) {
    this.content = content;
  }

  parse(): {
    elements: RevitElement[];
    levels: RevitLevel[];
    families: RevitFamily[];
    phases: RevitPhase[];
  } {
    const elements: RevitElement[] = [];
    const levels: RevitLevel[] = [];
    const families: RevitFamily[] = [];
    const phases: RevitPhase[] = [];

    const elementRegex = /<Element\s+([^>]+)>/g;
    let match;

    while ((match = elementRegex.exec(this.content)) !== null) {
      const attrs = match[1];
      const id = this.extractAttribute(attrs, 'Id') || crypto.randomUUID();
      const category = this.extractAttribute(attrs, 'Category') || 'Generic';
      const family = this.extractAttribute(attrs, 'Family');
      const type = this.extractAttribute(attrs, 'Type');
      const phase = this.extractAttribute(attrs, 'Phase');
      const status = this.extractAttribute(attrs, 'Status');

      const parameters: Record<string, string | number> = {};
      const knownParams = ['Width', 'Height', 'Length', 'Area', 'Volume'];
      for (const param of knownParams) {
        const value = this.extractAttribute(attrs, param);
        if (value) {
          parameters[param] = parseFloat(value) || value;
        }
      }

      elements.push({
        id,
        category,
        family,
        type,
        parameters,
        phase,
        status,
      });
    }

    const levelRegex = /<Level\s+([^>]+)>/g;
    while ((match = levelRegex.exec(this.content)) !== null) {
      const attrs = match[1];
      const id = this.extractAttribute(attrs, 'Id') || crypto.randomUUID();
      const name = this.extractAttribute(attrs, 'Name') || 'Untitled';
      const elevation = parseFloat(this.extractAttribute(attrs, 'Elevation') || '0');

      levels.push({ id, name, elevation });
    }

    const familyRegex = /<Family\s+([^>]+)>/g;
    while ((match = familyRegex.exec(this.content)) !== null) {
      const attrs = match[1];
      const id = this.extractAttribute(attrs, 'Id') || crypto.randomUUID();
      const name = this.extractAttribute(attrs, 'Name') || 'Untitled';
      const category = this.extractAttribute(attrs, 'Category') || 'Generic';

      families.push({ id, name, category });
    }

    const phaseRegex = /<Phase\s+([^>]+)>/g;
    while ((match = phaseRegex.exec(this.content)) !== null) {
      const attrs = match[1];
      const id = this.extractAttribute(attrs, 'Id') || crypto.randomUUID();
      const name = this.extractAttribute(attrs, 'Name') || 'Untitled';

      phases.push({ id, name });
    }

    return { elements, levels, families, phases };
  }

  private extractAttribute(attrs: string, name: string): string | undefined {
    const regex = new RegExp(`${name}="([^"]*)"`);
    const match = attrs.match(regex);
    return match ? match[1] : undefined;
  }
}

export function parseRVT(content: string): DocumentSchema {
  const parser = new RevitParser(content);
  const { elements, levels, families, phases } = parser.parse();

  const document = createProject('Imported Revit', 'revit-import');

  document.organization.levels = {};
  for (const level of levels) {
    document.organization.levels[level.id] = {
      id: level.id,
      name: level.name,
      elevation: level.elevation,
      height: 3000,
      order: Object.keys(document.organization.levels).length,
    };
  }

  document.library.families = {};
  for (const family of families) {
    document.library.families[family.id] = {
      id: family.id,
      name: family.name,
      category: family.category,
      properties: {},
    };
  }

  document.organization.phases = {};
  for (const phase of phases) {
    document.organization.phases[phase.id] = {
      id: phase.id,
      name: phase.name,
      status: 'incomplete',
    };
  }

  const layerIds = Object.keys(document.organization.layers);
  const defaultLayerId = layerIds[0] || crypto.randomUUID();

  for (const elem of elements) {
    const elementType = REVIT_CATEGORY_MAP[elem.category] || 'annotation';
    const layerId = layerIds[0] || defaultLayerId;
    const levelId = levels[0]?.id || Object.keys(document.organization.levels)[0] || '';

    const elementId = crypto.randomUUID();
    document.content.elements[elementId] = {
      id: elementId,
      type: elementType,
      properties: {
        Name: { type: 'string', value: elem.family || elem.category },
        Family: { type: 'string', value: elem.family || '' },
        Type: { type: 'string', value: elem.type || '' },
        ...elem.parameters,
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId,
      levelId,
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
        createdBy: 'revit-import',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };
  }

  const errorElements = elements.filter((e) => e.status === 'Error');

  (document.metadata as { importReport?: { elements: number; warnings: number } }).importReport = {
    elements: elements.length,
    warnings: errorElements.length,
  };

  return document;
}

// ── Binary format detection ────────────────────────────────────────────────────

/** Returns true if the buffer starts with the RVT magic bytes: 44 4F C8 F4
 *  (OLE/CFBF compound document header used by Revit .rvt). */
export function detectFormat(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new Uint8Array(buffer);
  // Full CFBF signature is D0 CF 11 E0 A1 B1 1A E1; Revit files are CFBF
  // containers so check either the legacy "DOC-rvt" tag or the CFBF magic.
  const cfbf = view[0] === 0xd0 && view[1] === 0xcf && view[2] === 0x11 && view[3] === 0xe0;
  const rvt  = view[0] === 0x44 && view[1] === 0x4f && view[2] === 0xc8 && view[3] === 0xf4;
  return cfbf || rvt;
}

interface RVTMeta {
  version: string;
  productName: string;
  locale: string;
  buildNumber: string;
}

/** Pull the BasicFileInfo ASCII metadata out of a CFBF .rvt buffer.
 *  The stream stores a small UTF-16LE blob containing "Build:", "Version:"
 *  etc. in the first ~8 KB after the header. */
function scrapeRVTMetadata(buffer: ArrayBuffer): RVTMeta {
  const slice = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 64 * 1024)));
  // Decode UTF-16LE the dumb way — RVT metadata is short and ASCII-only.
  let text = '';
  for (let i = 0; i + 1 < slice.length; i += 2) {
    const lo = slice[i]!;
    const hi = slice[i + 1]!;
    if (hi === 0 && lo >= 0x20 && lo <= 0x7e) text += String.fromCharCode(lo);
    else if (hi === 0) text += ' '; // control chars become spaces
  }

  const pickFirst = (re: RegExp): string => {
    const m = re.exec(text);
    return m ? m[1]!.trim() : '';
  };
  return {
    version:     pickFirst(/Version:\s*([\d.]+)/i) || pickFirst(/Revit\s+([\d]{4})/),
    productName: pickFirst(/Product:\s*([^\r\n]{1,80})/i) || 'Autodesk Revit',
    locale:      pickFirst(/Locale:\s*([A-Za-z_-]{2,20})/i),
    buildNumber: pickFirst(/Build:\s*([^\r\n\s]{1,40})/i),
  };
}

/** Binary RVT import — hardened.
 *
 *  Real Revit geometry lives in undocumented binary streams inside the
 *  CFBF container (RevitPreview4.0, PartAtom, etc.) that require Autodesk's
 *  Revit SDK to read. Rather than fake a synthetic wall, surface the
 *  metadata we CAN read (version, product, build, locale) and return an
 *  empty-but-labelled DocumentSchema. The canonical interop path is IFC.
 */
export function importFile(
  buffer: ArrayBuffer,
  projectId: string,
): { schema: DocumentSchema; warnings: string[] } {
  const warnings: string[] = [];
  const schema = createProject(projectId, 'revit-import');

  if (!detectFormat(buffer)) {
    warnings.push('File does not look like a Revit .rvt (CFBF) container. No elements imported.');
    return { schema, warnings };
  }

  const meta = scrapeRVTMetadata(buffer);
  (schema.metadata as unknown as { source?: Record<string, string> }).source = {
    format: 'rvt',
    product: meta.productName,
    version: meta.version || 'unknown',
    build: meta.buildNumber,
    locale: meta.locale,
  };
  warnings.push(
    'Revit binary geometry is not decoded — metadata only. ' +
    'Export RVT → IFC from Revit and re-import via IFC for full fidelity.',
  );
  return { schema, warnings };
}
