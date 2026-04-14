/**
 * IFC Import/Export Tests
 * T-IFC-001 through T-IFC-007
 */

import { describe, it, expect } from 'vitest';
import {
  IFCParser,
  IFCSerializer,
  parseIFC,
  serializeIFC,
  IFC4Parser,
  parsePropertySets,
  type IFCPropertySet,
} from './ifc';
import { createProject } from './document';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

function ifc2x3Fixture(): string {
  return [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
    "FILE_NAME('test.ifc','20240101T000000',('$'),('$'),('$'),'IFC2x3','');",
    "FILE_SCHEMA(('IFC2X3'));",
    'ENDSEC;',
    'DATA;',
    "#1=IFCPROJECT('abc1',$,'Test Project',$,$,$,$,$,$);",
    "#10=IFCBUILDING('bld1',$,'Building',$,$,#100,$,$,$);",
    "#100=IFCBUILDINGSTOREY('sty1',$,'Ground Floor',$,$,#200,$,$,$);",
    "#2=IFCWALL('wall1',$,'External Wall',$,$,#100,$,$,$);",
    "#3=IFCDOOR('door1',$,'Front Door',$,$,#2,$,$,$);",
    "#4=IFCWINDOW('win1',$,'Window 1',$,$,#2,$,$,$,$);",
    "#5=IFCSLAB('slab1',$,'Ground Slab',$,$,$,$,$,$);",
    "#6=IFCCOLUMN('col1',$,'Column A1',$,$,$,$,$);",
    "#7=IFCBEAM('beam1',$,'Beam B1',$,$,$,$,$);",
    "#8=IFCSPACE('sp1',$,'Room 101',$,$,$,$,$,$);",
    'ENDSEC;',
    'END-ISO-10303-21;',
  ].join('\n');
}

function ifc4Fixture(): string {
  return [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('ViewDefinition [ReferenceView]'),'2;1');",
    "FILE_NAME('test4.ifc','20240101T000000',('$'),('$'),('$'),'IFC4','');",
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
    "#1=IFCPROJECT('p1',$,'IFC4 Project',$,$,$,$,$,$);",
    // NURBS curve (IFCRATIONALBSPLINECURVEWITHKNOTS)
    '#10=IFCRATIONALBSPLINECURVEWITHKNOTS(3,(#11,#12,#13),.UNSPECIFIED.,.F.,.F.,(4,4),(0.,1.),.UNSPECIFIED.,(1.,1.,1.));',
    '#11=IFCCARTESIANPOINT((0.,0.,0.));',
    '#12=IFCCARTESIANPOINT((50.,100.,0.));',
    '#13=IFCCARTESIANPOINT((100.,0.,0.));',
    // CSG solid
    "#20=IFCBOOLEANRESULT(.DIFFERENCE.,#21,#22);",
    '#21=IFCEXTRUDEDAREASOLID(#23,#24,#25,3000.);',
    '#22=IFCEXTRUDEDAREASOLID(#26,#27,#28,1000.);',
    "#30=IFCWALL('w4',$,'IFC4 Wall',$,$,$,$,$,$);",
    "#31=IFCDOOR('d4',$,'IFC4 Door',$,$,$,$,$,$);",
    'ENDSEC;',
    'END-ISO-10303-21;',
  ].join('\n');
}

function psetFixture(): string {
  return [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_SCHEMA(('IFC2X3'));",
    'ENDSEC;',
    'DATA;',
    "#1=IFCWALL('w1',$,'Wall with Psets',$,$,$,$,$,$);",
    "#50=IFCPROPERTYSINGLEVALUE('FireRating',$,IFCLABEL('1hr'),$);",
    "#51=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);",
    "#52=IFCPROPERTYSINGLEVALUE('LoadBearing',$,IFCBOOLEAN(.T.),$);",
    "#53=IFCPROPERTYSET('pset1',$,'Pset_WallCommon',$,(#50,#51,#52));",
    "#60=IFCPROPERTYSINGLEVALUE('UValue',$,IFCREAL(0.25),$);",
    "#61=IFCPROPERTYSET('pset2',$,'Pset_ThermalProperties',$,(#60));",
    "#70=IFCRELDEFINESBYPROPERTIES('r1',$,$,$,(#1),(#53));",
    "#71=IFCRELDEFINESBYPROPERTIES('r2',$,$,$,(#1),(#61));",
    'ENDSEC;',
    'END-ISO-10303-21;',
  ].join('\n');
}

