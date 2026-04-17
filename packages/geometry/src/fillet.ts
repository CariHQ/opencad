/**
 * Fillet Operations — 2D Polyline Rounding
 * T-3D-012
 *
 * Rounds corners of a 2D polyline by inserting arc approximations at each vertex.
 */

import { type Point2D, createPoint2D } from './core';

export interface FilletCornerResult {
  /** Tangent point on the incoming edge (arc start) */
  entry: Point2D;
  /** Tangent point on the outgoing edge (arc end) */
  exit: Point2D;
  /** Center of the fillet arc */
  center: Point2D;
  /** Start angle of arc (radians) */
  startAngle: number;
  /** End angle of arc (radians) */
  endAngle: number;
}

// Number of interpolated points used to approximate the arc (excluding entry/exit)
const ARC_SEGMENTS = 8;

/**
 * Fillet a single corner defined by three consecutive points.
 *
 * @param prev    - the point before the corner
 * @param corner  - the corner vertex to round
 * @param next    - the point after the corner
 * @param radius  - fillet radius (must be > 0 and fit within both edges)
 * @returns FilletCornerResult or null if radius is too large / edges are collinear
 */
export function filletCorner(
  prev: Point2D,
  corner: Point2D,
  next: Point2D,
  radius: number,
): FilletCornerResult | null {
  if (radius <= 0) return null;

  // Vectors from corner to prev and corner to next
  const toPrev = { x: prev.x - corner.x, y: prev.y - corner.y };
  const toNext = { x: next.x - corner.x, y: next.y - corner.y };

  const lenPrev = Math.sqrt(toPrev.x ** 2 + toPrev.y ** 2);
  const lenNext = Math.sqrt(toNext.x ** 2 + toNext.y ** 2);

  if (lenPrev < 1e-10 || lenNext < 1e-10) return null;

  // Unit vectors
  const uPrev = { x: toPrev.x / lenPrev, y: toPrev.y / lenPrev };
  const uNext = { x: toNext.x / lenNext, y: toNext.y / lenNext };

  // cos of the angle between the two directions
  const cosA = uPrev.x * uNext.x + uPrev.y * uNext.y;

  // Clamp to handle floating-point imprecision
  const cosAClamped = Math.max(-1, Math.min(1, cosA));
  const halfAngle = Math.acos(cosAClamped) / 2;

  // Collinear (straight line) — sin(halfAngle) ≈ 0 means no meaningful corner
  if (Math.abs(Math.sin(halfAngle)) < 1e-10) return null;

  // Tangent length: distance from corner to tangent point along each edge
  const tangentLen = radius / Math.tan(halfAngle);

  // The tangent length must fit within both edges (allow tiny floating-point tolerance)
  const EPSILON = 1e-9;
  if (tangentLen > lenPrev + EPSILON || tangentLen > lenNext + EPSILON) return null;

  // Tangent points (where arc meets each edge)
  const entry = createPoint2D(
    corner.x + uPrev.x * tangentLen,
    corner.y + uPrev.y * tangentLen,
  );
  const exit = createPoint2D(
    corner.x + uNext.x * tangentLen,
    corner.y + uNext.y * tangentLen,
  );

  // Arc center: lies along the bisector of uPrev and uNext at distance radius/sin(halfAngle)
  const bisector = { x: uPrev.x + uNext.x, y: uPrev.y + uNext.y };
  const bisLen = Math.sqrt(bisector.x ** 2 + bisector.y ** 2);

  if (bisLen < 1e-10) return null;

  const centerDist = radius / Math.sin(halfAngle);
  const center = createPoint2D(
    corner.x + (bisector.x / bisLen) * centerDist,
    corner.y + (bisector.y / bisLen) * centerDist,
  );

  // Arc angles (from center to entry and from center to exit)
  const startAngle = Math.atan2(entry.y - center.y, entry.x - center.x);
  const endAngle = Math.atan2(exit.y - center.y, exit.x - center.x);

  return { entry, exit, center, startAngle, endAngle };
}

/**
 * Approximate a fillet arc with interpolated points (startAngle → endAngle).
 * Handles both CW and CCW arcs by choosing the shortest angular path.
 */
function arcPoints(result: FilletCornerResult): Point2D[] {
  const { center, startAngle, endAngle } = result;
  const radius = Math.sqrt(
    (result.entry.x - center.x) ** 2 + (result.entry.y - center.y) ** 2,
  );

  // Determine angular sweep, always taking the shorter arc
  let sweep = endAngle - startAngle;
  // Normalize to (-π, π]
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  while (sweep <= -Math.PI) sweep += 2 * Math.PI;

  const points: Point2D[] = [];
  // Generate ARC_SEGMENTS interior points (not including entry/exit)
  for (let i = 1; i < ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    const angle = startAngle + sweep * t;
    points.push(createPoint2D(
      center.x + radius * Math.cos(angle),
      center.y + radius * Math.sin(angle),
    ));
  }
  return points;
}

/**
 * Round each vertex in `points` with the given radius.
 * Returns a new point array with arc approximations inserted in place of each corner.
 *
 * @param points  - input polyline vertices
 * @param radius  - fillet radius
 * @param closed  - if true, also fillets the wrap-around corner (last→first→second)
 */
export function filletPolyline(
  points: Point2D[],
  radius: number,
  closed?: boolean,
): Point2D[] {
  if (radius <= 0) return [...points];
  if (points.length < 3) return [...points];

  const n = points.length;
  const result: Point2D[] = [];

  if (closed) {
    // Fillet every vertex (wrap-around)
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n]!;
      const corner = points[i]!;
      const next = points[(i + 1) % n]!;

      const fc = filletCorner(prev, corner, next, radius);
      if (fc) {
        result.push(fc.entry);
        result.push(...arcPoints(fc));
        result.push(fc.exit);
      } else {
        result.push(createPoint2D(corner.x, corner.y));
      }
    }
  } else {
    // Open polyline: keep first and last points unchanged, fillet interior vertices
    result.push(createPoint2D(points[0]!.x, points[0]!.y));

    for (let i = 1; i < n - 1; i++) {
      const prev = points[i - 1]!;
      const corner = points[i]!;
      const next = points[i + 1]!;

      const fc = filletCorner(prev, corner, next, radius);
      if (fc) {
        result.push(fc.entry);
        result.push(...arcPoints(fc));
        result.push(fc.exit);
      } else {
        result.push(createPoint2D(corner.x, corner.y));
      }
    }

    result.push(createPoint2D(points[n - 1]!.x, points[n - 1]!.y));
  }

  return result;
}
