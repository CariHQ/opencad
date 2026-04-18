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

// RVT magic bytes: 44 4F C8 F4 at offset 0
const RVT_MAGIC = [0x44, 0x4f, 0xc8, 0xf4];

export function detectFormat(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < RVT_MAGIC.length) return false;
  const view = new Uint8Array(buffer);
  return RVT_MAGIC.every((byte, i) => view[i] === byte);
}

export function importFile(
  _buffer: ArrayBuffer,
  projectId: string
): { schema: DocumentSchema; warnings: string[] } {
  const doc = createProject(projectId, 'revit-import');
  doc.name = 'Imported Revit';
  doc.content.elements = {};

  const elementId = crypto.randomUUID();
  const layerId = Object.keys(doc.organization.layers)[0] || crypto.randomUUID();
  const levelId = Object.keys(doc.organization.levels)[0] || '';

  doc.content.elements[elementId] = {
    id: elementId,
    type: 'annotation',
    properties: {
      Name: { type: 'string', value: 'Imported from Revit' },
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

  return {
    schema: doc,
    warnings: ['Full Revit import not yet implemented — returning stub'],
  };
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
