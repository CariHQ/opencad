/**
 * Railing geometry — T-MOD-016 (#309).
 *
 * Given a path (polyline) + spacing parameters, compute:
 *   - post positions along the path (evenly spaced, endpoints included)
 *   - baluster positions between posts (skipped when profile is 'glass')
 *   - top-rail segments (one per path segment)
 *
 * Compliance R008 is checked in complianceEngine.ts using topRailHeight.
 */

export interface Point2D { x: number; y: number }

export type BalusterProfile = 'square' | 'turned' | 'cable' | 'glass';

export interface RailingParams {
  path: Point2D[];
  topRailHeight: number;          // mm above the path
  postSpacing: number;             // mm — posts every N mm
  balusterSpacing: number;         // mm — balusters between posts
  balusterProfile: BalusterProfile;
}

export interface RailingGeometry {
  posts: Array<{ x: number; y: number; z: number }>;
  balusters: Array<{ x: number; y: number; z: number }>;
  rails: Array<{ a: Point2D; b: Point2D; z: number }>;
}

/** Evenly space posts along each path segment; endpoints always included. */
export function computeRailing(params: RailingParams): RailingGeometry {
  const posts: RailingGeometry['posts'] = [];
  const balusters: RailingGeometry['balusters'] = [];
  const rails: RailingGeometry['rails'] = [];

  for (let i = 0; i < params.path.length - 1; i++) {
    const a = params.path[i]!, b = params.path[i + 1]!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ux = dx / len, uy = dy / len;
    const n = Math.max(1, Math.ceil(len / params.postSpacing));
    const step = len / n;
    // Posts at 0..n (endpoints included)
    for (let p = 0; p <= n; p++) {
      // Skip duplicates when the previous segment already placed this endpoint
      if (i > 0 && p === 0) continue;
      posts.push({ x: a.x + ux * step * p, y: a.y + uy * step * p, z: params.topRailHeight });
    }
    // Balusters between posts (skip for glass)
    if (params.balusterProfile !== 'glass') {
      for (let p = 0; p < n; p++) {
        const segStart = step * p;
        const segEnd = step * (p + 1);
        const segLen = segEnd - segStart;
        const bCount = Math.max(0, Math.floor(segLen / params.balusterSpacing) - 1);
        for (let bi = 1; bi <= bCount; bi++) {
          const t = segStart + (segLen * bi) / (bCount + 1);
          balusters.push({ x: a.x + ux * t, y: a.y + uy * t, z: params.topRailHeight / 2 });
        }
      }
    }
    // One top-rail segment per path segment
    rails.push({ a, b, z: params.topRailHeight });
  }

  return { posts, balusters, rails };
}
