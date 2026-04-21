/**
 * T-MOD-015 edit-op tests (GitHub issue #308).
 *
 *   T-MOD-015-001 — trim(wall, cutter) pulls end at intersection
 *   T-MOD-015-002 — extend(wall, target) pushes end to line
 *   T-MOD-015-003 — split(wall, mid) → two halves
 *   T-MOD-015-004 — merge two collinear walls → one
 *   T-MOD-015-005 — merge non-collinear returns null + reason
 */
import { describe, it, expect } from 'vitest';
import { trimWall, extendWall, splitWall, mergeWalls, lineIntersection } from './editOps';

describe('T-MOD-015: wall edit ops', () => {
  it('T-MOD-015-001: trim [0,0]→[10,0] against cutter at x=5 returns [0,0]→[5,0]', () => {
    const out = trimWall(
      { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
      { a: { x: 5, y: -2 }, b: { x: 5, y: 2 } },
    );
    expect(out).not.toBeNull();
    expect(out!.b).toEqual({ x: 5, y: 0 });
  });

  it('T-MOD-015-002: extend [0,0]→[4,0] toward target at x=10 returns [0,0]→[10,0]', () => {
    const out = extendWall(
      { a: { x: 0, y: 0 }, b: { x: 4, y: 0 } },
      { a: { x: 10, y: -2 }, b: { x: 10, y: 2 } },
    );
    expect(out).not.toBeNull();
    expect(out!.b.x).toBeCloseTo(10);
  });

  it('T-MOD-015-003: split [0,0]→[10,0] at (5,0) → two 5-unit halves', () => {
    const [l, r] = splitWall({ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }, { x: 5, y: 0 })!;
    expect(l.b).toEqual({ x: 5, y: 0 });
    expect(r.a).toEqual({ x: 5, y: 0 });
  });

  it('split at an endpoint returns null', () => {
    expect(splitWall({ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }, { x: 0, y: 0 })).toBeNull();
    expect(splitWall({ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }, { x: 10, y: 0 })).toBeNull();
  });

  it('split far from the wall returns null', () => {
    expect(splitWall({ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }, { x: 5, y: 5000 })).toBeNull();
  });

  it('T-MOD-015-004: merge two collinear walls sharing endpoint → combined', () => {
    const { merged } = mergeWalls(
      { a: { x: 0, y: 0 }, b: { x: 5, y: 0 } },
      { a: { x: 5, y: 0 }, b: { x: 10, y: 0 } },
    );
    expect(merged).not.toBeNull();
    const xs = [merged!.a.x, merged!.b.x].sort((a, b) => a - b);
    expect(xs).toEqual([0, 10]);
  });

  it('T-MOD-015-005: merge non-collinear walls returns null + reason', () => {
    const { merged, reason } = mergeWalls(
      { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
      { a: { x: 10, y: 0 }, b: { x: 10, y: 10 } },
    );
    expect(merged).toBeNull();
    expect(reason).toMatch(/collinear/);
  });

  it('merge without shared endpoint returns null + reason', () => {
    const { merged, reason } = mergeWalls(
      { a: { x: 0, y: 0 }, b: { x: 5, y: 0 } },
      { a: { x: 10, y: 0 }, b: { x: 15, y: 0 } },
    );
    expect(merged).toBeNull();
    expect(reason).toMatch(/endpoint/);
  });

  it('lineIntersection of parallel walls returns null', () => {
    expect(lineIntersection(
      { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
      { a: { x: 0, y: 5 }, b: { x: 10, y: 5 } },
    )).toBeNull();
  });
});
