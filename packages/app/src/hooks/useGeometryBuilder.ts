/**
 * useGeometryBuilder
 *
 * Provides compute-heavy geometry operations backed by the Rust WASM kernel
 * (`@opencad/geometry` WASM module). Falls back to a lightweight TypeScript
 * implementation if the WASM module has not yet been initialised.
 *
 * Public API (unchanged from the pre-WASM interface):
 *   buildExtrudedGeometry(profile, height) → Float32Array
 *   subtractBox(geometry, box)             → Float32Array
 *   buildWallGeometry(wall)                → Float32Array
 */

import { useCallback, useRef } from 'react';
import type { ElementSchema } from '@opencad/document';

// ─── WASM module types ────────────────────────────────────────────────────────

interface GeometryWasmModule {
  extrude_profile(profilePoints: Float64Array, height: number): Float32Array;
  subtract_box(
    vertices: Float32Array,
    boxMinX: number, boxMinY: number, boxMinZ: number,
    boxMaxX: number, boxMaxY: number, boxMaxZ: number,
  ): Float32Array;
  build_wall_mesh(
    x1: number, y1: number,
    x2: number, y2: number,
    height: number,
    thickness: number,
  ): Float32Array;
  default(input?: unknown): Promise<unknown>;
}

// Lazily resolved WASM module (shared across all hook instances)
let _wasmModule: GeometryWasmModule | null = null;
let _initPromise: Promise<GeometryWasmModule | null> | null = null;

async function loadWasm(): Promise<GeometryWasmModule | null> {
  // The Rust/WASM kernel (@opencad/geometry) was removed — the audit flagged
  // its green tests as false positives that obscured the fact that every
  // live geometry path runs in pure TypeScript below. Keep the shape of
  // this function so callers can stay `await loadWasm()` style without
  // branching, and always fall through to the TS implementations.
  if (_wasmModule) return _wasmModule;
  if (_initPromise) return _initPromise;
  _initPromise = Promise.resolve(null);
  return _initPromise;
}

// ─── TypeScript fallback implementations ─────────────────────────────────────
// These mirror the Rust logic so tests and non-WASM environments still work.

/** Fan-triangulate a convex polygon; appends x,y,z triplets to `out`. */
function fanTriangulateXY(points: [number, number][], z: number, out: number[]): void {
  const n = points.length;
  if (n < 3) return;
  const [ax, ay] = points[0]!;
  for (let i = 1; i < n - 1; i++) {
    const [bx, by] = points[i]!;
    const [cx, cy] = points[i + 1]!;
    out.push(ax, ay, z, bx, by, z, cx, cy, z);
  }
}

function pushQuad(
  out: number[],
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  x3: number, y3: number, z3: number,
): void {
  out.push(x0, y0, z0, x1, y1, z1, x2, y2, z2);
  out.push(x0, y0, z0, x2, y2, z2, x3, y3, z3);
}

function tsExtrudeProfile(profilePoints: number[], height: number): Float32Array {
  const n = profilePoints.length / 2;
  if (n < 3) return new Float32Array(0);

  const pts: [number, number][] = Array.from({ length: n }, (_, i) => [
    profilePoints[i * 2]!,
    profilePoints[i * 2 + 1]!,
  ]);

  const out: number[] = [];

  // Bottom cap (reversed winding for -Z normal)
  fanTriangulateXY([...pts].reverse(), 0, out);
  // Top cap
  fanTriangulateXY(pts, height, out);
  // Side walls
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[j]!;
    pushQuad(out, x0, y0, 0, x1, y1, 0, x1, y1, height, x0, y0, height);
  }

  return new Float32Array(out);
}

function tsSubtractBox(
  vertices: Float32Array,
  boxMinX: number, boxMinY: number, boxMinZ: number,
  boxMaxX: number, boxMaxY: number, boxMaxZ: number,
): Float32Array {
  const out: number[] = [];
  const triCount = Math.floor(vertices.length / 9);
  const inside = (x: number, y: number, z: number) =>
    x >= boxMinX && x <= boxMaxX &&
    y >= boxMinY && y <= boxMaxY &&
    z >= boxMinZ && z <= boxMaxZ;

  for (let t = 0; t < triCount; t++) {
    const b = t * 9;
    const cx = (vertices[b]! + vertices[b + 3]! + vertices[b + 6]!) / 3;
    const cy = (vertices[b + 1]! + vertices[b + 4]! + vertices[b + 7]!) / 3;
    const cz = (vertices[b + 2]! + vertices[b + 5]! + vertices[b + 8]!) / 3;
    const allIn =
      inside(cx, cy, cz) &&
      inside(vertices[b]!, vertices[b + 1]!, vertices[b + 2]!) &&
      inside(vertices[b + 3]!, vertices[b + 4]!, vertices[b + 5]!) &&
      inside(vertices[b + 6]!, vertices[b + 7]!, vertices[b + 8]!);
    if (!allIn) {
      for (let k = 0; k < 9; k++) out.push(vertices[b + k]!);
    }
  }
  return new Float32Array(out);
}

