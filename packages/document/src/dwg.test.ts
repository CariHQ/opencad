/**
 * DWG/DXF Import/Export Tests
 * T-IO-007: DXF import produces valid document with correct elements
 *
 * Tests are organised around three scenarios:
 *   1. Parsing — importDXF / parseDXF with various entity types
 *   2. Layer extraction — from ENTITIES and TABLES sections
 *   3. Round-trip — exportDXF → importDXF preserves geometry
 */
import { describe, it, expect } from 'vitest';
import { parseDXF, serializeDXF, importDXF, exportDXF } from './dwg';
import { createProject, addElement } from './document';

// ─── Fixture DXF strings ──────────────────────────────────────────────────────

/** Minimal DXF with one LINE and one CIRCLE on "Layer1". */
const MINIMAL_DXF = `  0
SECTION
  2
ENTITIES
  0
LINE
  5
1A
  8
Layer1
 10
0.0
 20
0.0
 30
0.0
 11
100.0
 21
0.0
 31
0.0
  0
CIRCLE
  5
1B
  8
Layer1
 10
50.0
 20
50.0
 30
0.0
 40
25.0
  0
ENDSEC
  0
EOF`;

/** DXF with no entities inside the ENTITIES section. */
const EMPTY_DXF = `  0
SECTION
  2
ENTITIES
  0
ENDSEC
  0
EOF`;

/** DXF with a single ARC (codes 50/51 for start/end angle). */
const DXF_WITH_ARC = `  0
SECTION
  2
ENTITIES
  0
ARC
  5
2A
  8
Drawing
 10
10.0
 20
10.0
 30
0.0
 40
15.0
 50
0.0
 51
90.0
  0
ENDSEC
  0
EOF`;

/** DXF with a LWPOLYLINE containing 4 vertices. */
const DXF_WITH_POLYLINE = `  0
SECTION
  2
ENTITIES
  0
LWPOLYLINE
  5
3A
  8
Layer1
 90
4
 70
0
 10
0.0
 20
0.0
 10
10.0
 20
0.0
 10
10.0
 20
10.0
 10
0.0
 20
10.0
  0
ENDSEC
  0
EOF`;

/** DXF with a TEXT entity. */
const DXF_WITH_TEXT = `  0
SECTION
  2
ENTITIES
  0
TEXT
  5
4A
  8
Annotations
 10
5.0
 20
5.0
 30
0.0
 40
2.5
  1
Hello DXF
  0
ENDSEC
  0
EOF`;

/** DXF with a TABLES/LAYER section plus one entity. */
const DXF_WITH_LAYER_TABLE = `  0
SECTION
  2
TABLES
  0
TABLE
  2
LAYER
  5
10
 70
2
  0
LAYER
  5
11
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
  2
WALLS
 70
0
 62
1
  0
LAYER
  5
12
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
  2
STRUCTURAL
 70
0
 62
3
  0
ENDTAB
  0
ENDSEC
  0
SECTION
  2
ENTITIES
  0
LINE
  5
20
  8
WALLS
 10
0.0
 20
0.0
 30
0.0
 11
500.0
 21
0.0
 31
0.0
  0
ENDSEC
  0
EOF`;

// ─── T-IO-007: parseDXF ───────────────────────────────────────────────────────

