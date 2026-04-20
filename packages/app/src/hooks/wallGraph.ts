/**
 * Wall junction graph (T-MOD-001 / GitHub #294).
 *
 * Given the current document's wall elements, compute how each wall meets
 * its neighbours — endpoint-to-endpoint (L), endpoint-to-middle (T), or
 * middle-to-middle (X) — so downstream renderers can produce clean mitred
 * or butted joints.
 *
 * Pure module: no document-store / Three.js dependencies.
 */

import type { ElementSchema } from '@opencad/document';

export type JoinKind = 'L' | 'T' | 'X';

export interface JoinInfo {
  /** The other wall id participating in this junction. */
  otherWallId: string;
  /** Kind of junction from this wall's perspective. */
  kind: JoinKind;
  /** Parameter t ∈ [0, 1] along THIS wall where the junction lands. 0 = start, 1 = end. */
  t: number;
  /** Parameter u along the OTHER wall. */
  u: number;
  /** Intersection point in world coords. */
  point: { x: number; y: number };
  /** Unsigned angle between the two walls in radians. */
  angle: number;
}

/** Walls joined within this mm-tolerance are treated as touching. */
export const WALL_JUNCTION_TOLERANCE = 20;
/** A "t" within this much of 0 or 1 counts as "at the endpoint". */
const T_ENDPOINT_EPS = 0.02;

interface WallSeg {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
  len: number;
  /** Unit direction. */
  ux: number; uy: number;
}

function numProp(el: ElementSchema, k: string, fallback: number): number {
  const p = (el.properties as Record<string, { value: unknown }>)[k];
  return p && typeof p.value === 'number' ? (p.value as number) : fallback;
}

function toSeg(el: ElementSchema): WallSeg | null {
  const x1 = numProp(el, 'StartX', 0);
  const y1 = numProp(el, 'StartY', 0);
  const x2 = numProp(el, 'EndX',   x1 + 1);
  const y2 = numProp(el, 'EndY',   y1);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-3) return null;
  return { id: el.id, x1, y1, x2, y2, len, ux: dx / len, uy: dy / len };
}

/** Signed parameter along a along the wall for point p. */
function paramAlong(w: WallSeg, px: number, py: number): number {
  return ((px - w.x1) * w.ux + (py - w.y1) * w.uy) / w.len;
}

/** Perpendicular distance from p to the infinite line of w. */
function perpDist(w: WallSeg, px: number, py: number): number {
  return Math.abs((px - w.x1) * w.uy - (py - w.y1) * w.ux);
}

/** Intersect two infinite lines defined by walls; null when parallel. */
function intersectLines(a: WallSeg, b: WallSeg): { x: number; y: number } | null {
  // Solve a.x1 + t*(a.x2-a.x1) = b.x1 + s*(b.x2-b.x1)
  const d1x = a.x2 - a.x1, d1y = a.y2 - a.y1;
  const d2x = b.x2 - b.x1, d2y = b.y2 - b.y1;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-6) return null;
  const t = ((b.x1 - a.x1) * d2y - (b.y1 - a.y1) * d2x) / denom;
  return { x: a.x1 + t * d1x, y: a.y1 + t * d1y };
}

function unsignedAngle(a: WallSeg, b: WallSeg): number {
  // atan2 difference, folded into [0, π]
  const raw = Math.abs(Math.atan2(a.uy, a.ux) - Math.atan2(b.uy, b.ux));
  return raw > Math.PI ? 2 * Math.PI - raw : raw;
}

/** Classify each wall's t as "at endpoint" vs "along the body". */
function isAtEndpoint(t: number): 'start' | 'end' | 'middle' {
  if (t < T_ENDPOINT_EPS) return 'start';
  if (t > 1 - T_ENDPOINT_EPS) return 'end';
  return 'middle';
}

