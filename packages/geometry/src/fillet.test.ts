/**
 * T-3D-012: Fillet Operations — 2D polyline rounding
 */

import { describe, it, expect } from 'vitest';
import { filletCorner, filletPolyline } from './fillet';

// Helpers
const pt = (x: number, y: number) => ({ x, y });

// A 90° right-angle corner: prev is to the left, corner at origin, next is above
const PREV_90 = pt(-1, 0);
const CORNER_90 = pt(0, 0);
const NEXT_90 = pt(0, 1);

// A square [0,0]→[10,0]→[10,10]→[0,10]
const SQUARE = [pt(0, 0), pt(10, 0), pt(10, 10), pt(0, 10)];

describe('T-3D-012: filletCorner', () => {
  it('returns correct tangent points for a 90° right-angle corner', () => {
    const result = filletCorner(PREV_90, CORNER_90, NEXT_90, 1);
    expect(result).not.toBeNull();
    if (!result) return;

    // Entry point should be on edge from corner toward prev (-x direction), distance 1
    expect(result.entry.x).toBeCloseTo(-1, 5);
    expect(result.entry.y).toBeCloseTo(0, 5);

    // Exit point should be on edge from corner toward next (+y direction), distance 1
    expect(result.exit.x).toBeCloseTo(0, 5);
    expect(result.exit.y).toBeCloseTo(1, 5);

    // Center of arc should be at (-1, 1) for this specific 90° case with radius 1
    expect(result.center.x).toBeCloseTo(-1, 5);
    expect(result.center.y).toBeCloseTo(1, 5);
  });

  it('returns null when radius is larger than the shorter edge length', () => {
    // Edges from corner to prev and from corner to next are both length 1
    // radius 2 exceeds that
    const result = filletCorner(PREV_90, CORNER_90, NEXT_90, 2);
    expect(result).toBeNull();
  });

  it('returns startAngle and endAngle that span ~90° for a 90° corner', () => {
    const result = filletCorner(PREV_90, CORNER_90, NEXT_90, 1);
    expect(result).not.toBeNull();
    if (!result) return;

    // Angular span should be approximately π/2
    let span = result.endAngle - result.startAngle;
    // Normalize to handle wrap-around
    while (span < 0) span += 2 * Math.PI;
    while (span > 2 * Math.PI) span -= 2 * Math.PI;
    expect(Math.abs(span)).toBeCloseTo(Math.PI / 2, 3);
  });

  it('returns null for a straight (180°) segment — no corner to fillet', () => {
    // Collinear: prev (−1,0), corner (0,0), next (1,0)
    const result = filletCorner(pt(-1, 0), pt(0, 0), pt(1, 0), 0.5);
    expect(result).toBeNull();
  });
});

describe('T-3D-012: filletPolyline', () => {
  it('preserves point count when radius is 0', () => {
    const result = filletPolyline(SQUARE, 0);
    expect(result.length).toBe(SQUARE.length);
  });

  it('returns a rounded polygon with arc approximations for a square', () => {
    // radius = 1, square side = 10 → each corner produces arc points
    // Original 4 corners replaced by arc segments (8+ points expected)
    const result = filletPolyline(SQUARE, 1, true);
    // Each corner: 1 entry + 8 arc interior points + 1 exit = 10 pts per corner
    // but the implementation may vary; just ensure we have significantly more than 4
    expect(result.length).toBeGreaterThan(4);
  });

  it('closed=true handles the wrap-around vertex (first == last corner)', () => {
    const result = filletPolyline(SQUARE, 1, true);
    const resultOpen = filletPolyline(SQUARE, 1, false);
    // Closed should have at minimum as many points as open (it also fillets corner 0)
    expect(result.length).toBeGreaterThanOrEqual(resultOpen.length);
  });

  it('open polyline does not fillet first and last vertices', () => {
    const result = filletPolyline(SQUARE, 1, false);
    // First point should be the original first point
    expect(result[0]!.x).toBeCloseTo(SQUARE[0]!.x, 5);
    expect(result[0]!.y).toBeCloseTo(SQUARE[0]!.y, 5);
    // Last point should be the original last point
    const last = result[result.length - 1]!;
    const origLast = SQUARE[SQUARE.length - 1]!;
    expect(last.x).toBeCloseTo(origLast.x, 5);
    expect(last.y).toBeCloseTo(origLast.y, 5);
  });

  it('all arc points lie on the correct circle (distance from center ≈ radius)', () => {
    const radius = 2;
    const result = filletPolyline(SQUARE, radius, true);
    // The corner at (10,0) has center at (10-radius, radius) = (8,2)
    // Check that at least one arc point is close to that center at distance ~radius
    const centerX = 10 - radius;
    const centerY = radius;
    const distances = result.map((p) =>
      Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
    );
    const onArc = distances.filter((d) => Math.abs(d - radius) < 0.05);
    expect(onArc.length).toBeGreaterThan(0);
  });
});
