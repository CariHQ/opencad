/**
 * SketchUp SKP Import/Export
 * Trimble SketchUp file format support
 */

import { DocumentSchema, ElementType } from './types';
import { createProject } from './document';

const SKP_CATEGORY_MAP: Record<string, ElementType> = {
  Wall: 'wall',
  Column: 'column',
  Beam: 'beam',
  Door: 'door',
  Window: 'window',
  Slab: 'slab',
  Roof: 'roof',
  Stair: 'stair',
  Railing: 'railing',
  Component: 'component',
  Group: 'group',
};

interface SKPMaterial {
  name: string;
  color: string;
  opacity: number;
}

interface SKPComponent {
  name: string;
  definition: string;
  materials: string[];
}

export function parseSKP(content: string): DocumentSchema {
  const parser = new SKPParser(content);
  const { name, entities, materials, components } = parser.parse();

  const doc = createProject(name || 'Imported SketchUp', 'sketchup-import');
  doc.elements = {};
  doc.materials = {};

  for (const mat of materials) {
    const matId = crypto.randomUUID();
    const colorVal = parseInt(mat.color.slice(1, 3), 16);
    const greenVal = parseInt(mat.color.slice(3, 5), 16);
    const blueVal = parseInt(mat.color.slice(5, 7), 16);
    doc.materials[matId] = {
      id: matId,
      name: mat.name,
      category: 'Generic',
      properties: {
        color: { r: colorVal, g: greenVal, b: blueVal, a: Math.round(mat.opacity * 255) },
        roughness: 0.5,
        metalness: 0,
        transparency: mat.opacity,
      },
    };
  }

  void components;

  for (const entity of entities) {
    const elementType = SKP_CATEGORY_MAP[entity.type] || 'annotation';
    const elementId = entity.id;

    doc.elements[elementId] = {
      id: elementId,
      type: elementType,
      properties: {
        Name: { type: 'string', value: entity.name || entity.type },
        Type: { type: 'string', value: entity.type },
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: Object.keys(doc.layers)[0],
      levelId: Object.keys(doc.levels)[0] || null,
      transform: {
        translation: entity.position || { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 0, y: 0, z: 0, _type: 'Point3D' },
      },
      metadata: {
        id: elementId,
        createdBy: 'sketchup-import',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: { clock: {} },
      },
      visible: true,
      locked: entity.locked || false,
    };
  }

  const errorCount = entities.filter((e) => e.status === 'Error').length;
  (doc.metadata as { importReport?: { elements: number; warnings: number } }).importReport = {
    elements: entities.length,
    warnings: errorCount,
  };

  return doc;
}

export function serializeSKP(doc: DocumentSchema): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<SketchUp>');
  lines.push(`  <Name>${doc.name}</Name>`);

  lines.push('  <Materials>');
  for (const mat of Object.values(doc.materials)) {
    const props = mat.properties;
    const colorVal = (props as { color?: string }).color || props.color;
    const opacityVal = (props as { transparency?: number }).transparency || 1;
    lines.push(
      `    <Material Name="${mat.name}" Color="${colorVal || '#808080'}" Opacity="${opacityVal}"/>`
    );
  }
  lines.push('  </Materials>');

  lines.push('  <Entities>');
  for (const elem of Object.values(doc.elements)) {
    const type = elem.type.toUpperCase();
    lines.push(`    <Entity Type="${type}" Name="${elem.properties.Name?.value || type}"/>`);
  }
  lines.push('  </Entities>');

  lines.push('</SketchUp>');

  return lines.join('\n');
}

class SKPParser {
  private content: string;

  constructor(content: string) {
    this.content = content;
  }

  parse(): {
    name: string;
    entities: Array<{
      id: string;
      type: string;
      name?: string;
      position?: { x: number; y: number; z: number };
      locked?: boolean;
      status?: string;
    }>;
    materials: SKPMaterial[];
    components: SKPComponent[];
  } {
    const name = this.extractProjectName();
    const entities: Array<{
      id: string;
      type: string;
      name?: string;
      position?: { x: number; y: number; z: number };
      locked?: boolean;
      status?: string;
    }> = [];
    const materials: SKPMaterial[] = [];
    const components: SKPComponent[] = [];

    const entityRegex =
      /<(Wall|Column|Beam|Door|Window|Slab|Roof|Stair|Railing|Component|Group)[^>]*>/g;
    let match;

    while ((match = entityRegex.exec(this.content)) !== null) {
      const attrs = match[0].replace(/[<>]/g, '');
      const type = match[1];
      const id = this.extractAttribute(attrs, 'Id') || crypto.randomUUID();
      const name = this.extractAttribute(attrs, 'Name');
      const locked = this.extractAttribute(attrs, 'Locked') === 'True';
      const status = this.extractAttribute(attrs, 'Status');

      entities.push({ id, type, name, locked, status });
    }

    const materialRegex = /<Material\s+([^>]+)\/>/g;
    while ((match = materialRegex.exec(this.content)) !== null) {
      const attrs = match[1];
      const name = this.extractAttribute(attrs, 'Name') || 'Material';
      const color = this.extractAttribute(attrs, 'Color') || '#808080';
      const opacity = parseFloat(this.extractAttribute(attrs, 'Opacity') || '1');

      materials.push({ name, color, opacity });
    }

    const componentRegex = /<Component\s+([^>]+)\/>/g;
    while ((match = componentRegex.exec(this.content)) !== null) {
      const attrs = match[1];
      const name = this.extractAttribute(attrs, 'Name') || 'Component';
      const definition = this.extractAttribute(attrs, 'Definition') || '';
      const mats = this.extractAttribute(attrs, 'Materials') || '';

      components.push({
        name,
        definition,
        materials: mats ? mats.split(',') : [],
      });
    }

    return { name, entities, materials, components };
  }

  private extractProjectName(): string {
    const nameRegex = /<Name>([^<]+)<\/Name>/;
    const match = this.content.match(nameRegex);
    return match ? match[1] : 'Untitled SketchUp Project';
  }

  private extractAttribute(attrs: string, name: string): string | undefined {
    const regex = new RegExp(`${name}="([^"]*)"`);
    const match = attrs.match(regex);
    return match ? match[1] : undefined;
  }
}
