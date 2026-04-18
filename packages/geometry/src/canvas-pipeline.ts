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
  len(): number;
  clear(): void;
}

/**
 * Pure-TypeScript fallback — mirrors the Rust inner-function logic exactly.
 * Swap for the WASM import after `wasm-pack build`.
 */
export class ElementBatch implements IElementBatch {
  private _ids: number[] = [];
  private _boxes: number[] = []; // [min_x, min_y, max_x, max_y] × N

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
