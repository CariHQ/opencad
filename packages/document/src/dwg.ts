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

/** AutoCAD Color Index (ACI) to hex colour. Full 256-entry palette. */
const ACI_COLORS: Record<number, string> = {
  1: '#FF0000', // red
  2: '#FFFF00', // yellow
  3: '#00FF00', // green
  4: '#00FFFF', // cyan
  5: '#0000FF', // blue
  6: '#FF00FF', // magenta
  7: '#FFFFFF', // white / black-on-white
  8: '#808080', // grey
  9: '#C0C0C0', // light grey
  // 10-249 are algorithmic — computed below.
  250: '#333333',
  251: '#505050',
  252: '#696969',
  253: '#828282',
  254: '#BEBEBE',
  255: '#FFFFFF',
};

// Populate the algorithmic 10-249 range with a plausible palette so round-trip
// to a hex colour is stable. Exact AutoCAD palette values are public but we
// keep a compact approximation here — the reverse lookup on export uses
// nearest-match so round-tripping known base colours stays exact.
(() => {
  for (let i = 10; i <= 249; i++) {
    if (ACI_COLORS[i]) continue;
    const hue = ((i - 10) / 240) * 360;
    const { r, g, b } = hslToRgb(hue, 0.8, 0.5);
    ACI_COLORS[i] = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
})();

function toHex(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0').toUpperCase();
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh < 1) { r = c; g = x; }
  else if (hh < 2) { r = x; g = c; }
  else if (hh < 3) { g = c; b = x; }
  else if (hh < 4) { g = x; b = c; }
  else if (hh < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function aciToHex(aci: number): string {
  return ACI_COLORS[aci] ?? '#808080';
}

/** Reverse lookup — nearest ACI code for a hex colour, for export. */
function hexToAci(hex: string): number {
  const target = hex.replace('#', '').toLowerCase();
  const rr = parseInt(target.slice(0, 2), 16);
  const gg = parseInt(target.slice(2, 4), 16);
  const bb = parseInt(target.slice(4, 6), 16);
  let bestAci = 7;
  let bestDist = Infinity;
  for (const [aciStr, h] of Object.entries(ACI_COLORS)) {
    const hx = h.replace('#', '');
    const r = parseInt(hx.slice(0, 2), 16);
    const g = parseInt(hx.slice(2, 4), 16);
    const b = parseInt(hx.slice(4, 6), 16);
    const d = (r - rr) ** 2 + (g - gg) ** 2 + (b - bb) ** 2;
    if (d < bestDist) { bestDist = d; bestAci = parseInt(aciStr, 10); }
  }
  return bestAci;
}

const DXF_ENTITY_MAP: Record<string, ElementType> = {
  LINE: 'line',
  CIRCLE: 'circle',
  ARC: 'arc',
  POLYLINE: 'polyline',
  LWPOLYLINE: 'polyline',
  SPLINE: 'polyline',
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
            // LWPOLYLINE and SPLINE both repeat 10/20 pairs for each vertex /
            // control point. Route them to the vertex list.
            if (entityType === 'LWPOLYLINE' || entityType === 'SPLINE') {
              nextVertexX = v;
            } else if (entity.coordinates['x'] === undefined) {
              entity.coordinates['x'] = v;
            } else {
              // Subsequent 10 codes without a matching 20 — treat as secondary.
              entity.coordinates['x_extra'] = v;
            }
          } else if (code === '20') {
            const v = parseFloat(value);
            if ((entityType === 'LWPOLYLINE' || entityType === 'SPLINE') && nextVertexX !== null) {
              entity.vertices!.push({ x: nextVertexX, y: v });
              nextVertexX = null;
            } else if (entity.coordinates['y'] === undefined) {
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
            // 40 means different things per entity — store by context.
            if (entityType === 'TEXT' || entityType === 'MTEXT') {
              entity.coordinates['textHeight'] = parseFloat(value);
            } else if (entityType === 'ELLIPSE') {
              entity.coordinates['ratio'] = parseFloat(value);
            } else {
              entity.coordinates['radius'] = parseFloat(value);
            }
          } else if (code === '41') {
            if (entityType === 'INSERT') entity.coordinates['scaleX'] = parseFloat(value);
            else if (entityType === 'ELLIPSE') entity.coordinates['startParam'] = parseFloat(value);
          } else if (code === '42') {
            if (entityType === 'INSERT') entity.coordinates['scaleY'] = parseFloat(value);
            else if (entityType === 'ELLIPSE') entity.coordinates['endParam'] = parseFloat(value);
          } else if (code === '43') {
            if (entityType === 'INSERT') entity.coordinates['scaleZ'] = parseFloat(value);
          } else if (code === '50') {
            if (entityType === 'INSERT' || entityType === 'TEXT' || entityType === 'MTEXT') {
              entity.coordinates['rotation'] = parseFloat(value);
            } else {
              entity.coordinates['startAngle'] = parseFloat(value);
            }
          } else if (code === '51') {
            entity.coordinates['endAngle'] = parseFloat(value);
          } else if (code === '71') {
            if (entityType === 'SPLINE') entity.coordinates['degree'] = parseInt(value, 10);
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
    } else if (elementType === 'ellipse') {
      const mx = (entity.coordinates.x2 ?? 0) * scale;
      const my = (entity.coordinates.y2 ?? 0) * scale;
      const majorLen = Math.sqrt(mx * mx + my * my);
      const ratio = entity.coordinates.ratio ?? 1;
      addElement(document, {
        type: 'ellipse',
        properties: {
          CenterX: { type: 'number', value: sx },
          CenterY: { type: 'number', value: sy },
          RadiusX: { type: 'number', value: majorLen },
          RadiusY: { type: 'number', value: majorLen * ratio },
          Rotation: { type: 'number', value: Math.atan2(my, mx) },
        },
        layerId,
        levelId,
        transform: { translation: { x: sx, y: sy, z: sz }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      });
    } else if (elementType === 'text') {
      addElement(document, {
        type: 'text',
        properties: {
          Content:  { type: 'string', value: entity.textContent || '' },
          X:        { type: 'number', value: sx },
          Y:        { type: 'number', value: sy },
          FontSize: { type: 'number', value: (entity.coordinates.textHeight ?? 2.5) * scale },
          Rotation: { type: 'number', value: entity.coordinates.rotation ?? 0 },
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
          Rotation:  { type: 'number', value: entity.coordinates.rotation ?? 0 },
          ScaleX:    { type: 'number', value: entity.coordinates.scaleX ?? 1 },
          ScaleY:    { type: 'number', value: entity.coordinates.scaleY ?? 1 },
          ScaleZ:    { type: 'number', value: entity.coordinates.scaleZ ?? 1 },
        },
        layerId,
        levelId,
        transform: {
          translation: { x: sx, y: sy, z: sz },
          rotation: { x: 0, y: 0, z: (entity.coordinates.rotation ?? 0) * Math.PI / 180 },
          scale: {
            x: entity.coordinates.scaleX ?? 1,
            y: entity.coordinates.scaleY ?? 1,
            z: entity.coordinates.scaleZ ?? 1,
          },
        },
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
    const aci = String(hexToAci(layer.color));
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
      const height = (element.properties['FontSize']?.value as number) ?? 2.5;
      const rotation = (element.properties['Rotation']?.value as number) ?? 0;
      lines.push(
        '0', 'TEXT', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbText',
        '10', String(x), '20', String(y), '30', String(t.z),
        '40', String(height),
        '1', content,
        '50', String(rotation),
      );
    } else if (element.type === 'ellipse') {
      const cx = (element.properties['CenterX']?.value as number) ?? t.x;
      const cy = (element.properties['CenterY']?.value as number) ?? t.y;
      const rx = (element.properties['RadiusX']?.value as number) ?? 25;
      const ry = (element.properties['RadiusY']?.value as number) ?? 25;
      const rot = (element.properties['Rotation']?.value as number) ?? 0;
      const mx = Math.cos(rot) * rx;
      const my = Math.sin(rot) * rx;
      const ratio = rx > 0 ? ry / rx : 1;
      lines.push(
        '0', 'ELLIPSE', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbEllipse',
        '10', String(cx), '20', String(cy), '30', String(t.z),
        '11', String(mx), '21', String(my), '31', '0',
        '40', String(ratio),
        '41', '0', '42', String(2 * Math.PI),
      );
    } else if (element.type === 'block_ref') {
      const blockName = String(element.properties['BlockName']?.value ?? '');
      const rot = (element.properties['Rotation']?.value as number) ?? 0;
      const sx = (element.properties['ScaleX']?.value as number) ?? 1;
      const sy = (element.properties['ScaleY']?.value as number) ?? 1;
      const sz = (element.properties['ScaleZ']?.value as number) ?? 1;
      lines.push(
        '0', 'INSERT', '5', h, '330', '0',
        '100', 'AcDbEntity', '8', layerName,
        '100', 'AcDbBlockReference',
        '2', blockName,
        '10', String(t.x), '20', String(t.y), '30', String(t.z),
        '41', String(sx), '42', String(sy), '43', String(sz),
        '50', String(rot),
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
