/**
 * T-MOD-022 boundary tracer tests (GitHub issue #315).
 *
 *   T-MOD-022-001 — 4 walls forming a rectangle → 4-vertex polygon
 *   T-MOD-022-004 — click with no bounding walls → null
 */
import { describe, it, expect } from 'vitest';
import type { ElementSchema } from '@opencad/document';
import { traceBoundaryFromClick } from './boundaryTracer';

let __id = 0;
function wall(x1: number, y1: number, x2: number, y2: number): ElementSchema {
  return {
    id: `w-${++__id}`, type: 'wall', layerId: 'l',
    properties: {
      StartX: { type: 'number', value: x1 },
      StartY: { type: 'number', value: y1 },
      EndX:   { type: 'number', value: x2 },
      EndY:   { type: 'number', value: y2 },
    },
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

describe('T-MOD-022: boundary tracer', () => {
  it('T-MOD-022-001: 4 walls forming a rectangle return a 4-vertex polygon', () => {
    const walls = [
      wall(0, 0, 1000, 0),
      wall(1000, 0, 1000, 1000),
      wall(1000, 1000, 0, 1000),
      wall(0, 1000, 0, 0),
    ];
    const poly = traceBoundaryFromClick({ x: 500, y: 500 }, walls);
    expect(poly).not.toBeNull();
    expect(poly).toHaveLength(4);
  });

  it('T-MOD-022-004: click in empty space (no walls) returns null', () => {
    expect(traceBoundaryFromClick({ x: 500, y: 500 }, [])).toBeNull();
  });

  it('click outside all walls returns null', () => {
    const walls = [
      wall(0, 0, 1000, 0),
      wall(1000, 0, 1000, 1000),
      wall(1000, 1000, 0, 1000),
      wall(0, 1000, 0, 0),
    ];
    expect(traceBoundaryFromClick({ x: 5000, y: 5000 }, walls)).toBeNull();
  });

  it('click inside returns a polygon containing the click', () => {
    const walls = [
      wall(0, 0, 2000, 0),
      wall(2000, 0, 2000, 1000),
      wall(2000, 1000, 0, 1000),
      wall(0, 1000, 0, 0),
    ];
    const poly = traceBoundaryFromClick({ x: 1000, y: 500 }, walls);
    expect(poly).not.toBeNull();
    // The 4 corners of the 2000×1000 box
    const xs = poly!.map((p) => p.x).sort((a, b) => a - b);
    const ys = poly!.map((p) => p.y).sort((a, b) => a - b);
    expect(xs[0]).toBe(0);
    expect(xs[3]).toBe(2000);
    expect(ys[0]).toBe(0);
    expect(ys[3]).toBe(1000);
  });
});
