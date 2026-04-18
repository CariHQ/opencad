/**
 * T-SPACE-001: Room Detection — wall boundary → enclosed space detection
 *
 * Detects enclosed rooms from a set of wall elements by finding groups of
 * connected wall segments that form a closed polygon.  Wall endpoints are
 * considered connected when they are within SNAP_TOLERANCE mm of each other.
 *
 * Areas are returned in m² (converted from mm²).
 * Perimeters are returned in m (converted from mm).
 */

import type { ElementSchema } from '@opencad/document';

/** Snap tolerance in mm — endpoints closer than this are treated as connected */
const SNAP_TOLERANCE = 50;

/** mm → m conversion factor */
const MM_TO_M = 1e-3;

// ── Public interfaces ────────────────────────────────────────────────────────

export interface Point2D {
  x: number;
  y: number;
}

export interface WallSegment {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DetectedRoom {
  id: string;
  boundary: Point2D[]; // polygon vertices (clockwise)
  area: number;        // m²
  perimeter: number;   // m
  centroid: Point2D;
  wallIds: string[];   // walls forming this room
  name?: string;
}

// ── Polygon math ─────────────────────────────────────────────────────────────

/**
 * Signed area via the shoelace formula.
 * Returns the absolute value so caller need not worry about winding order.
 */
export function polygonArea(points: Point2D[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += (points[i].x * points[j].y) - (points[j].x * points[i].y);
  }
  return Math.abs(area) / 2;
}

/**
 * Polygon centroid using the standard formula (not simple average of vertices).
 * Falls back to the arithmetic mean when the polygon is degenerate (area ≈ 0).
 */
export function polygonCentroid(points: Point2D[]): Point2D {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { x: points[0].x, y: points[0].y };
  if (n === 2) {
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  }

  // Signed area (preserves sign for the centroid formula)
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signedArea += (points[i].x * points[j].y) - (points[j].x * points[i].y);
  }
  signedArea /= 2;

  if (Math.abs(signedArea) < 1e-12) {
    // Degenerate — return simple mean
    return {
      x: points.reduce((s, p) => s + p.x, 0) / n,
      y: points.reduce((s, p) => s + p.y, 0) / n,
    };
  }

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = (points[i].x * points[j].y) - (points[j].x * points[i].y);
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }
  const factor = 1 / (6 * signedArea);
  return { x: cx * factor, y: cy * factor };
}

/**
 * Sum of segment lengths around the polygon boundary.
 */
