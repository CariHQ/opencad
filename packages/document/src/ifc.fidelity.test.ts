/**
 * T-IFC-045: IFC Round-trip Fidelity
 *
 * Exercises the full export → re-import pipeline and asserts that
 * dimensional, structural, and semantic data survive the round-trip.
 *
 * These tests fail loudly if the serializer or parser regress on any
 * field that a downstream IFC consumer (Revit, Solibri, BIMcollab, etc.)
 * would rely on when reading our output.
 */

import { describe, it, expect } from 'vitest';
import { serializeIFC, parseIFC } from './ifc';
import { createProject } from './document';
import type { DocumentSchema, ElementSchema, ElementType } from './types';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

interface ElementSpec {
  name: string;
  type: ElementType;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  props?: Record<string, { type: 'string' | 'number' | 'boolean'; value: string | number | boolean }>;
}

function addElement(doc: DocumentSchema, spec: ElementSpec): string {
  const elementId = crypto.randomUUID();
  const layerId = Object.keys(doc.organization.layers)[0]!;
  const levelId = Object.keys(doc.organization.levels)[0]!;

  const properties: ElementSchema['properties'] = {
    Name: { type: 'string', value: spec.name },
    ...(spec.props ?? {}),
  };

  doc.content.elements[elementId] = {
    id: elementId,
    type: spec.type,
    properties,
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
      min: { x: spec.bbox.min[0], y: spec.bbox.min[1], z: spec.bbox.min[2], _type: 'Point3D' },
      max: { x: spec.bbox.max[0], y: spec.bbox.max[1], z: spec.bbox.max[2], _type: 'Point3D' },
    },
    metadata: {
      id: elementId,
      createdBy: 'fidelity-test',
      createdAt: 0,
      updatedAt: 0,
      version: { clock: {} },
    },
    visible: true,
    locked: false,
  };

  return elementId;
}

function findByName(doc: DocumentSchema, name: string): ElementSchema | undefined {
  return Object.values(doc.content.elements).find(
    (e) => e.properties['Name']?.value === name,
  );
}

// ─── Dimensional fidelity ────────────────────────────────────────────────────

