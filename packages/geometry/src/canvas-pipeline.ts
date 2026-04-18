/**
 * Canvas pipeline — TypeScript implementation of the Rust WASM ElementBatch
 * culling and screen-space transform module.
 *
 * TODO: Once wasm-pack is set up, swap the class body for:
 *   import init, { ElementBatch as RustBatch, snap_to_grid } from '../pkg/opencad_geometry.js';
 *   await init();
 *   export { RustBatch as ElementBatch, snap_to_grid as snapToGrid };
 */

export interface IElementBatch {
  push(idHash: number, minX: number, minY: number, maxX: number, maxY: number): void;
  cullVisible(viewMinX: number, viewMinY: number, viewMaxX: number, viewMaxY: number): Uint32Array;
  transformToScreen(viewTransform: Float32Array): Float32Array;
  /** Return the id_hash of the smallest hit AABB, or 0. */
  pickElement(x: number, y: number): number;
  /** Compute [scale, panX, panY] to fit all elements in the viewport. */
  fitViewport(canvasW: number, canvasH: number, margin?: number): [number, number, number];
  len(): number;
  clear(): void;
}

/**
 * Pure-TypeScript fallback — mirrors the Rust inner-function logic exactly.
 * Swap for the WASM import after `wasm-pack build`.
 */
export class ElementBatch implements IElementBatch {
  // Not `private` so that tests and subclasses can read them directly.
  _ids: number[] = [];
  _boxes: number[] = []; // [min_x, min_y, max_x, max_y] × N

  push(idHash: number, minX: number, minY: number, maxX: number, maxY: number): void {
    this._ids.push(idHash);
    this._boxes.push(minX, minY, maxX, maxY);
  }

  cullVisible(
    viewMinX: number,
    viewMinY: number,
    viewMaxX: number,
    viewMaxY: number,
  ): Uint32Array {
    const visible: number[] = [];
    for (let i = 0; i < this._ids.length; i++) {
      const base = i * 4;
      const minX = this._boxes[base]!;
      const minY = this._boxes[base + 1]!;
      const maxX = this._boxes[base + 2]!;
      const maxY = this._boxes[base + 3]!;
      if (maxX >= viewMinX && minX <= viewMaxX && maxY >= viewMinY && minY <= viewMaxY) {
        visible.push(this._ids[i]!);
      }
    }
    return new Uint32Array(visible);
  }

  transformToScreen(viewTransform: Float32Array): Float32Array {
    const scale   = viewTransform[0] ?? 1;
    const panX    = viewTransform[1] ?? 0;
    const panY    = viewTransform[2] ?? 0;
    const canvasW = viewTransform[3] ?? 0;
    const canvasH = viewTransform[4] ?? 0;
    if (scale === 0) return new Float32Array(this._boxes.length);
    const out = new Float32Array(this._boxes.length);
    const n = this._ids.length;
    for (let i = 0; i < n; i++) {
      const base = i * 4;
      out[base]     = (this._boxes[base]!     - panX) / scale + canvasW / 2;
      out[base + 1] = (this._boxes[base + 1]! - panY) / scale + canvasH / 2;
      out[base + 2] = (this._boxes[base + 2]! - panX) / scale + canvasW / 2;
      out[base + 3] = (this._boxes[base + 3]! - panY) / scale + canvasH / 2;
    }
    return out;
  }

