/**
 * Solid Element Operations (SEO) — minimal resolver (T-GEO-001 / #295).
 *
 * Walks the document and emits the list of automatic SEO operations that
 * should apply. Each operation is a pair of element ids (operator, target)
 * plus a kind. The consuming mesh builders can query the resolved list via
 * `operationsForTarget(targetId)` to decide how to render a trimmed /
 * clipped / subtracted geometry.
 *
 * v1 scope: three built-in rules:
 *
 *   - 'wall-roof-clip'    — wall top clips to roof underside when the
 *                           wall's footprint sits under a roof polygon.
 *   - 'slab-stair-cut'    — slab subtracts a stair's footprint when
 *                           their elevation planes match (ElevationOffset).
 *   - 'beam-column-trim'  — beam length shortens at each end that lands
 *                           inside a column's radius / half-section.
 *
 * Analytical — no CSG kernel required. Each mesh builder applies its
 * own simple geometry tweak when the resolver reports the op.
 */

import type { DocumentSchema, ElementSchema } from '@opencad/document';

export type SEOpKind = 'wall-roof-clip' | 'slab-stair-cut' | 'beam-column-trim';

export interface SEOp {
  id: string;
  kind: SEOpKind;
  operatorId: string;
  targetId: string;
  enabled: boolean;
}

function numProp(el: ElementSchema, key: string, fb = 0): number {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'number' ? (p.value as number) : fb;
}

function parsePoints(el: ElementSchema): Array<{ x: number; y: number }> | null {
  const raw = (el.properties as Record<string, { value: unknown }>)['Points']?.value;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const pts = JSON.parse(raw) as Array<{ x: number; y: number }>;
    return Array.isArray(pts) && pts.length >= 3 ? pts : null;
  } catch {
    return null;
  }
}

function pointInPolygon(pt: { x: number; y: number }, poly: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i]!.x, yi = poly[i]!.y;
    const xj = poly[j]!.x, yj = poly[j]!.y;
    const denom = yj - yi;
    const intersect =
      ((yi > pt.y) !== (yj > pt.y)) &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (denom === 0 ? 1e-9 : denom) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function collectByType(doc: DocumentSchema): {
  walls: ElementSchema[]; slabs: ElementSchema[]; roofs: ElementSchema[];
  stairs: ElementSchema[]; columns: ElementSchema[]; beams: ElementSchema[];
} {
  const out = { walls: [] as ElementSchema[], slabs: [] as ElementSchema[], roofs: [] as ElementSchema[], stairs: [] as ElementSchema[], columns: [] as ElementSchema[], beams: [] as ElementSchema[] };
  for (const el of Object.values(doc.content.elements)) {
    switch (el.type) {
      case 'wall':   out.walls.push(el); break;
      case 'slab':   out.slabs.push(el); break;
      case 'roof':   out.roofs.push(el); break;
      case 'stair':  out.stairs.push(el); break;
      case 'column': out.columns.push(el); break;
      case 'beam':   out.beams.push(el); break;
    }
  }
  return out;
}

/**
 * Resolve all automatic SEO operations for a document.
 */
