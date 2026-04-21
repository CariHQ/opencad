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
  IFCCURTAINWALL: 'curtain_wall',
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
  // Geometry entity counter — starts high to avoid collision with element IDs
  private _geomId: number = 1000;

  constructor(document: DocumentSchema, options: SerializeOptions = {}) {
    this.document = document;
    this.schema = options.schema ?? 'IFC2X3';
  }

  private _nextId(): number {
    return this._geomId++;
  }

  serialize(): string {
    const lines: string[] = [];

    lines.push(...this._generateHeader());
    lines.push('DATA;');

    const levels = Object.values(this.document.organization.levels);
    levels.forEach((level) => {
      lines.push(...this._serializeLevel(level.id));
    });

    const elements = Object.values(this.document.content.elements);
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
    const level = this.document.organization.levels[id];
    if (!level) return [];

    const lineNum = this.lineNumber++;
    return [
      `#${lineNum}=IFCBUILDINGSTOREY('${id}',$,'${level.name}',$,$,#${lineNum + 1},$,$,$);`,
    ];
  }

  private _serializeElement(element: ElementSchema): string[] {
    if (element.type === 'wall') {
      return this._wallToLines(element);
    }
    if (element.type === 'slab') {
      return this._slabToLines(element);
    }
    if (element.type === 'curtain_wall') {
      return this._curtainWallToLines(element);
    }

    // Fallback: stub with bounding-box comment for round-trip fidelity
    const lineNum = this.lineNumber++;
    const ifcType = this._getIFCType(element.type);
    const name = (element.properties['Name']?.value as string) || 'Unnamed';
    const bbox = element.boundingBox;
    const bboxStr = `/* bbox:${bbox.min.x},${bbox.min.y},${bbox.min.z}:${bbox.max.x},${bbox.max.y},${bbox.max.z} */`;
    return [`#${lineNum}=${ifcType}('${element.id}',$,'${name}',$,$,$,$,$,$); ${bboxStr}`];
  }

  /** Emit real IFC swept-solid geometry for a wall element. */
  private _wallToLines(element: ElementSchema): string[] {
    const prop = (key: string, def: number): number => {
      const v = element.properties[key];
      return v && v.type === 'number' ? (v.value as number) : def;
    };

    const startX = prop('StartX', 0);
    const startY = prop('StartY', 0);
    const endX = prop('EndX', 3000);
    const endY = prop('EndY', 0);
    const height = prop('Height', 3000);
    const thickness = prop('Thickness', 200);

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const cosA = parseFloat(Math.cos(angle).toFixed(10));
    const sinA = parseFloat(Math.sin(angle).toFixed(10));

    const idLocalPlace = this._nextId();
    const idPlaceOrigin = this._nextId();
    const idOriginPt = this._nextId();
    const idDirRef = this._nextId();
    const idDirUp = this._nextId();
    const idExtruded = this._nextId();
    const idProfile = this._nextId();
    const idExtrudeDir = this._nextId();
    const idPolyline = this._nextId();
    const idPt0 = this._nextId();
    const idPt1 = this._nextId();
    const idPt2 = this._nextId();
    const idPt3 = this._nextId();
    const idShapeRep = this._nextId();
    const idGeomCtx = this._nextId();
    const idCtxPlace = this._nextId();
    const idCtxOrigin = this._nextId();
    const idProductShape = this._nextId();

    const wallLineNum = this.lineNumber++;
    const ifcType = this._getIFCType(element.type);
    const name = (element.properties['Name']?.value as string) || 'Unnamed';
    const bbox = element.boundingBox;
    const bboxStr = `/* bbox:${bbox.min.x},${bbox.min.y},${bbox.min.z}:${bbox.max.x},${bbox.max.y},${bbox.max.z} */`;

    const f = (n: number): string => {
      const s = n.toString();
      return s.includes('.') ? s : `${s}.`;
    };

    return [
      `#${idLocalPlace}=IFCLOCALPLACEMENT($,#${idPlaceOrigin});`,
      `#${idPlaceOrigin}=IFCAXIS2PLACEMENT3D(#${idOriginPt},#${idDirUp},#${idDirRef});`,
      `#${idOriginPt}=IFCCARTESIANPOINT((${f(startX)},${f(startY)},0.));`,
      `#${idDirRef}=IFCDIRECTION((${f(cosA)},${f(sinA)},0.));`,
      `#${idDirUp}=IFCDIRECTION((0.,0.,1.));`,
      `#${idExtruded}=IFCEXTRUDEDAREASOLID(#${idProfile},#${idPlaceOrigin},#${idExtrudeDir},${f(height)});`,
      `#${idProfile}=IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,#${idPolyline});`,
      `#${idExtrudeDir}=IFCDIRECTION((0.,0.,1.));`,
      `#${idPolyline}=IFCPOLYLINE((#${idPt0},#${idPt1},#${idPt2},#${idPt3},#${idPt0}));`,
      `#${idPt0}=IFCCARTESIANPOINT((0.,0.));`,
      `#${idPt1}=IFCCARTESIANPOINT((${f(length)},0.));`,
      `#${idPt2}=IFCCARTESIANPOINT((${f(length)},${f(thickness)}));`,
      `#${idPt3}=IFCCARTESIANPOINT((0.,${f(thickness)}));`,
      `#${idShapeRep}=IFCSHAPEREPRESENTATION(#${idGeomCtx},'Body','SweptSolid',(#${idExtruded}));`,
      `#${idGeomCtx}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-5,#${idCtxPlace},$);`,
      `#${idCtxPlace}=IFCAXIS2PLACEMENT3D(#${idCtxOrigin},$,$);`,
      `#${idCtxOrigin}=IFCCARTESIANPOINT((0.,0.,0.));`,
      `#${idProductShape}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${idShapeRep}));`,
      `#${wallLineNum}=${ifcType}('${element.id}',$,'${name}',$,$,#${idLocalPlace},#${idProductShape},$); ${bboxStr}`,
    ];
  }

  /** Emit real IFC swept-solid geometry for a slab element. */
  private _slabToLines(element: ElementSchema): string[] {
    const bbox = element.boundingBox;
    const width = bbox.max.x - bbox.min.x;
    const depth = bbox.max.y - bbox.min.y;
    const slabHeight = bbox.max.z - bbox.min.z || 300;

    const idPlace = this._nextId();
    const idOriginPt = this._nextId();
    const idExtruded = this._nextId();
    const idProfile = this._nextId();
    const idExtrudeDir = this._nextId();
    const idPolyline = this._nextId();
    const idPt0 = this._nextId();
    const idPt1 = this._nextId();
    const idPt2 = this._nextId();
    const idPt3 = this._nextId();
    const idShapeRep = this._nextId();
    const idGeomCtx = this._nextId();
    const idCtxPlace = this._nextId();
    const idCtxOrigin = this._nextId();
    const idProductShape = this._nextId();

    const slabLineNum = this.lineNumber++;
    const ifcType = this._getIFCType(element.type);
    const name = (element.properties['Name']?.value as string) || 'Unnamed';
    const bboxStr = `/* bbox:${bbox.min.x},${bbox.min.y},${bbox.min.z}:${bbox.max.x},${bbox.max.y},${bbox.max.z} */`;

    const f = (n: number): string => {
      const s = n.toString();
      return s.includes('.') ? s : `${s}.`;
    };

    return [
      `#${idPlace}=IFCAXIS2PLACEMENT3D(#${idOriginPt},$,$);`,
      `#${idOriginPt}=IFCCARTESIANPOINT((${f(bbox.min.x)},${f(bbox.min.y)},0.));`,
      `#${idExtruded}=IFCEXTRUDEDAREASOLID(#${idProfile},#${idPlace},#${idExtrudeDir},${f(slabHeight)});`,
      `#${idProfile}=IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,#${idPolyline});`,
      `#${idExtrudeDir}=IFCDIRECTION((0.,0.,1.));`,
      `#${idPolyline}=IFCPOLYLINE((#${idPt0},#${idPt1},#${idPt2},#${idPt3},#${idPt0}));`,
      `#${idPt0}=IFCCARTESIANPOINT((0.,0.));`,
      `#${idPt1}=IFCCARTESIANPOINT((${f(width)},0.));`,
      `#${idPt2}=IFCCARTESIANPOINT((${f(width)},${f(depth)}));`,
      `#${idPt3}=IFCCARTESIANPOINT((0.,${f(depth)}));`,
      `#${idShapeRep}=IFCSHAPEREPRESENTATION(#${idGeomCtx},'Body','SweptSolid',(#${idExtruded}));`,
      `#${idGeomCtx}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-5,#${idCtxPlace},$);`,
      `#${idCtxPlace}=IFCAXIS2PLACEMENT3D(#${idCtxOrigin},$,$);`,
      `#${idCtxOrigin}=IFCCARTESIANPOINT((0.,0.,0.));`,
      `#${idProductShape}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${idShapeRep}));`,
      `#${slabLineNum}=${ifcType}('${element.id}',$,'${name}',$,$,#${idPlace},#${idProductShape},$); ${bboxStr}`,
    ];
  }

  /** Emit IFC geometry for a curtain wall element. */
  private _curtainWallToLines(element: ElementSchema): string[] {
    const prop = (key: string, def: number): number => {
      const v = element.properties[key];
      return v && v.type === 'number' ? (v.value as number) : def;
    };

    const bbox = element.boundingBox;
    const width = prop('Width', bbox.max.x - bbox.min.x || 5000);
    const height = prop('Height', bbox.max.z - bbox.min.z || 3000);
    const frameDepth = prop('FrameDepth', 150);

    const idPlace = this._nextId();
    const idOriginPt = this._nextId();
    const idExtruded = this._nextId();
    const idProfile = this._nextId();
    const idExtrudeDir = this._nextId();
    const idPolyline = this._nextId();
    const idPt0 = this._nextId();
    const idPt1 = this._nextId();
    const idPt2 = this._nextId();
    const idPt3 = this._nextId();
    const idShapeRep = this._nextId();
    const idGeomCtx = this._nextId();
    const idCtxPlace = this._nextId();
    const idCtxOrigin = this._nextId();
    const idProductShape = this._nextId();

    const lineNum = this.lineNumber++;
    const name = (element.properties['Name']?.value as string) || 'Unnamed';
    const bboxStr = `/* bbox:${bbox.min.x},${bbox.min.y},${bbox.min.z}:${bbox.max.x},${bbox.max.y},${bbox.max.z} */`;

    const f = (n: number): string => {
      const s = n.toString();
      return s.includes('.') ? s : `${s}.`;
    };

    return [
      `#${idPlace}=IFCAXIS2PLACEMENT3D(#${idOriginPt},$,$);`,
      `#${idOriginPt}=IFCCARTESIANPOINT((${f(bbox.min.x)},${f(bbox.min.y)},0.));`,
      `#${idExtruded}=IFCEXTRUDEDAREASOLID(#${idProfile},#${idPlace},#${idExtrudeDir},${f(height)});`,
      `#${idProfile}=IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,#${idPolyline});`,
      `#${idExtrudeDir}=IFCDIRECTION((0.,0.,1.));`,
      `#${idPolyline}=IFCPOLYLINE((#${idPt0},#${idPt1},#${idPt2},#${idPt3},#${idPt0}));`,
      `#${idPt0}=IFCCARTESIANPOINT((0.,0.));`,
      `#${idPt1}=IFCCARTESIANPOINT((${f(width)},0.));`,
      `#${idPt2}=IFCCARTESIANPOINT((${f(width)},${f(frameDepth)}));`,
      `#${idPt3}=IFCCARTESIANPOINT((0.,${f(frameDepth)}));`,
      `#${idShapeRep}=IFCSHAPEREPRESENTATION(#${idGeomCtx},'Body','SweptSolid',(#${idExtruded}));`,
      `#${idGeomCtx}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-5,#${idCtxPlace},$);`,
      `#${idCtxPlace}=IFCAXIS2PLACEMENT3D(#${idCtxOrigin},$,$);`,
      `#${idCtxOrigin}=IFCCARTESIANPOINT((0.,0.,0.));`,
      `#${idProductShape}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${idShapeRep}));`,
      `#${lineNum}=IFCCURTAINWALL('${element.id}',$,'${name}',$,$,#${idPlace},#${idProductShape},$); ${bboxStr}`,
    ];
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
        curtain_wall: 'IFCCURTAINWALL',
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
      rectangle: 'IFCANNOTATION',
      polygon: 'IFCANNOTATION',
      component: 'IFCGROUP',
      group: 'IFCGROUP',
      duct: 'IFCDUCTFITTINGTYPE',
      pipe: 'IFCPIPEFITTINGTYPE',
      plumbing_fixture: 'IFCFLOWTERMINAL',
      electrical_equipment: 'IFCELECTRICAPPLIANCE',
      mechanical_equipment: 'IFCMECHANICALFASTENER',
      curtain_wall: 'IFCCURTAINWALL',
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

// ─── Pset helpers ────────────────────────────────────────────────────────────

/** A flat pset definition used when editing element property sets. */
export interface PsetDef {
  name: string;
  properties: Record<string, string | number | boolean>;
}

/**
 * Extracts psets from an element's flat `properties` map.
 * Properties namespaced as `Pset_<Name>.<Key>` are grouped into PsetDef objects.
 */
export function extractPsets(el: { properties: Record<string, { type: string; value: unknown }> }): PsetDef[] {
  const map = new Map<string, Record<string, string | number | boolean>>();

  for (const [key, propVal] of Object.entries(el.properties)) {
    const dot = key.indexOf('.');
    if (dot === -1) continue;
    const psetName = key.slice(0, dot);
    if (!psetName.startsWith('Pset_')) continue;
    const propKey = key.slice(dot + 1);
    if (!map.has(psetName)) map.set(psetName, {});
    const v = propVal.value;
    map.get(psetName)![propKey] = v as string | number | boolean;
  }

  return Array.from(map.entries()).map(([name, properties]) => ({ name, properties }));
}

/**
 * Applies a PsetDef to an element, namespacing the pset properties as
 * `<pset.name>.<key>`. Returns a new element without mutating the original.
 */
export function applyPset(
  el: { properties: Record<string, { type: 'string' | 'number' | 'boolean' | 'enum' | 'reference'; value: unknown }> },
  pset: PsetDef,
): typeof el {
  const added: Record<string, { type: 'string' | 'number' | 'boolean'; value: string | number | boolean }> = {};

  for (const [key, value] of Object.entries(pset.properties)) {
    const nsKey = `${pset.name}.${key}`;
    const type: 'string' | 'number' | 'boolean' =
      typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string';
    added[nsKey] = { type, value };
  }

  return {
    ...el,
    properties: { ...el.properties, ...added },
  };
}

// ─── Dimensional extraction helpers ──────────────────────────────────────────

/**
 * Given a `#N` entity ref, finds `#N=IFCCARTESIANPOINT((x,y[,z]))` in content
 * and returns the parsed coordinates. Returns null if not found or parse fails.
 */
export function extractEntityCoordinates(
  content: string,
  entityRef: string
): { x: number; y: number; z: number } | null {
  try {
    const id = entityRef.replace(/^#/, '');
    const re = new RegExp(
      `#${id}\\s*=\\s*IFCCARTESIANPOINT\\s*\\(\\s*\\(([^)]+)\\)\\s*\\)`,
      'i'
    );
    const m = content.match(re);
    if (!m) return null;
    const coords = m[1].split(',').map((s) => parseFloat(s.trim()));
    if (coords.some(isNaN)) return null;
    return { x: coords[0] ?? 0, y: coords[1] ?? 0, z: coords[2] ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Extracts wall dimensional properties from an IFC STEP file.
 *
 * Resolution chain:
 *  - startX/Y  → IFCLOCALPLACEMENT → IFCAXIS2PLACEMENT3D → IFCCARTESIANPOINT
 *  - height     → IFCEXTRUDEDAREASOLID depth (last float argument)
 *  - endX/Y     → startX/Y + polyline extent (longest axis of cross-section profile)
 *  - thickness  → polyline cross-section minor dimension
 *
 * Returns null if extraction fails at any critical step.
 */
export function extractWallDimensions(
  content: string,
  wallEntityLine: string
): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  height: number;
  thickness: number;
} | null {
  try {
    // ── 1. Find placement ref from wall entity line ──────────────────────────
    // Wall line shape: IFCWALL('guid',$,'name',$,$,#placementRef,#shapeRef,$,$)
    // The 6th argument (index 5, 0-based) is typically the placement ref.
    // We match any #N references in the wall args to find placement/shape.
    const wallRefs = wallEntityLine.match(/#(\d+)/g) ?? [];
    // wallRefs[0] is the wall entity id itself — skip it
    const candidateRefs = wallRefs.slice(1);

    // Fast early-exit: if the wall entity has no geometry refs at all,
    // there is nothing to extract. Avoid expensive full-content regex scans.
    if (candidateRefs.length === 0) return null;

    // ── 2. Resolve start coordinates from IFCLOCALPLACEMENT chain ────────────
    let startX = 0;
    let startY = 0;
    let foundPlacement = false;

    for (const ref of candidateRefs) {
      const id = ref.replace('#', '');
      // Check if this ref is an IFCLOCALPLACEMENT
      const placementLineRe = new RegExp(
        `#${id}\\s*=\\s*IFCLOCALPLACEMENT\\s*\\(([^)]*)\\)`,
        'i'
      );
      const placementMatch = content.match(placementLineRe);
      if (!placementMatch) continue;

      // Find the IFCAXIS2PLACEMENT3D ref inside this IFCLOCALPLACEMENT
      const axis2Ref = placementMatch[1].match(/#(\d+)/g);
      if (!axis2Ref || axis2Ref.length === 0) continue;

      for (const aRef of axis2Ref) {
        const aId = aRef.replace('#', '');
        const axis2Re = new RegExp(
          `#${aId}\\s*=\\s*IFCAXIS2PLACEMENT3D\\s*\\(([^)]*)\\)`,
          'i'
        );
        const axis2Match = content.match(axis2Re);
        if (!axis2Match) continue;

        // First ref in IFCAXIS2PLACEMENT3D is the location point
        const ptRefs = axis2Match[1].match(/#(\d+)/g);
        if (!ptRefs || ptRefs.length === 0) continue;

        const coords = extractEntityCoordinates(content, ptRefs[0]);
        if (coords) {
          startX = coords.x;
          startY = coords.y;
          foundPlacement = true;
          break;
        }
      }
      if (foundPlacement) break;
    }

    // ── 3. Find IFCEXTRUDEDAREASOLID depth (height) ──────────────────────────
    // IFCEXTRUDEDAREASOLID(profileRef, placementRef, directionRef, depth)
    // depth is the last numeric argument.
    let height = 0;
    let polylineRef: string | null = null;
    let foundExtrusion = false;

    const extrusionRe = /#(\d+)\s*=\s*IFCEXTRUDEDAREASOLID\s*\(([^)]+)\)/gi;
    let extMatch;
    while ((extMatch = extrusionRe.exec(content)) !== null) {
      const extArgs = extMatch[2];
      // Last float in the argument list is the depth/height
      const floatMatches = extArgs.match(/[\d.]+(?:[eE][+-]?\d+)?/g);
      if (!floatMatches || floatMatches.length === 0) continue;
      const depthStr = floatMatches[floatMatches.length - 1];
      const depth = parseFloat(depthStr);
      if (isNaN(depth)) continue;

      height = depth;

      // The first ref in extArgs is typically the profile def
      const profileRef = extArgs.match(/#(\d+)/);
      if (profileRef) {
        // Resolve profile def to get polyline ref
        const profId = profileRef[1];
        const profRe = new RegExp(
          `#${profId}\\s*=\\s*IFCARBITRARYCLOSEDPROFILEDEF\\s*\\(([^)]*)\\)`,
          'i'
        );
        const profMatch = content.match(profRe);
        if (profMatch) {
          const polyRefs = profMatch[1].match(/#(\d+)/g);
          if (polyRefs && polyRefs.length > 0) {
            polylineRef = polyRefs[polyRefs.length - 1];
          }
        }
      }
      foundExtrusion = true;
      break; // use the first extrusion solid found
    }

    // ── 4. Resolve polyline points for endX/Y and thickness ──────────────────
    let endX = startX;
    let endY = startY;
    let thickness = 0;

    if (polylineRef) {
      const polyId = polylineRef.replace('#', '');
      const polyRe = new RegExp(
        `#${polyId}\\s*=\\s*IFCPOLYLINE\\s*\\(\\s*\\(([^)]+(?:\\([^)]*\\)[^)]*)*)\\)\\s*\\)`,
        'i'
      );
      const polyMatch = content.match(polyRe);
      if (polyMatch) {
        // Extract all #N refs inside the polyline point list
        const ptRefs = polyMatch[1].match(/#\d+/g) ?? [];
        // Deduplicate (closing repeat of first point)
        const uniqueRefs = [...new Set(ptRefs)];
        const points = uniqueRefs
          .map((r) => extractEntityCoordinates(content, r))
          .filter((p): p is { x: number; y: number; z: number } => p !== null);

        if (points.length >= 2) {
          // Compute bounding box of profile points
          const xs = points.map((p) => p.x);
          const ys = points.map((p) => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const spanX = maxX - minX;
          const spanY = maxY - minY;

          // The longer span is the wall length, shorter is thickness
          if (spanX >= spanY) {
            endX = startX + spanX;
            endY = startY;
            thickness = spanY;
          } else {
            endX = startX;
            endY = startY + spanY;
            thickness = spanX;
          }
        }
      }
    }

    // Only return a result if we found at least the extrusion (height)
    if (!foundExtrusion && !foundPlacement) return null;

    return { startX, startY, endX, endY, height, thickness };
  } catch {
    return null;
  }
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
    metadata: {
      createdAt: now,
      updatedAt: now,
      createdBy: 'ifc-import',
      schemaVersion: '1.0.0',
    },
    content: {
      elements: {},
      spaces: {},
    },
    organization: {
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
    },
    presentation: {
      views: {},
      annotations: {},
    },
    library: {
      materials: {},
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

  // Pre-check: skip geometry extraction entirely if the file has no geometry
  // entities — avoids per-entity regex scans on files without IFC geometry.
  const hasGeometry =
    /IFCEXTRUDEDAREASOLID/i.test(content) || /IFCLOCALPLACEMENT/i.test(content);

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

    // Build initial properties
    const elementProperties: Record<string, { type: 'string' | 'number' | 'boolean'; value: string | number | boolean }> = {
      Name: { type: 'string', value: entity.name },
    };

    // ── Dimensional extraction for wall/slab elements ────────────────────────
    if (hasGeometry && (entity.elementType === 'wall' || entity.elementType === 'slab') && entity.rawLine) {
      const dims = extractWallDimensions(content, entity.rawLine);
      if (dims) {
        elementProperties['StartX'] = { type: 'number', value: dims.startX };
        elementProperties['StartY'] = { type: 'number', value: dims.startY };
        elementProperties['EndX'] = { type: 'number', value: dims.endX };
        elementProperties['EndY'] = { type: 'number', value: dims.endY };
        elementProperties['Height'] = { type: 'number', value: dims.height };
        elementProperties['Thickness'] = { type: 'number', value: dims.thickness };
      }
    }

    // ── Pset_WallCommon property promotion ───────────────────────────────────
    // If dimensional extraction didn't supply Height/Thickness, try Pset values.
    const wallCommonPset = (entityPsets[entity.id] ?? []).find(
      (ps) => ps.name === 'Pset_WallCommon'
    );
    if (wallCommonPset) {
      if (!elementProperties['Height'] && wallCommonPset.properties['Height'] !== undefined) {
        const h = wallCommonPset.properties['Height'];
        elementProperties['Height'] = {
          type: typeof h === 'number' ? 'number' : 'string',
          value: h,
        };
      }
      if (!elementProperties['Thickness'] && wallCommonPset.properties['Width'] !== undefined) {
        const w = wallCommonPset.properties['Width'];
        elementProperties['Thickness'] = {
          type: typeof w === 'number' ? 'number' : 'string',
          value: w,
        };
      }
      if (wallCommonPset.properties['IsExternal'] !== undefined) {
        const ext = wallCommonPset.properties['IsExternal'];
        elementProperties['IsExternal'] = {
          type: 'boolean',
          value: Boolean(ext),
        };
      }
    }

    document.content.elements[elementId] = {
      id: elementId,
      type: entity.elementType,
      properties: elementProperties,
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

/**
 * T-IO-002: Export a DocumentSchema to a minimal but valid IFC 2x3 string.
 *
 * Produces:
 *  - ISO-10303-21 envelope with FILE_DESCRIPTION, FILE_NAME, FILE_SCHEMA
 *  - IFCPROJECT, IFCSITE, IFCBUILDING
 *  - IFCBUILDINGSTOREY for every level in doc.organization.levels
*  - IFCWALL / IFCWALLSTANDARDCASE for every wall element
 */
export function exportToIFC(doc: DocumentSchema): string {
  const lines: string[] = [];
  let id = 1;
  const next = (): number => id++;

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const projectName = doc.name || 'OpenCAD Project';

  // ── Header ────────────────────────────────────────────────────────────────
  lines.push('ISO-10303-21;');
  lines.push('HEADER;');
  lines.push(`FILE_DESCRIPTION(('OpenCAD Export'),'2;1');`);
  lines.push(`FILE_NAME('${projectName}','${now}',(''),(''),'','OpenCAD','');`);
  lines.push(`FILE_SCHEMA(('IFC2X3'));`);
  lines.push('ENDSEC;');
  lines.push('DATA;');

  const idProject  = next();
  const idSite     = next();
  const idBuilding = next();

  lines.push(`#${idProject}=IFCPROJECT('${doc.id}',$,'${projectName}',$,$,$,$,(),#${idProject + 100});`);
  lines.push(`#${idSite}=IFCSITE('${doc.id}-site',$,'Site',$,$,$,$,$,.ELEMENT.,$,$,$,$,());`);
  lines.push(`#${idBuilding}=IFCBUILDING('${doc.id}-bldg',$,'Building',$,$,$,$,$,.ELEMENT.,$,$,());`);

  const levels = Object.values(doc.organization.levels);
  const storeyIds: Record<string, number> = {};
  for (const level of levels) {
    const sid = next();
    storeyIds[level.id] = sid;
    lines.push(`#${sid}=IFCBUILDINGSTOREY('${level.id}',$,'${level.name}',$,$,$,$,$,.ELEMENT.,${level.elevation}.);`);
  }

  const walls = Object.values(doc.content.elements).filter((e) => e.type === 'wall');
  for (const wall of walls) {
    const wid = next();
    const name = (wall.properties['Name']?.value as string) || 'Wall';
    const storeyRef = wall.levelId && storeyIds[wall.levelId]
      ? `#${storeyIds[wall.levelId]}`
      : '$';
    const bbox = wall.boundingBox;
    const bboxComment = ` /* bbox:${bbox.min.x},${bbox.min.y},${bbox.min.z}:${bbox.max.x},${bbox.max.y},${bbox.max.z} */`;
    lines.push(`#${wid}=IFCWALL('${wall.id}',$,'${name}',$,$,${storeyRef},$,$);${bboxComment}`);
  }

  lines.push('ENDSEC;');
  lines.push('END-ISO-10303-21;');

  return lines.join('\n');
}
