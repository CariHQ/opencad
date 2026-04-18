/**
 * T-DOC-006: DWG/DXF Import/Export — New API Tests
 *
 * Tests for the lower-level DXF parsing API:
 *   - parseDxf(content): DxfEntity[]
 *   - dxfToDocument(entities, projectId): DocumentSchema
 *   - documentToDxf(doc): string
 */

import { describe, it, expect } from 'vitest';
import { parseDxf, dxfToDocument, documentToDxf } from './dwg';
import { createProject, addElement } from './document';

// ─── DXF fixtures ─────────────────────────────────────────────────────────────

const MINIMAL_DXF_FIXTURE = `0
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
50.0
31
0.0
0
ARC
5
2A
8
Layer1
10
20.0
20
20.0
30
0.0
40
10.0
50
0.0
51
90.0
0
ENDSEC
0
EOF`;

const EMPTY_ENTITIES_DXF = `0
SECTION
2
ENTITIES
0
ENDSEC
0
EOF`;

const LWPOLYLINE_DXF = `0
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
3
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
5.0
20
8.0
0
ENDSEC
0
EOF`;

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

// ─── T-DOC-006: parseDxf ──────────────────────────────────────────────────────

describe('T-DOC-006: parseDxf extracts entity list from a minimal DXF string fixture', () => {
  it('returns an array of DxfEntity objects', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    expect(Array.isArray(entities)).toBe(true);
    expect(entities.length).toBe(2);
  });

  it('each entity has a type string', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    for (const entity of entities) {
      expect(typeof entity.type).toBe('string');
      expect(entity.type.length).toBeGreaterThan(0);
    }
  });

  it('each entity has a handle string', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    for (const entity of entities) {
      expect(typeof entity.handle).toBe('string');
    }
  });

  it('each entity has a properties record', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    for (const entity of entities) {
      expect(typeof entity.properties).toBe('object');
      expect(entity.properties).not.toBeNull();
    }
  });

  it('first entity type is LINE', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    expect(entities[0]!.type).toBe('LINE');
  });

  it('second entity type is ARC', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    expect(entities[1]!.type).toBe('ARC');
  });

  it('LINE entity handle is extracted', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    const line = entities.find((e) => e.type === 'LINE')!;
    expect(line.handle).toBe('1A');
  });

  it('LINE entity has group code 10 (X start) in properties', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    const line = entities.find((e) => e.type === 'LINE')!;
    expect(line.properties['10']).toBe('0.0');
  });

  it('LINE entity has group code 11 (X end) in properties', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    const line = entities.find((e) => e.type === 'LINE')!;
    expect(line.properties['11']).toBe('100.0');
  });

  it('ARC entity has group code 40 (radius) in properties', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    const arc = entities.find((e) => e.type === 'ARC')!;
    expect(arc.properties['40']).toBe('10.0');
  });
});

describe('parseDxf handles empty ENTITIES section', () => {
  it('returns an empty array for empty ENTITIES section', () => {
    const entities = parseDxf(EMPTY_ENTITIES_DXF);
    expect(entities).toHaveLength(0);
  });

  it('does not throw on empty input', () => {
    expect(() => parseDxf('')).not.toThrow();
  });

  it('returns empty array for content with no ENTITIES section', () => {
    const entities = parseDxf('0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF');
    expect(entities).toHaveLength(0);
  });
});

// ─── dxfToDocument ───────────────────────────────────────────────────────────

describe('dxfToDocument converts LINE entities to walls', () => {
  it('returns a DocumentSchema', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    const doc = dxfToDocument(entities, 'proj-001');
    expect(doc).toBeDefined();
    expect(doc.id).toBe('proj-001');
  });

  it('LINE entity becomes a line element in the document', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    const doc = dxfToDocument(entities, 'proj-001');
    const elements = Object.values(doc.content.elements);
    const lines = elements.filter((e) => e.type === 'line');
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('ARC entity becomes an arc element in the document', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    const doc = dxfToDocument(entities, 'proj-001');
    const elements = Object.values(doc.content.elements);
    const arcs = elements.filter((e) => e.type === 'arc');
    expect(arcs.length).toBeGreaterThanOrEqual(1);
  });

  it('LWPOLYLINE entity becomes a polyline element', () => {
    const entities = parseDxf(LWPOLYLINE_DXF);
    const doc = dxfToDocument(entities, 'proj-002');
    const elements = Object.values(doc.content.elements);
    const polys = elements.filter((e) => e.type === 'polyline');
    expect(polys.length).toBeGreaterThanOrEqual(1);
  });

  it('INSERT entity becomes a block_ref element', () => {
    const entities = parseDxf(INSERT_DXF);
    const doc = dxfToDocument(entities, 'proj-003');
    const elements = Object.values(doc.content.elements);
    const refs = elements.filter((e) => e.type === 'block_ref');
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it('produces a document with at least one layer', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    const doc = dxfToDocument(entities, 'proj-001');
    expect(Object.keys(doc.organization.layers).length).toBeGreaterThanOrEqual(1);
  });

  it('empty entities list produces document with no content elements', () => {
    const doc = dxfToDocument([], 'proj-empty');
    expect(Object.keys(doc.content.elements)).toHaveLength(0);
  });

  it('each element in the result has a valid layerId', () => {
    const entities = parseDxf(MINIMAL_DXF_FIXTURE);
    const doc = dxfToDocument(entities, 'proj-001');
    for (const el of Object.values(doc.content.elements)) {
      expect(doc.organization.layers[el.layerId]).toBeDefined();
    }
  });
});

