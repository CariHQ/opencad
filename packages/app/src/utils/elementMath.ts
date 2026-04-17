/**
 * Pure geometry helpers for element hit-testing, handle placement, and
 * property mutation during move / resize operations in the 2D viewport.
 *
 * All functions are free of React and store dependencies — they can be
 * imported directly by hooks, utilities, and tests.
 */

import type { ElementSchema, PropertyValue } from '@opencad/document';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface Point { x: number; y: number; }

/** Which part of an element the user grabbed. */
export type HandleKind =
  // Endpoint handles (walls, lines, beams, dimensions)
  | 'p0' | 'p1'
  // Rectangle corner handles
  | 'nw' | 'ne' | 'se' | 'sw'
  // Rectangle edge handles
  | 'n' | 'e' | 's' | 'w'
  // Circle/arc radius handles
  | 'r0' | 'r1' | 'r2' | 'r3';

export interface Handle {
  kind: HandleKind;
  x: number;     // world-space centre of handle square
  y: number;
  cursor: string; // CSS cursor for this handle
}

// ─── Property-value helper ────────────────────────────────────────────────────

function pv(props: Record<string, { value: unknown }>, key: string, fallback: number): number {
  return typeof props[key]?.value === 'number' ? (props[key]!.value as number) : fallback;
}

// ─── Handle placement ─────────────────────────────────────────────────────────

/**
 * Return resize / endpoint handles for a selected element.
 * Returns [] for types that don't support resizing (column, door, window, stair).
 */
export function getHandles(element: ElementSchema): Handle[] {
  const props = element.properties as Record<string, { value: unknown }>;
  const t = element.type;

  if (t === 'wall' || t === 'annotation' || t === 'beam' || t === 'dimension') {
    const x1 = pv(props, 'StartX', 0), y1 = pv(props, 'StartY', 0);
    const x2 = pv(props, 'EndX', x1 + 1000), y2 = pv(props, 'EndY', y1);
    return [
      { kind: 'p0', x: x1, y: y1, cursor: 'crosshair' },
      { kind: 'p1', x: x2, y: y2, cursor: 'crosshair' },
    ];
  }

  if (t === 'rectangle' || t === 'slab' || t === 'roof') {
    const x = pv(props, 'X', 0), y = pv(props, 'Y', 0);
    const w = pv(props, 'Width', 1000), h = pv(props, 'Height', 1000);
    return [
      { kind: 'nw', x,         y,         cursor: 'nw-resize' },
      { kind: 'n',  x: x+w/2,  y,         cursor: 'n-resize'  },
      { kind: 'ne', x: x+w,    y,         cursor: 'ne-resize' },
      { kind: 'e',  x: x+w,    y: y+h/2,  cursor: 'e-resize'  },
      { kind: 'se', x: x+w,    y: y+h,    cursor: 'se-resize' },
      { kind: 's',  x: x+w/2,  y: y+h,    cursor: 's-resize'  },
      { kind: 'sw', x,         y: y+h,    cursor: 'sw-resize' },
      { kind: 'w',  x,         y: y+h/2,  cursor: 'w-resize'  },
    ];
  }

  if (t === 'circle' || t === 'arc') {
    const cx = pv(props, 'CenterX', 0), cy = pv(props, 'CenterY', 0);
    const r  = pv(props, 'Radius', 500);
    return [
      { kind: 'r0', x: cx,   y: cy-r, cursor: 'n-resize' },
      { kind: 'r1', x: cx+r, y: cy,   cursor: 'e-resize' },
      { kind: 'r2', x: cx,   y: cy+r, cursor: 's-resize' },
      { kind: 'r3', x: cx-r, y: cy,   cursor: 'w-resize' },
    ];
  }

  return [];
}

/** Hit-test a handle at world-space `point`. Returns handle or null. */
export function hitHandle(
  point: Point,
  handles: Handle[],
  toleranceWorld: number
): Handle | null {
  for (const h of handles) {
    if (Math.abs(h.x - point.x) <= toleranceWorld &&
        Math.abs(h.y - point.y) <= toleranceWorld) {
      return h;
    }
  }
  return null;
}

