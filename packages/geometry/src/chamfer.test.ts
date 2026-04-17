/**
 * T-3D-013: Chamfer Operations — 2D polyline corner cutting
 */

import { describe, it, expect } from 'vitest';
import { chamferCorner, chamferPolyline } from './chamfer';

// Helpers
const pt = (x: number, y: number) => ({ x, y });

// A 90° right-angle corner: prev is to the left, corner at origin, next is above
const PREV_90 = pt(-1, 0);
const CORNER_90 = pt(0, 0);
const NEXT_90 = pt(0, 1);

// A square [0,0]→[10,0]→[10,10]→[0,10]
const SQUARE = [pt(0, 0), pt(10, 0), pt(10, 10), pt(0, 10)];

describe('T-3D-013: chamferCorner', () => {
  it('returns correct cut points for a 90° corner with equal distances', () => {
    const dist = 0.5;
    const result = chamferCorner(PREV_90, CORNER_90, NEXT_90, dist, dist);
    expect(result).not.toBeNull();
    if (!result) return;

    // Entry: corner + unitVecToPrev * dist = (0,0) + (-1,0)*0.5 = (-0.5, 0)
    expect(result.entry.x).toBeCloseTo(-0.5, 5);
    expect(result.entry.y).toBeCloseTo(0, 5);

    // Exit: corner + unitVecToNext * dist = (0,0) + (0,1)*0.5 = (0, 0.5)
    expect(result.exit.x).toBeCloseTo(0, 5);
    expect(result.exit.y).toBeCloseTo(0.5, 5);
  });

  it('returns correct cut points with asymmetric distances (dist1 ≠ dist2)', () => {
    const result = chamferCorner(PREV_90, CORNER_90, NEXT_90, 0.3, 0.7);
    expect(result).not.toBeNull();
    if (!result) return;

    // Entry: (0,0) + (-1,0)*0.3 = (-0.3, 0)
    expect(result.entry.x).toBeCloseTo(-0.3, 5);
    expect(result.entry.y).toBeCloseTo(0, 5);

    // Exit: (0,0) + (0,1)*0.7 = (0, 0.7)
    expect(result.exit.x).toBeCloseTo(0, 5);
    expect(result.exit.y).toBeCloseTo(0.7, 5);
  });

  it('returns null when dist1 exceeds the length of the incoming edge', () => {
    // Edge from CORNER to PREV is length 1; dist1=2 exceeds it
    const result = chamferCorner(PREV_90, CORNER_90, NEXT_90, 2, 0.5);
    expect(result).toBeNull();
  });

  it('returns null when dist2 exceeds the length of the outgoing edge', () => {
    // Edge from CORNER to NEXT is length 1; dist2=2 exceeds it
    const result = chamferCorner(PREV_90, CORNER_90, NEXT_90, 0.5, 2);
    expect(result).toBeNull();
  });

  it('returns null for a zero-length edge (corner == prev)', () => {
    const result = chamferCorner(CORNER_90, CORNER_90, NEXT_90, 0.5, 0.5);
    expect(result).toBeNull();
  });
});

describe('T-3D-013: chamferPolyline', () => {
  it('returns 8 points for a closed square with equal chamfer distances', () => {
    // 4 corners × 2 cut points each = 8 points
    const result = chamferPolyline(SQUARE, 1, 1, true);
    expect(result.length).toBe(8);
  });

  it('open polyline does not chamfer first and last vertices', () => {
    const result = chamferPolyline(SQUARE, 1, 1, false);
    // Only corners 1 and 2 are chamfered → 4 original + 2 extra points = 6
    expect(result.length).toBe(6);
  });

  it('first point of open polyline equals original first point', () => {
    const result = chamferPolyline(SQUARE, 1, 1, false);
    expect(result[0]!.x).toBeCloseTo(SQUARE[0]!.x, 5);
    expect(result[0]!.y).toBeCloseTo(SQUARE[0]!.y, 5);
  });

  it('produces asymmetric cuts when dist1 ≠ dist2', () => {
    const d1 = 1;
    const d2 = 2;
    const result = chamferPolyline(SQUARE, d1, d2, true);
    // Verify that the cut at corner (10,0) has entry and exit at different distances
    // Entry of corner (10,0): along incoming edge (from (0,0)→(10,0)), dist1=1 back → (9, 0)
    // Exit of corner (10,0): along outgoing edge (from (10,0)→(10,10)), dist2=2 forward → (10, 2)
    const entryIdx = result.findIndex((p) => Math.abs(p.x - 9) < 0.01 && Math.abs(p.y - 0) < 0.01);
    const exitIdx = result.findIndex((p) => Math.abs(p.x - 10) < 0.01 && Math.abs(p.y - 2) < 0.01);
    expect(entryIdx).toBeGreaterThanOrEqual(0);
    expect(exitIdx).toBeGreaterThanOrEqual(0);
  });

  it('closed=true handles wrap-around (corner between last and first point is chamfered)', () => {
    const resultClosed = chamferPolyline(SQUARE, 1, 1, true);
    const resultOpen = chamferPolyline(SQUARE, 1, 1, false);
    // Closed should chamfer 2 more corners than open (corners 0 and 3)
    expect(resultClosed.length).toBeGreaterThan(resultOpen.length);
  });
});