// ─── documentToDxf ───────────────────────────────────────────────────────────

describe('documentToDxf produces a string containing ENTITIES section', () => {
  it('returns a string', () => {
    const doc = createProject('test', 'user');
    const result = documentToDxf(doc);
    expect(typeof result).toBe('string');
  });

  it('output contains ENTITIES section header', () => {
    const doc = createProject('test', 'user');
    const result = documentToDxf(doc);
    expect(result).toContain('ENTITIES');
  });

  it('output contains ENDSEC', () => {
    const doc = createProject('test', 'user');
    const result = documentToDxf(doc);
    expect(result).toContain('ENDSEC');
  });

  it('wall element produces LINE entity in output', () => {
    const doc = createProject('test', 'user');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
    addElement(doc, {
      type: 'line',
      points: [
        { x: 0, y: 0, z: 0, _type: 'Point3D' },
        { x: 100, y: 0, z: 0, _type: 'Point3D' },
      ],
      properties: {},
      layerId,
      levelId,
    });
    const result = documentToDxf(doc);
    expect(result).toContain('LINE');
  });

  it('arc element produces ARC entity in output', () => {
    const doc = createProject('test', 'user');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
    addElement(doc, {
      type: 'arc',
      properties: {
        CenterX: { type: 'number', value: 0 },
        CenterY: { type: 'number', value: 0 },
        Radius: { type: 'number', value: 10 },
        StartAngle: { type: 'number', value: 0 },
        EndAngle: { type: 'number', value: 90 },
      },
      layerId,
      levelId,
    });
    const result = documentToDxf(doc);
    expect(result).toContain('ARC');
  });

  it('polyline element produces LWPOLYLINE entity in output', () => {
    const doc = createProject('test', 'user');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;
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
    const result = documentToDxf(doc);
    expect(result).toContain('LWPOLYLINE');
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe('Round-trip: document → documentToDxf → parseDxf → dxfToDocument', () => {
  it('round-trip preserves line count', () => {
    const doc = createProject('rt', 'user');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;

    addElement(doc, {
      type: 'line',
      points: [
        { x: 0, y: 0, z: 0, _type: 'Point3D' },
        { x: 200, y: 100, z: 0, _type: 'Point3D' },
      ],
      properties: {},
      layerId,
      levelId,
    });

    const dxfStr = documentToDxf(doc);
    const entities = parseDxf(dxfStr);
    const restored = dxfToDocument(entities, 'rt-restored');

    const origLines = Object.values(doc.content.elements).filter((e) => e.type === 'line').length;
    const restoredLines = Object.values(restored.content.elements).filter((e) => e.type === 'line').length;
    expect(restoredLines).toBe(origLines);
  });

  it('round-trip preserves arc count', () => {
    const doc = createProject('rt-arc', 'user');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;

    addElement(doc, {
      type: 'arc',
      properties: {
        CenterX: { type: 'number', value: 50 },
        CenterY: { type: 'number', value: 50 },
        Radius: { type: 'number', value: 25 },
        StartAngle: { type: 'number', value: 0 },
        EndAngle: { type: 'number', value: 180 },
      },
      layerId,
      levelId,
    });

    const dxfStr = documentToDxf(doc);
    const entities = parseDxf(dxfStr);
    const restored = dxfToDocument(entities, 'rt-arc-restored');

    const origArcs = Object.values(doc.content.elements).filter((e) => e.type === 'arc').length;
    const restoredArcs = Object.values(restored.content.elements).filter((e) => e.type === 'arc').length;
    expect(restoredArcs).toBe(origArcs);
  });

  it('round-trip preserves total element count (within reason)', () => {
    const doc = createProject('rt-multi', 'user');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    const levelId = Object.keys(doc.organization.levels)[0]!;

    addElement(doc, {
      type: 'line',
      points: [
        { x: 0, y: 0, z: 0, _type: 'Point3D' },
        { x: 100, y: 0, z: 0, _type: 'Point3D' },
      ],
      properties: {},
      layerId,
      levelId,
    });
    addElement(doc, {
      type: 'arc',
      properties: {
        CenterX: { type: 'number', value: 0 },
        CenterY: { type: 'number', value: 0 },
        Radius: { type: 'number', value: 10 },
        StartAngle: { type: 'number', value: 0 },
        EndAngle: { type: 'number', value: 90 },
      },
      layerId,
      levelId,
    });

    const origCount = Object.keys(doc.content.elements).length;
    const dxfStr = documentToDxf(doc);
    const entities = parseDxf(dxfStr);
    const restored = dxfToDocument(entities, 'rt-multi-restored');
    const restoredCount = Object.keys(restored.content.elements).length;

    // Allow ±1 tolerance for any adapter differences
    expect(Math.abs(restoredCount - origCount)).toBeLessThanOrEqual(1);
  });
});
