/**
 * DWG/DXF Import/Export
 * AutoCAD DWG and DXF file format support
 */

import { DocumentSchema, ElementSchema, ElementType, Point3D } from './types';
import { createProject, addElement } from './document';

interface DXFEntity {
  type: string;
  handle: string;
  layer: string;
  coordinates: Record<string, number>;
  textContent?: string;
  blockName?: string;
  vertices?: Array<{ x: number; y: number }>;
}

/** Low-level DXF entity returned by parseDxf — group codes as raw string values. */
export interface DxfEntity {
  type: string;
  handle: string;
  properties: Record<string, string>;
  /** Vertices collected from repeating 10/20 code pairs (LWPOLYLINE/POLYLINE). */
  vertices?: Array<{ x: number; y: number }>;
}

/** AutoCAD Color Index (ACI) to hex colour. Only the 7 standard colours are listed. */
const ACI_COLORS: Record<number, string> = {
  1: '#FF0000',
  2: '#FFFF00',
  3: '#00FF00',
  4: '#00FFFF',
  5: '#0000FF',
  6: '#FF00FF',
  7: '#FFFFFF',
};

function aciToHex(aci: number): string {
  return ACI_COLORS[aci] ?? '#808080';
}

const DXF_ENTITY_MAP: Record<string, ElementType> = {
  LINE: 'line',
  CIRCLE: 'circle',
  ARC: 'arc',
  POLYLINE: 'polyline',
  LWPOLYLINE: 'polyline',
  ELLIPSE: 'ellipse',
  POINT: 'point',
  TEXT: 'text',
  MTEXT: 'text',
  DIMENSION: 'dimension',
  '3DFACE': 'surface',
  '3DSOLID': 'solid',
  MESH: 'surface',
  INSERT: 'block_ref',
  HATCH: 'slab',
};

class DXFParser {
  private lines: string[];
  private entities: DXFEntity[] = [];
  private layers: Record<string, string> = {};
  private blocks: Record<string, DXFEntity> = {};

  constructor(content: string) {
    this.lines = content.split('\n').map((l) => l.trim());
  }

  parse(): {
    entities: DXFEntity[];
    layers: Record<string, string>;
    blocks: Record<string, DXFEntity>;
    layerTable: Record<string, { name: string; aci: number }>;
  } {
    this.entities = [];
    this.layers = {};
    this.blocks = {};

    const sections = this.findSections();
    const entitiesSection = sections['ENTITIES'];
    const blocksSection = sections['BLOCKS'];
    const tablesSection = sections['TABLES'];

    const layerTable: Record<string, { name: string; aci: number }> = {};
    if (tablesSection) {
      const parsed = this.parseLayerTableSection(tablesSection);
      for (const entry of parsed) {
        layerTable[entry.name] = entry;
      }
    }

    if (blocksSection) {
      this.parseBlocks(blocksSection);
    }

    if (entitiesSection) {
      this.parseEntities(entitiesSection);
    }

    return { entities: this.entities, layers: this.layers, blocks: this.blocks, layerTable };
  }

  /** Extract LAYER entries from the TABLES section, returning name + ACI color. */
  private parseLayerTableSection(section: [number, number]): Array<{ name: string; aci: number }> {
    const [start, end] = section;
    const result: Array<{ name: string; aci: number }> = [];
    let i = start;
    let inLayerTable = false;

    while (i < end) {
      const code = this.lines[i];
      const value = this.lines[i + 1] ?? '';

      if (code === '0' && value === 'TABLE') {
        // check if it's the LAYER table
        if (i + 3 < end && this.lines[i + 2] === '2' && this.lines[i + 3] === 'LAYER') {
          inLayerTable = true;
        }
        i += 2;
        continue;
      }

      if (code === '0' && value === 'ENDTAB') {
        inLayerTable = false;
        i += 2;
        continue;
      }

      if (inLayerTable && code === '0' && value === 'LAYER') {
        // parse one LAYER record
        i += 2;
        let name = '';
        let aci = 7;
        while (i < end) {
          const c = this.lines[i];
          const v = this.lines[i + 1] ?? '';
          if (c === '0') break; // next entity/record
          if (c === '2') name = v;
          if (c === '62') aci = parseInt(v, 10);
          i += 2;
        }
        if (name) result.push({ name, aci });
        continue;
      }

      i += 2;
    }

    return result;
  }