export function polygonPerimeter(points: Point2D[]): number {
  const n = points.length;
  if (n < 2) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

// ── Element helpers ───────────────────────────────────────────────────────────

/**
 * Convert a wall ElementSchema into a WallSegment.
 * Returns null if the element is not a wall or is missing coordinate properties.
 */
export function elementToWallSegment(element: ElementSchema): WallSegment | null {
  if (element.type !== 'wall') return null;

  const sx = element.properties['StartX'];
  const sy = element.properties['StartY'];
  const ex = element.properties['EndX'];
  const ey = element.properties['EndY'];

  if (!sx || !sy || !ex || !ey) return null;

  const startX = Number(sx.value);
  const startY = Number(sy.value);
  const endX = Number(ex.value);
  const endY = Number(ey.value);

  if (!isFinite(startX) || !isFinite(startY) || !isFinite(endX) || !isFinite(endY)) {
    return null;
  }

  return { id: element.id, startX, startY, endX, endY };
}

// ── Room detection ────────────────────────────────────────────────────────────

/** Euclidean distance squared between two points */
function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** True if two endpoints are within SNAP_TOLERANCE of each other */
function connected(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  tolerance: number = SNAP_TOLERANCE,
): boolean {
  return dist2(ax, ay, bx, by) <= tolerance * tolerance;
}

interface AdjInfo {
  /** the segment we are leaving from (either its start or end) */
  fromStart: boolean;
  /** the neighbouring segment index */
  toSegIdx: number;
  /** are we entering the neighbour via its start? */
  toStart: boolean;
}

/**
 * Detect enclosed rooms from a collection of wall elements.
 *
 * Strategy:
 * 1. Convert walls → WallSegments.
 * 2. Build adjacency: for each endpoint of every segment, find which other
 *    segment endpoints are within SNAP_TOLERANCE.
 * 3. Trace closed loops (depth-first, max length = number of walls) starting
 *    from each segment's start endpoint.
 * 4. Deduplicate loops (same set of wall IDs) and keep only loops with ≥ 3
 *    walls that form a non-zero-area polygon.
 * 5. Convert area/perimeter from mm units to m.
 */
export function detectRoomsFromWalls(walls: ElementSchema[]): DetectedRoom[] {
  const segments = walls
    .map(elementToWallSegment)
    .filter((s): s is WallSegment => s !== null);

  if (segments.length < 3) return [];

  const n = segments.length;

  const adj: Map<string, AdjInfo[]> = new Map();

  const nodeKey = (segIdx: number, useStart: boolean): string =>
    `${segIdx}:${useStart ? 'S' : 'E'}`;

  for (let i = 0; i < n; i++) {
    for (const startI of [true, false]) {
      const key = nodeKey(i, startI);
      if (!adj.has(key)) adj.set(key, []);
    }
  }

  for (let i = 0; i < n; i++) {
    const si = segments[i]!;
    for (const startI of [true, false] as const) {
      const px = startI ? si.startX : si.endX;
      const py = startI ? si.startY : si.endY;

      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const sj = segments[j]!;

        if (connected(px, py, sj.startX, sj.startY)) {
          adj.get(nodeKey(i, startI))!.push({
            fromStart: startI,
            toSegIdx: j,
            toStart: true,
          });
        }
        if (connected(px, py, sj.endX, sj.endY)) {
          adj.get(nodeKey(i, startI))!.push({
            fromStart: startI,
            toSegIdx: j,
            toStart: false,
          });
        }
      }
    }
  }

  const foundLoops: Array<{ wallIds: string[]; boundary: Point2D[] }> = [];
  const loopSignatures = new Set<string>();

  for (let startSeg = 0; startSeg < n; startSeg++) {
    const path: Array<{ segIdx: number; enteredViaStart: boolean }> = [];
    const visitedSegs = new Set<number>();

    const dfs = (
      segIdx: number,
      enteredViaStart: boolean,
    ): void => {
      path.push({ segIdx, enteredViaStart });
      visitedSegs.add(segIdx);

      const exitViaStart = !enteredViaStart;
      const exitKey = nodeKey(segIdx, exitViaStart);
      const neighbours = adj.get(exitKey) ?? [];

      for (const nb of neighbours) {
        if (nb.toSegIdx === startSeg) {
          if (path.length >= 3) {
            const wallIds = path.map((p) => segments[p.segIdx]!.id);
            const boundary = path.map((p) => {
              const seg = segments[p.segIdx]!;
              return p.enteredViaStart
                ? { x: seg.startX, y: seg.startY }
                : { x: seg.endX, y: seg.endY };
            });
            const sig = [...wallIds].sort().join(',');
            if (!loopSignatures.has(sig)) {
              loopSignatures.add(sig);
              foundLoops.push({ wallIds, boundary });
            }
          }
          continue;
        }

        if (!visitedSegs.has(nb.toSegIdx) && path.length < n) {
          dfs(nb.toSegIdx, nb.toStart);
        }
      }

      path.pop();
      visitedSegs.delete(segIdx);
    };

    dfs(startSeg, true);
  }

  const rooms: DetectedRoom[] = [];
  let roomCounter = 0;

  for (const loop of foundLoops) {
    const areaMm2 = polygonArea(loop.boundary);
    if (areaMm2 < 1) continue;

    const centroidMm = polygonCentroid(loop.boundary);
    const perimeterMm = polygonPerimeter(loop.boundary);

    roomCounter++;
    rooms.push({
      id: `room-${roomCounter}`,
      boundary: loop.boundary,
      area: areaMm2 * MM_TO_M * MM_TO_M,       // mm² → m²
      perimeter: perimeterMm * MM_TO_M,          // mm → m
      centroid: centroidMm,
      wallIds: loop.wallIds,
    });
  }

  return rooms;
}
