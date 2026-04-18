/**
 * T-MEP-001: Clash Detection Tests (lib/)
 *
 * Tests for AABB-based clash detection between MEP and structural elements.
 */
import { describe, it, expect } from 'vitest';
import { elementBBox, detectClashes } from './clashDetection';
import type { ElementSchema } from '@opencad/document';

const BASE_META = {
  id: 'el',
  createdAt: 0,
  updatedAt: 0,
  createdBy: 'test',
  version: { clock: {} },
};

const BASE_TRANSFORM = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const BASE_BBOX = {
  min: { _type: 'Point3D' as const, x: 0, y: 0, z: 0 },
  max: { _type: 'Point3D' as const, x: 0, y: 0, z: 0 },
};

function makeEl(
  id: string,
  type: ElementSchema['type'],
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
): ElementSchema {
  return {
    id,
    type,
    layerId: 'l1',
    levelId: null,
    geometry: { type: 'brep', data: {} },
    properties: { x: { type: 'number', value: x }, y: { type: 'number', value: y }, z: { type: 'number', value: z }, width: { type: 'number', value: width }, height: { type: 'number', value: height }, depth: { type: 'number', value: depth } },
    propertySets: [],
    transform: BASE_TRANSFORM,
    boundingBox: BASE_BBOX,
    visible: true,
    locked: false,
    metadata: { ...BASE_META, id },
  };
}

/** Structural: wall at (0,0,0) 2×2×2 */
const wall = makeEl('wall-1', 'wall', 0, 0, 0, 2, 2, 2);
/** MEP duct far away: no overlap */
const ductFar = makeEl('duct-1', 'duct', 10, 10, 10, 2, 2, 2);
/** MEP duct fully inside wall: hard clash */
const ductInside = makeEl('duct-2', 'duct', 0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
/** MEP duct partially overlapping: hard clash */
const ductPartial = makeEl('duct-3', 'duct', 1.5, 1.5, 1.5, 2, 2, 2);
/** MEP pipe just touching (within tolerance): soft clash */
const pipeTouching = makeEl('pipe-1', 'pipe', 2.03, 0, 0, 1, 1, 1); // gap ~0.03 m < 0.05 tolerance

describe('T-MEP-001: elementBBox', () => {
  it('T-MEP-001-010: elementBBox uses width/height/depth as fallback dimensions (1m default)', () => {
    const el = makeEl('e1', 'duct', 0, 0, 0, 0, 0, 0);
    // When width/height/depth are 0 in properties, default to 1
    const elNoSize: ElementSchema = {
      ...el,
      properties: {},
    };
    const box = elementBBox(elNoSize);
    // Should produce a 1m cube centered at origin (x=0, y=0, z=0)
    expect(box.maxX - box.minX).toBeCloseTo(1);
    expect(box.maxY - box.minY).toBeCloseTo(1);
    expect(box.maxZ - box.minZ).toBeCloseTo(1);
  });
});

describe('T-MEP-001: detectClashes', () => {
  it('T-MEP-001-001: non-overlapping elements produce no clashes', () => {
    const result = detectClashes([wall], [ductFar]);
    expect(result).toHaveLength(0);
  });

  it('T-MEP-001-002: fully overlapping elements produce a hard clash', () => {
    const result = detectClashes([wall], [ductInside]);
    expect(result.length).toBeGreaterThan(0);
    const hard = result.filter((c) => c.severity === 'hard');
    expect(hard.length).toBeGreaterThan(0);
  });

  it('T-MEP-001-003: partially overlapping elements produce a hard clash', () => {
    const result = detectClashes([wall], [ductPartial]);
    const hard = result.filter((c) => c.severity === 'hard');
    expect(hard.length).toBeGreaterThan(0);
  });

  it('T-MEP-001-004: touching elements within tolerance produce a soft clash', () => {
    const result = detectClashes([wall], [pipeTouching], 0.05);
    expect(result.length).toBeGreaterThan(0);
    const soft = result.filter((c) => c.severity === 'soft');
    expect(soft.length).toBeGreaterThan(0);
  });

  it('T-MEP-001-005: overlapVolume is positive for hard clashes', () => {
    const result = detectClashes([wall], [ductInside]);
    const hard = result.filter((c) => c.severity === 'hard');
    expect(hard[0].overlapVolume).toBeGreaterThan(0);
  });

  it('T-MEP-001-006: overlapVolume is 0 for soft (touching) clashes', () => {
    const result = detectClashes([wall], [pipeTouching], 0.05);
    const soft = result.filter((c) => c.severity === 'soft');
    if (soft.length > 0) {
      expect(soft[0].overlapVolume).toBe(0);
    }
  });

  it('T-MEP-001-007: empty structural array produces no clashes', () => {
    const result = detectClashes([], [ductInside]);
    expect(result).toHaveLength(0);
  });

  it('T-MEP-001-008: empty MEP array produces no clashes', () => {
    const result = detectClashes([wall], []);
    expect(result).toHaveLength(0);
  });

  it('T-MEP-001-009: multiple structural elements each checked against each MEP element', () => {
    const wall2 = makeEl('wall-2', 'wall', 5, 5, 5, 2, 2, 2);
    const ductHitsWall2 = makeEl('duct-x', 'duct', 5.5, 5.5, 5.5, 0.5, 0.5, 0.5);
    const result = detectClashes([wall, wall2], [ductInside, ductHitsWall2]);
    // ductInside hits wall, ductHitsWall2 hits wall2 => expect at least 2 clashes
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});
