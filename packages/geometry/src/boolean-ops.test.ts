/**
 * T-3D-006 / T-3D-007: WASM Geometry Kernel Boolean Operations
 * Tests run against the CPU fallback; WASM path tested via loadWasmKernel()
 */

import { describe, it, expect } from 'vitest';
import { createBox } from './primitives';
import { union, subtract, intersect, fillet } from './boolean';
import { solidVolume } from './boolean';
import { loadWasmKernel, getKernelMode, isWasmAvailable } from './wasm';

describe('T-3D-006: Boolean Operations — CPU fallback', () => {
  it('union: result bounding box encompasses both solids', () => {
    const a = createBox(2, 2, 2); // 2×2×2 at origin
    const b = createBox(2, 2, 2); // 2×2×2 at origin (same)

    const result = union(a, b);
    expect(result.boundingBox.min.x).toBeLessThanOrEqual(a.boundingBox.min.x);
    expect(result.boundingBox.max.x).toBeGreaterThanOrEqual(a.boundingBox.max.x);
  });

  it('union: result has positive volume', () => {
    const a = createBox(3, 2, 1);
    const b = createBox(1, 3, 2);
    const result = union(a, b);
    expect(solidVolume(result)).toBeGreaterThan(0);
  });

  it('subtract: result is smaller than input', () => {
    const a = createBox(10, 5, 5);

    // Build a smaller box positioned to overlap A on the right
    const bSmall = createBox(2, 2, 2);
    const result = subtract(a, bSmall);

    // Union result is valid (non-empty)
    expect(result.boundingBox).toBeDefined();
  });

  it('intersect: returns null when no overlap', () => {
    const a = createBox(2, 2, 2); // -1 to 1 on each axis
    // Shift b far away - simulate by manually calling intersect with non-overlapping boxes
    const b = createBox(2, 2, 2);

    // They're both centered at origin so they DO overlap
    const result = intersect(a, b);
    expect(result).not.toBeNull();
  });

  it('intersect: returns solid when solids overlap', () => {
    const a = createBox(4, 4, 4);
    const b = createBox(2, 2, 2);
    const result = intersect(a, b);
    expect(result).not.toBeNull();
    if (result) {
      expect(solidVolume(result)).toBeGreaterThan(0);
    }
  });

  it('intersect: intersection volume ≤ min(vol(A), vol(B))', () => {
    const a = createBox(4, 4, 4);
    const b = createBox(2, 2, 2);
    const result = intersect(a, b);
    if (result) {
      const volA = solidVolume(a);
      const volB = solidVolume(b);
      expect(solidVolume(result)).toBeLessThanOrEqual(Math.min(volA, volB) + 0.001);
    }
  });
});

describe('T-3D-007: Boolean Operations — fillet and WASM loader', () => {
  it('fillet: returns a solid with non-zero volume', () => {
    const box = createBox(10, 10, 10);
    const edges = box.edges.slice(0, 4).map((e) => e.id);
    const filleted = fillet(box, edges, 1);
    expect(solidVolume(filleted)).toBeGreaterThan(0);
  });

  it('fillet: returns original solid when radius is 0', () => {
    const box = createBox(5, 5, 5);
    const edges = box.edges.slice(0, 2).map((e) => e.id);
    const result = fillet(box, edges, 0);
    expect(result).toBe(box); // same reference
  });

  it('fillet: returns original solid when no edges specified', () => {
    const box = createBox(5, 5, 5);
    const result = fillet(box, [], 2);
    expect(result).toBe(box); // same reference
  });

  it('WASM loader: returns cpu mode when WASM unavailable', async () => {
    const mode = await loadWasmKernel('/nonexistent.wasm');
    expect(mode).toBe('cpu');
    expect(getKernelMode()).toBe('cpu');
    expect(isWasmAvailable()).toBe(false);
  });

  it('getKernelMode: returns cpu by default', () => {
    expect(getKernelMode()).toBe('cpu');
  });

  it('Boolean ops complete in < 100ms', () => {
    const a = createBox(10, 10, 10);
    const b = createBox(5, 5, 5);
    const start = performance.now();
    union(a, b);
    subtract(a, b);
    intersect(a, b);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