  pickElement(x: number, y: number): number {
    let bestId = 0;
    let bestArea = Infinity;
    const n = this._ids.length;
    for (let i = 0; i < n; i++) {
      const base = i * 4;
      const minX = this._boxes[base]!;
      const minY = this._boxes[base + 1]!;
      const maxX = this._boxes[base + 2]!;
      const maxY = this._boxes[base + 3]!;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        const area = (maxX - minX) * (maxY - minY);
        if (area < bestArea) { bestArea = area; bestId = this._ids[i]!; }
      }
    }
    return bestId;
  }

  fitViewport(canvasW: number, canvasH: number, margin = 40): [number, number, number] {
    if (this._ids.length === 0) return [1, 0, 0];
    let wx0 = Infinity, wy0 = Infinity, wx1 = -Infinity, wy1 = -Infinity;
    for (let i = 0; i < this._ids.length; i++) {
      const b = i * 4;
      wx0 = Math.min(wx0, this._boxes[b]!);
      wy0 = Math.min(wy0, this._boxes[b + 1]!);
      wx1 = Math.max(wx1, this._boxes[b + 2]!);
      wy1 = Math.max(wy1, this._boxes[b + 3]!);
    }
    const ww = wx1 - wx0, wh = wy1 - wy0;
    const aw = Math.max(1, canvasW - 2 * margin), ah = Math.max(1, canvasH - 2 * margin);
    let scale: number;
    if (ww < 1e-6 && wh < 1e-6) { scale = 1; }
    else if (ww < 1e-6) { scale = wh / ah; }
    else if (wh < 1e-6) { scale = ww / aw; }
    else { scale = Math.max(ww / aw, wh / ah); }
    return [scale, (wx0 + wx1) / 2, (wy0 + wy1) / 2];
  }

  len(): number { return this._ids.length; }
  clear(): void { this._ids = []; this._boxes = []; }
}

/**
 * Snap a world-space coordinate to the nearest grid point.
 */
export function snapToGrid(x: number, y: number, gridSize: number): [number, number] {
  if (gridSize === 0) return [x, y];
  return [
    Math.round(x / gridSize) * gridSize,
    Math.round(y / gridSize) * gridSize,
  ];
}

// ── Element picking ───────────────────────────────────────────────────────────

/**
 * Return the id_hash of the smallest AABB in `batch` that contains `(x, y)`,
 * or 0 if no element is hit.  Smallest area wins (front-most in a flat drawing).
 */
export function pickElement(batch: IElementBatch, x: number, y: number): number {
  return batch.pickElement(x, y);
}

// ── Zoom-to-fit ───────────────────────────────────────────────────────────────

/**
 * Compute [scale, panX, panY] to fit all elements in `batch` into a
 * `canvasW × canvasH` viewport with `margin` pixels of padding on each side.
 *
 * The returned transform matches the convention used by `transformToScreen`:
 * `screen_x = (world_x - panX) / scale + canvasW / 2`
 */
export function fitViewport(
  batch: IElementBatch,
  canvasW: number,
  canvasH: number,
  margin = 40,
): [number, number, number] {
  return batch.fitViewport(canvasW, canvasH, margin);
}

// ── Circle / arc triangulation ────────────────────────────────────────────────

/**
 * Triangulate a filled circle as a fan of `segments` triangles.
 *
 * Returns a `Float32Array` of `[x, y, z]` triplets:
 * `segments × 3 vertices × 3 floats = segments × 9` floats.
 */
export function triangulateCircle(
  cx: number, cy: number, r: number,
  segments: number, z = 0,
): Float32Array {
  const n = Math.max(3, Math.floor(segments));
  const out = new Float32Array(n * 9);
  const step = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const a0 = step * i;
    const a1 = step * (i + 1);
    const base = i * 9;
    out[base]     = cx;   out[base + 1] = cy;   out[base + 2] = z;
    out[base + 3] = cx + r * Math.cos(a0); out[base + 4] = cy + r * Math.sin(a0); out[base + 5] = z;
    out[base + 6] = cx + r * Math.cos(a1); out[base + 7] = cy + r * Math.sin(a1); out[base + 8] = z;
  }
  return out;
}

/**
 * Triangulate a filled arc sector (pie slice) from `startAngle` to `endAngle` (radians).
 * Returns a `Float32Array` of `[x, y, z]` triplets.
 */
export function triangulateArc(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number,
  segments: number, z = 0,
): Float32Array {
  const n = Math.max(1, Math.floor(segments));
  const out = new Float32Array(n * 9);
  const sweep = endAngle - startAngle;
  const step = sweep / n;
  for (let i = 0; i < n; i++) {
    const a0 = startAngle + step * i;
    const a1 = startAngle + step * (i + 1);
    const base = i * 9;
    out[base]     = cx;   out[base + 1] = cy;   out[base + 2] = z;
    out[base + 3] = cx + r * Math.cos(a0); out[base + 4] = cy + r * Math.sin(a0); out[base + 5] = z;
    out[base + 6] = cx + r * Math.cos(a1); out[base + 7] = cy + r * Math.sin(a1); out[base + 8] = z;
  }
  return out;
}

