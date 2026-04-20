/**
 * T-MOD-024 transforms tests (GitHub issue #317).
 *
 *   T-MOD-024-001 — mirrorPoint across a vertical axis
 *   T-MOD-024-002 — rotatePoint by 90° around origin
 *   T-MOD-024-003 — linearArray count 3 offset (1,0)
 *   T-MOD-024-004 — polarArray count 4 around origin
 */
import { describe, it, expect } from 'vitest';
import {
  mirrorPoint, rotatePoint, translatePoint, linearArray, polarArray,
} from './transforms';

describe('T-MOD-024: transforms', () => {
  it('T-MOD-024-001: mirror across vertical axis x=5 sends (2,0) → (8,0)', () => {
    const r = mirrorPoint({ x: 2, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 10 });
    expect(r.x).toBeCloseTo(8);
    expect(r.y).toBeCloseTo(0);
  });

  it('mirror across horizontal axis y=0 sends (0,3) → (0,-3)', () => {
    const r = mirrorPoint({ x: 0, y: 3 }, { x: -1, y: 0 }, { x: 1, y: 0 });
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(-3);
  });

  it('T-MOD-024-002: rotate (1,0) by 90° around origin → (0,1)', () => {
    const r = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(r.x).toBeCloseTo(0, 6);
    expect(r.y).toBeCloseTo(1, 6);
  });

  it('rotate 180° sends point to opposite side', () => {
    const r = rotatePoint({ x: 1, y: 1 }, { x: 0, y: 0 }, Math.PI);
    expect(r.x).toBeCloseTo(-1, 6);
    expect(r.y).toBeCloseTo(-1, 6);
  });

  it('translate adds (dx, dy)', () => {
    expect(translatePoint({ x: 3, y: 4 }, 1, 2)).toEqual({ x: 4, y: 6 });
  });

  it('T-MOD-024-003: linearArray count 3 offset (1,0) → [0,1,2]', () => {
    const pts = linearArray({ x: 0, y: 0 }, 3, { x: 1, y: 0 });
    expect(pts.map((p) => p.x)).toEqual([0, 1, 2]);
  });

  it('linearArray count 0 returns []', () => {
    expect(linearArray({ x: 0, y: 0 }, 0, { x: 1, y: 0 })).toEqual([]);
  });

  it('T-MOD-024-004: polarArray 4 around origin gives 0°, 90°, 180°, 270°', () => {
    const pts = polarArray({ x: 1, y: 0 }, 4, { x: 0, y: 0 });
    expect(pts[0]!.x).toBeCloseTo(1, 6); expect(pts[0]!.y).toBeCloseTo(0, 6);
    expect(pts[1]!.x).toBeCloseTo(0, 6); expect(pts[1]!.y).toBeCloseTo(1, 6);
    expect(pts[2]!.x).toBeCloseTo(-1, 6); expect(pts[2]!.y).toBeCloseTo(0, 6);
    expect(pts[3]!.x).toBeCloseTo(0, 6); expect(pts[3]!.y).toBeCloseTo(-1, 6);
  });
});
