/**
 * T-DOC-005 section slicer tests (GitHub issue #298).
 *
 *   T-DOC-005-001 — slice a 1×1×1 box with x=0.5 plane → 4-vertex rectangle
 *   T-DOC-005-002 — non-intersecting plane returns null
 *   T-DOC-005-003 — composite wall slice returns one polygon per layer
 *   T-DOC-005-004 — slicing is deterministic
 */
import { describe, it, expect } from 'vitest';
import { sliceBoxAxisPlane, sliceBoxes, sliceCompositeWall } from './sectionSlice';

describe('T-DOC-005: sectionSlice', () => {
  it('T-DOC-005-001: slicing a unit box with x=0.5 plane returns a YZ rectangle', () => {
    const r = sliceBoxAxisPlane(
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { axis: 'x', value: 0.5 },
    );
    expect(r).toHaveLength(4);
    expect(r).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ]);
  });

  it('T-DOC-005-002: plane that misses the box returns null', () => {
    const r = sliceBoxAxisPlane(
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { axis: 'x', value: 10 },
    );
    expect(r).toBeNull();
  });

  it('T-DOC-005-002b: y plane outside the box returns null', () => {
    const r = sliceBoxAxisPlane(
      { min: { x: 0, y: 2, z: 0 }, max: { x: 1, y: 3, z: 1 } },
      { axis: 'y', value: 0 },
    );
    expect(r).toBeNull();
  });

  it('T-DOC-005-003: composite wall slice returns one polygon per layer', () => {
    const layers = [
      { box: { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 100 } }, material: 'Brick' },
      { box: { min: { x: 100, y: 0, z: 0 }, max: { x: 150, y: 100, z: 100 } }, material: 'Cavity' },
      { box: { min: { x: 150, y: 0, z: 0 }, max: { x: 200, y: 100, z: 100 } }, material: 'Blockwork' },
    ];
    const result = sliceCompositeWall(layers, { axis: 'x', value: 50 });
    // The x=50 plane hits the first layer only
    expect(result.polygons).toHaveLength(1);
    expect(result.polygons[0]!.material).toBe('Brick');
    // Sliced at x=125, only cavity
    const r2 = sliceCompositeWall(layers, { axis: 'x', value: 125 });
    expect(r2.polygons).toHaveLength(1);
    expect(r2.polygons[0]!.material).toBe('Cavity');
  });

  it('T-DOC-005-004: slicing is deterministic across repeated calls', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      { min: { x: 2, y: 0, z: 0 }, max: { x: 3, y: 1, z: 1 } },
    ];
    const a = sliceBoxes(boxes, { axis: 'x', value: 0.5 });
    const b = sliceBoxes(boxes, { axis: 'x', value: 0.5 });
    expect(a.polygons).toEqual(b.polygons);
  });

  it('sliceBoxes includes only the boxes the plane crosses', () => {
    const boxes = [
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 }, elementId: 'a' },
      { min: { x: 10, y: 0, z: 0 }, max: { x: 11, y: 1, z: 1 }, elementId: 'b' },
    ];
    const r = sliceBoxes(boxes, { axis: 'x', value: 0.5 });
    expect(r.polygons).toHaveLength(1);
    expect(r.polygons[0]!.elementId).toBe('a');
  });
});