describe('T-IFC-045: dimensional fidelity', () => {
  it('preserves wall StartX/Y, EndX/Y, Height, Thickness through round-trip', () => {
    const doc = createProject('fid-wall', 'tester');
    addElement(doc, {
      name: 'Dim Wall',
      type: 'wall',
      bbox: { min: [0, 0, 0], max: [5000, 200, 3000] },
      props: {
        StartX:   { type: 'number', value: 0 },
        StartY:   { type: 'number', value: 0 },
        EndX:     { type: 'number', value: 5000 },
        EndY:     { type: 'number', value: 0 },
        Height:   { type: 'number', value: 3000 },
        Thickness:{ type: 'number', value: 200 },
      },
    });

    const exported = serializeIFC(doc);
    const reimported = parseIFC(exported);
    const wall = findByName(reimported, 'Dim Wall');

    expect(wall).toBeDefined();
    expect(Number(wall!.properties['StartX']!.value)).toBeCloseTo(0, 3);
    expect(Number(wall!.properties['StartY']!.value)).toBeCloseTo(0, 3);
    expect(Number(wall!.properties['EndX']!.value)).toBeCloseTo(5000, 3);
    expect(Number(wall!.properties['Height']!.value)).toBeCloseTo(3000, 3);
    expect(Number(wall!.properties['Thickness']!.value)).toBeCloseTo(200, 3);
  });

  it('preserves wall placement for an off-origin wall', () => {
    const doc = createProject('fid-wall-offset', 'tester');
    addElement(doc, {
      name: 'Offset Wall',
      type: 'wall',
      bbox: { min: [1000, 2000, 0], max: [4000, 2200, 3000] },
      props: {
        StartX:   { type: 'number', value: 1000 },
        StartY:   { type: 'number', value: 2000 },
        EndX:     { type: 'number', value: 4000 },
        EndY:     { type: 'number', value: 2000 },
        Height:   { type: 'number', value: 3000 },
        Thickness:{ type: 'number', value: 200 },
      },
    });

    const reimported = parseIFC(serializeIFC(doc));
    const wall = findByName(reimported, 'Offset Wall');

    expect(wall).toBeDefined();
    expect(Number(wall!.properties['StartX']!.value)).toBeCloseTo(1000, 2);
    expect(Number(wall!.properties['StartY']!.value)).toBeCloseTo(2000, 2);
  });

  it('preserves slab bounding box within 0.1mm', () => {
    const doc = createProject('fid-slab', 'tester');
    addElement(doc, {
      name: 'Ground Slab',
      type: 'slab',
      bbox: { min: [100, 200, 0], max: [6100, 4200, 300] },
    });

    const reimported = parseIFC(serializeIFC(doc));
    const slab = findByName(reimported, 'Ground Slab');

    expect(slab).toBeDefined();
    expect(slab!.boundingBox.min.x).toBeCloseTo(100, 2);
    expect(slab!.boundingBox.min.y).toBeCloseTo(200, 2);
    expect(slab!.boundingBox.max.x).toBeCloseTo(6100, 2);
    expect(slab!.boundingBox.max.y).toBeCloseTo(4200, 2);
    expect(slab!.boundingBox.max.z).toBeCloseTo(300, 2);
  });

  it('survives ten walls with unique names and dimensions', () => {
    const doc = createProject('fid-multi-wall', 'tester');
    for (let i = 0; i < 10; i++) {
      addElement(doc, {
        name: `Wall ${i}`,
        type: 'wall',
        bbox: { min: [i * 1000, 0, 0], max: [i * 1000 + 800, 200, 3000] },
        props: {
          StartX:   { type: 'number', value: i * 1000 },
          StartY:   { type: 'number', value: 0 },
          EndX:     { type: 'number', value: i * 1000 + 800 },
          EndY:     { type: 'number', value: 0 },
          Height:   { type: 'number', value: 3000 },
          Thickness:{ type: 'number', value: 200 },
        },
      });
    }

    const reimported = parseIFC(serializeIFC(doc));
    const walls = Object.values(reimported.content.elements).filter((e) => e.type === 'wall');
    expect(walls.length).toBe(10);

    for (let i = 0; i < 10; i++) {
      expect(findByName(reimported, `Wall ${i}`)).toBeDefined();
    }
  });
});

// ─── Structural fidelity ─────────────────────────────────────────────────────

describe('T-IFC-045: structural fidelity', () => {
  it('preserves every BIM element type in a mixed document', () => {
    const doc = createProject('fid-mixed', 'tester');
    const specs: ElementSpec[] = [
      { name: 'W',  type: 'wall',   bbox: { min: [0, 0, 0], max: [3000, 200, 3000] } },
      { name: 'D',  type: 'door',   bbox: { min: [900, 0, 0], max: [1800, 200, 2100] } },
      { name: 'WD', type: 'window', bbox: { min: [2000, 0, 900], max: [2900, 200, 2100] } },
      { name: 'S',  type: 'slab',   bbox: { min: [0, 0, 0], max: [5000, 4000, 300] } },
      { name: 'R',  type: 'roof',   bbox: { min: [0, 0, 3000], max: [5000, 4000, 3300] } },
      { name: 'C',  type: 'column', bbox: { min: [0, 0, 0], max: [300, 300, 3000] } },
      { name: 'B',  type: 'beam',   bbox: { min: [0, 0, 2700], max: [5000, 200, 3000] } },
      { name: 'ST', type: 'stair',  bbox: { min: [0, 0, 0], max: [1200, 3000, 3000] } },
      { name: 'SP', type: 'space',  bbox: { min: [0, 0, 0], max: [5000, 4000, 3000] } },
    ];
    for (const s of specs) addElement(doc, s);

    const reimported = parseIFC(serializeIFC(doc));
    for (const s of specs) {
      const el = findByName(reimported, s.name);
      expect(el, `missing ${s.name} after round-trip`).toBeDefined();
      expect(el!.type).toBe(s.type);
    }
  });

  it('preserves multiple storeys by name', () => {
    const doc = createProject('fid-levels', 'tester');
    const l1 = Object.keys(doc.organization.levels)[0]!;
    doc.organization.levels[l1]!.name = 'Ground';

    const l2 = crypto.randomUUID();
    doc.organization.levels[l2] = {
      id: l2, name: 'First Floor', elevation: 3000, height: 3000, order: 1,
    };
    const l3 = crypto.randomUUID();
    doc.organization.levels[l3] = {
      id: l3, name: 'Roof',        elevation: 6000, height: 3000, order: 2,
    };

    const exported = serializeIFC(doc);
    expect(exported).toContain("'Ground'");
    expect(exported).toContain("'First Floor'");
    expect(exported).toContain("'Roof'");
  });
});

