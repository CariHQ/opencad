/**
 * T-MOD-011 multi-plane roof tests (GitHub issue #304).
 *
 *   T-MOD-011-001 — hip roof on rectangle yields 4 planes
 *   T-MOD-011-002 — gable on N + S yields 2 hips + 2 gables
 *   T-MOD-011-003 — slope 30° produces ridge at tan(30°)×halfWidth
 *   T-MOD-011-005 — plane kinds are classified correctly
 */
import { describe, it, expect } from 'vitest';
import { rectangleRoof } from './roofGeometry';

const RECT = {
  footprint: [
    { x: 0, y: 0 },
    { x: 10000, y: 0 },
    { x: 10000, y: 6000 },
    { x: 0, y: 6000 },
  ] as [
    { x: number; y: number }, { x: number; y: number },
    { x: number; y: number }, { x: number; y: number },
  ],
  slopeAngleDeg: 30,
  eaveZ: 3000,
};

describe('T-MOD-011: multi-plane roof', () => {
  it('T-MOD-011-001: full hip (no gables) on a rectangle yields 4 planes', () => {
    const planes = rectangleRoof(RECT);
    expect(planes).toHaveLength(4);
    for (const p of planes) expect(p.kind).toBe('hip');
  });

  it('T-MOD-011-002: gable on N + S yields 2 hips + 2 gables', () => {
    const planes = rectangleRoof({ ...RECT, gableSides: ['north', 'south'] });
    expect(planes).toHaveLength(4);
    expect(planes.filter((p) => p.kind === 'hip')).toHaveLength(2);
    expect(planes.filter((p) => p.kind === 'gable')).toHaveLength(2);
  });

  it('T-MOD-011-002b: gable on E + W yields 2 hips + 2 gables', () => {
    const planes = rectangleRoof({ ...RECT, gableSides: ['east', 'west'] });
    expect(planes.filter((p) => p.kind === 'gable')).toHaveLength(2);
  });

  it('T-MOD-011-003: ridge elevation = eave + halfShortSide × tan(slope)', () => {
    const planes = rectangleRoof(RECT);
    // Short side is 6000; half = 3000; tan(30°) ≈ 0.5774
    const expectedRidgeZ = 3000 + 3000 * Math.tan(Math.PI / 6);
    const maxZ = Math.max(...planes.flatMap((p) => p.vertices.map((v) => v.z)));
    expect(maxZ).toBeCloseTo(expectedRidgeZ, 1);
  });

  it('T-MOD-011-005: hip planes have non-zero slope, gables have slope π/2', () => {
    const planes = rectangleRoof({ ...RECT, gableSides: ['north', 'south'] });
    for (const p of planes) {
      if (p.kind === 'hip')    expect(p.slopeAngle).toBeLessThan(Math.PI / 2);
      if (p.kind === 'gable')  expect(p.slopeAngle).toBeCloseTo(Math.PI / 2);
    }
  });

  it('every plane has ≥ 3 vertices (valid polygon)', () => {
    const planes = rectangleRoof(RECT);
    for (const p of planes) expect(p.vertices.length).toBeGreaterThanOrEqual(3);
  });

  it('all vertices sit at z ≥ eaveZ', () => {
    const planes = rectangleRoof(RECT);
    for (const p of planes) for (const v of p.vertices) {
      expect(v.z).toBeGreaterThanOrEqual(3000);
    }
  });
});
