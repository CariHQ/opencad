/**
 * Chamfer Operations — 2D Polyline Corner Cutting
 * T-3D-013
 *
 * Cuts corners of a 2D polyline by replacing each vertex with two cut points.
 */

import { type Point2D, createPoint2D } from './core';

export interface ChamferCornerResult {
  /** Cut point on the incoming edge */
  entry: Point2D;
  /** Cut point on the outgoing edge */
  exit: Point2D;
}

/**
 * Chamfer a single corner defined by three consecutive points.
 *
 * @param prev   - the point before the corner
 * @param corner - the corner vertex to cut
 * @param next   - the point after the corner
 * @param dist1  - distance back along the incoming edge (corner → prev direction)
 * @param dist2  - distance forward along the outgoing edge (corner → next direction)
 * @returns ChamferCornerResult or null if distances exceed edge lengths
 */
export function chamferCorner(
  prev: Point2D,
  corner: Point2D,
  next: Point2D,
  dist1: number,
  dist2: number,
): ChamferCornerResult | null {
  // Vectors from corner to prev and corner to next
  const toPrev = { x: prev.x - corner.x, y: prev.y - corner.y };
  const toNext = { x: next.x - corner.x, y: next.y - corner.y };

  const lenPrev = Math.sqrt(toPrev.x ** 2 + toPrev.y ** 2);
  const lenNext = Math.sqrt(toNext.x ** 2 + toNext.y ** 2);

  // Zero-length edge — cannot chamfer
  if (lenPrev < 1e-10 || lenNext < 1e-10) return null;

  // Distances must fit within the respective edges
  if (dist1 > lenPrev || dist2 > lenNext) return null;

  // Unit vectors from corner toward prev and toward next
  const uPrev = { x: toPrev.x / lenPrev, y: toPrev.y / lenPrev };
  const uNext = { x: toNext.x / lenNext, y: toNext.y / lenNext };

  // entry = corner + uPrev * dist1
  const entry = createPoint2D(
    corner.x + uPrev.x * dist1,
    corner.y + uPrev.y * dist1,
  );

  // exit = corner + uNext * dist2
  const exit = createPoint2D(
    corner.x + uNext.x * dist2,
    corner.y + uNext.y * dist2,
  );

  return { entry, exit };
}

/**
 * Chamfer each vertex in `points` at distances [dist1, dist2] along each edge.
 *
 * @param points  - input polyline vertices
 * @param dist1   - distance back along the incoming edge
 * @param dist2   - distance forward along the outgoing edge (defaults to dist1)
 * @param closed  - if true, also chamfers the wrap-around corner
 */
export function chamferPolyline(
  points: Point2D[],
  dist1: number,
  dist2?: number,
  closed?: boolean,
): Point2D[] {
  const d2 = dist2 ?? dist1;
  if (points.length < 3) return [...points];

  const n = points.length;
  const result: Point2D[] = [];

  if (closed) {
    // Chamfer every vertex (wrap-around)
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n]!;
      const corner = points[i]!;
      const next = points[(i + 1) % n]!;

      const cc = chamferCorner(prev, corner, next, dist1, d2);
      if (cc) {
        result.push(cc.entry);
        result.push(cc.exit);
      } else {
        result.push(createPoint2D(corner.x, corner.y));
      }
    }
  } else {
    // Open polyline: keep first and last points unchanged, chamfer interior vertices
    result.push(createPoint2D(points[0]!.x, points[0]!.y));

    for (let i = 1; i < n - 1; i++) {
      const prev = points[i - 1]!;
      const corner = points[i]!;
      const next = points[i + 1]!;

      const cc = chamferCorner(prev, corner, next, dist1, d2);
      if (cc) {
        result.push(cc.entry);
        result.push(cc.exit);
      } else {
        result.push(createPoint2D(corner.x, corner.y));
      }
    }

    result.push(createPoint2D(points[n - 1]!.x, points[n - 1]!.y));
  }

  return result;
}
