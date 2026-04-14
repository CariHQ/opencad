/**
 * IFC Import/Export
 * IFC file format support for Open BIM interoperability
 */

import { DocumentSchema, ElementSchema, ElementType } from './types';

interface ParsedIFCEntity {
  id: string;
  type: string;
  name: string;
  elementType: ElementType;
  attributes: Record<string, string>;
  guid?: string;
}

const IFC_ENTITY_MAP: Record<string, ElementType> = {
  IFCWALL: 'wall',
  IFCWALLSTANDARDCASE: 'wall',
  IFCDOOR: 'door',
  IFCWINDOW: 'window',
  IFCSLAB: 'slab',
  IFCROOF: 'roof',
  IFCCOLUMN: 'column',
  IFCBEAM: 'beam',
  IFCSTAIR: 'stair',
  IFCRAILING: 'railing',
  IFCSPACE: 'space',
  IFCANNOTATION: 'annotation',
};

export class IFCParser {
  private content: string;

  constructor(content: string) {
    this.content = content;
  }

  parse(): { entities: ParsedIFCEntity[]; warnings: string[] } {
    const entities: ParsedIFCEntity[] = [];
    const warnings: string[] = [];

    // Match IFC entities with their attributes - handles various IFC formats
    // Format: #id=TYPE('guid',$,'name',...);
    const entityRegex = /#(\d+)=(\w+)\s*\((?:'[^']*',\s*\$,\s*'([^']*)'|[^)]*)\)/gi;
    let match;

    while ((match = entityRegex.exec(this.content)) !== null) {
      const [, id, type] = match;
      const upperType = type.toUpperCase();

      // Extract name from the full match
      const nameMatch = match[0].match(/'([^']+)'/g);
      const name = nameMatch && nameMatch.length > 1 ? nameMatch[1].replace(/'/g, '') : upperType;

      if (IFC_ENTITY_MAP[upperType]) {
        entities.push({
          id: `#${id}`,
          type: upperType,
          name: name || upperType,
          elementType: IFC_ENTITY_MAP[upperType],
          attributes: {},
        });
      }
    }

    return { entities, warnings };
  }
}

export class IFCSerializer {
  private document: DocumentSchema;
  private lineNumber: number = 1;

  constructor(document: DocumentSchema) {
    this.document = document;
  }

  serialize(): string {
    const lines: string[] = [];

    lines.push(...this.generateHeader());
    lines.push('DATA;');

    const elements = Object.values(this.document.elements);
    const levels = Object.values(this.document.levels);

    levels.forEach((level) => {
      lines.push(...this.serializeLevel(level.id));
    });

    elements.forEach((element) => {
      lines.push(...this.serializeElement(element));
    });

    lines.push('ENDSEC;');
    lines.push('END-ISO-10303-21;');

    return lines.join('\n');
  }

  private generateHeader(): string[] {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];

    return [
      'ISO-10303-21;',
      'HEADER;',
      'FILE_DESCRIPTION(($ . $), $ . $);',
      `FILE_NAME('${this.document.name}.ifc','${timestamp}',('$'),('$'),('$'),'$','$','$');`,
      'FILE_SCHEMA(($ . $));',
      'ENDSEC;',
    ];
  }

  private serializeLevel(id: string): string[] {
    const level = this.document.levels[id];
    if (!level) return [];

    const lineNum = this.lineNumber++;
    return [`#${lineNum}=IFCBUILDINGSTOREY('${id}',$,'${level.name}',$,$,#${lineNum + 1},$);`];
  }

  private serializeElement(element: ElementSchema): string[] {
    const lineNum = this.lineNumber++;
    const ifcType = getIFCType(element.type);
    const name = (element.properties.Name?.value as string) || 'Unnamed';

    return [`#${lineNum}=${ifcType}('${element.id}',$,'${name}',$,$,$,$,$,$);`];
  }
}

function getIFCType(elementType: ElementType): string {
  const map: Record<ElementType, string> = {
    wall: 'IFCWALLSTANDARDCASE',
    door: 'IFCDOOR',
    window: 'IFCWINDOW',
    slab: 'IFCSLAB',
    roof: 'IFCROOF',
    column: 'IFCCOLUMN',
    beam: 'IFCBEAM',
    stair: 'IFCSTAIR',
    railing: 'IFCRAILING',
    space: 'IFCSPACE',
    annotation: 'IFCANNOTATION',
    dimension: 'IFCANNOTATION',
    grid: 'IFCANNOTATION',
    line: 'IFCANNOTATION',
    circle: 'IFCANNOTATION',
    arc: 'IFCANNOTATION',
    polyline: 'IFCANNOTATION',
    surface: 'IFCANNOTATION',
    solid: 'IFCSOLID',
    point: 'IFCANNOTATION',
    text: 'IFCTEXT',
    block_ref: 'IFCBLOCK',
    ellipse: 'IFCANNOTATION',
    component: 'IFCGROUP',
    group: 'IFCGROUP',
  };

  return map[elementType] || 'IFCANNOTATION';
}

export function parseIFC(content: string): DocumentSchema {
  const parser = new IFCParser(content);
  const { entities } = parser.parse();

  const defaultLayerId = crypto.randomUUID();
  const defaultLevelId = crypto.randomUUID();
  const now = Date.now();

  const document: DocumentSchema = {
    id: crypto.randomUUID(),
    name: 'Imported IFC',
    version: { clock: {} },
    elements: {},
    layers: {
      [defaultLayerId]: {
        id: defaultLayerId,
        name: 'Layer 1',
        color: '#808080',
        visible: true,
        locked: false,
        order: 0,
      },
    },
    levels: {
      [defaultLevelId]: {
        id: defaultLevelId,
        name: 'Level 1',
        elevation: 0,
        height: 3000,
        order: 0,
      },
    },
    views: {},
    materials: {},
    spaces: {},
    annotations: {},
    metadata: {
      createdAt: now,
      updatedAt: now,
      createdBy: 'ifc-import',
      schemaVersion: '1.0.0',
    },
  };

  entities.forEach((entity) => {
    const elementId = crypto.randomUUID();
    document.elements[elementId] = {
      id: elementId,
      type: entity.elementType,
      properties: {
        Name: { type: 'string', value: entity.name },
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: defaultLayerId,
      levelId: defaultLevelId,
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
        createdBy: 'ifc-import',
        createdAt: now,
        updatedAt: now,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };
  });

  return document;
}

export function serializeIFC(document: DocumentSchema): string {
  const serializer = new IFCSerializer(document);
  return serializer.serialize();
}
