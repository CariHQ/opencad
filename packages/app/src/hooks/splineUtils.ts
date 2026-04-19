/**
 * Catmull-Rom spline utilities
 *
 * Pure functions — no React, no side effects.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface BezierSegment {
  /** First cubic Bezier control point */
  cp1: Point2D;
  /** Second cubic Bezier control point */
  cp2: Point2D;
  /** End point of the segment */
  end: Point2D;
}

/**
 * Convert an array of points to cubic Bezier segments using the
 * Catmull-Rom → Bezier conversion formula.
 *
 * For a segment from p[i] to p[i+1]:
 *   cp1 = p[i]   + (p[i+1] - p[i-1]) / 6
 *   cp2 = p[i+1] - (p[i+2] - p[i])   / 6
 *
 * Phantom points are mirrored at the two ends so the first and last
 * segments have natural (non-clamped) tangents.
 *
 * Returns an empty array when fewer than 2 points are supplied.
 */
export function catmullRomToBezier(points: Point2D[]): BezierSegment[] {
  if (points.length < 2) return [];

  // Build an extended array with phantom endpoints so every real point
  // has a valid predecessor and successor.
  // p[-1]  = 2*p[0] - p[1]   (mirror of first interior point)
  // p[n]   = 2*p[n-1] - p[n-2] (mirror of last interior point)
  const first = points[0]!;
  const second = points[1]!;
  const last = points[points.length - 1]!;
  const secondToLast = points[points.length - 2]!;

  const phantom0: Point2D = { x: 2 * first.x - second.x, y: 2 * first.y - second.y };
  const phantomN: Point2D = { x: 2 * last.x - secondToLast.x, y: 2 * last.y - secondToLast.y };

  const ext = [phantom0, ...points, phantomN];

  const segments: BezierSegment[] = [];

  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1]!;
    const p1 = ext[i]!;
    const p2 = ext[i + 1]!;
    const p3 = ext[i + 2]!;

    const cp1: Point2D = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };

    const cp2: Point2D = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };

    segments.push({ cp1, cp2, end: { x: p2.x, y: p2.y } });
  }

  return segments;
}