  private findSections(): Record<string, [number, number]> {
    const sections: Record<string, [number, number]> = {};
    let currentSection: string | null = null;
    let startLine = 0;

    for (let i = 0; i < this.lines.length; i++) {
      if (this.lines[i] === 'SECTION') {
        currentSection = null;
        startLine = i;
      } else if (currentSection === null && this.lines[i] === '2' && i + 1 < this.lines.length) {
        currentSection = this.lines[i + 1];
        startLine = i;
      } else if (this.lines[i] === 'ENDSEC' && currentSection) {
        sections[currentSection] = [startLine, i];
        currentSection = null;
      }
    }

    return sections;
  }

  private parseBlocks(section: [number, number]): void {
    const [start, end] = section;
    let i = start;

    while (i < end) {
      if (this.lines[i] === 'BLOCK') {
        const entity: DXFEntity = {
          type: 'BLOCK',
          handle: '',
          layer: '0',
          coordinates: {},
        };

        i += 2;
        while (i < end && this.lines[i] !== 'ENDBLK') {
          const code = this.lines[i];
          const value = this.lines[i + 1];

          if (code === '2') {
            entity.handle = value;
          } else if (code === '8') {
            entity.layer = value;
          } else if (code === '10') {
            entity.coordinates['x'] = parseFloat(value);
          } else if (code === '20') {
            entity.coordinates['y'] = parseFloat(value);
          } else if (code === '30') {
            entity.coordinates['z'] = parseFloat(value);
          }
          i += 2;
        }

        this.blocks[entity.handle] = entity;
      }
      i++;
    }
  }

  private parseEntities(section: [number, number]): void {
    const [start, end] = section;
    let i = start;

    while (i < end - 1) {
      if (
        this.lines[i] === '0' &&
        i + 1 < end &&
        this.lines[i + 1] &&
        DXF_ENTITY_MAP[this.lines[i + 1]]
      ) {
        const entityType = this.lines[i + 1];
        const entity: DXFEntity = {
          type: entityType,
          handle: '',
          layer: '0',
          coordinates: {},
          vertices: [],
        };

        i += 2;
        let nextVertexX: number | null = null;
        while (i < end - 1) {
          const code = this.lines[i];
          const value = this.lines[i + 1];

          if (!code || code === '0') break;

          if (code === '5') {
            entity.handle = value;
          } else if (code === '8') {
            entity.layer = value;
          } else if (code === '2' && entityType === 'INSERT') {
            entity.blockName = value;
          } else if (code === '1') {
            entity.textContent = value;
          } else if (code === '10') {
            const v = parseFloat(value);
            if (entityType === 'LWPOLYLINE') {
              nextVertexX = v;
            } else {
              entity.coordinates['x'] = v;
            }
          } else if (code === '20') {
            const v = parseFloat(value);
            if (entityType === 'LWPOLYLINE' && nextVertexX !== null) {
              entity.vertices!.push({ x: nextVertexX, y: v });
              nextVertexX = null;
            } else {
              entity.coordinates['y'] = v;
            }
          } else if (code === '30') {
            entity.coordinates['z'] = parseFloat(value);
          } else if (code === '11') {
            entity.coordinates['x2'] = parseFloat(value);
          } else if (code === '21') {
            entity.coordinates['y2'] = parseFloat(value);
          } else if (code === '31') {
            entity.coordinates['z2'] = parseFloat(value);
          } else if (code === '40') {
            entity.coordinates['radius'] = parseFloat(value);
          } else if (code === '50') {
            entity.coordinates['startAngle'] = parseFloat(value);
          } else if (code === '51') {
            entity.coordinates['endAngle'] = parseFloat(value);
          } else if (code === '90') {
            entity.coordinates['vertexCount'] = parseInt(value);
          }
          i += 2;
          if (i >= end) break;
        }

        this.entities.push(entity);

        if (entity.layer && !this.layers[entity.layer]) {
          this.layers[entity.layer] = entity.layer;
        }
      } else {
        i++;
      }
    }
  }
}

class DXFSerializer {
  private document: DocumentSchema;
  private handleCounter: number = 1;

  private formatCoord(value: number): string {
    return value === 0 ? '0.0' : value.toFixed(1).replace(/\.0$/, '.0');
  }

