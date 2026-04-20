/**
 * Smart hotspots on selected element edges — T-MOD-027 (#320).
 *
 * A hotspot is a drag-handle at a control point on the selected element:
 * a vertex (drag moves that vertex), a midpoint (drag translates the
 * whole element along its axis), or an edge midpoint (drag moves the
 * edge parallel to itself). This module returns the hotspots for an
 * element; the viewport renders them and binds pointer events.
 */

import type { ElementSchema } from '@opencad/document';

export interface Point { x: number; y: number }

export type HotspotKind = 'vertex' | 'edge-midpoint' | 'segment-midpoint';

export interface Hotspot {
  kind: HotspotKind;
  position: Point;
  /** Apply a drag delta (world mm) and return the element property patch. */
  apply: (delta: Point) => Record<string, { type: string; value: unknown }>;
}

function num(el: ElementSchema, key: string, fb = 0): number {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'number' ? (p.value as number) : fb;
}
function str(el: ElementSchema, key: string): string | null {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'string' ? (p.value as string) : null;
}

/**
 * Build the hotspot array for a given element. Wall (start, end, midpoint)
 * + slab/roof (each polygon vertex + each edge midpoint).
 */
export function hotspotsFor(el: ElementSchema): Hotspot[] {
  switch (el.type) {
    case 'wall':    return wallHotspots(el);
    case 'beam':    return wallHotspots(el);   // same start/end pattern
    case 'slab':
    case 'roof':    return slabHotspots(el);
    default:        return [];
  }
}

function wallHotspots(el: ElementSchema): Hotspot[] {
  const x1 = num(el, 'StartX'), y1 = num(el, 'StartY');
  const x2 = num(el, 'EndX'),   y2 = num(el, 'EndY');
  return [
    // Start vertex → moves StartX/StartY
    {
      kind: 'vertex',
      position: { x: x1, y: y1 },
      apply: (d) => ({
        StartX: { type: 'number', value: x1 + d.x },
        StartY: { type: 'number', value: y1 + d.y },
      }),
    },
    // End vertex
    {
      kind: 'vertex',
      position: { x: x2, y: y2 },
      apply: (d) => ({
        EndX: { type: 'number', value: x2 + d.x },
        EndY: { type: 'number', value: y2 + d.y },
      }),
    },
    // Midpoint → translates the whole wall
    {
      kind: 'segment-midpoint',
      position: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
      apply: (d) => ({
        StartX: { type: 'number', value: x1 + d.x },
        StartY: { type: 'number', value: y1 + d.y },
        EndX:   { type: 'number', value: x2 + d.x },
        EndY:   { type: 'number', value: y2 + d.y },
      }),
    },
  ];
}

function slabHotspots(el: ElementSchema): Hotspot[] {
  const raw = str(el, 'Points');
  if (!raw) return [];
  let pts: Point[] = [];
  try { pts = JSON.parse(raw) as Point[]; } catch { return []; }
  if (pts.length < 3) return [];

  const out: Hotspot[] = [];
  // Each polygon vertex
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    out.push({
      kind: 'vertex',
      position: { x: p.x, y: p.y },
      apply: (d) => {
        const next = pts.map((q, j) => (j === i ? { x: q.x + d.x, y: q.y + d.y } : q));
        return { Points: { type: 'string', value: JSON.stringify(next) } };
      },
    });
  }
  // Each edge midpoint — translates the two endpoints of that edge
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
    out.push({
      kind: 'edge-midpoint',
      position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      apply: (d) => {
        const next = pts.map((q, j) => {
          if (j === i || j === (i + 1) % pts.length) return { x: q.x + d.x, y: q.y + d.y };
          return q;
        });
        return { Points: { type: 'string', value: JSON.stringify(next) } };
      },
    });
  }
  return out;
}