function tsBuildWallMesh(
  x1: number, y1: number,
  x2: number, y2: number,
  height: number,
  thickness: number,
): Float32Array {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6 || height < 1e-6) return new Float32Array(0);

  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const t = thickness / 2;
  const h = height;

  type V = [number, number, number];
  const v: V[] = [
    [x1 - px * t, y1 - py * t, 0],  // 0
    [x1 + px * t, y1 + py * t, 0],  // 1
    [x2 + px * t, y2 + py * t, 0],  // 2
    [x2 - px * t, y2 - py * t, 0],  // 3
    [x1 - px * t, y1 - py * t, h],  // 4
    [x1 + px * t, y1 + py * t, h],  // 5
    [x2 + px * t, y2 + py * t, h],  // 6
    [x2 - px * t, y2 - py * t, h],  // 7
  ];

  const out: number[] = [];
  const pq = (a: number, b: number, c: number, d: number) =>
    pushQuad(out, ...v[a]!, ...v[b]!, ...v[c]!, ...v[d]!);

  pq(0, 3, 2, 1); // bottom
  pq(4, 5, 6, 7); // top
  pq(0, 1, 5, 4); // start face
  pq(2, 3, 7, 6); // end face
  pq(0, 4, 7, 3); // left
  pq(1, 2, 6, 5); // right

  return new Float32Array(out);
}

// ─── Public input / output types ─────────────────────────────────────────────

export interface Profile2D {
  /** Flat array of [x0, y0, x1, y1, ...] pairs */
  points: number[];
}

export interface BoxRegion {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeometryBuilder() {
  const wasmRef = useRef<GeometryWasmModule | null>(null);

  // Kick off WASM load on first hook use (fire-and-forget; callers get TS
  // fallback synchronously until WASM is ready).
  if (wasmRef.current === null && _wasmModule !== null) {
    wasmRef.current = _wasmModule;
  } else if (wasmRef.current === null) {
    void loadWasm().then((mod) => {
      wasmRef.current = mod;
    });
  }

  /**
   * Extrude a 2D polygon profile to a triangulated 3D mesh.
   *
   * @param profile - The 2D profile with a flat `points` array `[x0,y0,x1,y1,…]`
   * @param height  - Extrusion height along the Z axis
   * @returns       - Flat `Float32Array` of (x,y,z) triplets ready for Three.js `BufferGeometry`
   */
  const buildExtrudedGeometry = useCallback(
    (profile: Profile2D, height: number): Float32Array => {
      const wasm = wasmRef.current;
      if (wasm) {
        try {
          return wasm.extrude_profile(new Float64Array(profile.points), height);
        } catch {
          // fall through to TS fallback
        }
      }
      return tsExtrudeProfile(profile.points, height);
    },
    [],
  );

  /**
   * Boolean subtraction: remove triangles fully inside an AABB.
   * Used to cut door / window openings from wall meshes.
   *
   * @param geometry - Existing vertex buffer (Float32Array of x,y,z triplets)
   * @param box      - The AABB to subtract
   * @returns        - Filtered vertex buffer
   */
  const subtractBox = useCallback(
    (geometry: Float32Array, box: BoxRegion): Float32Array => {
      const wasm = wasmRef.current;
      if (wasm) {
        try {
          return wasm.subtract_box(
            geometry,
            box.minX, box.minY, box.minZ,
            box.maxX, box.maxY, box.maxZ,
          );
        } catch {
          // fall through
        }
      }
      return tsSubtractBox(geometry, box.minX, box.minY, box.minZ, box.maxX, box.maxY, box.maxZ);
    },
    [],
  );

  /**
   * Build a wall mesh from an `ElementSchema` with type `'wall'`.
   *
   * Reads properties: `StartX`, `StartY`, `EndX`, `EndY`, `Height`, `Width`
   * (matching the conventions used throughout the viewport renderers).
   *
   * @param wall - A wall `ElementSchema`
   * @returns    - Flat `Float32Array` of (x,y,z) triplets
   */
  const buildWallGeometry = useCallback(
    (wall: ElementSchema): Float32Array => {
      const pv = (key: string, def: number): number => {
        const p = (wall.properties as Record<string, { value: unknown }>)[key];
        return typeof p?.value === 'number' ? p.value : def;
      };

      const x1 = pv('StartX', 0);
      const y1 = pv('StartY', 0);
      const x2 = pv('EndX', x1 + 1000);
      const y2 = pv('EndY', y1);
      const height = pv('Height', 3000);
      const thickness = pv('Width', 200);

      const wasm = wasmRef.current;
      if (wasm) {
        try {
          return wasm.build_wall_mesh(x1, y1, x2, y2, height, thickness);
        } catch {
          // fall through
        }
      }
      return tsBuildWallMesh(x1, y1, x2, y2, height, thickness);
    },
    [],
  );

  return { buildExtrudedGeometry, subtractBox, buildWallGeometry };
}