// ─── T-IFC-001: IFC 2x3 Import ───────────────────────────────────────────────

describe('T-IFC-001: IFC 2x3 Import', () => {
  it('should parse IFC 2x3 format and detect schema', () => {
    const parser = new IFCParser(ifc2x3Fixture());
    const result = parser.parse();
    expect(result.schema).toBe('IFC2X3');
  });

  it('should map all IFC entity types to OpenCAD element types', () => {
    const parser = new IFCParser(ifc2x3Fixture());
    const { entities } = parser.parse();
    const types = entities.map((e) => e.elementType);
    expect(types).toContain('wall');
    expect(types).toContain('door');
    expect(types).toContain('window');
    expect(types).toContain('slab');
    expect(types).toContain('column');
    expect(types).toContain('beam');
    expect(types).toContain('space');
  });

  it('should preserve IFC hierarchy (building storey reference)', () => {
    const parser = new IFCParser(ifc2x3Fixture());
    const { entities } = parser.parse();
    const wall = entities.find((e) => e.name === 'External Wall');
    expect(wall).toBeDefined();
    // storey reference #100 should be captured
    expect(wall?.storeyRef).toBe('#100');
  });

  it('should import to DocumentSchema with all entities as elements', () => {
    const doc = parseIFC(ifc2x3Fixture());
    const elements = Object.values(doc.elements);
    // wall, door, window, slab, column, beam, space = 7
    expect(elements.length).toBeGreaterThanOrEqual(7);
  });
});

// ─── T-IFC-002: IFC 4 Import ─────────────────────────────────────────────────

describe('T-IFC-002: IFC 4 Import', () => {
  it('should parse IFC 4 format and detect schema', () => {
    const parser = new IFC4Parser(ifc4Fixture());
    const result = parser.parse();
    expect(result.schema).toBe('IFC4');
  });

  it('should handle NURBS curves (IFCRATIONALBSPLINECURVEWITHKNOTS)', () => {
    const parser = new IFC4Parser(ifc4Fixture());
    const { geometryEntities } = parser.parse();
    const nurbs = geometryEntities.find((g) => g.type === 'NURBS');
    expect(nurbs).toBeDefined();
    expect(nurbs?.controlPoints?.length).toBe(3);
  });

  it('should handle CSG geometry (IFCBOOLEANRESULT)', () => {
    const parser = new IFC4Parser(ifc4Fixture());
    const { geometryEntities } = parser.parse();
    const csg = geometryEntities.find((g) => g.type === 'CSG');
    expect(csg).toBeDefined();
    expect(csg?.operation).toBe('DIFFERENCE');
  });

  it('should import IFC 4 elements to DocumentSchema', () => {
    const doc = parseIFC(ifc4Fixture());
    const elements = Object.values(doc.elements);
    expect(elements.length).toBeGreaterThanOrEqual(2); // wall + door
  });
});

// ─── T-IFC-003: IFC 2x3 Export ───────────────────────────────────────────────

describe('T-IFC-003: IFC 2x3 Export', () => {
  it('should export valid IFC 2x3 with required header', () => {
    const project = createProject('Export Test', 'tester');
    const ifc = serializeIFC(project, { schema: 'IFC2X3' });
    expect(ifc).toContain('ISO-10303-21');
    expect(ifc).toContain("FILE_SCHEMA(('IFC2X3'))");
    expect(ifc).toContain('DATA;');
    expect(ifc).toContain('ENDSEC;');
    expect(ifc).toContain('END-ISO-10303-21;');
  });

  it('should include all required IFC header entities', () => {
    const project = createProject('Cert Test', 'tester');
    const ifc = serializeIFC(project, { schema: 'IFC2X3' });
    expect(ifc).toContain('FILE_DESCRIPTION');
    expect(ifc).toContain('FILE_NAME');
    expect(ifc).toContain('FILE_SCHEMA');
  });

  it('should export IFCWALLSTANDARDCASE for wall elements', () => {
    const project = createProject('Wall Test', 'tester');
    const layerId = Object.keys(project.layers)[0];
    const levelId = Object.keys(project.levels)[0];
    const wallId = crypto.randomUUID();
    project.elements[wallId] = {
      id: wallId,
      type: 'wall',
      properties: { Name: { type: 'string', value: 'South Wall' } },
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
        max: { x: 1, y: 0.3, z: 3, _type: 'Point3D' },
      },
      metadata: {
        id: wallId,
        createdBy: 'test',
        createdAt: 0,
        updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };

    const ifc = serializeIFC(project, { schema: 'IFC2X3' });
    expect(ifc).toContain('IFCWALLSTANDARDCASE');
    expect(ifc).toContain('South Wall');
  });
});