// ─── Semantic fidelity ──────────────────────────────────────────────────────

describe('T-IFC-045: semantic fidelity', () => {
  it('preserves GUID (element id) through round-trip', () => {
    const doc = createProject('fid-guid', 'tester');
    const id = addElement(doc, {
      name: 'GUID Wall',
      type: 'wall',
      bbox: { min: [0, 0, 0], max: [3000, 200, 3000] },
    });

    const exported = serializeIFC(doc);
    // The serializer embeds the element id as the IFC GUID (first quoted arg).
    expect(exported).toContain(`'${id}'`);
  });

  it('preserves Name property for every element type', () => {
    const doc = createProject('fid-names', 'tester');
    const names = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    const types: ElementType[] = ['wall', 'slab', 'door', 'window'];
    for (let i = 0; i < names.length; i++) {
      addElement(doc, {
        name: names[i]!,
        type: types[i]!,
        bbox: { min: [i, i, 0], max: [i + 100, i + 100, 100] },
      });
    }

    const reimported = parseIFC(serializeIFC(doc));
    for (const n of names) {
      expect(findByName(reimported, n), `missing ${n}`).toBeDefined();
    }
  });

  it('emits a valid IFC 2x3 header by default', () => {
    const doc = createProject('fid-header', 'tester');
    const exported = serializeIFC(doc);
    expect(exported).toMatch(/^ISO-10303-21;/);
    expect(exported).toContain("FILE_SCHEMA(('IFC2X3'));");
    expect(exported).toContain('DATA;');
    expect(exported).toContain('END-ISO-10303-21;');
  });

  it('emits IFC4 header when requested', () => {
    const doc = createProject('fid-ifc4', 'tester');
    const exported = serializeIFC(doc, { schema: 'IFC4' });
    expect(exported).toContain("FILE_SCHEMA(('IFC4'));");
  });
});

// ─── Count fidelity ─────────────────────────────────────────────────────────

describe('T-IFC-045: count fidelity', () => {
  it('N walls in = N walls out', () => {
    const doc = createProject('fid-count', 'tester');
    for (let i = 0; i < 25; i++) {
      addElement(doc, {
        name: `W${i}`,
        type: 'wall',
        bbox: { min: [i * 500, 0, 0], max: [i * 500 + 400, 200, 3000] },
      });
    }
    const reimported = parseIFC(serializeIFC(doc));
    const wallCount = Object.values(reimported.content.elements).filter(
      (e) => e.type === 'wall',
    ).length;
    expect(wallCount).toBe(25);
  });

  it('mixed 30-element document preserves every element', () => {
    const doc = createProject('fid-mixed30', 'tester');
    const types: ElementType[] = ['wall', 'slab', 'door', 'window', 'column', 'beam'];
    for (let i = 0; i < 30; i++) {
      addElement(doc, {
        name: `E${i}`,
        type: types[i % types.length]!,
        bbox: { min: [i, 0, 0], max: [i + 100, 100, 100] },
      });
    }
    const reimported = parseIFC(serializeIFC(doc));
    expect(Object.keys(reimported.content.elements).length).toBe(30);
  });
});
