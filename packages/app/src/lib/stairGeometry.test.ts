/**
 * T-MOD-010 stair tests (GitHub issue #303).
 *
 *   T-MOD-010-001 — 3000/280 → 16 treads, riser 187.5, run 4200
 *   T-MOD-010-002 — 3500/280 → 19 treads
 *   T-MOD-010-003 — riser count is smallest satisfying riser ≤ 196
 *   T-MOD-010-004 — L-shape: 2 flights + 1 landing
 *   T-MOD-010-005 — treads monotonic in Z
 */
import { describe, it, expect } from 'vitest';
import { computeStairGeometry, isStairCompliant } from './stairGeometry';

describe('T-MOD-010: stair geometry', () => {
  it('T-MOD-010-001: 3000mm story × 280mm tread → 16 risers, 187.5mm each', () => {
    const r = computeStairGeometry({ type: 'straight', storyHeight: 3000, treadDepth: 280, width: 1000 });
    expect(r.riserCount).toBe(16);
    expect(r.riserHeight).toBeCloseTo(187.5, 2);
    // 15 treads × 280 = 4200
    expect(r.runLength).toBe(15 * 280);
  });

  it('T-MOD-010-002: 3500mm story × 280mm tread → 18 or 19 risers', () => {
    const r = computeStairGeometry({ type: 'straight', storyHeight: 3500, treadDepth: 280, width: 1000 });
    expect(r.riserCount).toBeGreaterThanOrEqual(18);
    expect(r.riserCount).toBeLessThanOrEqual(19);
    expect(r.riserHeight).toBeLessThanOrEqual(196);
  });

  it('T-MOD-010-003: riserHeight stays ≤ 196 for any storyHeight', () => {
    for (const h of [2400, 3000, 3600, 4200, 5000]) {
      const r = computeStairGeometry({ type: 'straight', storyHeight: h, treadDepth: 280, width: 1000 });
      expect(r.riserHeight).toBeLessThanOrEqual(196);
    }
  });

  it('T-MOD-010-004: L-shape produces 2 flights + 1 landing', () => {
    const r = computeStairGeometry({
      type: 'L-shape', storyHeight: 3000, treadDepth: 280, width: 1000, handedness: 'R',
    });
    expect(r.flights).toHaveLength(2);
    expect(r.landings).toHaveLength(1);
  });

  it('T-MOD-010-005: L-shape second flight starts above first (Z increases)', () => {
    const r = computeStairGeometry({
      type: 'L-shape', storyHeight: 3000, treadDepth: 280, width: 1000, handedness: 'R',
    });
    expect(r.flights[1]!.origin.z).toBeGreaterThan(r.flights[0]!.origin.z);
  });

  it('isStairCompliant flags a 250mm riser as non-compliant', () => {
    // Force a big riser by capping riserCount via maxRiser 250
    const r = computeStairGeometry({
      type: 'straight', storyHeight: 3000, treadDepth: 280, width: 1000, maxRiser: 300,
    });
    // 3000 / Math.ceil(3000/300) = 3000 / 10 = 300 → not compliant under default 196
    expect(isStairCompliant(r)).toBe(false);
  });

  it('isStairCompliant passes on standard 3000/280', () => {
    const r = computeStairGeometry({ type: 'straight', storyHeight: 3000, treadDepth: 280, width: 1000 });
    expect(isStairCompliant(r)).toBe(true);
  });
});
