/**
 * Inference guides for drawing — T-MOD-021 (#314).
 *
 * Pure helpers that turn raw cursor motion into "engineer-correct"
 * geometry by snapping to visual inferences:
 *
 *   - Axis lock: Shift-held drag more horizontal than vertical → lock Y;
 *     more vertical than horizontal → lock X.
 *   - Reference inference: when the cursor lines up with an existing
 *     vertex's X or Y (within a world-mm tolerance), snap that coord to
 *     the reference and report the inference.
 *   - Line extension: when the cursor lies near the extension of an
 *     existing segment beyond one of its endpoints, snap to the line.
 */

export interface Point { x: number; y: number }
export interface Segment { a: Point; b: Point }

export type AxisLock = 'x' | 'y' | 'free';

/**
 * Pick the axis to lock based on drag dominance + Shift modifier.
 * Returns 'free' when shift is not held.
 */
export function computeAxisLock(
  start: Point, current: Point, shift: boolean,
): AxisLock {
  if (!shift) return 'free';
  const dx = Math.abs(current.x - start.x);
  const dy = Math.abs(current.y - start.y);
  return dx >= dy ? 'y' : 'x';  // Lock the SECONDARY axis
}

/** Apply an axis lock to a candidate point. */
export function applyAxisLock(start: Point, current: Point, lock: AxisLock): Point {
  if (lock === 'free') return current;
  if (lock === 'x') return { x: start.x, y: current.y };
  return { x: current.x, y: start.y };
}

export interface InferenceGuide {
  /** 'x' means a vertical guide at this x (snap current.x to guide.value).
   *  'y' means a horizontal guide at this y. 'extension' means snap along
   *  the extension of a segment. */
  kind: 'x' | 'y' | 'extension';
  value: number;           // For 'x' and 'y': the coordinate. For 'extension': meaningless.
  fromPointId?: string;    // Optional source reference id
  segment?: Segment;       // For 'extension'
}

/**
 * Given the current cursor and a list of reference points (endpoints of
 * existing elements), return the closest X or Y inference guide within
 * tolerance. Returns null when no reference is close enough.
 */
export function inferFromReferencePoints(
  current: Point,
  refs: Array<Point & { id?: string }>,
  tolerance: number,
): InferenceGuide | null {
  let best: { guide: InferenceGuide; dist: number } | null = null;
  for (const r of refs) {
    const dx = Math.abs(current.x - r.x);
    if (dx <= tolerance && (best === null || dx < best.dist)) {
      best = { guide: { kind: 'x', value: r.x, fromPointId: r.id }, dist: dx };
    }
    const dy = Math.abs(current.y - r.y);
    if (dy <= tolerance && (best === null || dy < best.dist)) {
      best = { guide: { kind: 'y', value: r.y, fromPointId: r.id }, dist: dy };
    }
  }
  return best ? best.guide : null;
}

/**
 * Snap the cursor point to a line that extends segment (a,b) beyond one of
 * its endpoints when the cursor is within tolerance of that line. Returns
 * the snapped point + extension guide, or null.
 */
export function inferExtension(
  current: Point,
  segment: Segment,
  tolerance: number,
): { point: Point; guide: InferenceGuide } | null {
  const { a, b } = segment;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const ux = dx / len, uy = dy / len;

  // Project current onto the line
  const t = (current.x - a.x) * ux + (current.y - a.y) * uy;
  // Must be beyond one of the endpoints (t < 0 or t > len)
  if (t >= 0 && t <= len) return null;
  const projX = a.x + t * ux, projY = a.y + t * uy;
  const perp = Math.hypot(current.x - projX, current.y - projY);
  if (perp > tolerance) return null;
  return {
    point: { x: projX, y: projY },
    guide: { kind: 'extension', value: 0, segment },
  };
}

/**
 * Snap current to the midpoint of a segment if within tolerance.
 */
export function inferMidpoint(
  current: Point,
  segment: Segment,
  tolerance: number,
): Point | null {
  const mid = { x: (segment.a.x + segment.b.x) / 2, y: (segment.a.y + segment.b.y) / 2 };
  return Math.hypot(current.x - mid.x, current.y - mid.y) <= tolerance ? mid : null;
}

/**
 * Foot-of-perpendicular from current to segment if within tolerance.
 */
export function inferPerpendicularFoot(
  current: Point,
  segment: Segment,
  tolerance: number,
): Point | null {
  const { a, b } = segment;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const t = ((current.x - a.x) * dx + (current.y - a.y) * dy) / (len * len);
  const clampedT = Math.max(0, Math.min(1, t));
  const foot = { x: a.x + clampedT * dx, y: a.y + clampedT * dy };
  return Math.hypot(current.x - foot.x, current.y - foot.y) <= tolerance ? foot : null;
}
