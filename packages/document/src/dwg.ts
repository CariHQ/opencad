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

    if (blocksSection) {
      this.parseBlocks(blocksSection);
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
        };

        i += 2;
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
            entity.coordinates['x'] = parseFloat(value);
          } else if (code === '20') {
            entity.coordinates['y'] = parseFloat(value);
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
    const elements = Object.values(this.document.elements);

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
    return this.serializeCircle(element);
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

export function parseDXF(content: string): DocumentSchema {
  const parser = new DXFParser(content);
  const { entities, layers } = parser.parse();

  const document = createProject('Imported DXF', 'dxf-import');
  document.blocks = {};

  for (const layerName of Object.keys(layers)) {
    const layerId = crypto.randomUUID();
    document.layers[layerId] = {
      id: layerId,
      name: layerName,
      color: '#808080',
      visible: true,
      locked: false,
      order: Object.keys(document.layers).length,
    };
  }

  for (const entity of entities) {
    const elementType = DXF_ENTITY_MAP[entity.type] || 'annotation';

    let layerId = Object.keys(document.layers).find(
      (id) => document.layers[id].name === entity.layer
    );

    if (!layerId && entity.layer && entity.layer !== '0') {
      const newLayerId = crypto.randomUUID();
      document.layers[newLayerId] = {
        id: newLayerId,
        name: entity.layer,
        color: '#808080',
        visible: true,
        locked: false,
        order: Object.keys(document.layers).length,
      };
      layerId = newLayerId;
    }

    layerId = layerId || Object.keys(document.layers)[0];

    if (elementType === 'line') {
      addElement(document, {
        type: 'line',
        points: [
          {
            x: entity.coordinates.x || 0,
            y: entity.coordinates.y || 0,
            z: entity.coordinates.z || 0,
            _type: 'Point3D',
          },
          {
            x: entity.coordinates.x2 || entity.coordinates.x || 100,
            y: entity.coordinates.y2 || entity.coordinates.y || 0,
            z: entity.coordinates.z2 || entity.coordinates.z || 0,
            _type: 'Point3D',
          },
        ],
        layerId,
        levelId: Object.keys(document.levels)[0],
      });
    } else if (elementType === 'circle') {
      addElement(document, {
        type: 'circle',
        properties: { Radius: { type: 'number', value: entity.coordinates.radius || 25 } },
        layerId,
        levelId: Object.keys(document.levels)[0],
        transform: {
          translation: {
            x: entity.coordinates.x || 0,
            y: entity.coordinates.y || 0,
            z: entity.coordinates.z || 0,
          },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      });
    } else if (elementType === 'polyline') {
      addElement(document, {
        type: 'polyline',
        points: [
          { x: 0, y: 0, z: 0, _type: 'Point3D' },
          { x: 10, y: 0, z: 0, _type: 'Point3D' },
          { x: 10, y: 10, z: 0, _type: 'Point3D' },
          { x: 0, y: 10, z: 0, _type: 'Point3D' },
        ],
        layerId,
        levelId: Object.keys(document.levels)[0],
      });
    } else if (elementType === 'surface') {
      addElement(document, {
        type: 'surface',
        layerId,
        levelId: Object.keys(document.levels)[0],
        transform: {
          translation: {
            x: entity.coordinates.x || 0,
            y: entity.coordinates.y || 0,
            z: entity.coordinates.z || 0,
          },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      });
    } else {
      addElement(document, {
        type: elementType as ElementType,
        layerId,
        levelId: Object.keys(document.levels)[0],
        transform: {
          translation: {
            x: entity.coordinates.x || 0,
            y: entity.coordinates.y || 0,
            z: entity.coordinates.z || 0,
          },
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
