/**
 * T-MOD-021 inference tests (GitHub issue #314).
 *
 *   T-MOD-021-001 — X-aligned reference returns a vertical guide
 *   T-MOD-021-002 — extension inference engages beyond a line's endpoint
 *   T-MOD-021-003 — midpoint snap engages within tolerance
 *   T-MOD-021-004 — perpendicular foot snap returns foot on segment
 */
import { describe, it, expect } from 'vitest';
import {
  computeAxisLock, applyAxisLock,
  inferFromReferencePoints, inferExtension, inferMidpoint, inferPerpendicularFoot,
} from './inference';

describe('T-MOD-021: inference', () => {
  it('T-MOD-021-001: reference X-align returns a vertical guide', () => {
    const g = inferFromReferencePoints(
      { x: 100, y: 0 },
      [{ x: 99, y: 500 }],
      20,
    );
    expect(g?.kind).toBe('x');
    expect(g?.value).toBe(99);
  });

  it('T-MOD-021-002: extension beyond a line endpoint engages', () => {
    const seg = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } };
    const r = inferExtension({ x: 150, y: 1 }, seg, 20);
    expect(r).not.toBeNull();
    expect(r?.point.x).toBeCloseTo(150, 1);
    expect(r?.point.y).toBeCloseTo(0, 1);
  });

  it('T-MOD-021-002b: point between endpoints does NOT engage extension (inside the segment)', () => {
    const seg = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } };
    const r = inferExtension({ x: 50, y: 1 }, seg, 20);
    expect(r).toBeNull();
  });

  it('T-MOD-021-003: midpoint snap engages within tolerance', () => {
    const seg = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } };
    const m = inferMidpoint({ x: 50, y: 1 }, seg, 5);
    expect(m).toEqual({ x: 50, y: 0 });
  });

  it('T-MOD-021-003b: midpoint snap rejects outside tolerance', () => {
    const seg = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } };
    expect(inferMidpoint({ x: 50, y: 20 }, seg, 5)).toBeNull();
  });

  it('T-MOD-021-004: perpendicular foot from (50,20) to horizontal segment returns (50,0)', () => {
    const seg = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } };
    const foot = inferPerpendicularFoot({ x: 50, y: 20 }, seg, 50);
    expect(foot).toEqual({ x: 50, y: 0 });
  });

  it('computeAxisLock lock Y for mostly-horizontal drag when shift is held', () => {
    expect(computeAxisLock({ x: 0, y: 0 }, { x: 100, y: 10 }, true)).toBe('y');
  });

  it('computeAxisLock returns free when shift is not held', () => {
    expect(computeAxisLock({ x: 0, y: 0 }, { x: 100, y: 10 }, false)).toBe('free');
  });

  it('applyAxisLock y snaps current.y to start.y', () => {
    const locked = applyAxisLock({ x: 0, y: 5 }, { x: 100, y: 20 }, 'y');
    expect(locked).toEqual({ x: 100, y: 5 });
  });

  it('applyAxisLock free passes current through unchanged', () => {
    const locked = applyAxisLock({ x: 0, y: 5 }, { x: 100, y: 20 }, 'free');
    expect(locked).toEqual({ x: 100, y: 20 });
  });
});