describe('T-IO-007: parseDXF', () => {
  it('returns a valid DocumentSchema', () => {
    const doc = parseDXF(MINIMAL_DXF);
    expect(doc).toBeDefined();
    expect(doc.id).toBeTruthy();
  });

  it('parses LINE entities as line elements', () => {
    const doc = parseDXF(MINIMAL_DXF);
    const elements = Object.values(doc.content.elements);
    const lines = elements.filter((e) => e.type === 'line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('parses CIRCLE entities as circle elements', () => {
    const doc = parseDXF(MINIMAL_DXF);
    const elements = Object.values(doc.content.elements);
    const circles = elements.filter((e) => e.type === 'circle');
    expect(circles.length).toBeGreaterThan(0);
  });

  it('parses ARC entities as arc elements', () => {
    const doc = parseDXF(DXF_WITH_ARC);
    const elements = Object.values(doc.content.elements);
    const arcs = elements.filter((e) => e.type === 'arc');
    expect(arcs.length).toBeGreaterThan(0);
  });

  it('returns empty elements for DXF with no entities', () => {
    const doc = parseDXF(EMPTY_DXF);
    expect(Object.keys(doc.content.elements)).toHaveLength(0);
  });

  it('creates a layer for the entity layer name', () => {
    const doc = parseDXF(MINIMAL_DXF);
    const layerNames = Object.values(doc.organization.layers).map((l) => l.name);
    expect(layerNames).toContain('Layer1');
  });

  it('each element has required fields', () => {
    const doc = parseDXF(MINIMAL_DXF);
    for (const el of Object.values(doc.content.elements)) {
      expect(el.id).toBeTruthy();
      expect(el.type).toBeTruthy();
      expect(el.layerId).toBeTruthy();
    }
  });

  it('each element has transform', () => {
    const doc = parseDXF(MINIMAL_DXF);
    for (const el of Object.values(doc.content.elements)) {
      expect(el.transform).toBeDefined();
      expect(el.transform.translation).toBeDefined();
    }
  });

  it('metadata schemaVersion is set', () => {
    const doc = parseDXF(MINIMAL_DXF);
    expect(doc.metadata.schemaVersion).toBe('1.0.0');
  });
});

// ─── T-IO-007: serializeDXF ───────────────────────────────────────────────────

describe('T-IO-007: serializeDXF', () => {
  it('returns a non-empty string', () => {
    const doc = createProject('test', 'user');
    const dxf = serializeDXF(doc);
    expect(typeof dxf).toBe('string');
    expect(dxf.length).toBeGreaterThan(0);
  });

  it('output contains SECTION header', () => {
    const doc = createProject('test', 'user');
    const dxf = serializeDXF(doc);
    expect(dxf).toContain('SECTION');
  });

  it('output contains ENDSEC', () => {
    const doc = createProject('test', 'user');
    const dxf = serializeDXF(doc);
    expect(dxf).toContain('ENDSEC');
  });

  it('serializes line elements as LINE entities', () => {
    const doc = createProject('test', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    doc.content.elements['e1'] = {
      id: 'e1',
      type: 'line',
      properties: {},
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
        id: 'e1',
        createdBy: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };
    const dxf = serializeDXF(doc);
    expect(dxf).toContain('LINE');
  });
});

// ─── T-DXF-PARSE: Detailed parser tests ──────────────────────────────────────

describe('T-DXF-PARSE: Minimal DXF with 1 LINE and 1 CIRCLE', () => {
  it('extracts exactly 1 LINE and 1 CIRCLE', () => {
    const doc = parseDXF(MINIMAL_DXF);
    const els = Object.values(doc.content.elements);
    expect(els.filter((e) => e.type === 'line').length).toBe(1);
    expect(els.filter((e) => e.type === 'circle').length).toBe(1);
  });

  it('LINE has correct start coordinates in transform', () => {
    const doc = parseDXF(MINIMAL_DXF);
    const line = Object.values(doc.content.elements).find((e) => e.type === 'line')!;
    expect(line.transform.translation.x).toBe(0);
    expect(line.transform.translation.y).toBe(0);
  });

  it('LINE has correct end coordinates in properties', () => {
    const doc = parseDXF(MINIMAL_DXF);
    const line = Object.values(doc.content.elements).find((e) => e.type === 'line')!;
    expect(line.properties['EndX']?.value).toBe(100);
    expect(line.properties['EndY']?.value).toBe(0);
  });

  it('CIRCLE has correct center coordinates', () => {
    const doc = parseDXF(MINIMAL_DXF);
    const circle = Object.values(doc.content.elements).find((e) => e.type === 'circle')!;
    expect(circle.transform.translation.x).toBe(50);
    expect(circle.transform.translation.y).toBe(50);
  });

  it('CIRCLE has correct radius property', () => {
    const doc = parseDXF(MINIMAL_DXF);
    const circle = Object.values(doc.content.elements).find((e) => e.type === 'circle')!;
    expect(circle.properties['Radius']?.value).toBe(25);
  });

  it('ARC includes start and end angle properties', () => {
    const doc = parseDXF(DXF_WITH_ARC);
    const arc = Object.values(doc.content.elements).find((e) => e.type === 'arc')!;
    expect(arc.properties['StartAngle']?.value).toBe(0);
    expect(arc.properties['EndAngle']?.value).toBe(90);
  });

  it('LWPOLYLINE is parsed with correct vertex count', () => {
    const doc = parseDXF(DXF_WITH_POLYLINE);
    const poly = Object.values(doc.content.elements).find((e) => e.type === 'polyline')!;
    expect(poly).toBeDefined();
    // The Points JSON should have 4 entries
    const pts = JSON.parse(poly.properties['Points']?.value as string ?? '[]') as unknown[];
    expect(pts.length).toBe(4);
  });

  it('TEXT entity is parsed with content', () => {
    const doc = parseDXF(DXF_WITH_TEXT);
    const text = Object.values(doc.content.elements).find((e) => e.type === 'text')!;
    expect(text).toBeDefined();
    expect(text.properties['Content']?.value).toBe('Hello DXF');
  });

  it('INSERT entity becomes a block_ref element with BlockName', () => {
    const INSERT_DXF = `0
SECTION
2
ENTITIES
0
INSERT
5
4A
8
Layer1
2
DOOR_BLOCK
10
100.0
20
200.0
30
0.0
0
ENDSEC
0
EOF`;
    const doc = parseDXF(INSERT_DXF);
    const refs = Object.values(doc.content.elements).filter((e) => e.type === 'block_ref');
    expect(refs.length).toBe(1);
    expect(refs[0]!.properties['BlockName']?.value).toBe('DOOR_BLOCK');
  });
});

// ─── T-DXF-LAYER: Layer table parsing ────────────────────────────────────────

describe('T-DXF-LAYER: DXF with LAYER table', () => {
  it('creates layers defined in TABLES/LAYER section', () => {
    const doc = parseDXF(DXF_WITH_LAYER_TABLE);
    const names = Object.values(doc.organization.layers).map((l) => l.name);
    expect(names).toContain('WALLS');
    expect(names).toContain('STRUCTURAL');
  });

  it('LINE entity is assigned to the correct layer', () => {
    const doc = parseDXF(DXF_WITH_LAYER_TABLE);
    const line = Object.values(doc.content.elements).find((e) => e.type === 'line')!;
    const layer = doc.organization.layers[line.layerId];
    expect(layer.name).toBe('WALLS');
  });

  it('layer colour derived from ACI colour index', () => {
    const doc = parseDXF(DXF_WITH_LAYER_TABLE);
    const walls = Object.values(doc.organization.layers).find((l) => l.name === 'WALLS')!;
    // ACI 1 = red
    expect(walls.color).toBe('#FF0000');
  });
});

// ─── T-DXF-IMPORT: importDXF Result type ─────────────────────────────────────

describe('T-DXF-IMPORT: importDXF returns Result<DocumentSchema, string>', () => {
  it('returns ok:true and a valid document for valid DXF', () => {
    const result = importDXF(MINIMAL_DXF);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBeTruthy();
      const lines = Object.values(result.value.content.elements).filter((e) => e.type === 'line');
      expect(lines.length).toBe(1);
    }
  });

  it('returns ok:false for empty input', () => {
    const result = importDXF('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });

  it('returns ok:true even for empty ENTITIES section', () => {
    const result = importDXF(EMPTY_DXF);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value.content.elements)).toHaveLength(0);
    }
  });
});

// ─── T-DXF-EXPORT: exportDXF output structure ────────────────────────────────

describe('T-DXF-EXPORT: exportDXF output structure', () => {
  it('includes HEADER section', () => {
    const doc = createProject('test', 'user');
    const dxf = exportDXF(doc);
    expect(dxf).toContain('HEADER');
  });

  it('includes TABLES section with LAYER table', () => {
    const doc = createProject('test', 'user');
    const dxf = exportDXF(doc);
    expect(dxf).toContain('TABLES');
    expect(dxf).toContain('LAYER');
  });

  it('includes ENTITIES section', () => {
    const doc = createProject('test', 'user');
    const dxf = exportDXF(doc);
    expect(dxf).toContain('ENTITIES');
  });

  it('ends with EOF marker', () => {
    const doc = createProject('test', 'user');
    const dxf = exportDXF(doc);
    expect(dxf.trim()).toMatch(/EOF\s*$/);
  });

  it('exports circle elements as CIRCLE entities', () => {
    const doc = createProject('test', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    addElement(doc, {
      type: 'circle',
      properties: {
        CenterX: { type: 'number', value: 10 },
        CenterY: { type: 'number', value: 20 },
        Radius:  { type: 'number', value: 5 },
      },
      layerId,
      levelId,
    });
    expect(exportDXF(doc)).toContain('CIRCLE');
  });

  it('exports arc elements as ARC entities with angle codes', () => {
    const doc = createProject('test', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    addElement(doc, {
      type: 'arc',
      properties: {
        CenterX:    { type: 'number', value: 0 },
        CenterY:    { type: 'number', value: 0 },
        Radius:     { type: 'number', value: 10 },
        StartAngle: { type: 'number', value: 0 },
        EndAngle:   { type: 'number', value: 180 },
      },
      layerId,
      levelId,
    });
    const dxf = exportDXF(doc);
    expect(dxf).toContain('ARC');
    expect(dxf).toContain('50');   // start-angle group code
    expect(dxf).toContain('51');   // end-angle group code
  });

  it('exports polyline elements as LWPOLYLINE entities', () => {
    const doc = createProject('test', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    addElement(doc, {
      type: 'polyline',
      points: [
        { x: 0, y: 0, z: 0, _type: 'Point3D' },
        { x: 10, y: 0, z: 0, _type: 'Point3D' },
        { x: 10, y: 10, z: 0, _type: 'Point3D' },
      ],
      layerId,
      levelId,
    });
    expect(exportDXF(doc)).toContain('LWPOLYLINE');
  });

  it('exports text elements as TEXT entities', () => {
    const doc = createProject('test', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];
    addElement(doc, {
      type: 'text',
      properties: {
        X:       { type: 'number', value: 0 },
        Y:       { type: 'number', value: 0 },
        Content: { type: 'string', value: 'Label' },
      },
      layerId,
      levelId,
    });
    const dxf = exportDXF(doc);
    expect(dxf).toContain('TEXT');
    expect(dxf).toContain('Label');
  });

  it('layer names appear in TABLES section', () => {
    const doc = createProject('test', 'user');
    const dxf = exportDXF(doc);
    const layerName = Object.values(doc.organization.layers)[0].name;
    expect(dxf).toContain(layerName);
  });
});

// ─── T-DXF-ROUNDTRIP: Export → Import round-trip ─────────────────────────────

describe('T-DXF-ROUNDTRIP: exportDXF(schema) → importDXF(result) → verify elements', () => {
  it('LINE count is preserved after round-trip', () => {
    const doc = createProject('rt-line', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];

    addElement(doc, {
      type: 'line',
      properties: {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX:   { type: 'number', value: 200 },
        EndY:   { type: 'number', value: 100 },
      },
      points: [
        { x: 0,   y: 0,   z: 0, _type: 'Point3D' },
        { x: 200, y: 100, z: 0, _type: 'Point3D' },
      ],
      layerId,
      levelId,
    });

    const exported = exportDXF(doc);
    const result = importDXF(exported);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lines = Object.values(result.value.content.elements).filter((e) => e.type === 'line');
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('CIRCLE count is preserved after round-trip', () => {
    const doc = createProject('rt-circle', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];

    addElement(doc, {
      type: 'circle',
      properties: {
        CenterX: { type: 'number', value: 50 },
        CenterY: { type: 'number', value: 50 },
        Radius:  { type: 'number', value: 25 },
      },
      layerId,
      levelId,
    });

    const exported = exportDXF(doc);
    const result = importDXF(exported);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const circles = Object.values(result.value.content.elements).filter((e) => e.type === 'circle');
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it('circle radius is preserved after round-trip', () => {
    const doc = createProject('rt-circle-r', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];

    addElement(doc, {
      type: 'circle',
      properties: {
        CenterX: { type: 'number', value: 0 },
        CenterY: { type: 'number', value: 0 },
        Radius:  { type: 'number', value: 42 },
      },
      layerId,
      levelId,
    });

    const exported = exportDXF(doc);
    const result = importDXF(exported);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const circle = Object.values(result.value.content.elements).find((e) => e.type === 'circle')!;
    expect(circle.properties['Radius']?.value).toBe(42);
  });

  it('POLYLINE vertex count is preserved after round-trip', () => {
    const doc = createProject('rt-poly', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];

    const pts: Array<{ x: number; y: number; z: number; _type: 'Point3D' }> = [
      { x: 0, y: 0, z: 0, _type: 'Point3D' },
      { x: 10, y: 0, z: 0, _type: 'Point3D' },
      { x: 10, y: 10, z: 0, _type: 'Point3D' },
      { x: 0, y: 10, z: 0, _type: 'Point3D' },
    ];

    addElement(doc, {
      type: 'polyline',
      properties: {
        Points: { type: 'string', value: JSON.stringify(pts.map((p) => ({ x: p.x, y: p.y }))) },
      },
      points: pts,
      layerId,
      levelId,
    });

    const exported = exportDXF(doc);
    const result = importDXF(exported);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const poly = Object.values(result.value.content.elements).find((e) => e.type === 'polyline')!;
    expect(poly).toBeDefined();
    const importedPts = JSON.parse(poly.properties['Points']?.value as string ?? '[]') as unknown[];
    expect(importedPts.length).toBe(4);
  });

  it('layer name for LINE is preserved after round-trip', () => {
    const doc = createProject('rt-layer', 'user');
    // Rename the default layer to something distinctive
    const layerId = Object.keys(doc.organization.layers)[0];
    doc.organization.layers[layerId].name = 'MyWalls';
    const levelId = Object.keys(doc.organization.levels)[0];

    addElement(doc, {
      type: 'line',
      points: [
        { x: 0, y: 0, z: 0, _type: 'Point3D' },
        { x: 100, y: 0, z: 0, _type: 'Point3D' },
      ],
      layerId,
      levelId,
    });

    const exported = exportDXF(doc);
    const result = importDXF(exported);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const layerNames = Object.values(result.value.organization.layers).map((l) => l.name);
    expect(layerNames).toContain('MyWalls');
  });

  it('multiple element types coexist after round-trip', () => {
    const doc = createProject('rt-multi', 'user');
    const layerId = Object.keys(doc.organization.layers)[0];
    const levelId = Object.keys(doc.organization.levels)[0];

    addElement(doc, {
      type: 'line',
      points: [
        { x: 0, y: 0, z: 0, _type: 'Point3D' },
        { x: 100, y: 0, z: 0, _type: 'Point3D' },
      ],
      layerId,
      levelId,
    });
    addElement(doc, {
      type: 'circle',
      properties: {
        CenterX: { type: 'number', value: 50 },
        CenterY: { type: 'number', value: 50 },
        Radius:  { type: 'number', value: 10 },
      },
      layerId,
      levelId,
    });

    const exported = exportDXF(doc);
    const result = importDXF(exported);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const els = Object.values(result.value.content.elements);
    expect(els.filter((e) => e.type === 'line').length).toBeGreaterThanOrEqual(1);
    expect(els.filter((e) => e.type === 'circle').length).toBeGreaterThanOrEqual(1);
  });
});
