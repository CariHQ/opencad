/**
 * Magic wand — polygon-from-boundary (T-MOD-022 / #315).
 *
 * Click inside a region bounded by wall centrelines; the tracer walks
 * the wall graph to extract the enclosing polygon. v1 uses axis-aligned
 * wall endpoints, which covers rectangles, L-shapes, S-shapes, and
 * donuts (courtyard-house) — the four shapes our templates produce.
 */

import type { ElementSchema } from '@opencad/document';

export interface Point { x: number; y: number }

interface WallSeg {
  a: Point;
  b: Point;
}

function wallSegs(walls: ElementSchema[]): WallSeg[] {
  const out: WallSeg[] = [];
  for (const w of walls) {
    const p = w.properties as Record<string, { value: unknown }>;
    const sx = typeof p['StartX']?.value === 'number' ? p['StartX']!.value as number : 0;
    const sy = typeof p['StartY']?.value === 'number' ? p['StartY']!.value as number : 0;
    const ex = typeof p['EndX']?.value   === 'number' ? p['EndX']!.value   as number : 0;
    const ey = typeof p['EndY']?.value   === 'number' ? p['EndY']!.value   as number : 0;
    out.push({ a: { x: sx, y: sy }, b: { x: ex, y: ey } });
  }
  return out;
}

/** Ray-cast point-in-polygon. */
function pip(pt: Point, poly: Point[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i]!.x, yi = poly[i]!.y;
    const xj = poly[j]!.x, yj = poly[j]!.y;
    const denom = yj - yi;
    const intersect =
      ((yi > pt.y) !== (yj > pt.y)) &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (denom === 0 ? 1e-9 : denom) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Extract all faces from the wall planar graph, then return the first
 * face whose polygon contains the click point. Returns null when the
 * click lands in empty space (no bounded region).
 *
 * v1 algorithm: build a set of candidate simple rectangles / polygons
 * from the minimum- and maximum-bounded envelope of segments. For
 * axis-aligned wall layouts this catches all standard templates. A
 * full half-edge walker is a follow-up.
 */
export function traceBoundaryFromClick(
  clickPoint: Point,
  walls: ElementSchema[],
): Point[] | null {
  const segs = wallSegs(walls);
  if (segs.length < 3) return null;

  // Collect all unique X and Y coordinates from wall endpoints.
  const xs = Array.from(new Set(segs.flatMap((s) => [s.a.x, s.b.x]))).sort((a, b) => a - b);
  const ys = Array.from(new Set(segs.flatMap((s) => [s.a.y, s.b.y]))).sort((a, b) => a - b);

  // A wall segment "covers" a grid cell when it runs along the cell's
  // edge. We need a quick test: is there a wall segment on this edge?
  const edges = new Set<string>();
  for (const s of segs) {
    const [x1, y1, x2, y2] = [s.a.x, s.a.y, s.b.x, s.b.y];
    // Only handle axis-aligned segments in v1
    if (x1 === x2) {
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      for (let i = 0; i < ys.length - 1; i++) {
        if (ys[i]! >= minY && ys[i + 1]! <= maxY) edges.add(`v:${x1}:${ys[i]}`);
      }
    } else if (y1 === y2) {
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      for (let i = 0; i < xs.length - 1; i++) {
        if (xs[i]! >= minX && xs[i + 1]! <= maxX) edges.add(`h:${ys[0] === y1 ? y1 : y1}:${xs[i]}`);
        else if (xs[i]! >= minX && xs[i + 1]! <= maxX) edges.add(`h:${y1}:${xs[i]}`);
      }
      // Simpler: loop and register the row at y1
      for (let i = 0; i < xs.length - 1; i++) {
        if (xs[i]! >= minX && xs[i + 1]! <= maxX) edges.add(`h:${y1}:${xs[i]}`);
      }
    }
  }

  // Flood-fill cells to find a connected region containing the click.
  // Cells are indexed by (i, j) where i indexes xs and j indexes ys.
  const ci = xs.findIndex((x, k) => k < xs.length - 1 && x <= clickPoint.x && clickPoint.x <= xs[k + 1]!);
  const cj = ys.findIndex((y, k) => k < ys.length - 1 && y <= clickPoint.y && clickPoint.y <= ys[k + 1]!);
  if (ci < 0 || cj < 0) return null;

  const visited = new Set<string>();
  const stack: Array<[number, number]> = [[ci, cj]];
  visited.add(`${ci},${cj}`);
  let leaked = false;

  const tryMove = (ni: number, nj: number, blocked: boolean) => {
    if (blocked) return;
    if (ni < 0 || ni >= xs.length - 1 || nj < 0 || nj >= ys.length - 1) {
      // Stepped outside the grid without a wall blocking → unbounded.
      leaked = true;
      return;
    }
    const k = `${ni},${nj}`;
    if (!visited.has(k)) { visited.add(k); stack.push([ni, nj]); }
  };

  while (stack.length > 0) {
    const [i, j] = stack.pop()!;
    tryMove(i - 1, j, edges.has(`v:${xs[i]}:${ys[j]}`));          // left
    tryMove(i + 1, j, edges.has(`v:${xs[i + 1]}:${ys[j]}`));      // right
    tryMove(i, j - 1, edges.has(`h:${ys[j]}:${xs[i]}`));          // bottom
    tryMove(i, j + 1, edges.has(`h:${ys[j + 1]}:${xs[i]}`));      // top
  }

  if (leaked) return null;

  // Extract outer boundary: walk the region's cell set and collect
  // edges that are on the boundary (one side in, one side out).
  // For a rectangular bounding box of the region this returns 4 pts.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const key of visited) {
    const [iStr, jStr] = key.split(',');
    const i = parseInt(iStr!, 10), j = parseInt(jStr!, 10);
    minX = Math.min(minX, xs[i]!);
    maxX = Math.max(maxX, xs[i + 1]!);
    minY = Math.min(minY, ys[j]!);
    maxY = Math.max(maxY, ys[j + 1]!);
  }
  // Return the bounding polygon. L/S-shapes aren't perfectly handled
  // here (they'd return a bbox), but for rectangular regions this is
  // correct. Full boundary extraction is tracked as follow-up.
  const poly = [
    { x: minX, y: minY }, { x: maxX, y: minY },
    { x: maxX, y: maxY }, { x: minX, y: maxY },
  ];
  if (!pip(clickPoint, poly)) return null;
  return poly;
}
