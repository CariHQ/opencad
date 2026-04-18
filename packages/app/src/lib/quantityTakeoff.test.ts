/**
 * Quantity Takeoff Tests
 * T-BIM-002-001 through T-BIM-002-008
 */
import { describe, it, expect } from 'vitest';
import { computeTakeoff } from './quantityTakeoff';
import type { DocumentSchema } from '@opencad/document';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDoc(elements: Record<string, object> = {}): DocumentSchema {
  return {
    id: 'test-doc',
    name: 'Test',
    version: { clock: {} },
    metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u1', schemaVersion: '1' },
    content: {
      elements: elements as DocumentSchema['content']['elements'],
      spaces: {},
    },
    organization: { layers: {}, levels: {} },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
  };
}

function makeWall(id: string, length: number, height: number, thickness = 0.2) {
  return {
    id,
    type: 'wall' as const,
    layerId: 'l1',
    levelId: null,
    visible: true,
    locked: false,
    properties: {
      length: { type: 'number' as const, value: length, unit: 'm' },
      height: { type: 'number' as const, value: height, unit: 'm' },
      thickness: { type: 'number' as const, value: thickness, unit: 'm' },
    },
    propertySets: [],
    geometry: { type: 'brep' as const, data: null },
    transform: {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 } as unknown as { x: number; y: number; z: number },
      scale: { x: 1, y: 1, z: 1 },
    },
    boundingBox: {
      min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
      max: { x: length, y: thickness, z: height, _type: 'Point3D' as const },
    },
    metadata: { id, createdBy: 'u1', createdAt: 0, updatedAt: 0, version: { clock: {} } },
  };
}

function makeDoor(id: string, width: number, height: number) {
  return {
    id,
    type: 'door' as const,
    layerId: 'l1',
    levelId: null,
    visible: true,
    locked: false,
    properties: {
      width: { type: 'number' as const, value: width, unit: 'm' },
      height: { type: 'number' as const, value: height, unit: 'm' },
    },
    propertySets: [],
    geometry: { type: 'brep' as const, data: null },
    transform: {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 } as unknown as { x: number; y: number; z: number },
      scale: { x: 1, y: 1, z: 1 },
    },
    boundingBox: {
      min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
      max: { x: width, y: 0.1, z: height, _type: 'Point3D' as const },
    },
    metadata: { id, createdBy: 'u1', createdAt: 0, updatedAt: 0, version: { clock: {} } },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('T-BIM-002-001: empty document returns empty array', () => {
  it('T-BIM-002-001', () => {
    const result = computeTakeoff(makeDoc());
    expect(result).toEqual([]);
  });
});

describe('T-BIM-002-002: counts walls correctly', () => {
  it('T-BIM-002-002', () => {
    const doc = makeDoc({
      w1: makeWall('w1', 5, 3),
      w2: makeWall('w2', 4, 2.7),
    });
    const result = computeTakeoff(doc);
    const wallRow = result.find((r) => r.type === 'wall');
    expect(wallRow).toBeDefined();
    expect(wallRow!.count).toBe(2);
  });
});

describe('T-BIM-002-003: counts doors correctly', () => {
  it('T-BIM-002-003', () => {
    const doc = makeDoc({
      d1: makeDoor('d1', 0.9, 2.1),
      d2: makeDoor('d2', 1.2, 2.1),
      d3: makeDoor('d3', 0.8, 2.0),
    });
    const result = computeTakeoff(doc);
    const doorRow = result.find((r) => r.type === 'door');
    expect(doorRow).toBeDefined();
    expect(doorRow!.count).toBe(3);
  });
});

describe('T-BIM-002-004: wall area = length × height', () => {
  it('T-BIM-002-004', () => {
    const doc = makeDoc({
      w1: makeWall('w1', 5, 3),
    });
    const result = computeTakeoff(doc);
    const wallRow = result.find((r) => r.type === 'wall');
    expect(wallRow?.totalArea).toBeCloseTo(5 * 3, 4);
  });
});

describe('T-BIM-002-005: door area = width × height', () => {
  it('T-BIM-002-005', () => {
    const doc = makeDoc({
      d1: makeDoor('d1', 0.9, 2.1),
      d2: makeDoor('d2', 1.2, 2.1),
    });
    const result = computeTakeoff(doc);
    const doorRow = result.find((r) => r.type === 'door');
    expect(doorRow?.totalArea).toBeCloseTo(0.9 * 2.1 + 1.2 * 2.1, 4);
  });
});

describe('T-BIM-002-006: mixed element types all appear in results', () => {
  it('T-BIM-002-006', () => {
    const doc = makeDoc({
      w1: makeWall('w1', 5, 3),
      d1: makeDoor('d1', 0.9, 2.1),
    });
    const result = computeTakeoff(doc);
    const types = result.map((r) => r.type);
    expect(types).toContain('wall');
    expect(types).toContain('door');
  });
});

describe('T-BIM-002-007: results sorted by type name', () => {
  it('T-BIM-002-007', () => {
    const doc = makeDoc({
      w1: makeWall('w1', 5, 3),
      d1: makeDoor('d1', 0.9, 2.1),
    });
    const result = computeTakeoff(doc);
    const types = result.map((r) => r.type);
    const sorted = [...types].sort();
    expect(types).toEqual(sorted);
  });
});

describe('T-BIM-002-008: volume computed when wall thickness present', () => {
  it('T-BIM-002-008', () => {
    const doc = makeDoc({
      w1: makeWall('w1', 5, 3, 0.2),
    });
    const result = computeTakeoff(doc);
    const wallRow = result.find((r) => r.type === 'wall');
    // volume = length * height * thickness = 5 * 3 * 0.2 = 3.0
    expect(wallRow?.totalVolume).toBeCloseTo(5 * 3 * 0.2, 4);
  });
});