// ─── Element hit test ─────────────────────────────────────────────────────────

/** Point-to-segment distance (for line/wall hit testing). */
function segmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

/**
 * Returns true if `worldPoint` hits `element` within `toleranceWorld` world units.
 * For lines/walls uses segment distance; for filled shapes uses bounding box.
 */
export function hitTestElement(
  worldPoint: Point,
  element: ElementSchema,
  toleranceWorld: number
): boolean {
  const props = element.properties as Record<string, { value: unknown }>;
  const t = element.type;
  const { x, y } = worldPoint;

  if (t === 'wall' || t === 'annotation' || t === 'beam' || t === 'dimension') {
    const x1 = pv(props, 'StartX', 0), y1 = pv(props, 'StartY', 0);
    const x2 = pv(props, 'EndX', x1+1000), y2 = pv(props, 'EndY', y1);
    return segmentDist(x, y, x1, y1, x2, y2) <= toleranceWorld;
  }

  if (t === 'circle' || t === 'arc') {
    const cx = pv(props, 'CenterX', 0), cy = pv(props, 'CenterY', 0);
    const r  = pv(props, 'Radius', 500);
    const d  = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    return Math.abs(d - r) <= toleranceWorld || d <= r + toleranceWorld;
  }

  if (t === 'polygon' || t === 'polyline' || t === 'railing') {
    const v = props['Points'];
    if (!v || typeof v.value !== 'string') return false;
    try {
      const pts = JSON.parse(v.value as string) as Point[];
      for (let i = 0; i < pts.length - 1; i++) {
        if (segmentDist(x, y, pts[i]!.x, pts[i]!.y, pts[i+1]!.x, pts[i+1]!.y) <= toleranceWorld) return true;
      }
      return false;
    } catch { return false; }
  }

  // Filled shapes — bounding-box test
  const bb = element.boundingBox;
  return x >= bb.min.x - toleranceWorld && x <= bb.max.x + toleranceWorld &&
         y >= bb.min.y - toleranceWorld && y <= bb.max.y + toleranceWorld;
}

// ─── Move ─────────────────────────────────────────────────────────────────────

/**
 * Return a partial-properties update that translates `element` by (dx, dy).
 * Caller should spread this into the existing element.properties before calling updateElement.
 */
export function moveElementProps(
  element: ElementSchema,
  dx: number,
  dy: number
): Record<string, PropertyValue> {
  const props = element.properties as Record<string, { value: unknown; type: string; unit?: string }>;
  const t = element.type;
  const upd: Record<string, PropertyValue> = {};

  const shift = (key: string, axis: 'x' | 'y') => {
    const v = props[key];
    if (v && typeof v.value === 'number') {
      upd[key] = { ...v, value: (v.value as number) + (axis === 'x' ? dx : dy) } as PropertyValue;
    }
  };

  if (t === 'wall' || t === 'annotation' || t === 'beam' || t === 'dimension') {
    shift('StartX', 'x'); shift('StartY', 'y');
    shift('EndX',   'x'); shift('EndY',   'y');
    return upd;
  }
  if (t === 'rectangle' || t === 'slab' || t === 'roof' ||
      t === 'door'      || t === 'window' || t === 'column' || t === 'stair') {
    shift('X', 'x'); shift('Y', 'y');
    return upd;
  }
  if (t === 'circle' || t === 'arc') {
    shift('CenterX', 'x'); shift('CenterY', 'y');
    return upd;
  }
  if (t === 'polygon' || t === 'polyline' || t === 'railing') {
    const v = props['Points'];
    if (v && typeof v.value === 'string') {
      try {
        const pts = JSON.parse(v.value as string) as Point[];
        upd['Points'] = {
          ...v,
          value: JSON.stringify(pts.map((p) => ({ x: p.x + dx, y: p.y + dy }))),
        } as PropertyValue;
      } catch { /* skip */ }
    }
    return upd;
  }
  return upd;
}

// ─── Resize ───────────────────────────────────────────────────────────────────

const MIN_DIM = 50; // minimum width/height/radius in world units

/**
 * Return a partial-properties update that applies a handle drag to `worldPoint`.
 */