export function resolveOperations(doc: DocumentSchema): SEOp[] {
  const ops: SEOp[] = [];
  const g = collectByType(doc);

  // Rule 1: wall-roof-clip — a wall whose 2D centerline midpoint sits under
  // a roof polygon is clipped to the roof underside. v1: flat roofs only;
  // reports the op even if the wall's Height already fits (consumer is
  // idempotent).
  for (const wall of g.walls) {
    const mx = (numProp(wall, 'StartX') + numProp(wall, 'EndX')) / 2;
    const my = (numProp(wall, 'StartY') + numProp(wall, 'EndY')) / 2;
    for (const roof of g.roofs) {
      const poly = parsePoints(roof);
      if (!poly) continue;
      if (pointInPolygon({ x: mx, y: my }, poly)) {
        ops.push({
          id: `wrc-${wall.id}-${roof.id}`,
          kind: 'wall-roof-clip',
          operatorId: roof.id,
          targetId:   wall.id,
          enabled: true,
        });
      }
    }
  }

  // Rule 2: slab-stair-cut — a stair whose ElevationOffset matches a slab's
  // top-plane elevation (i.e., sits on that slab) subtracts its footprint
  // from the slab.
  for (const stair of g.stairs) {
    const stairElev = numProp(stair, 'ElevationOffset');
    for (const slab of g.slabs) {
      const slabElev = numProp(slab, 'ElevationOffset');
      const slabThickness = numProp(slab, 'Thickness', 200);
      const slabTopPlane = slabElev + slabThickness;
      if (Math.abs(slabTopPlane - stairElev) < 10) {
        ops.push({
          id: `ssc-${stair.id}-${slab.id}`,
          kind: 'slab-stair-cut',
          operatorId: stair.id,
          targetId:   slab.id,
          enabled: true,
        });
      }
    }
  }

  // Rule 3: beam-column-trim — beam trims at each column whose centre
  // sits within beam halfWidth + column halfSection of the beam line.
  for (const beam of g.beams) {
    const bx1 = numProp(beam, 'StartX'), by1 = numProp(beam, 'StartY');
    const bx2 = numProp(beam, 'EndX'),   by2 = numProp(beam, 'EndY');
    const bLen = Math.hypot(bx2 - bx1, by2 - by1) || 1;
    const bDirX = (bx2 - bx1) / bLen, bDirY = (by2 - by1) / bLen;
    const bW = numProp(beam, 'Width', 200);
    for (const col of g.columns) {
      const cx = numProp(col, 'X'), cy = numProp(col, 'Y');
      const colDia = numProp(col, 'Diameter', numProp(col, 'Width', 300));
      const rad = colDia / 2 + bW / 2;
      // Distance from column centre to beam line
      const dx = cx - bx1, dy = cy - by1;
      const tAlong = dx * bDirX + dy * bDirY;
      const perp = Math.abs(dx * bDirY - dy * bDirX);
      // Column centre within beam corridor AND its projection between the ends
      if (perp <= rad && tAlong >= -rad && tAlong <= bLen + rad) {
        ops.push({
          id: `bct-${beam.id}-${col.id}`,
          kind: 'beam-column-trim',
          operatorId: col.id,
          targetId:   beam.id,
          enabled: true,
        });
      }
    }
  }

  return ops;
}

/** Convenience — operations in which element X is the target. */
export function operationsForTarget(ops: SEOp[], targetId: string): SEOp[] {
  return ops.filter((o) => o.enabled && o.targetId === targetId);
}

/**
 * Analytical beam-column trim: given a beam and the columns that trim it,
 * return adjusted start/end points that stop at the column faces.
 */
export function trimBeamAtColumns(
  beam: ElementSchema,
  columns: ElementSchema[],
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const x1 = numProp(beam, 'StartX'), y1 = numProp(beam, 'StartY');
  const x2 = numProp(beam, 'EndX'),   y2 = numProp(beam, 'EndY');
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / len, dy = (y2 - y1) / len;

  // For each column on the line, find the nearer face along the beam.
  let startT = 0, endT = len;
  for (const col of columns) {
    const cx = numProp(col, 'X'), cy = numProp(col, 'Y');
    const colDia = numProp(col, 'Diameter', numProp(col, 'Width', 300));
    const half = colDia / 2;
    // Project column centre onto beam line
    const t = (cx - x1) * dx + (cy - y1) * dy;
    // If beam hits this column, trim the closer endpoint to the column face.
    if (t > -half && t < half) {
      // Column at the start of the beam → push start further in
      if (t + half > startT) startT = t + half;
    } else if (t > len - half && t < len + half) {
      if (t - half < endT) endT = t - half;
    }
  }
  // Clamp so the beam doesn't invert
  if (endT < startT) { startT = 0; endT = len; }
  return {
    start: { x: x1 + dx * startT, y: y1 + dy * startT },
    end:   { x: x1 + dx * endT,   y: y1 + dy * endT   },
  };
}