// ── Normal generation ─────────────────────────────────────────────────────────

/**
 * Compute per-face (flat) normals for a triangle mesh.
 *
 * `vertices` — flat `[x,y,z, ...]` float32 array (groups of 9 = 1 triangle).
 * Returns a `Float32Array` of the same length: face normal repeated for each
 * of the 3 vertices of every triangle.  Degenerate triangles emit `[0,0,1]`.
 */
export function computeFaceNormals(vertices: Float32Array): Float32Array {
  const out = new Float32Array(vertices.length);
  const triCount = Math.floor(vertices.length / 9);
  for (let t = 0; t < triCount; t++) {
    const b = t * 9;
    const ax = vertices[b]!, ay = vertices[b+1]!, az = vertices[b+2]!;
    const bx = vertices[b+3]!, by = vertices[b+4]!, bz = vertices[b+5]!;
    const cx = vertices[b+6]!, cy = vertices[b+7]!, cz = vertices[b+8]!;
    // AB × AC
    const ex = bx - ax, ey = by - ay, ez = bz - az;
    const fx = cx - ax, fy = cy - ay, fz = cz - az;
    let nx = ey * fz - ez * fy;
    let ny = ez * fx - ex * fz;
    let nz = ex * fy - ey * fx;
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
    if (len > 1e-10) { nx /= len; ny /= len; nz /= len; } else { nz = 1; }
    // Repeat for all 3 vertices
    for (let k = 0; k < 3; k++) {
      out[b + k*3]     = nx;
      out[b + k*3 + 1] = ny;
      out[b + k*3 + 2] = nz;
    }
  }
  return out;
}

/**
 * Compute per-vertex (smooth) normals by averaging adjacent face normals,
 * weighted by triangle area.  Returns a `Float32Array` the same length as
 * `vertices`.
 */
export function computeSmoothNormals(vertices: Float32Array): Float32Array {
  const nVerts = Math.floor(vertices.length / 3);
  const triCount = Math.floor(vertices.length / 9);
  const accum = new Float32Array(nVerts * 3); // [nx, ny, nz] per vertex

  for (let t = 0; t < triCount; t++) {
    const b = t * 9;
    const ax = vertices[b]!, ay = vertices[b+1]!, az = vertices[b+2]!;
    const bx = vertices[b+3]!, by = vertices[b+4]!, bz = vertices[b+5]!;
    const cx = vertices[b+6]!, cy = vertices[b+7]!, cz = vertices[b+8]!;
    const ex = bx - ax, ey = by - ay, ez = bz - az;
    const fx = cx - ax, fy = cy - ay, fz = cz - az;
    let nx = ey * fz - ez * fy;
    let ny = ez * fx - ex * fz;
    let nz = ex * fy - ey * fx;
    const area = Math.sqrt(nx*nx + ny*ny + nz*nz) * 0.5;
    const len = area * 2; // == cross-product length
    if (len > 1e-10) { nx /= len; ny /= len; nz /= len; } else { nz = 1; }
    for (let k = 0; k < 3; k++) {
      const vi = (t * 3 + k) * 3;
      accum[vi]     += nx * area;
      accum[vi + 1] += ny * area;
      accum[vi + 2] += nz * area;
    }
  }

  const out = new Float32Array(vertices.length);
  for (let i = 0; i < nVerts; i++) {
    const vi = i * 3;
    let nx = accum[vi]!, ny = accum[vi+1]!, nz = accum[vi+2]!;
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
    if (len > 1e-10) { nx /= len; ny /= len; nz /= len; } else { nz = 1; }
    out[vi]     = nx;
    out[vi + 1] = ny;
    out[vi + 2] = nz;
  }
  return out;
}
