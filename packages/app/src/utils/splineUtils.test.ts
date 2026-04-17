/**
 * T-2D-011: Spline / Bezier curve utility tests
 *
 * Verifies: catmullRomToBezier converts control points correctly,
 * interpolateSpline returns points at parameter t.
 */
import { describe, it, expect } from 'vitest';
import { catmullRomToBezier, interpolateSpline } from './splineUtils';

describe('T-2D-011: catmullRomToBezier', () => {
  it('returns empty array for a single point', () => {
    const result = catmullRomToBezier([{ x: 0, y: 0 }]);
    expect(result).toHaveLength(0);
  });

  it('2 input points → 1 degenerate (straight-line) segment', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 100, y: 0 };
    const segments = catmullRomToBezier([p0, p1]);
    expect(segments).toHaveLength(1);
    const seg = segments[0]!;
    // Control points for a straight line should lie on the line
    expect(seg.end.x).toBeCloseTo(100);
    expect(seg.end.y).toBeCloseTo(0);
    // cp1 and cp2 should be strictly between p0 and p1 on the line
    expect(seg.cp1.x).toBeGreaterThan(0);
    expect(seg.cp1.x).toBeLessThan(100);
    expect(seg.cp2.x).toBeGreaterThan(0);
    expect(seg.cp2.x).toBeLessThan(100);
    expect(seg.cp1.y).toBeCloseTo(0);
    expect(seg.cp2.y).toBeCloseTo(0);
  });

  it('4 input points → 3 Bezier segments', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 50 },
      { x: 200, y: 0 },
      { x: 300, y: 50 },
    ];
    const segments = catmullRomToBezier(pts);
    expect(segments).toHaveLength(3);
  });

  it('5 input points → 4 Bezier segments', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 0 },
      { x: 150, y: 100 },
      { x: 200, y: 0 },
    ];
    const segments = catmullRomToBezier(pts);
    expect(segments).toHaveLength(4);
  });

  it('each segment end matches the corresponding input point', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 50 },
      { x: 200, y: 0 },
    ];
    const segments = catmullRomToBezier(pts);
    expect(segments[0]!.end.x).toBeCloseTo(100);
    expect(segments[0]!.end.y).toBeCloseTo(50);
    expect(segments[1]!.end.x).toBeCloseTo(200);
    expect(segments[1]!.end.y).toBeCloseTo(0);
  });

  it('returns segments with cp1, cp2, and end properties', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 0 }];
    const segments = catmullRomToBezier(pts);
    for (const seg of segments) {
      expect(seg).toHaveProperty('cp1');
      expect(seg).toHaveProperty('cp2');
      expect(seg).toHaveProperty('end');
      expect(typeof seg.cp1.x).toBe('number');
      expect(typeof seg.cp1.y).toBe('number');
      expect(typeof seg.cp2.x).toBe('number');
      expect(typeof seg.cp2.y).toBe('number');
      expect(typeof seg.end.x).toBe('number');
      expect(typeof seg.end.y).toBe('number');
    }
  });

  it('respects custom tension parameter', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 0 }];
    const defaultSegs = catmullRomToBezier(pts);
    const customSegs = catmullRomToBezier(pts, 0.25);
    // Different tension → different control points
    expect(defaultSegs[0]!.cp1.x).not.toBeCloseTo(customSegs[0]!.cp1.x);
  });
});

describe('T-2D-011: interpolateSpline', () => {
  it('t=0 returns the first point', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 0 }];
    const pt = interpolateSpline(pts, 0);
    expect(pt.x).toBeCloseTo(0);
    expect(pt.y).toBeCloseTo(0);
  });

  it('t=1 returns the last point', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 0 }];
    const pt = interpolateSpline(pts, 1);
    expect(pt.x).toBeCloseTo(200);
    expect(pt.y).toBeCloseTo(0);
  });

  it('t=0.5 returns a point strictly between first and last', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 0 }];
    const pt = interpolateSpline(pts, 0.5);
    expect(pt.x).toBeGreaterThan(0);
    expect(pt.x).toBeLessThan(200);
  });

  it('t=0.5 on symmetric curve is near the centre x', () => {
    // Symmetric: first and last y=0, middle y=100
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 0 }];
    const pt = interpolateSpline(pts, 0.5);
    expect(pt.x).toBeCloseTo(100, 0);
  });

  it('single segment (2 points) interpolates linearly', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const pt = interpolateSpline(pts, 0.5);
    expect(pt.x).toBeCloseTo(50, 0);
    expect(pt.y).toBeCloseTo(50, 0);
  });
});
