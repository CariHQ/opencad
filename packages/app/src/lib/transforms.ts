/**
 * Mirror / rotate / array transforms — T-MOD-024 (#317).
 *
 * Pure geometry functions that transform a set of element endpoints
 * or anchor points. Higher layers (commit path, undo) apply the
 * resulting points back onto the element's properties.
 */

export interface Point { x: number; y: number }

/** Mirror a point across a line defined by two points. */
export function mirrorPoint(p: Point, axisA: Point, axisB: Point): Point {
  const dx = axisB.x - axisA.x, dy = axisB.y - axisA.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return p;
  // Project p onto axis, then reflect
  const t = ((p.x - axisA.x) * dx + (p.y - axisA.y) * dy) / len2;
  const projX = axisA.x + t * dx, projY = axisA.y + t * dy;
  return { x: 2 * projX - p.x, y: 2 * projY - p.y };
}

/** Rotate a point by `angle` radians around `pivot`. */
export function rotatePoint(p: Point, pivot: Point, angle: number): Point {
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx = p.x - pivot.x, dy = p.y - pivot.y;
  return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c };
}

/** Translate a point by (dx, dy). */
export function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

/** Linear array: return N copies of origin at integer multiples of offset. */
export function linearArray(origin: Point, count: number, offset: Point): Point[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => ({
    x: origin.x + i * offset.x,
    y: origin.y + i * offset.y,
  }));
}

/** Polar array: return N copies around a centre at equal angular spacing. */
export function polarArray(origin: Point, count: number, centre: Point): Point[] {
  if (count <= 0) return [];
  const out: Point[] = [];
  const baseAngle = Math.atan2(origin.y - centre.y, origin.x - centre.x);
  const radius = Math.hypot(origin.x - centre.x, origin.y - centre.y);
  const step = (2 * Math.PI) / count;
  for (let i = 0; i < count; i++) {
    const a = baseAngle + i * step;
    out.push({ x: centre.x + radius * Math.cos(a), y: centre.y + radius * Math.sin(a) });
  }
  return out;
}
