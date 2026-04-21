/**
 * T-MOD-020 structural-profile tests (GitHub issue #313).
 *
 *   T-MOD-020-001 — W-shape outer polygon has 12 vertices
 *   T-MOD-020-002 — W8×31 computed area within 5% of published
 *   T-MOD-020-003 — HSS produces an outer + inner loop
 *   T-MOD-020-004 — sweepVolume = area × length
 */
import { describe, it, expect } from 'vitest';
import {
  profileArea, polygonArea, sweepVolume,
  buildWShape, buildHSS, BUILT_IN_PROFILES,
} from './structuralProfiles';

describe('T-MOD-020: structuralProfiles', () => {
  it('T-MOD-020-001: W-shape outer polygon has 12 vertices', () => {
    const w = buildWShape({ id: 'W', name: 'test', depth: 200, bf: 150, tw: 8, tf: 12 });
    expect(w.outer).toHaveLength(12);
  });

  it('T-MOD-020-002: W8×31 computed area within 5% of published 5870 mm²', () => {
    const w = BUILT_IN_PROFILES.find((p) => p.id === 'W8x31')!;
    const a = profileArea(w);
    expect(a).toBeGreaterThan(w.publishedAreaMm2! * 0.95);
    expect(a).toBeLessThan(w.publishedAreaMm2! * 1.05);
  });

  it('T-MOD-020-003: HSS produces outer loop + exactly one inner hole', () => {
    const h = buildHSS({ id: 'H', name: 'test', outerW: 100, outerH: 100, wallThickness: 10 });
    expect(h.outer).toHaveLength(4);
    expect(h.holes).toHaveLength(1);
    expect(h.holes![0]).toHaveLength(4);
    // Area = outer - inner = (100×100) - (80×80) = 10000 - 6400 = 3600
    expect(profileArea(h)).toBeCloseTo(3600, 1);
  });

  it('T-MOD-020-004: sweepVolume = area × length', () => {
    const w = buildWShape({ id: 'W', name: 't', depth: 200, bf: 150, tw: 10, tf: 10 });
    const len = 3000;
    expect(sweepVolume(w, len)).toBeCloseTo(profileArea(w) * len, 3);
  });

  it('polygonArea is positive for CCW winding', () => {
    const square = [
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    expect(polygonArea(square)).toBeCloseTo(100, 3);
  });

  it('polygonArea on CW winding returns same magnitude', () => {
    const square = [
      { x: 0, y: 0 }, { x: 0, y: 10 },
      { x: 10, y: 10 }, { x: 10, y: 0 },
    ];
    expect(polygonArea(square)).toBeCloseTo(100, 3);
  });

  it('round column has ~π × 150² area', () => {
    const round = BUILT_IN_PROFILES.find((p) => p.id === 'col-round-300')!;
    // 32-sided polygon ≈ 99% of true circle area
    const expected = Math.PI * 150 * 150;
    expect(profileArea(round)).toBeGreaterThan(expected * 0.98);
    expect(profileArea(round)).toBeLessThanOrEqual(expected);
  });

  it('BUILT_IN_PROFILES includes ≥ 4 W-shapes and ≥ 3 HSS shapes', () => {
    expect(BUILT_IN_PROFILES.filter((p) => p.category === 'W').length).toBeGreaterThanOrEqual(4);
    expect(BUILT_IN_PROFILES.filter((p) => p.category === 'HSS').length).toBeGreaterThanOrEqual(3);
  });
});
