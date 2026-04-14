/**
 * IFC Import/Export
 * IFC file format support for Open BIM interoperability
 * Supports IFC 2x3 and IFC 4
 */

import { DocumentSchema, ElementSchema, ElementType } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedIFCEntity {
  id: string;
  type: string;
  name: string;
  elementType: ElementType;
  attributes: Record<string, string>;
  guid?: string;
  storeyRef?: string;
  rawLine?: string;
}

export interface ParsedGeometryEntity {
  id: string;
  type: 'NURBS' | 'CSG' | 'EXTRUSION' | 'OTHER';
  operation?: string;
  controlPoints?: Array<{ x: number; y: number; z: number }>;
  degree?: number;
  operandRefs?: string[];
}

export interface IFCParseResult {
  schema: string;
  entities: ParsedIFCEntity[];
  geometryEntities: ParsedGeometryEntity[];
  warnings: string[];
}

export interface IFCPropertySet {
  id: string;
  name: string;
  properties: Record<string, string | number | boolean>;
  relatedObjectRefs: string[];
}

export interface SerializeOptions {
  schema?: 'IFC2X3' | 'IFC4';
}

// ─── Entity type mappings ─────────────────────────────────────────────────────

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

// ─── IFCParser (2x3 and base) ─────────────────────────────────────────────────

export class IFCParser {
  protected content: string;

  constructor(content: string) {
    this.content = content;
  }

  parse(): IFCParseResult {
    const schema = this._extractSchema();
    const entities = this._parseEntities();
    const geometryEntities = this._parseGeometryEntities();
    return { schema, entities, geometryEntities, warnings: [] };
  }

  protected _extractSchema(): string {
    const m = this.content.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'\s*\)\s*\)/i);
    return m ? m[1].toUpperCase() : 'IFC2X3';
  }