// ─── T-IFC-004: IFC 4 Export ─────────────────────────────────────────────────

describe('T-IFC-004: IFC 4 Export', () => {
  it('should export with IFC4 schema declaration', () => {
    const project = createProject('IFC4 Export', 'tester');
    const ifc = serializeIFC(project, { schema: 'IFC4' });
    expect(ifc).toContain("FILE_SCHEMA(('IFC4'))");
  });

  it('should use IFCWALL (not IFCWALLSTANDARDCASE) for IFC4', () => {
    const project = createProject('IFC4 Wall', 'tester');
    const layerId = Object.keys(project.layers)[0];
    const levelId = Object.keys(project.levels)[0];
    const wallId = crypto.randomUUID();
    project.elements[wallId] = {
      id: wallId,
      type: 'wall',
      properties: { Name: { type: 'string', value: 'IFC4 Wall' } },
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
        max: { x: 1, y: 0.3, z: 3, _type: 'Point3D' },
      },
      metadata: {
        id: wallId,
        createdBy: 'test',
        createdAt: 0,
        updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };

    const ifc = serializeIFC(project, { schema: 'IFC4' });
    // IFC4 uses IFCWALL not IFCWALLSTANDARDCASE
    expect(ifc).toMatch(/IFCWALL[^S]/);
  });
});

// ─── T-IFC-005: IFC Round-trip ────────────────────────────────────────────────

