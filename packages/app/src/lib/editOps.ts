/**
 * Wall edit operations — T-MOD-015 (#308).
 *
 * Pure geometry operations on wall endpoints: trim to another wall,
 * extend to another wall, split at a point, merge two collinear walls.
 * Inputs are "walls" as {a, b} endpoint pairs; callers map back to
 * element properties after receiving the result.
 */

export interface Point { x: number; y: number }
export interface WallSeg { a: Point; b: Point }

/** Line-line intersection; returns null when parallel. */
export function lineIntersection(s1: WallSeg, s2: WallSeg): Point | null {
  const d1x = s1.b.x - s1.a.x, d1y = s1.b.y - s1.a.y;
  const d2x = s2.b.x - s2.a.x, d2y = s2.b.y - s2.a.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-6) return null;
  const t = ((s2.a.x - s1.a.x) * d2y - (s2.a.y - s1.a.y) * d2x) / denom;
  return { x: s1.a.x + t * d1x, y: s1.a.y + t * d1y };
}

/**
 * Trim the wall to the cutter — the endpoint nearer the intersection
 * is pulled inward to the intersection point.
 */
export function trimWall(wall: WallSeg, cutter: WallSeg): WallSeg | null {
  const hit = lineIntersection(wall, cutter);
  if (!hit) return null;
  const da = Math.hypot(hit.x - wall.a.x, hit.y - wall.a.y);
  const db = Math.hypot(hit.x - wall.b.x, hit.y - wall.b.y);
  return da < db
    ? { a: hit, b: wall.b }
    : { a: wall.a, b: hit };
}

/**
 * Extend the wall's nearer endpoint until it meets the target's line.
 */
export function extendWall(wall: WallSeg, target: WallSeg): WallSeg | null {
  const hit = lineIntersection(wall, target);
  if (!hit) return null;
  // Pick the endpoint that's closer to the target, move it to the hit.
  const da = Math.hypot(hit.x - wall.a.x, hit.y - wall.a.y);
  const db = Math.hypot(hit.x - wall.b.x, hit.y - wall.b.y);
  return da < db
    ? { a: hit, b: wall.b }
    : { a: wall.a, b: hit };
}

/**
 * Split a wall at `at`. Returns [leftHalf, rightHalf] on success,
 * or null when `at` isn't near the wall.
 */
export function splitWall(wall: WallSeg, at: Point, tolerance = 1): [WallSeg, WallSeg] | null {
  const dx = wall.b.x - wall.a.x, dy = wall.b.y - wall.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const t = ((at.x - wall.a.x) * dx + (at.y - wall.a.y) * dy) / (len * len);
  // Reject when `at` coincides with an endpoint (within tolerance).
  if (t * len <= tolerance || (1 - t) * len <= tolerance) return null;
  const projX = wall.a.x + t * dx, projY = wall.a.y + t * dy;
  const perp = Math.hypot(at.x - projX, at.y - projY);
  if (perp > tolerance) return null;
  const mid = { x: projX, y: projY };
  return [{ a: wall.a, b: mid }, { a: mid, b: wall.b }];
}

/**
 * Merge two walls when they are collinear AND share an endpoint.
 * Returns `{ merged, reason }` — `merged` is null on failure.
 */
export function mergeWalls(
  w1: WallSeg, w2: WallSeg, tolerance = 1,
): { merged: WallSeg | null; reason?: string } {
  // Cross-product must be ~0 for collinearity.
  const d1x = w1.b.x - w1.a.x, d1y = w1.b.y - w1.a.y;
  const d2x = w2.b.x - w2.a.x, d2y = w2.b.y - w2.a.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) > tolerance) return { merged: null, reason: 'walls are not collinear' };

  // Find shared endpoint — any pair within tolerance.
  const pairs: Array<[Point, Point, Point, Point]> = [
    [w1.a, w1.b, w2.a, w2.b],  // outer = w1.b, w2.b if match is w1.a-w2.a
    [w1.b, w1.a, w2.a, w2.b],
    [w1.a, w1.b, w2.b, w2.a],
    [w1.b, w1.a, w2.b, w2.a],
  ];
  for (const [p1Shared, p1Other, p2Shared, p2Other] of pairs) {
    if (Math.hypot(p1Shared.x - p2Shared.x, p1Shared.y - p2Shared.y) <= tolerance) {
      return { merged: { a: p1Other, b: p2Other } };
    }
  }
  return { merged: null, reason: 'walls do not share an endpoint' };
}