export function resizeElementProps(
  element: ElementSchema,
  handle: HandleKind,
  worldPoint: Point
): Record<string, PropertyValue> {
  const props = element.properties as Record<string, { value: unknown; type: string; unit?: string }>;
  const t = element.type;
  const upd: Record<string, PropertyValue> = {};

  const set = (key: string, val: number) => {
    const v = props[key];
    if (v) upd[key] = { ...v, value: val } as PropertyValue;
  };

  // ── Line-like endpoints ─────────────────────────────────────────────────────
  if (t === 'wall' || t === 'annotation' || t === 'beam' || t === 'dimension') {
    if (handle === 'p0') { set('StartX', worldPoint.x); set('StartY', worldPoint.y); }
    if (handle === 'p1') { set('EndX',   worldPoint.x); set('EndY',   worldPoint.y); }
    return upd;
  }

  // ── Box shapes ──────────────────────────────────────────────────────────────
  if (t === 'rectangle' || t === 'slab' || t === 'roof') {
    const x  = pv(props, 'X', 0),     y  = pv(props, 'Y', 0);
    const w  = pv(props, 'Width', 1000), h  = pv(props, 'Height', 1000);
    const r  = x + w, b = y + h;

    switch (handle) {
      case 'nw': set('X', worldPoint.x); set('Y', worldPoint.y);
                 set('Width',  Math.max(MIN_DIM, r - worldPoint.x));
                 set('Height', Math.max(MIN_DIM, b - worldPoint.y)); break;
      case 'n':  set('Y', worldPoint.y);
                 set('Height', Math.max(MIN_DIM, b - worldPoint.y)); break;
      case 'ne': set('Y', worldPoint.y);
                 set('Width',  Math.max(MIN_DIM, worldPoint.x - x));
                 set('Height', Math.max(MIN_DIM, b - worldPoint.y)); break;
      case 'e':  set('Width',  Math.max(MIN_DIM, worldPoint.x - x)); break;
      case 'se': set('Width',  Math.max(MIN_DIM, worldPoint.x - x));
                 set('Height', Math.max(MIN_DIM, worldPoint.y - y)); break;
      case 's':  set('Height', Math.max(MIN_DIM, worldPoint.y - y)); break;
      case 'sw': set('X', worldPoint.x); set('Width', Math.max(MIN_DIM, r - worldPoint.x));
                 set('Height', Math.max(MIN_DIM, worldPoint.y - y)); break;
      case 'w':  set('X', worldPoint.x);
                 set('Width',  Math.max(MIN_DIM, r - worldPoint.x)); break;
    }
    return upd;
  }

  // ── Circle / arc ────────────────────────────────────────────────────────────
  if (t === 'circle' || t === 'arc') {
    const cx = pv(props, 'CenterX', 0), cy = pv(props, 'CenterY', 0);
    const r  = Math.max(MIN_DIM, Math.sqrt((worldPoint.x - cx) ** 2 + (worldPoint.y - cy) ** 2));
    set('Radius', r);
    return upd;
  }

  return upd;
}

// ─── Element centre (for copy-paste offset reference) ─────────────────────────

export function getElementCenter(element: ElementSchema): Point {
  const props = element.properties as Record<string, { value: unknown }>;
  const t = element.type;

  if (t === 'wall' || t === 'annotation' || t === 'beam' || t === 'dimension') {
    const x1 = pv(props, 'StartX', 0), y1 = pv(props, 'StartY', 0);
    const x2 = pv(props, 'EndX', x1+1000), y2 = pv(props, 'EndY', y1);
    return { x: (x1+x2)/2, y: (y1+y2)/2 };
  }
  if (t === 'circle' || t === 'arc') {
    return { x: pv(props, 'CenterX', 0), y: pv(props, 'CenterY', 0) };
  }
  if (t === 'rectangle' || t === 'slab' || t === 'roof' ||
      t === 'door'      || t === 'window' || t === 'column' || t === 'stair') {
    return { x: pv(props, 'X', 0), y: pv(props, 'Y', 0) };
  }
  const bb = element.boundingBox;
  return { x: (bb.min.x + bb.max.x) / 2, y: (bb.min.y + bb.max.y) / 2 };
}