  protected _parseEntities(): ParsedIFCEntity[] {
    const entities: ParsedIFCEntity[] = [];
    // Match: #id=TYPE(...)
    const entityRegex = /#(\d+)\s*=\s*([A-Z]+)\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/gi;
    let match;

    while ((match = entityRegex.exec(this.content)) !== null) {
      const [fullMatch, id, type] = match;
      const upperType = type.toUpperCase();

      if (!IFC_ENTITY_MAP[upperType]) continue;

      const args = match[3];

      // First argument is typically GUID in quotes
      const guidMatch = args.match(/^'([^']+)'/);
      const guid = guidMatch ? guidMatch[1] : undefined;

      // Third non-$ argument is typically the name
      const nameMatch = fullMatch.match(/'[^']*',\s*\$,\s*'([^']+)'/);
      const name = nameMatch ? nameMatch[1] : upperType;

      // Find storey reference — last #ref in arg list
      const storeyRefMatch = args.match(/,\s*(#\d+)\s*,/g);
      const storeyRef = storeyRefMatch
        ? storeyRefMatch[storeyRefMatch.length - 1].replace(/[,\s]/g, '')
        : undefined;

      entities.push({
        id: `#${id}`,
        type: upperType,
        name,
        elementType: IFC_ENTITY_MAP[upperType],
        attributes: {},
        guid,
        storeyRef,
        rawLine: fullMatch,
      });
    }

    return entities;
  }

  protected _parseGeometryEntities(): ParsedGeometryEntity[] {
    return [];
  }
}

// ─── IFC4Parser ──────────────────────────────────────────────────────────────

export class IFC4Parser extends IFCParser {
  constructor(content: string) {
    super(content);
  }

  parse(): IFCParseResult {
    const schema = this._extractSchema();
    const entities = this._parseEntities();
    const geometryEntities = this._parseGeometryEntities();
    return { schema, entities, geometryEntities, warnings: [] };
  }

  protected _parseGeometryEntities(): ParsedGeometryEntity[] {
    const geos: ParsedGeometryEntity[] = [];
    this._parseNURBS(geos);
    this._parseCSG(geos);
    return geos;
  }

  private _parseNURBS(out: ParsedGeometryEntity[]): void {
    // Match IFCRATIONALBSPLINECURVEWITHKNOTS(degree,(#refs),...)
    const re =
      /#(\d+)\s*=\s*IFCRATIONALBSPLINECURVEWITHKNOTS\s*\((\d+)\s*,\s*\(([^)]+)\)/gi;
    let m;
    while ((m = re.exec(this.content)) !== null) {
      const [, id, degreeStr, refs] = m;
      const degree = parseInt(degreeStr, 10);
      // Collect cartesian point refs
      const ptRefs = refs.match(/#\d+/g) ?? [];
      const controlPoints = ptRefs
        .map((ref) => this._getCartesianPoint(ref))
        .filter((p): p is { x: number; y: number; z: number } => p !== null);

      out.push({
        id: `#${id}`,
        type: 'NURBS',
        degree,
        controlPoints,
      });
    }
  }

  private _parseCSG(out: ParsedGeometryEntity[]): void {
    // Match IFCBOOLEANRESULT(.OP.,#A,#B)
    const re = /#(\d+)\s*=\s*IFCBOOLEANRESULT\s*\(\s*\.(\w+)\.\s*,\s*(#\d+)\s*,\s*(#\d+)\s*\)/gi;
    let m;
    while ((m = re.exec(this.content)) !== null) {
      const [, id, op, opA, opB] = m;
      out.push({
        id: `#${id}`,
        type: 'CSG',
        operation: op,
        operandRefs: [opA, opB],
      });
    }
  }

  private _getCartesianPoint(ref: string): { x: number; y: number; z: number } | null {
    // Match: #N=IFCCARTESIANPOINT((x.,y.,z.));
    const id = ref.slice(1);
    const re = new RegExp(
      `#${id}\\s*=\\s*IFCCARTESIANPOINT\\s*\\(\\s*\\(([^)]+)\\)\\s*\\)`,
      'i'
    );
    const m = this.content.match(re);
    if (!m) return null;
    const coords = m[1].split(',').map((s) => parseFloat(s.trim()));
    return { x: coords[0] ?? 0, y: coords[1] ?? 0, z: coords[2] ?? 0 };
  }
}

// ─── IFCSerializer ────────────────────────────────────────────────────────────

export class IFCSerializer {
  private document: DocumentSchema;
  private schema: 'IFC2X3' | 'IFC4';
  private lineNumber: number = 1;

  constructor(document: DocumentSchema, options: SerializeOptions = {}) {
    this.document = document;
    this.schema = options.schema ?? 'IFC2X3';
  }

  serialize(): string {
    const lines: string[] = [];

    lines.push(...this._generateHeader());
    lines.push('DATA;');

    const levels = Object.values(this.document.levels);
    levels.forEach((level) => {
      lines.push(...this._serializeLevel(level.id));
    });

    const elements = Object.values(this.document.elements);
    elements.forEach((element) => {
      lines.push(...this._serializeElement(element));
    });

    lines.push('ENDSEC;');
    lines.push('END-ISO-10303-21;');

    return lines.join('\n');
  }

  private _generateHeader(): string[] {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];

    return [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
      `FILE_NAME('${this.document.name}.ifc','${timestamp}',('$'),('$'),('$'),'${this.schema}','');`,
      `FILE_SCHEMA(('${this.schema}'));`,
      'ENDSEC;',
    ];
  }

  private _serializeLevel(id: string): string[] {
    const level = this.document.levels[id];
    if (!level) return [];

    const lineNum = this.lineNumber++;
    return [
      `#${lineNum}=IFCBUILDINGSTOREY('${id}',$,'${level.name}',$,$,#${lineNum + 1},$,$,$);`,
    ];
  }

  private _serializeElement(element: ElementSchema): string[] {
    const lineNum = this.lineNumber++;
    const ifcType = this._getIFCType(element.type);
    const name = (element.properties['Name']?.value as string) || 'Unnamed';
    const bbox = element.boundingBox;

    // Embed bounding box as comment for round-trip fidelity
    const bboxStr = `/* bbox:${bbox.min.x},${bbox.min.y},${bbox.min.z}:${bbox.max.x},${bbox.max.y},${bbox.max.z} */`;

    return [`#${lineNum}=${ifcType}('${element.id}',$,'${name}',$,$,$,$,$,$); ${bboxStr}`];
  }

  private _getIFCType(elementType: ElementType): string {
    if (this.schema === 'IFC4') {
      const map4: Partial<Record<ElementType, string>> = {
        wall: 'IFCWALL',
        door: 'IFCDOOR',
        window: 'IFCWINDOW',
        slab: 'IFCSLAB',
        roof: 'IFCROOF',
        column: 'IFCCOLUMN',
        beam: 'IFCBEAM',
        stair: 'IFCSTAIR',
        railing: 'IFCRAILING',
        space: 'IFCSPACE',
      };
      if (map4[elementType]) return map4[elementType]!;
    }

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
}

// ─── Property set parsing ─────────────────────────────────────────────────────

export function parsePropertySets(content: string): IFCPropertySet[] {
  const psets: IFCPropertySet[] = [];

  // Parse individual property values first: #id=IFCPROPERTYSINGLEVALUE('name',$,value,$)
  const propValues: Record<string, { name: string; value: string | number | boolean }> = {};
  const propRe =
    /#(\d+)\s*=\s*IFCPROPERTYSINGLEVALUE\s*\(\s*'([^']+)'\s*,\s*\$\s*,\s*([^,]+)/gi;
  let pm;
  while ((pm = propRe.exec(content)) !== null) {
    const [, id, name, rawVal] = pm;
    let value: string | number | boolean = rawVal.trim();
    // IFCLABEL('...')
    const lblMatch = value.match(/IFCLABEL\('([^']*)'\)/i);
    if (lblMatch) {
      value = lblMatch[1];
    }
    // IFCBOOLEAN(.T.) or .F.
    else if (/IFCBOOLEAN\(\.T\.\)/i.test(value as string) || value === '.T.') {
      value = true;
    } else if (/IFCBOOLEAN\(\.F\.\)/i.test(value as string) || value === '.F.') {
      value = false;
    }
    // IFCREAL(n) or IFCINTEGER(n)
    else {
      const numMatch = (value as string).match(/IFC(?:REAL|INTEGER|NUMERIC)\(([^)]+)\)/i);
      if (numMatch) value = parseFloat(numMatch[1]);
    }
    propValues[`#${id}`] = { name, value };
  }

  // Parse property sets: #id=IFCPROPERTYSET('guid',$,'Pset_Name',$,(#refs...))
  const psetRe =
    /#(\d+)\s*=\s*IFCPROPERTYSET\s*\(\s*'[^']*'\s*,\s*\$\s*,\s*'([^']+)'\s*,\s*\$\s*,\s*\(([^)]+)\)/gi;
  let psm;
  while ((psm = psetRe.exec(content)) !== null) {
    const [, id, name, refsStr] = psm;
    const refs = (refsStr.match(/#\d+/g) ?? []);
    const properties: Record<string, string | number | boolean> = {};
    for (const ref of refs) {
      const pv = propValues[ref];
      if (pv) properties[pv.name] = pv.value;
    }
    psets.push({
      id: `#${id}`,
      name,
      properties,
      relatedObjectRefs: [],
    });
  }

  // Parse relations: #id=IFCRELDEFINESBYPROPERTIES('...',$,$,$,(#objRefs...),(#psetRef))
  const relRe =
    /#(\d+)\s*=\s*IFCRELDEFINESBYPROPERTIES\s*\(\s*'[^']*'\s*,\s*\$\s*,\s*\$\s*,\s*\$\s*,\s*\(([^)]+)\)\s*,\s*\(([^)]+)\)\s*\)/gi;
  let rm;
  while ((rm = relRe.exec(content)) !== null) {
    const [, , objRefsStr, psetRefsStr] = rm;
    const objRefs = (objRefsStr.match(/#\d+/g) ?? []);
    const psetRefs = (psetRefsStr.match(/#\d+/g) ?? []);
    for (const psetRef of psetRefs) {
      const pset = psets.find((p) => p.id === psetRef);
      if (pset) {
        pset.relatedObjectRefs.push(...objRefs);
      }
    }
  }

  return psets;
}

// ─── Convenience functions ────────────────────────────────────────────────────

export function parseIFC(content: string): DocumentSchema {
  const schemaMatch = content.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'\s*\)\s*\)/i);
  const schema = schemaMatch ? schemaMatch[1].toUpperCase() : 'IFC2X3';

  const parser = schema === 'IFC4' ? new IFC4Parser(content) : new IFCParser(content);
  const { entities } = parser.parse();

  const psets = parsePropertySets(content);

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

  // Build entity id → psets lookup
  const entityPsets: Record<string, IFCPropertySet[]> = {};
  for (const pset of psets) {
    for (const ref of pset.relatedObjectRefs) {
      if (!entityPsets[ref]) entityPsets[ref] = [];
      entityPsets[ref].push(pset);
    }
  }

  entities.forEach((entity) => {
    const elementId = crypto.randomUUID();

    // Extract bounding box from serialized comment (round-trip support)
    // The serializer embeds: /* bbox:x1,y1,z1:x2,y2,z2 */ on the same line as the entity
    // Search by GUID to find the right line, then extract the bbox comment
    const bboxMatch = entity.guid
      ? (() => {
          const lineRe = new RegExp(
            String.raw`#\d+=` +
            entity.type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
            String.raw`\('` +
            entity.guid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
            String.raw`'[^\n]*bbox:([\d.+-]+),([\d.+-]+),([\d.+-]+):([\d.+-]+),([\d.+-]+),([\d.+-]+)`
          );
          return content.match(lineRe);
        })()
      : null;
    const bbox = bboxMatch
      ? {
          min: {
            x: parseFloat(bboxMatch[1] ?? '0'),
            y: parseFloat(bboxMatch[2] ?? '0'),
            z: parseFloat(bboxMatch[3] ?? '0'),
            _type: 'Point3D' as const,
          },
          max: {
            x: parseFloat(bboxMatch[4] ?? '0'),
            y: parseFloat(bboxMatch[5] ?? '0'),
            z: parseFloat(bboxMatch[6] ?? '0'),
            _type: 'Point3D' as const,
          },
        }
      : {
          min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
          max: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
        };

    // Get psets associated with this entity's IFC id
    const elementPsets = (entityPsets[entity.id] ?? []).map((ps) => {
      const propRecord: Record<string, { type: 'string' | 'number' | 'boolean'; value: string | number | boolean }> = {};
      for (const [propName, propVal] of Object.entries(ps.properties)) {
        propRecord[propName] = {
          type: typeof propVal === 'boolean' ? 'boolean' : typeof propVal === 'number' ? 'number' : 'string',
          value: propVal,
        };
      }
      return { id: ps.id, name: ps.name, properties: propRecord };
    });

    document.elements[elementId] = {
      id: elementId,
      type: entity.elementType,
      properties: {
        Name: { type: 'string', value: entity.name },
      },
      propertySets: elementPsets,
      geometry: { type: 'brep', data: null },
      layerId: defaultLayerId,
      levelId: defaultLevelId,
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: bbox,
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

export function serializeIFC(document: DocumentSchema, options: SerializeOptions = {}): string {
  const serializer = new IFCSerializer(document, options);
  return serializer.serialize();
}