  constructor(document: DocumentSchema) {
    this.document = document;
  }

  serialize(): string {
    const lines: string[] = [];

    lines.push(...this.generateHeader());
    lines.push(...this.serializeEntities());
    lines.push(...this.generateFooter());

    return lines.join('\n');
  }

  private generateHeader(): string[] {
    const lines: string[] = ['0', 'SECTION', '2', 'ENTITIES'];
    return lines;
  }

  private serializeEntities(): string[] {
    const lines: string[] = [];
    const elements = Object.values(this.document.content.elements);

    for (const element of elements) {
      if (element.type === 'line') {
        lines.push(...this.serializeLine(element));
      } else if (element.type === 'circle') {
        lines.push(...this.serializeCircle(element));
      } else if (element.type === 'polyline') {
        lines.push(...this.serializePolyline(element));
      } else if (element.type === 'arc') {
        lines.push(...this.serializeArc(element));
      } else if (element.type === 'dimension') {
        lines.push(...this.serializeDimension(element));
      } else if (element.type === 'text') {
        lines.push(...this.serializeText(element));
      } else {
        lines.push(...this.serializeGeneric(element));
      }
    }

    return lines;
  }

  private serializeLine(element: ElementSchema): string[] {
    const lines: string[] = [];
    const coords = element.transform.translation;
    const points = (element as { points?: Point3D[] }).points || [];

    lines.push('0');
    lines.push('LINE');
    lines.push('5');
    lines.push(`$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330');
    lines.push('0');
    lines.push('100');
    lines.push('AcDbEntity');
    lines.push('8');
    lines.push(element.layerId || '0');
    lines.push('100');
    lines.push('AcDbLine');
    lines.push('10');
    lines.push(this.formatCoord(coords.x));
    lines.push('20');
    lines.push(this.formatCoord(coords.y));
    lines.push('30');
    lines.push(this.formatCoord(coords.z));

    if (points.length >= 2) {
      lines.push('11');
      lines.push(this.formatCoord(points[1].x));
      lines.push('21');
      lines.push(this.formatCoord(points[1].y));
      lines.push('31');
      lines.push(this.formatCoord(points[1].z));
    }

    this.handleCounter++;
    return lines;
  }

  private serializeCircle(element: ElementSchema): string[] {
    const lines: string[] = [];
    const coords = element.transform.translation;
    const radius = (element.properties.Radius?.value as number) || 25;

    lines.push('0');
    lines.push('CIRCLE');
    lines.push('5');
    lines.push(`$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330');
    lines.push('0');
    lines.push('100');
    lines.push('AcDbEntity');
    lines.push('8');
    lines.push(element.layerId || '0');
    lines.push('100');
    lines.push('AcDbCircle');
    lines.push('10');
    lines.push(String(coords.x));
    lines.push('20');
    lines.push(String(coords.y));
    lines.push('30');
    lines.push(String(coords.z));
    lines.push('40');
    lines.push(String(radius));

    this.handleCounter++;
    return lines;
  }

  private serializePolyline(element: ElementSchema): string[] {
    const lines: string[] = [];
    const points = (element as { points?: Point3D[] }).points || [];

    lines.push('0');
    lines.push('LWPOLYLINE');
    lines.push('5');
    lines.push(`$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330');
    lines.push('0');
    lines.push('100');
    lines.push('AcDbEntity');
    lines.push('8');
    lines.push(element.layerId || '0');
    lines.push('100');
    lines.push('AcDbPolyline');
    lines.push('90');
    lines.push(String(points.length));
    lines.push('70');
    lines.push('0');

    for (const point of points) {
      lines.push('10');
      lines.push(String(point.x));
      lines.push('20');
      lines.push(String(point.y));
    }

    this.handleCounter++;
    return lines;
  }

  private serializeArc(element: ElementSchema): string[] {
    const lines: string[] = [];
    const cx = (element.properties.CenterX?.value as number) ?? element.transform.translation.x;
    const cy = (element.properties.CenterY?.value as number) ?? element.transform.translation.y;
    const cz = element.transform.translation.z;
    const radius = (element.properties.Radius?.value as number) || 25;
    const startAngle = (element.properties.StartAngle?.value as number) ?? 0;
    const endAngle = (element.properties.EndAngle?.value as number) ?? 360;

    lines.push('0', 'ARC',
      '5', `$${this.handleCounter.toString(16).toUpperCase()}`,
      '330', '0',
      '100', 'AcDbEntity',
      '8', element.layerId || '0',
      '100', 'AcDbCircle',
      '10', String(cx), '20', String(cy), '30', String(cz),
      '40', String(radius),
      '100', 'AcDbArc',
      '50', String(startAngle),
      '51', String(endAngle),
    );
    this.handleCounter++;
    return lines;
  }

  private serializeDimension(element: ElementSchema): string[] {
    return this.serializeGeneric(element);
  }

  private serializeText(element: ElementSchema): string[] {
    return this.serializeGeneric(element);
  }

  private serializeGeneric(element: ElementSchema): string[] {
    const lines: string[] = [];
    const coords = element.transform.translation;
    const name = (element.properties.Name?.value as string) || element.type;

    lines.push('0');
    lines.push(name.toUpperCase());
    lines.push('5');
    lines.push(`$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330');
    lines.push('0');
    lines.push('100');
    lines.push('AcDbEntity');
    lines.push('8');
    lines.push(element.layerId || '0');
    lines.push('10');
    lines.push(String(coords.x));
    lines.push('20');
    lines.push(String(coords.y));
    lines.push('30');
    lines.push(String(coords.z));

    this.handleCounter++;
    return lines;
  }

  private generateFooter(): string[] {
    return ['0', 'ENDSEC', '0', 'EOF'];
  }
}

/** Read $INSUNITS from the DXF HEADER section and return mm conversion factor. */
function readUnitScale(content: string): number {
  const match = /\$INSUNITS\s*\n\s*70\s*\n\s*(\d+)/i.exec(content);
  if (!match) return 1;
  const code = parseInt(match[1], 10);
  // Common $INSUNITS values:  1=inches  4=mm(default)  5=cm  6=meters
  switch (code) {
    case 1: return 25.4;   // inches → mm
    case 2: return 304.8;  // feet → mm
    case 4: return 1;      // mm (default)
    case 5: return 10;     // cm → mm
    case 6: return 1000;   // meters → mm
    default: return 1;
  }
}

function findOrCreateLayer(document: DocumentSchema, layerName: string, color?: string): string {
  const existing = Object.keys(document.organization.layers).find(
    (id) => document.organization.layers[id]!.name === layerName
  );
  if (existing) {
    if (color) document.organization.layers[existing]!.color = color;
    return existing;
  }
  const newId = crypto.randomUUID();
  document.organization.layers[newId] = {
    id: newId,
    name: layerName,
    color: color ?? '#808080',
    visible: true,
    locked: false,
    order: Object.keys(document.organization.layers).length,
  };
  return newId;
}

export function parseDXF(content: string): DocumentSchema {
  const scale = readUnitScale(content);
  const parser = new DXFParser(content);
  const { entities, layers, layerTable } = parser.parse();

  const document = createProject('Imported DXF', 'dxf-import');
  document.library.blocks = {};

  // Create layers from the TABLES/LAYER section first (with ACI color)
  for (const entry of Object.values(layerTable)) {
    findOrCreateLayer(document, entry.name, aciToHex(entry.aci));
  }

  // Also ensure any layers referenced by entities exist
  for (const layerName of Object.keys(layers)) {
    findOrCreateLayer(document, layerName);
  }

  const levelId = Object.keys(document.organization.levels)[0]!;

  for (const entity of entities) {
    const elementType = DXF_ENTITY_MAP[entity.type] || 'annotation';
    const layerId = findOrCreateLayer(document, entity.layer || '0');

    const sx = (entity.coordinates.x || 0) * scale;
    const sy = (entity.coordinates.y || 0) * scale;
    const sz = (entity.coordinates.z || 0) * scale;

    if (elementType === 'line') {
      const ex = (entity.coordinates.x2 ?? entity.coordinates.x ?? 0) * scale;
      const ey = (entity.coordinates.y2 ?? entity.coordinates.y ?? 0) * scale;
      const ez = (entity.coordinates.z2 ?? entity.coordinates.z ?? 0) * scale;
      addElement(document, {
        type: 'line',
        properties: {
          StartX: { type: 'number', value: sx },
          StartY: { type: 'number', value: sy },
          EndX:   { type: 'number', value: ex },
          EndY:   { type: 'number', value: ey },
        },
        points: [
          { x: sx, y: sy, z: sz, _type: 'Point3D' },
          { x: ex, y: ey, z: ez, _type: 'Point3D' },
        ],
        layerId,
        levelId,
      });
    } else if (elementType === 'circle') {
      addElement(document, {
        type: 'circle',
        properties: {
          CenterX: { type: 'number', value: sx },
          CenterY: { type: 'number', value: sy },
          Radius:  { type: 'number', value: (entity.coordinates.radius || 25) * scale },
        },
        layerId,
        levelId,
        transform: { translation: { x: sx, y: sy, z: sz }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    } else if (elementType === 'arc') {
      addElement(document, {
        type: 'arc',
        properties: {
          CenterX:    { type: 'number', value: sx },
          CenterY:    { type: 'number', value: sy },
          Radius:     { type: 'number', value: (entity.coordinates.radius || 25) * scale },
          StartAngle: { type: 'number', value: entity.coordinates.startAngle ?? 0 },
          EndAngle:   { type: 'number', value: entity.coordinates.endAngle ?? 360 },
        },
        layerId,
        levelId,
        transform: { translation: { x: sx, y: sy, z: sz }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    } else if (elementType === 'polyline') {
      const verts = entity.vertices && entity.vertices.length > 0
        ? entity.vertices
        : [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
      addElement(document, {
        type: 'polyline',
        properties: {
          Points: { type: 'string', value: JSON.stringify(verts.map((v) => ({ x: v.x * scale, y: v.y * scale }))) },
        },
        points: verts.map((v) => ({ x: v.x * scale, y: v.y * scale, z: 0, _type: 'Point3D' as const })),
        layerId,
        levelId,
      });
    } else if (elementType === 'text') {
      addElement(document, {
        type: 'text',
        properties: {
          Content: { type: 'string', value: entity.textContent || '' },
          X: { type: 'number', value: sx },
          Y: { type: 'number', value: sy },
        },
        layerId,
        levelId,
        transform: { translation: { x: sx, y: sy, z: sz }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    } else if (elementType === 'block_ref') {
      addElement(document, {
        type: 'block_ref',
        properties: {
          BlockName: { type: 'string', value: entity.blockName || '' },
        },
        layerId,
        levelId,
        transform: { translation: { x: sx, y: sy, z: sz }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    } else {
      addElement(document, {
        type: elementType as ElementType,
        layerId,
        levelId,
        transform: { translation: { x: sx, y: sy, z: sz }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    }
  }

  return document;
}

export function serializeDXF(document: DocumentSchema): string {
  const serializer = new DXFSerializer(document);
  return serializer.serialize();
}

export function parseDWG(content: ArrayBuffer): DocumentSchema {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(content);
  return parseDXF(text);
}

export function serializeDWG(document: DocumentSchema): ArrayBuffer {
  const text = serializeDXF(document);
  const encoder = new TextEncoder();
  return encoder.encode(text).buffer;
}

// ─── Low-level DXF API ────────────────────────────────────────────────────────

/**
 * Parses a DXF string into an array of raw DxfEntity objects.
 * Each entity has its DXF group codes as string values (last value wins for
 * duplicate codes). Suitable for programmatic inspection before calling
 * dxfToDocument().
 */
export function parseDxf(content: string): DxfEntity[] {
  if (!content) return [];

  const lines = content.split('\n').map((l) => l.trim());
  const entities: DxfEntity[] = [];
  let inEntities = false;
  let i = 0;

  while (i < lines.length) {
    // Detect the ENTITIES section
    if (!inEntities) {
      if (lines[i] === '2' && i + 1 < lines.length && lines[i + 1] === 'ENTITIES') {
        inEntities = true;
      }
      i++;
      continue;
    }

    if (lines[i] === 'ENDSEC') break;

    if (lines[i] === '0' && i + 1 < lines.length) {
      const entityType = lines[i + 1];
      if (entityType === 'ENDSEC' || entityType === 'EOF' || !entityType) break;

      const isPolyline = entityType === 'LWPOLYLINE' || entityType === 'POLYLINE';
      const entity: DxfEntity = { type: entityType, handle: '', properties: {} };
      if (isPolyline) entity.vertices = [];

      i += 2;
      let pendingX: string | null = null;

      while (i < lines.length - 1) {
        const code = lines[i];
        const value = lines[i + 1];
        if (code === '0') break;
        if (code === '5') entity.handle = value;
        // For polylines, collect repeating 10/20 pairs as vertices
        if (isPolyline && code === '10') {
          pendingX = value;
        } else if (isPolyline && code === '20' && pendingX !== null) {
          entity.vertices!.push({ x: parseFloat(pendingX), y: parseFloat(value) });
          pendingX = null;
        } else {
          entity.properties[code] = value;
        }
        i += 2;
      }

      entities.push(entity);
    } else {
      i++;
    }
  }

  return entities;
}

/**
 * Converts an array of DxfEntity objects (from parseDxf) into a DocumentSchema
 * with the given projectId as document ID.
 */
export function dxfToDocument(entities: DxfEntity[], projectId: string): DocumentSchema {
  const document = createProject(projectId, 'dxf-import');
  (document as DocumentSchema).id = projectId;
  document.library.blocks = {};

  const levelId = Object.keys(document.organization.levels)[0]!;

  for (const entity of entities) {
    const elementType = DXF_ENTITY_MAP[entity.type] || 'annotation';
    const layerName = entity.properties['8'] || '0';
    const layerId = findOrCreateLayer(document, layerName);

    const x = parseFloat(entity.properties['10'] || '0');
    const y = parseFloat(entity.properties['20'] || '0');
    const z = parseFloat(entity.properties['30'] || '0');

    if (entity.type === 'LINE') {
      const x2 = parseFloat(entity.properties['11'] || String(x));
      const y2 = parseFloat(entity.properties['21'] || String(y));
      addElement(document, {
        type: 'line',
        properties: {
          StartX: { type: 'number', value: x },
          StartY: { type: 'number', value: y },
          EndX:   { type: 'number', value: x2 },
          EndY:   { type: 'number', value: y2 },
        },
        points: [
          { x, y, z, _type: 'Point3D' },
          { x: x2, y: y2, z, _type: 'Point3D' },
        ],
        layerId,
        levelId,
      });
    } else if (entity.type === 'CIRCLE') {
      addElement(document, {
        type: 'circle',
        properties: {
          CenterX: { type: 'number', value: x },
          CenterY: { type: 'number', value: y },
          Radius:  { type: 'number', value: parseFloat(entity.properties['40'] || '25') },
        },
        layerId,
        levelId,
        transform: { translation: { x, y, z }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    } else if (entity.type === 'ARC') {
      addElement(document, {
        type: 'arc',
        properties: {
          CenterX:    { type: 'number', value: x },
          CenterY:    { type: 'number', value: y },
          Radius:     { type: 'number', value: parseFloat(entity.properties['40'] || '25') },
          StartAngle: { type: 'number', value: parseFloat(entity.properties['50'] || '0') },
          EndAngle:   { type: 'number', value: parseFloat(entity.properties['51'] || '360') },
        },
        layerId,
        levelId,
        transform: { translation: { x, y, z }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
      const verts = entity.vertices && entity.vertices.length > 0
        ? entity.vertices
        : [{ x, y }];
      addElement(document, {
        type: 'polyline',
        properties: {
          Points: { type: 'string', value: JSON.stringify(verts) },
        },
        points: verts.map((v) => ({ x: v.x, y: v.y, z, _type: 'Point3D' as const })),
        layerId,
        levelId,
      });
    } else if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
      addElement(document, {
        type: 'text',
        properties: {
          Content: { type: 'string', value: entity.properties['1'] || '' },
          X: { type: 'number', value: x },
          Y: { type: 'number', value: y },
        },
        layerId,
        levelId,
        transform: { translation: { x, y, z }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    } else if (entity.type === 'INSERT') {
      addElement(document, {
        type: 'block_ref',
        properties: {
          BlockName: { type: 'string', value: entity.properties['2'] || '' },
        },
        layerId,
        levelId,
        transform: { translation: { x, y, z }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    } else {
      addElement(document, {
        type: elementType as ElementType,
        layerId,
        levelId,
        transform: { translation: { x, y, z }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    }
  }

  return document;
}

/** Serializes a DocumentSchema to a DXF string. Alias for serializeDXF. */
export function documentToDxf(document: DocumentSchema): string {
  return serializeDXF(document);
}

// ─── Result type ──────────────────────────────────────────────────────────────

export type DXFResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Parses a DXF string and returns a Result<DocumentSchema, string>.
 * Returns ok:false for empty input; ok:true with the document otherwise.
 */
export function importDXF(content: string): DXFResult<DocumentSchema> {
  if (!content || content.trim() === '') {
    return { ok: false, error: 'Empty DXF content' };
  }
  try {
    const doc = parseDXF(content);
    return { ok: true, value: doc };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ─── Full DXF export (HEADER + TABLES + ENTITIES) ────────────────────────────

/**
 * Serializes a DocumentSchema to a fully-structured DXF string with HEADER,
 * TABLES (including LAYER table), and ENTITIES sections.
 */
export function exportDXF(document: DocumentSchema): string {
  const lines: string[] = [];
  let handle = 1;
  const nextHandle = (): string => `${(handle++).toString(16).toUpperCase()}`;

  // ── HEADER section ────────────────────────────────────────────────────────
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1015');
  lines.push('9', '$INSUNITS', '70', '4'); // 4 = mm
  lines.push('0', 'ENDSEC');

  // ── TABLES section with LAYER table ──────────────────────────────────────
  const docLayers = Object.values(document.organization.layers);
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '5', nextHandle(), '70', String(docLayers.length));

  for (const layer of docLayers) {
    // Reverse hex color to ACI (default 7 = white)
    const aci = Object.entries(ACI_COLORS).find(([, hex]) => hex.toLowerCase() === layer.color.toLowerCase())?.[0] ?? '7';
    lines.push(
      '0', 'LAYER',
      '5', nextHandle(),
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbLayerTableRecord',
      '2', layer.name,
      '70', layer.visible ? '0' : '1',
      '62', String(aci),
    );
  }

  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // ── ENTITIES section ──────────────────────────────────────────────────────
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  for (const element of Object.values(document.content.elements)) {
    const layerName = document.organization.layers[element.layerId]?.name ?? '0';
    const t = element.transform?.translation ?? { x: 0, y: 0, z: 0 };
    const h = nextHandle();

    if (element.type === 'line') {
      const pts = (element as { points?: Array<{ x: number; y: number; z: number }> }).points ?? [];
      const sx = pts[0]?.x ?? t.x;
      const sy = pts[0]?.y ?? t.y;
      const sz = pts[0]?.z ?? t.z;
      const ex = pts[1]?.x ?? (element.properties['EndX']?.value as number ?? sx);
      const ey = pts[1]?.y ?? (element.properties['EndY']?.value as number ?? sy);
      const ez = pts[1]?.z ?? sz;
      lines.push(
        '0', 'LINE', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbLine',
        '10', String(sx), '20', String(sy), '30', String(sz),
        '11', String(ex), '21', String(ey), '31', String(ez),
      );
    } else if (element.type === 'circle') {
      const cx = (element.properties['CenterX']?.value as number) ?? t.x;
      const cy = (element.properties['CenterY']?.value as number) ?? t.y;
      const r  = (element.properties['Radius']?.value as number) ?? 25;
      lines.push(
        '0', 'CIRCLE', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbCircle',
        '10', String(cx), '20', String(cy), '30', String(t.z),
        '40', String(r),
      );
    } else if (element.type === 'arc') {
      const cx = (element.properties['CenterX']?.value as number) ?? t.x;
      const cy = (element.properties['CenterY']?.value as number) ?? t.y;
      const r  = (element.properties['Radius']?.value as number) ?? 25;
      const sa = (element.properties['StartAngle']?.value as number) ?? 0;
      const ea = (element.properties['EndAngle']?.value as number) ?? 360;
      lines.push(
        '0', 'ARC', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbCircle',
        '10', String(cx), '20', String(cy), '30', String(t.z),
        '40', String(r),
        '100', 'AcDbArc',
        '50', String(sa), '51', String(ea),
      );
    } else if (element.type === 'polyline') {
      const pts = (element as { points?: Array<{ x: number; y: number }> }).points ?? [];
      lines.push(
        '0', 'LWPOLYLINE', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbPolyline',
        '90', String(pts.length),
        '70', '0',
      );
      for (const pt of pts) {
        lines.push('10', String(pt.x), '20', String(pt.y));
      }
    } else if (element.type === 'text') {
      const x = (element.properties['X']?.value as number) ?? t.x;
      const y = (element.properties['Y']?.value as number) ?? t.y;
      const content = String(element.properties['Content']?.value ?? '');
      lines.push(
        '0', 'TEXT', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbText',
        '10', String(x), '20', String(y), '30', String(t.z),
        '40', '2.5',
        '1', content,
      );
    } else {
      // Generic fallback
      const name = (element.properties['Name']?.value as string) || element.type;
      lines.push(
        '0', name.toUpperCase(), '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '10', String(t.x), '20', String(t.y), '30', String(t.z),
      );
    }
  }

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\n');
}

/**
 * T-IO-003: Export a DocumentSchema to a minimal DXF string.
 *
 * Produces:
 *  - HEADER section with $ACADVER and $INSUNITS
 *  - ENTITIES section with LINE for walls, CIRCLE for columns,
 *    and appropriate entities for other element types
 */
export function exportToDXF(doc: DocumentSchema): string {
  const lines: string[] = [];
  let handle = 1;
  const nextHandle = (): string => `${(handle++).toString(16).toUpperCase()}`;

  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1015');
  lines.push('9', '$INSUNITS', '70', '4');
  lines.push('0', 'ENDSEC');

  lines.push('0', 'SECTION', '2', 'ENTITIES');

  for (const element of Object.values(doc.content.elements)) {
    const layerName = doc.organization.layers[element.layerId]?.name ?? '0';
    const t = element.transform?.translation ?? { x: 0, y: 0, z: 0 };
    const h = nextHandle();

    if (element.type === 'wall') {
      const sx = (element.properties['StartX']?.value as number) ?? t.x;
      const sy = (element.properties['StartY']?.value as number) ?? t.y;
      const ex = (element.properties['EndX']?.value as number) ?? element.boundingBox.max.x;
      const ey = (element.properties['EndY']?.value as number) ?? t.y;
      lines.push(
        '0', 'LINE', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbLine',
        '10', String(sx), '20', String(sy), '30', String(t.z),
        '11', String(ex), '21', String(ey), '31', String(t.z),
      );
    } else if (element.type === 'column') {
      const cx = (element.properties['CenterX']?.value as number) ?? t.x;
      const cy = (element.properties['CenterY']?.value as number) ?? t.y;
      const r  = (element.properties['Radius']?.value as number) ?? 100;
      lines.push(
        '0', 'CIRCLE', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbCircle',
        '10', String(cx), '20', String(cy), '30', String(t.z),
        '40', String(r),
      );
    } else if (element.type === 'line') {
      const pts = (element as { points?: Array<{ x: number; y: number; z: number }> }).points ?? [];
      const sx = pts[0]?.x ?? t.x;
      const sy = pts[0]?.y ?? t.y;
      const sz = pts[0]?.z ?? t.z;
      const ex = pts[1]?.x ?? (element.properties['EndX']?.value as number ?? sx);
      const ey = pts[1]?.y ?? (element.properties['EndY']?.value as number ?? sy);
      const ez = pts[1]?.z ?? sz;
      lines.push(
        '0', 'LINE', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbLine',
        '10', String(sx), '20', String(sy), '30', String(sz),
        '11', String(ex), '21', String(ey), '31', String(ez),
      );
    } else if (element.type === 'circle') {
      const cx = (element.properties['CenterX']?.value as number) ?? t.x;
      const cy = (element.properties['CenterY']?.value as number) ?? t.y;
      const r  = (element.properties['Radius']?.value as number) ?? 25;
      lines.push(
        '0', 'CIRCLE', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbCircle',
        '10', String(cx), '20', String(cy), '30', String(t.z),
        '40', String(r),
      );
    } else if (element.type === 'polyline') {
      const pts = (element as { points?: Array<{ x: number; y: number }> }).points ?? [];
      lines.push(
        '0', 'LWPOLYLINE', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbPolyline',
        '90', String(pts.length),
        '70', '0',
      );
      for (const pt of pts) {
        lines.push('10', String(pt.x), '20', String(pt.y));
      }
    } else {
      lines.push(
        '0', element.type.toUpperCase(), '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '10', String(t.x), '20', String(t.y), '30', String(t.z),
      );
    }
  }

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\n');
}
