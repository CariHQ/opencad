/**
 * useGeometryBuilder Tests
 *
 * Tests the TypeScript fallback layer (WASM unavailable in vitest / jsdom).
 * The same numeric results are validated by the Rust unit tests in
 * packages/geometry/src-rust/lib.rs.
 *
 * Test IDs: T-3D-WASM-001 through T-3D-WASM-006
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGeometryBuilder } from './useGeometryBuilder';
import type { ElementSchema } from '@opencad/document';
import type { Profile2D, BoxRegion } from './useGeometryBuilder';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWallElement(
  startX = 0, startY = 0,
  endX = 5000, endY = 0,
  height = 3000,
  thickness = 200,
): ElementSchema {
  return {
    id: 'wall-test',
    type: 'wall',
    visible: true,
    locked: false,
    layerId: 'layer-0',
    levelId: null,
    properties: {
      StartX:   { type: 'number', value: startX },
      StartY:   { type: 'number', value: startY },
      EndX:     { type: 'number', value: endX },
      EndY:     { type: 'number', value: endY },
      Height:   { type: 'number', value: height },
      Width:    { type: 'number', value: thickness },
    },
    propertySets: [],
    geometry:    { type: 'mesh', data: null },
    transform:   { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    boundingBox: { min: { x: 0, y: 0, z: 0, _type: 'Point3D' }, max: { x: 5000, y: 200, z: 3000, _type: 'Point3D' } },
    metadata:    { id: 'wall-test', createdBy: 'test', createdAt: 0, updatedAt: 0, version: { clock: {} } },
  };
}

// ─── T-3D-WASM-001: buildExtrudedGeometry ────────────────────────────────────

describe('T-3D-WASM-001: buildExtrudedGeometry', () => {
  it('returns a non-empty Float32Array for a square profile', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const profile: Profile2D = { points: [0, 0, 1, 0, 1, 1, 0, 1] };
    const verts = result.current.buildExtrudedGeometry(profile, 1.0);
    expect(verts).toBeInstanceOf(Float32Array);
    expect(verts.length).toBeGreaterThan(0);
  });

  it('square profile produces exactly 108 floats (matches Rust)', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const profile: Profile2D = { points: [0, 0, 1, 0, 1, 1, 0, 1] };
    const verts = result.current.buildExtrudedGeometry(profile, 1.0);
    // 6 faces × 2 tris × 3 verts × 3 floats = 108
    expect(verts.length).toBe(108);
  });

  it('triangle profile produces exactly 72 floats', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const profile: Profile2D = { points: [0, 0, 2, 0, 1, 2] };
    const verts = result.current.buildExtrudedGeometry(profile, 3.0);
    expect(verts.length).toBe(72);
  });

  it('vertex buffer length is always a multiple of 9', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const profile: Profile2D = { points: [0, 0, 4, 0, 4, 3, 0, 3] };
    const verts = result.current.buildExtrudedGeometry(profile, 2.0);
    expect(verts.length % 9).toBe(0);
  });

  it('Z range spans from 0 to height', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const profile: Profile2D = { points: [0, 0, 1, 0, 1, 1, 0, 1] };
    const verts = result.current.buildExtrudedGeometry(profile, 5.0);
    const zVals: number[] = [];
    for (let i = 2; i < verts.length; i += 3) zVals.push(verts[i]!);
    expect(Math.min(...zVals)).toBeCloseTo(0, 5);
    expect(Math.max(...zVals)).toBeCloseTo(5.0, 5);
  });

  it('degenerate profile (< 3 points) returns empty array', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const profile: Profile2D = { points: [0, 0, 1, 0] };
    const verts = result.current.buildExtrudedGeometry(profile, 1.0);
    expect(verts.length).toBe(0);
  });
});

// ─── T-3D-WASM-002: buildWallGeometry ────────────────────────────────────────

describe('T-3D-WASM-002: buildWallGeometry', () => {
  it('returns a non-empty Float32Array', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const wall = makeWallElement();
    const verts = result.current.buildWallGeometry(wall);
    expect(verts).toBeInstanceOf(Float32Array);
    expect(verts.length).toBeGreaterThan(0);
  });

  it('produces exactly 108 floats for a standard wall', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const wall = makeWallElement();
    const verts = result.current.buildWallGeometry(wall);
    expect(verts.length).toBe(108);
  });

  it('Z range matches the wall height property', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const wall = makeWallElement(0, 0, 5000, 0, 3000, 200);
    const verts = result.current.buildWallGeometry(wall);
    const zVals: number[] = [];
    for (let i = 2; i < verts.length; i += 3) zVals.push(verts[i]!);
    expect(Math.min(...zVals)).toBeCloseTo(0, 3);
    expect(Math.max(...zVals)).toBeCloseTo(3000, 3);
  });

  it('diagonal wall also produces 108 floats', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const wall = makeWallElement(0, 0, 3000, 4000, 2500, 300);
    const verts = result.current.buildWallGeometry(wall);
    expect(verts.length).toBe(108);
  });

  it('zero-length wall returns empty array', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const wall = makeWallElement(1000, 1000, 1000, 1000, 3000, 200);
    const verts = result.current.buildWallGeometry(wall);
    expect(verts.length).toBe(0);
  });

  it('uses default values when properties are missing', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const wall: ElementSchema = {
      id: 'w2', type: 'wall', visible: true, locked: false,
      layerId: 'l', levelId: null, properties: {}, propertySets: [],
      geometry: { type: 'mesh', data: null },
      transform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      boundingBox: { min: { x: 0, y: 0, z: 0, _type: 'Point3D' }, max: { x: 1000, y: 200, z: 3000, _type: 'Point3D' } },
      metadata: { id: 'w2', createdBy: 'test', createdAt: 0, updatedAt: 0, version: { clock: {} } },
    };
    // Default EndX = StartX + 1000, so length > 0 → mesh should be non-empty
    const verts = result.current.buildWallGeometry(wall);
    expect(verts.length).toBe(108);
  });
});

// ─── T-3D-WASM-003: subtractBox ──────────────────────────────────────────────

describe('T-3D-WASM-003: subtractBox', () => {
  it('returns a Float32Array', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const profile: Profile2D = { points: [0, 0, 2, 0, 2, 2, 0, 2] };
    const verts = result.current.buildExtrudedGeometry(profile, 2.0);
    const box: BoxRegion = { minX: 0.1, minY: 0.1, minZ: 0.1, maxX: 1.9, maxY: 1.9, maxZ: 1.9 };
    const result2 = result.current.subtractBox(verts, box);
    expect(result2).toBeInstanceOf(Float32Array);
  });

  it('removes fully-interior triangles', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    // A single triangle completely inside the box
    const insideTri = new Float32Array([1.1, 1.1, 0.0,  1.9, 1.1, 0.0,  1.5, 1.9, 0.0]);
    // A single triangle completely outside
    const outsideTri = new Float32Array([4.0, 4.0, 0.0,  6.0, 4.0, 0.0,  5.0, 6.0, 0.0]);
    const combined = new Float32Array(18);
    combined.set(insideTri, 0);
    combined.set(outsideTri, 9);

    const box: BoxRegion = { minX: 1.0, minY: 1.0, minZ: -1.0, maxX: 2.0, maxY: 2.0, maxZ: 1.0 };
    const filtered = result.current.subtractBox(combined, box);
    expect(filtered.length).toBe(9); // only outside triangle remains
  });

  it('keeps boundary-straddling triangles', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    // Vertex at 0.5 is outside box [1,2]
    const straddling = new Float32Array([0.5, 1.5, 0.0,  1.5, 1.5, 0.0,  1.0, 2.5, 0.0]);
    const box: BoxRegion = { minX: 1.0, minY: 1.0, minZ: -1.0, maxX: 2.0, maxY: 2.0, maxZ: 1.0 };
    const filtered = result.current.subtractBox(straddling, box);
    expect(filtered.length).toBe(9);
  });

  it('does not increase triangle count', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const profile: Profile2D = { points: [0, 0, 2, 0, 2, 2, 0, 2] };
    const verts = result.current.buildExtrudedGeometry(profile, 2.0);
    const before = verts.length;
    const box: BoxRegion = { minX: 0.1, minY: 0.1, minZ: 0.1, maxX: 1.9, maxY: 1.9, maxZ: 1.9 };
    const after = result.current.subtractBox(verts, box);
    expect(after.length).toBeLessThanOrEqual(before);
  });

  it('empty input returns empty output', () => {
    const { result } = renderHook(() => useGeometryBuilder());
    const box: BoxRegion = { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 };
    const filtered = result.current.subtractBox(new Float32Array(0), box);
    expect(filtered.length).toBe(0);
  });
});
