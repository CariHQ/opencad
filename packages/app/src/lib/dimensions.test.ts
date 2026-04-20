/**
 * T-DOC-033 dimensions tests (GitHub issue #326).
 *
 *   T-DOC-033-001 — angularDim between perpendicular lines = 90°
 *   T-DOC-033-002 — radialDim returns radius
 *   T-DOC-033-003 — arcLength(r=1500, Δθ=π/2) ≈ 2356.19
 *   T-DOC-033-004 — chainDim on [0,1000,2500,4000] → [1000,1500,1500]
 *   T-DOC-033-005 — ordinateDim origin(0,0) targets [(3,4),(5,2)] → {xs:[3,5], ys:[4,2]}
 */
import { describe, it, expect } from 'vitest';
import {
  angularDim, radialDim, diameterDim, arcLength, chainDim, ordinateDim, formatDimension,
} from './dimensions';

describe('T-DOC-033: dimensions', () => {
  it('T-DOC-033-001: angularDim between perpendicular horizontal + vertical lines = 90°', () => {
    const a = { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }; // horizontal
    const b = { a: { x: 0, y: 0 }, b: { x: 0, y: 1 } }; // vertical
    const rad = angularDim(a, b);
    expect(rad).toBeCloseTo(Math.PI / 2, 4);
  });

  it('T-DOC-033-001b: angularDim of two 60° angled lines returns 60°', () => {
    const ang = Math.PI / 3;
    const a = { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } };
    const b = { a: { x: 0, y: 0 }, b: { x: Math.cos(ang), y: Math.sin(ang) } };
    expect(angularDim(a, b)).toBeCloseTo(ang, 4);
  });

  it('T-DOC-033-002: radialDim on a circle radius 1500 returns 1500', () => {
    expect(radialDim({ centre: { x: 0, y: 0 }, radius: 1500 })).toBe(1500);
  });

  it('T-DOC-033-002b: diameterDim doubles the radius', () => {
    expect(diameterDim({ centre: { x: 0, y: 0 }, radius: 1500 })).toBe(3000);
  });

  it('T-DOC-033-003: arcLength(r=1500, Δθ=π/2) ≈ 2356.19', () => {
    const v = arcLength({ centre: { x: 0, y: 0 }, radius: 1500, startAngle: 0, endAngle: Math.PI / 2 });
    expect(v).toBeCloseTo(2356.19, 1);
  });

  it('T-DOC-033-004: chainDim on [0,1000,2500,4000] returns [1000,1500,1500]', () => {
    expect(chainDim([0, 1000, 2500, 4000])).toEqual([1000, 1500, 1500]);
  });

  it('chainDim sorts input and ignores length-one inputs', () => {
    expect(chainDim([2500, 0, 4000, 1000])).toEqual([1000, 1500, 1500]);
    expect(chainDim([500])).toEqual([]);
  });

  it('T-DOC-033-005: ordinateDim from origin(0,0) to [(3,4),(5,2)] returns {xs:[3,5], ys:[4,2]}', () => {
    expect(ordinateDim({ x: 0, y: 0 }, [{ x: 3, y: 4 }, { x: 5, y: 2 }]))
      .toEqual({ xs: [3, 5], ys: [4, 2] });
  });

  it('formatDimension linear with unit=m divides by 1000', () => {
    expect(formatDimension({ kind: 'linear', value: 4500, precision: 1, unit: 'm' })).toBe('4.5');
  });

  it('formatDimension angular converts radians to degrees by default', () => {
    expect(formatDimension({ kind: 'angular', value: Math.PI / 2, precision: 1 })).toBe('90.0°');
  });

  it('formatDimension chain joins multiple values', () => {
    expect(formatDimension({ kind: 'chain', value: [1000, 1500, 1500], precision: 0 })).toBe('1000 | 1500 | 1500');
  });

  it('formatDimension radial applies "R = " prefix when asked', () => {
    expect(formatDimension({ kind: 'radial', value: 1500, precision: 0, prefix: 'R = ' })).toBe('R = 1500');
  });
});
