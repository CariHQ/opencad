/**
 * DWG/DXF Import/Export
 * AutoCAD DWG and DXF file format support
 */

import { DocumentSchema, ElementSchema, ElementType, Point3D } from './types';
import { createProject, addElement } from './document';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

interface DXFEntity {
  type: string;
  handle: string;
  layer: string;
  coordinates: Record<string, number>;
  vertices: Array<{ x: number; y: number }>;
  textContent: string;
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
  } {
    this.entities = [];
    this.layers = {};
    this.blocks = {};

    const sections = this.findSections();
    const entitiesSection = sections['ENTITIES'];
    const blocksSection = sections['BLOCKS'];
    const tablesSection = sections['TABLES'];

    if (blocksSection) {
      this.parseBlocks(blocksSection);
    }

    if (tablesSection) {
      this.parseTables(tablesSection);
    }

    if (entitiesSection) {
      this.parseEntities(entitiesSection);
    }

    return { entities: this.entities, layers: this.layers, blocks: this.blocks };
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

  // ACI (AutoCAD Color Index) to hex — only the common named colours
  private aciToHex(aci: number): string {
    const map: Record<number, string> = {
      1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF',
      5: '#0000FF', 6: '#FF00FF', 7: '#FFFFFF', 8: '#808080', 9: '#C0C0C0',
    };
    return map[aci] ?? '#808080';
  }

  private parseTables(section: [number, number]): void {
    const [start, end] = section;
    let i = start;
    let inLayerTable = false;
    let currentLayerName = '';
    let currentLayerColor = '#808080';

    while (i < end) {
      const line = this.lines[i];

      if (line === 'LAYER' && this.lines[i - 1] === '2') {
        inLayerTable = true;
      } else if (line === 'ENDTAB') {
        // Commit the last layer before closing the table
        if (inLayerTable && currentLayerName) {
          this.layers[currentLayerName] = currentLayerColor;
          currentLayerName = '';
          currentLayerColor = '#808080';
        }
        inLayerTable = false;
      } else if (inLayerTable && line === 'LAYER' && this.lines[i - 1] === '0') {
        // Start of a new LAYER entry — commit the previous one if any
        if (currentLayerName) {
          this.layers[currentLayerName] = currentLayerColor;
        }
        currentLayerName = '';
        currentLayerColor = '#808080';
      } else if (inLayerTable) {
        const code = this.lines[i - 1];
        if (code === '2') {
          currentLayerName = line;
        } else if (code === '62') {
          currentLayerColor = this.aciToHex(parseInt(line, 10));
        }
      }

      i++;
    }

    // Commit the last layer entry
    if (inLayerTable && currentLayerName) {
      this.layers[currentLayerName] = currentLayerColor;
    }
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
          vertices: [],
          textContent: '',
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
          textContent: '',
        };

        i += 2;
        let pendingX: number | null = null;

        while (i < end - 1) {
          const code = this.lines[i];
          const value = this.lines[i + 1];

          if (!code || code === '0') {
            break;
          }

          if (code === '5') {
            entity.handle = value;
          } else if (code === '8') {
            entity.layer = value;
          } else if (code === '10') {
            if (entity.type === 'LWPOLYLINE') {
              pendingX = parseFloat(value);
            } else {
              entity.coordinates['x'] = parseFloat(value);
            }
          } else if (code === '20') {
            if (entity.type === 'LWPOLYLINE' && pendingX !== null) {
              entity.vertices.push({ x: pendingX, y: parseFloat(value) });
              pendingX = null;
            } else {
              entity.coordinates['y'] = parseFloat(value);
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
          } else if (code === '1') {
            entity.textContent = value;
          }
          i += 2;
          if (i >= end) break;
        }

        this.entities.push(entity);

        if (entity.layer && !this.layers[entity.layer]) {
          this.layers[entity.layer] = '#808080';
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

  constructor(document: DocumentSchema) {
    this.document = document;
  }

  private layerName(layerId: string): string {
    return this.document.organization.layers[layerId]?.name ?? '0';
  }

  private formatCoord(value: number): string {
    return value === 0 ? '0.0' : value.toFixed(1).replace(/\.0$/, '.0');
  }

  serialize(): string {
    const lines: string[] = [];

    lines.push(...this.generateHeader());
    lines.push(...this.serializeEntities());
    lines.push(...this.generateFooter());

    return lines.join('\n');
  }

  private generateHeader(): string[] {
    const lines: string[] = [
      '0', 'SECTION', '2', 'HEADER',
      '0', 'ENDSEC',
      '0', 'SECTION', '2', 'TABLES',
      ...this.generateLayerTable(),
      '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES',
    ];
    return lines;
  }

  private generateLayerTable(): string[] {
    const lines: string[] = ['0', 'TABLE', '2', 'LAYER'];
    for (const layer of Object.values(this.document.organization.layers)) {
      lines.push('0', 'LAYER', '2', layer.name, '70', '0');
    }
    lines.push('0', 'ENDTAB');
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

    lines.push('0', 'LINE');
    lines.push('5', `$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330', '0');
    lines.push('100', 'AcDbEntity');
    lines.push('8', this.layerName(element.layerId));
    lines.push('100', 'AcDbLine');
    lines.push('10', this.formatCoord(coords.x));
    lines.push('20', this.formatCoord(coords.y));
    lines.push('30', this.formatCoord(coords.z));

    if (points.length >= 2) {
      lines.push('11', this.formatCoord(points[1]!.x));
      lines.push('21', this.formatCoord(points[1]!.y));
      lines.push('31', this.formatCoord(points[1]!.z));
    }

    this.handleCounter++;
    return lines;
  }

  private serializeCircle(element: ElementSchema): string[] {
    const lines: string[] = [];
    const cx = (element.properties['CenterX']?.value as number) ?? element.transform.translation.x;
    const cy = (element.properties['CenterY']?.value as number) ?? element.transform.translation.y;
    const cz = element.transform.translation.z;
    const radius = (element.properties['Radius']?.value as number) || 25;

    lines.push('0', 'CIRCLE');
    lines.push('5', `$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330', '0');
    lines.push('100', 'AcDbEntity');
    lines.push('8', this.layerName(element.layerId));
    lines.push('100', 'AcDbCircle');
    lines.push('10', String(cx));
    lines.push('20', String(cy));
    lines.push('30', String(cz));
    lines.push('40', String(radius));

    this.handleCounter++;
    return lines;
  }

  private serializePolyline(element: ElementSchema): string[] {
    const lines: string[] = [];
    const points = (element as { points?: Point3D[] }).points || [];

    lines.push('0', 'LWPOLYLINE');
    lines.push('5', `$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330', '0');
    lines.push('100', 'AcDbEntity');
    lines.push('8', this.layerName(element.layerId));
    lines.push('100', 'AcDbPolyline');
    lines.push('90', String(points.length));
    lines.push('70', '0');

    for (const point of points) {
      lines.push('10', String(point.x));
      lines.push('20', String(point.y));
    }

    this.handleCounter++;
    return lines;
  }

  private serializeArc(element: ElementSchema): string[] {
    const lines: string[] = [];
    const cx = (element.properties['CenterX']?.value as number) ?? element.transform.translation.x;
    const cy = (element.properties['CenterY']?.value as number) ?? element.transform.translation.y;
    const cz = element.transform.translation.z;
    const radius = (element.properties['Radius']?.value as number) || 25;
    const startAngle = (element.properties['StartAngle']?.value as number) ?? 0;
    const endAngle = (element.properties['EndAngle']?.value as number) ?? 360;

    lines.push('0', 'ARC');
    lines.push('5', `$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330', '0');
    lines.push('100', 'AcDbEntity');
    lines.push('8', this.layerName(element.layerId));
    lines.push('100', 'AcDbArc');
    lines.push('10', String(cx));
    lines.push('20', String(cy));
    lines.push('30', String(cz));
    lines.push('40', String(radius));
    lines.push('50', String(startAngle));
    lines.push('51', String(endAngle));

    this.handleCounter++;
    return lines;
  }

  private serializeDimension(element: ElementSchema): string[] {
    return this.serializeGeneric(element);
  }

  private serializeText(element: ElementSchema): string[] {
    const lines: string[] = [];
    const x = (element.properties['X']?.value as number) ?? element.transform.translation.x;
    const y = (element.properties['Y']?.value as number) ?? element.transform.translation.y;
    const content = (element.properties['Content']?.value as string) ?? (element.properties['Text']?.value as string) ?? '';

    lines.push('0', 'TEXT');
    lines.push('5', `$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330', '0');
    lines.push('100', 'AcDbEntity');
    lines.push('8', this.layerName(element.layerId));
    lines.push('100', 'AcDbText');
    lines.push('10', String(x));
    lines.push('20', String(y));
    lines.push('30', '0.0');
    lines.push('40', '2.5');
    lines.push('1', content);

    this.handleCounter++;
    return lines;
  }

  private serializeGeneric(element: ElementSchema): string[] {
    const lines: string[] = [];
    const coords = element.transform.translation;
    const entityName = element.type.toUpperCase();

    lines.push('0', entityName);
    lines.push('5', `$${this.handleCounter.toString(16).toUpperCase()}`);
    lines.push('330', '0');
    lines.push('100', 'AcDbEntity');
    lines.push('8', this.layerName(element.layerId));
    lines.push('10', String(coords.x));
    lines.push('20', String(coords.y));
    lines.push('30', String(coords.z));

    this.handleCounter++;
    return lines;
  }

  private generateFooter(): string[] {
    return ['0', 'ENDSEC', '0', 'EOF'];
  }
}

export function parseDXF(content: string): DocumentSchema {
  const parser = new DXFParser(content);
  const { entities, layers } = parser.parse();

  const document = createProject('Imported DXF', 'dxf-import');
  document.library.blocks = {};

  for (const [layerName, layerColor] of Object.entries(layers)) {
    const layerId = crypto.randomUUID();
    document.organization.layers[layerId] = {
      id: layerId,
      name: layerName,
      color: layerColor,
      visible: true,
      locked: false,
      order: Object.keys(document.organization.layers).length,
    };
  }

  for (const entity of entities) {
    const elementType = DXF_ENTITY_MAP[entity.type] || 'annotation';

    let layerId = Object.keys(document.organization.layers).find(
      (id) => document.organization.layers[id]!.name === entity.layer
    );

    if (!layerId && entity.layer && entity.layer !== '0') {
      const newLayerId = crypto.randomUUID();
      document.organization.layers[newLayerId] = {
        id: newLayerId,
        name: entity.layer,
        color: '#808080',
        visible: true,
        locked: false,
        order: Object.keys(document.organization.layers).length,
      };
      layerId = newLayerId;
    }

    layerId = layerId || Object.keys(document.organization.layers)[0]!;
    const levelId = Object.keys(document.organization.levels)[0]!;

    if (elementType === 'line') {
      const x1 = entity.coordinates['x'] ?? 0;
      const y1 = entity.coordinates['y'] ?? 0;
      const x2 = entity.coordinates['x2'] ?? x1;
      const y2 = entity.coordinates['y2'] ?? y1;
      addElement(document, {
        type: 'line',
        points: [
          { x: x1, y: y1, z: entity.coordinates['z'] ?? 0, _type: 'Point3D' },
          { x: x2, y: y2, z: entity.coordinates['z2'] ?? 0, _type: 'Point3D' },
        ],
        properties: {
          StartX: { type: 'number', value: x1 },
          StartY: { type: 'number', value: y1 },
          EndX:   { type: 'number', value: x2 },
          EndY:   { type: 'number', value: y2 },
        },
        layerId,
        levelId,
      });
    } else if (elementType === 'circle') {
      const cx = entity.coordinates['x'] ?? 0;
      const cy = entity.coordinates['y'] ?? 0;
      addElement(document, {
        type: 'circle',
        properties: {
          CenterX: { type: 'number', value: cx },
          CenterY: { type: 'number', value: cy },
          Radius:  { type: 'number', value: entity.coordinates['radius'] ?? 25 },
        },
        transform: {
          translation: { x: cx, y: cy, z: entity.coordinates['z'] ?? 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        layerId,
        levelId,
      });
    } else if (elementType === 'polyline') {
      const pts = entity.vertices.length > 0 ? entity.vertices : [
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
      ];
      addElement(document, {
        type: 'polyline',
        properties: {
          Points: { type: 'string', value: JSON.stringify(pts) },
        },
        points: pts.map((p) => ({ x: p.x, y: p.y, z: 0, _type: 'Point3D' as const })),
        layerId,
        levelId,
      });
    } else if (elementType === 'arc') {
      const cx = entity.coordinates['x'] ?? 0;
      const cy = entity.coordinates['y'] ?? 0;
      addElement(document, {
        type: 'arc',
        properties: {
          CenterX:    { type: 'number', value: cx },
          CenterY:    { type: 'number', value: cy },
          Radius:     { type: 'number', value: entity.coordinates['radius'] ?? 25 },
          StartAngle: { type: 'number', value: entity.coordinates['startAngle'] ?? 0 },
          EndAngle:   { type: 'number', value: entity.coordinates['endAngle'] ?? 360 },
        },
        transform: {
          translation: { x: cx, y: cy, z: entity.coordinates['z'] ?? 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        layerId,
        levelId,
      });
    } else if (elementType === 'text') {
      addElement(document, {
        type: 'text',
        properties: {
          X:       { type: 'number', value: entity.coordinates['x'] ?? 0 },
          Y:       { type: 'number', value: entity.coordinates['y'] ?? 0 },
          Content: { type: 'string', value: entity.textContent },
        },
        layerId,
        levelId,
      });
    } else if (elementType === 'surface') {
      addElement(document, {
        type: 'surface',
        layerId,
        levelId,
        transform: {
          translation: { x: entity.coordinates['x'] ?? 0, y: entity.coordinates['y'] ?? 0, z: entity.coordinates['z'] ?? 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      });
    } else {
      addElement(document, {
        type: elementType as ElementType,
        layerId,
        levelId,
        transform: {
          translation: { x: entity.coordinates['x'] ?? 0, y: entity.coordinates['y'] ?? 0, z: entity.coordinates['z'] ?? 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      });
    }
  }

  return document;
}

export function serializeDXF(document: DocumentSchema): string {
  const serializer = new DXFSerializer(document);
  return serializer.serialize();
}

export function exportDXF(document: DocumentSchema): string {
  return serializeDXF(document);
}

export function importDXF(content: string): Result<DocumentSchema, string> {
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
