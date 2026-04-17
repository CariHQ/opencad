/**
 * Extrude Operations Tests
 * T-3D-004: Polygon area computation
 * T-3D-005: Convexity check
 * T-3D-006: Extrude profile to solid
 */
import { describe, it, expect } from 'vitest';
import {
  polygonArea,
  isConvex,
  extrude,
  createPolygon2D,
} from './extrude';

const UNIT_SQUARE = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

const TRIANGLE = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 2, y: 3 },
];

const L_SHAPE = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 0, y: 2 },
];

describe('T-3D-004: polygonArea', () => {
  it('computes area of unit square as 1', () => {
    expect(polygonArea(UNIT_SQUARE)).toBeCloseTo(1, 5);
  });

  it('computes area of 2x3 rectangle as 6', () => {
    const rect = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 3 },
      { x: 0, y: 3 },
    ];
    expect(polygonArea(rect)).toBeCloseTo(6, 5);
  });

  it('computes area of triangle correctly', () => {
    // base=4, height=3 → area = 0.5 * 4 * 3 = 6
    expect(polygonArea(TRIANGLE)).toBeCloseTo(6, 5);
  });

  it('computes area of L-shape correctly', () => {
    // L-shape: 2x2 minus 1x1 = 3
    expect(polygonArea(L_SHAPE)).toBeCloseTo(3, 5);
  });

  it('returns 0 for a degenerate polygon (< 3 points)', () => {
    expect(polygonArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });

  it('area is always positive regardless of vertex winding', () => {
    const ccw = [...UNIT_SQUARE];
    const cw = [...UNIT_SQUARE].reverse();
    expect(polygonArea(ccw)).toBeCloseTo(1, 5);
    expect(polygonArea(cw)).toBeCloseTo(1, 5);
  });
});

describe('T-3D-005: isConvex', () => {
  it('returns true for a square (convex)', () => {
    expect(isConvex(UNIT_SQUARE)).toBe(true);
  });

  it('returns true for a triangle (convex)', () => {
    expect(isConvex(TRIANGLE)).toBe(true);
  });

  it('returns false for an L-shape (concave)', () => {
    expect(isConvex(L_SHAPE)).toBe(false);
  });

  it('returns false for fewer than 3 points', () => {
    expect(isConvex([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe(false);
  });

  it('returns true for regular hexagon', () => {
    const hexagon = Array.from({ length: 6 }, (_, i) => ({
      x: Math.cos((i * Math.PI * 2) / 6),
      y: Math.sin((i * Math.PI * 2) / 6),
    }));
    expect(isConvex(hexagon)).toBe(true);
  });
});

describe('T-3D-006: createPolygon2D', () => {
  it('creates profile with outer polygon', () => {
    const profile = createPolygon2D(UNIT_SQUARE);
    expect(profile.outer).toEqual(UNIT_SQUARE);
  });

  it('creates profile with empty holes array', () => {
    const profile = createPolygon2D(UNIT_SQUARE);
    expect(profile.holes).toEqual([]);
  });
});

describe('T-3D-006: extrude', () => {
  it('returns a Solid', () => {
    const profile = createPolygon2D(UNIT_SQUARE);
    const solid = extrude(profile, 3);
    expect(solid).toBeDefined();
    expect(solid.faces).toBeDefined();
    expect(solid.vertices).toBeDefined();
  });

  it('produces faces for a square extrusion', () => {
    const profile = createPolygon2D(UNIT_SQUARE);
    const solid = extrude(profile, 3);
    // 4 side faces + 2 caps = 6 faces for a square profile
    expect(solid.faces.length).toBeGreaterThanOrEqual(6);
  });

  it('bottom and top cap areas equal polygon area', () => {
    const profile = createPolygon2D(UNIT_SQUARE);
    const solid = extrude(profile, 3);
    const area = polygonArea(UNIT_SQUARE);
    const caps = solid.faces.filter((f) => Math.abs(f.normal.z) > 0.9);
    expect(caps).toHaveLength(2);
    for (const cap of caps) {
      expect(cap.area).toBeCloseTo(area, 5);
    }
  });

  it('vertices span the correct height', () => {
    const profile = createPolygon2D(UNIT_SQUARE);
    const solid = extrude(profile, 5);
    const zValues = solid.vertices.map((v) => v.z);
    expect(Math.min(...zValues)).toBeCloseTo(0, 5);
    expect(Math.max(...zValues)).toBeCloseTo(5, 5);
  });

  it('extrudes a triangle profile', () => {
    const profile = createPolygon2D(TRIANGLE);
    const solid = extrude(profile, 2);
    // 3 side faces + 2 caps = 5 faces
    expect(solid.faces.length).toBeGreaterThanOrEqual(5);
  });

  it('each face has a unique id', () => {
    const profile = createPolygon2D(UNIT_SQUARE);
    const solid = extrude(profile, 3);
    const ids = solid.faces.map((f) => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