describe('T-IFC-005: IFC Round-trip', () => {
  it('should export then re-import preserving element count', () => {
    const project = createProject('Round-trip', 'tester');
    const layerId = Object.keys(project.layers)[0];
    const levelId = Object.keys(project.levels)[0];

    // Add a wall
    const wallId = crypto.randomUUID();
    project.elements[wallId] = {
      id: wallId,
      type: 'wall',
      properties: { Name: { type: 'string', value: 'RT Wall' } },
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
        max: { x: 5000, y: 300, z: 3000, _type: 'Point3D' },
      },
      metadata: {
        id: wallId,
        createdBy: 'test',
        createdAt: 0,
        updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };

    const exported = serializeIFC(project);
    const reimported = parseIFC(exported);
    const elements = Object.values(reimported.elements);

    expect(elements.length).toBe(Object.values(project.elements).length);
  });

  it('should preserve element names through round-trip', () => {
    const project = createProject('RT Name', 'tester');
    const layerId = Object.keys(project.layers)[0];
    const levelId = Object.keys(project.levels)[0];
    const wallId = crypto.randomUUID();
    project.elements[wallId] = {
      id: wallId,
      type: 'wall',
      properties: { Name: { type: 'string', value: 'Named Wall' } },
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
        max: { x: 1, y: 1, z: 1, _type: 'Point3D' },
      },
      metadata: {
        id: wallId,
        createdBy: 'test',
        createdAt: 0,
        updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };

    const exported = serializeIFC(project);
    const reimported = parseIFC(exported);
    const elements = Object.values(reimported.elements);
    const names = elements.map((e) => e.properties['Name']?.value);
    expect(names).toContain('Named Wall');
  });

  it('should preserve bounding box within 0.1mm tolerance', () => {
    const project = createProject('RT Geo', 'tester');
    const layerId = Object.keys(project.layers)[0];
    const levelId = Object.keys(project.levels)[0];
    const wallId = crypto.randomUUID();
    const bbox = {
      min: { x: 100.0, y: 200.0, z: 0.0, _type: 'Point3D' as const },
      max: { x: 5100.0, y: 500.0, z: 3000.0, _type: 'Point3D' as const },
    };
    project.elements[wallId] = {
      id: wallId,
      type: 'wall',
      properties: { Name: { type: 'string', value: 'Geo Wall' } },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId,
      levelId,
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: bbox,
      metadata: {
        id: wallId,
        createdBy: 'test',
        createdAt: 0,
        updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };

    const exported = serializeIFC(project);
    const reimported = parseIFC(exported);
    const el = Object.values(reimported.elements).find(
      (e) => e.properties['Name']?.value === 'Geo Wall'
    );
    expect(el).toBeDefined();
    // Bounding box should be preserved within 0.1mm
    const tolerance = 0.1;
    expect(Math.abs((el?.boundingBox.min.x ?? 0) - bbox.min.x)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs((el?.boundingBox.max.x ?? 0) - bbox.max.x)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs((el?.boundingBox.max.z ?? 0) - bbox.max.z)).toBeLessThanOrEqual(tolerance);
  });
});

// ─── T-IFC-006: IFC Property Sets ────────────────────────────────────────────

describe('T-IFC-006: IFC Property Sets', () => {
  it('should parse Pset_ elements', () => {
    const psets = parsePropertySets(psetFixture());
    expect(psets.length).toBeGreaterThanOrEqual(2);
    expect(psets.map((p) => p.name)).toContain('Pset_WallCommon');
    expect(psets.map((p) => p.name)).toContain('Pset_ThermalProperties');
  });

  it('should extract individual properties from Pset', () => {
    const psets = parsePropertySets(psetFixture());
    const wallCommon = psets.find((p) => p.name === 'Pset_WallCommon');
    expect(wallCommon).toBeDefined();
    const props = wallCommon?.properties ?? {};
    expect(props['FireRating']).toBe('1hr');
  });

  it('should associate Psets with the correct element', () => {
    const psets = parsePropertySets(psetFixture());
    const wallCommon = psets.find((p) => p.name === 'Pset_WallCommon');
    // element ref #1 (IFCWALL w1) should be in relatedObjects
    expect(wallCommon?.relatedObjectRefs).toContain('#1');
  });

  it('should import Psets into element propertySets on parseIFC', () => {
    const doc = parseIFC(psetFixture());
    const elements = Object.values(doc.elements);
    const wall = elements.find((e) => e.type === 'wall');
    expect(wall?.propertySets.length).toBeGreaterThan(0);
    const psetNames = wall?.propertySets.map((ps) => ps.name) ?? [];
    expect(psetNames).toContain('Pset_WallCommon');
  });
});

// ─── T-IFC-007: Large IFC Import Performance ─────────────────────────────────

describe('T-IFC-007: Large IFC Import Performance', () => {
  function generateLargeIFC(entityCount: number): string {
    const lines = [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_SCHEMA(('IFC2X3'));",
      'ENDSEC;',
      'DATA;',
    ];
    for (let i = 1; i <= entityCount; i++) {
      lines.push(
        `#${i}=IFCWALL('wall${i}',$,'Wall ${i}',$,$,$,$,$,$);`
      );
    }
    lines.push('ENDSEC;', 'END-ISO-10303-21;');
    return lines.join('\n');
  }

  it('should parse 10,000 entities without error', () => {
    const content = generateLargeIFC(10_000);
    const parser = new IFCParser(content);
    const { entities } = parser.parse();
    expect(entities.length).toBe(10_000);
  });

  it('should parse 10,000 entities within 5 seconds', () => {
    const content = generateLargeIFC(10_000);
    const start = Date.now();
    const parser = new IFCParser(content);
    parser.parse();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5_000); // 5s for 10k entities, scaled from 500MB/30s
  });

  it('should import 1,000 entities into DocumentSchema within 2 seconds', () => {
    const content = generateLargeIFC(1_000);
    const start = Date.now();
    const doc = parseIFC(content);
    const elapsed = Date.now() - start;
    expect(Object.values(doc.elements).length).toBe(1_000);
    expect(elapsed).toBeLessThan(2_000);
  });
});
