/**
 * Spline utility functions for the 2D drafting viewport.
 *
 * Provides Catmull-Rom to cubic Bezier conversion and spline interpolation
 * used by the 'spline' drawing tool (T-2D-011).
 */

export interface Point {
  x: number;
  y: number;
}

export interface BezierSegment {
  cp1: Point;
  cp2: Point;
  end: Point;
}

/**
 * Convert an array of Catmull-Rom control points to cubic Bezier segments
 * suitable for use with CanvasRenderingContext2D.bezierCurveTo.
 *
 * For each consecutive pair of points (p[i], p[i+1]) a segment is produced.
 * The phantom point before the first and after the last mirror their neighbours
 * so the spline starts and ends at the given endpoints.
 *
 * @param points  Array of 2-D points (≥1 required, 0 → empty array)
 * @param tension Catmull-Rom tension factor α ∈ (0, 1]. Default 0.5.
 * @returns       Array of BezierSegment objects (length = points.length - 1)
 */
export function catmullRomToBezier(points: Point[], tension: number = 0.5): BezierSegment[] {
  if (points.length < 2) return [];

  const segments: BezierSegment[] = [];
  const n = points.length;

  for (let i = 0; i < n - 1; i++) {
    // Phantom points: mirror first/last when out of bounds
    const p0 = i === 0 ? mirrorPoint(points[1]!, points[0]!) : points[i - 1]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = i + 2 < n ? points[i + 2]! : mirrorPoint(points[n - 2]!, points[n - 1]!);

    // Catmull-Rom → Bezier control points
    // cp1 = p1 + (p2 - p0) * tension / 3
    // cp2 = p2 - (p3 - p1) * tension / 3
    const cp1: Point = {
      x: p1.x + (p2.x - p0.x) * tension / 3,
      y: p1.y + (p2.y - p0.y) * tension / 3,
    };
    const cp2: Point = {
      x: p2.x - (p3.x - p1.x) * tension / 3,
      y: p2.y - (p3.y - p1.y) * tension / 3,
    };

    segments.push({ cp1, cp2, end: { x: p2.x, y: p2.y } });
  }

  return segments;
}

/**
 * Evaluate a point on the Catmull-Rom spline at parameter t ∈ [0, 1].
 *
 * The parameter range is divided evenly across the available segments.
 * For a spline with k segments, segment i covers t ∈ [i/k, (i+1)/k].
 * Within each segment cubic Bezier evaluation (de Casteljau) is used.
 *
 * @param points Array of control points (≥2)
 * @param t      Parameter in [0, 1]
 * @returns      Interpolated 2-D point
 */
export function interpolateSpline(points: Point[], t: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0]!.x, y: points[0]!.y };

  const segments = catmullRomToBezier(points);
  const k = segments.length; // = points.length - 1

  // Clamp t to [0, 1]
  const tc = Math.max(0, Math.min(1, t));

  if (tc === 1) {
    // Return last point exactly
    const last = points[points.length - 1]!;
    return { x: last.x, y: last.y };
  }

  // Determine which segment and local parameter
  const segFloat = tc * k;
  const segIdx = Math.floor(segFloat);
  const localT = segFloat - segIdx;

  const seg = segments[Math.min(segIdx, k - 1)]!;
  const startPt = points[Math.min(segIdx, points.length - 1)]!;

  // Cubic Bezier evaluation via de Casteljau
  return cubicBezierPoint(startPt, seg.cp1, seg.cp2, seg.end, localT);
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Mirror point `a` through `b` to produce a phantom tangent point. */
function mirrorPoint(a: Point, b: Point): Point {
  return { x: 2 * b.x - a.x, y: 2 * b.y - a.y };
}

/** Evaluate a cubic Bezier at parameter t using the standard formula. */
function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}
