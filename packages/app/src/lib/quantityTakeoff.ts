/**
 * Quantity Takeoff Engine — T-BIM-002
 *
 * Counts and sums element types from a DocumentSchema, producing a
 * schedule-ready summary grouped by element type.
 */
import type { DocumentSchema, ElementSchema } from '@opencad/document';

export interface TakeoffRow {
  type: string;
  count: number;
  totalArea?: number;   // m²
  totalLength?: number; // m
  totalVolume?: number; // m³
}

// ── Property helpers ──────────────────────────────────────────────────────────

function numProp(el: ElementSchema, key: string): number | undefined {
  const p = el.properties[key];
  if (p && p.type === 'number' && typeof p.value === 'number') return p.value;
  return undefined;
}

// ── Per-type computation ──────────────────────────────────────────────────────

function wallMetrics(elements: ElementSchema[]): Partial<TakeoffRow> {
  let totalArea = 0;
  let totalVolume = 0;
  let hasVolume = false;

  for (const el of elements) {
    const length = numProp(el, 'length');
    const height = numProp(el, 'height');
    const thickness = numProp(el, 'thickness');

    if (length !== undefined && height !== undefined) {
      totalArea += length * height;
      if (thickness !== undefined) {
        totalVolume += length * height * thickness;
        hasVolume = true;
      }
    }
  }

  return {
    totalArea,
    ...(hasVolume ? { totalVolume } : {}),
  };
}

function doorWindowMetrics(elements: ElementSchema[]): Partial<TakeoffRow> {
  let totalArea = 0;

  for (const el of elements) {
    const width = numProp(el, 'width');
    const height = numProp(el, 'height');
    if (width !== undefined && height !== undefined) {
      totalArea += width * height;
    }
  }

  return { totalArea };
}

function slabMetrics(elements: ElementSchema[]): Partial<TakeoffRow> {
  let totalArea = 0;
  let hasArea = false;

  for (const el of elements) {
    const area = numProp(el, 'area');
    if (area !== undefined) {
      totalArea += area;
      hasArea = true;
    }
  }

  return hasArea ? { totalArea } : {};
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute a quantity takeoff summary from a document.
 *
 * Groups elements by `type`, then calculates:
 * - walls: area = length × height, volume = length × height × thickness
 * - doors/windows: area = width × height
 * - slabs/floors: area from the `area` property (if present)
 *
 * Returns rows sorted by type name.
 */
export function computeTakeoff(doc: DocumentSchema): TakeoffRow[] {
  const byType = new Map<string, ElementSchema[]>();

  for (const el of Object.values(doc.content.elements)) {
    const list = byType.get(el.type) ?? [];
    list.push(el);
    byType.set(el.type, list);
  }

  const rows: TakeoffRow[] = [];

  for (const [type, elements] of byType) {
    let metrics: Partial<TakeoffRow> = {};

    if (type === 'wall') {
      metrics = wallMetrics(elements);
    } else if (type === 'door' || type === 'window') {
      metrics = doorWindowMetrics(elements);
    } else if (type === 'slab' || type === 'floor') {
      metrics = slabMetrics(elements);
    }

    rows.push({ type, count: elements.length, ...metrics });
  }

  return rows.sort((a, b) => a.type.localeCompare(b.type));
}