/**
 * Build the wall junction graph for the given element map.
 * Returns a Map from wall id → list of junctions that wall participates in.
 * Walls with no junctions get an empty list; absent walls aren't keyed.
 */
export function buildWallGraph(
  elements: Record<string, ElementSchema>
): Map<string, JoinInfo[]> {
  const result = new Map<string, JoinInfo[]>();

  const segs: WallSeg[] = [];
  for (const el of Object.values(elements)) {
    if (el.type !== 'wall') continue;
    const s = toSeg(el);
    if (s) segs.push(s);
  }
  // Seed every wall with an empty array so callers can assume presence.
  for (const s of segs) result.set(s.id, []);

  const tol = WALL_JUNCTION_TOLERANCE;

  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i]!;
      const b = segs[j]!;

      const hit = intersectLines(a, b);
      if (!hit) continue;

      const tA = paramAlong(a, hit.x, hit.y);
      const tB = paramAlong(b, hit.x, hit.y);

      // Tolerate the hit being slightly outside the 0..1 range, in world mm
      // (tol / len). Don't even consider if either wall would need to be
      // extended more than tol to reach the intersection.
      const outA = tA < 0 ? -tA * a.len : tA > 1 ? (tA - 1) * a.len : 0;
      const outB = tB < 0 ? -tB * b.len : tB > 1 ? (tB - 1) * b.len : 0;
      if (outA > tol || outB > tol) continue;

      const clampedTA = Math.max(0, Math.min(1, tA));
      const clampedTB = Math.max(0, Math.min(1, tB));

      const posA = isAtEndpoint(clampedTA);
      const posB = isAtEndpoint(clampedTB);

      // Per-wall classification. Each wall reports the kind from its own
      // perspective: an L if its end meets an endpoint, a T if the wall is
      // the one whose BODY is being hit, an X when both hits are mid-span.
      const angle = unsignedAngle(a, b);
      const kindFor = (ownPos: 'start' | 'end' | 'middle', otherPos: 'start' | 'end' | 'middle'): JoinKind => {
        if (ownPos === 'middle' && otherPos === 'middle') return 'X';
        if (ownPos === 'middle') return 'T';      // I'm the through-wall
        return 'L';                               // My end meets something (L or stub of T)
      };

      result.get(a.id)!.push({
        otherWallId: b.id,
        kind: kindFor(posA, posB),
        t: clampedTA, u: clampedTB, point: hit, angle,
      });
      result.get(b.id)!.push({
        otherWallId: a.id,
        kind: kindFor(posB, posA),
        t: clampedTB, u: clampedTA, point: hit, angle,
      });
    }
  }

  return result;
}

/**
 * For a given wall, compute how much to extend or trim each end based on
 * its junctions. Returns `{ startOffset, endOffset }` in world mm, positive
 * meaning extend outward past the endpoint, negative meaning trim inward.
 *
 * Simplistic v1: at an L-junction, extend by half-thickness of the other
 * wall along this wall's direction (the visible overshoot today) but drop
 * to 0 at T/X junctions where the other wall is already through.
 */
export function wallEndOffsets(
  wallId: string,
  graph: Map<string, JoinInfo[]>,
  elements: Record<string, ElementSchema>
): { startOffset: number; endOffset: number } {
  const joins = graph.get(wallId) ?? [];
  let startOffset = 0;
  let endOffset = 0;
  for (const j of joins) {
    const other = elements[j.otherWallId];
    if (!other) continue;
    const otherT = numProp(other, 'Width', 200);
    const halfOther = otherT / 2;
    const atStart = j.t < 0.5;
    // L-junctions: extend this wall by the other's half-thickness to close
    // the outside corner. T/X: leave this wall alone (the other wall is
    // either butting in or passing through).
    if (j.kind === 'L') {
      if (atStart) startOffset = Math.max(startOffset, halfOther);
      else         endOffset   = Math.max(endOffset,   halfOther);
    }
  }
  return { startOffset, endOffset };
}
