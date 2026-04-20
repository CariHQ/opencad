/**
 * Zone / room stamp helper — T-DOC-035 (#328).
 *
 * Given a zone element (a `space` with a Points polygon and optional
 * name / occupancy / finish properties) produce:
 *   - centroid (where the stamp renders)
 *   - area (m², computed from polygon)
 *   - formatted stamp lines (respects configurable field list)
 *
 * Pure module — reuses the existing polygonArea / polygonCentroid
 * helpers from utils/roomDetection so there's one implementation of
 * the math.
 */
import type { ElementSchema } from '@opencad/document';
import { polygonArea, polygonCentroid, type Point2D } from '../utils/roomDetection';

export type StampField =
  | 'tag' | 'name' | 'area' | 'occupancy'
  | 'finishFloor' | 'finishWalls' | 'finishCeiling';

export interface ZoneStamp {
  elementId: string;
  centroid: Point2D;        // world mm
  areaMm2: number;          // raw area
  areaM2: number;           // area in m²
  lines: string[];          // one per configured field, pre-rendered
}

function strProp(el: ElementSchema, key: string, fb = ''): string {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'string' ? (p.value as string) : fb;
}
function numProp(el: ElementSchema, key: string, fb = 0): number {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'number' ? (p.value as number) : fb;
}
function points(el: ElementSchema): Point2D[] | null {
  const raw = (el.properties as Record<string, { value: unknown }>)['Points']?.value;
  if (typeof raw !== 'string') return null;
  try {
    const pts = JSON.parse(raw) as Point2D[];
    return Array.isArray(pts) && pts.length >= 3 ? pts : null;
  } catch { return null; }
}

export const DEFAULT_STAMP_FIELDS: StampField[] = ['tag', 'name', 'area', 'occupancy'];

/**
 * Build the stamp for a zone. Returns `null` when the element is not a
 * polygon-backed zone. `tag` defaults to the element's Tag property; the
 * caller can override (e.g. for numbered room schedules).
 */
export function buildZoneStamp(
  zone: ElementSchema,
  fields: StampField[] = DEFAULT_STAMP_FIELDS,
  overrideTag?: string,
): ZoneStamp | null {
  const pts = points(zone);
  if (!pts) return null;

  const areaMm2 = Math.abs(polygonArea(pts));
  const areaM2  = areaMm2 / 1_000_000;
  const centroid = polygonCentroid(pts);

  const tag = overrideTag ?? strProp(zone, 'Tag');
  const name = strProp(zone, 'Name', '(room)');
  const occupancy = strProp(zone, 'OccupancyType');
  const finishFloor = strProp(zone, 'FinishFloor');
  const finishWalls = strProp(zone, 'FinishWalls');
  const finishCeiling = strProp(zone, 'FinishCeiling');

  const rendered: Record<StampField, string> = {
    tag,
    name,
    area: areaM2 > 0 ? `${areaM2.toFixed(1)} m²` : '',
    occupancy,
    finishFloor,
    finishWalls,
    finishCeiling,
  };

  const lines = fields
    .map((f) => rendered[f])
    .filter((s) => s && s.length > 0);

  return { elementId: zone.id, centroid, areaMm2, areaM2, lines };
}

/**
 * Convenience: build stamps for every zone in a doc.
 */
export function buildAllStamps(
  elements: Record<string, ElementSchema>,
  fields: StampField[] = DEFAULT_STAMP_FIELDS,
): ZoneStamp[] {
  const out: ZoneStamp[] = [];
  for (const el of Object.values(elements)) {
    if (el.type !== 'space') continue;
    // Fall back to numProp Area if Points isn't present
    const stamp = buildZoneStamp(el, fields);
    if (stamp) { out.push(stamp); continue; }
    const legacyArea = numProp(el, 'Area');
    if (legacyArea > 0) {
      out.push({
        elementId: el.id,
        centroid: { x: 0, y: 0 },
        areaMm2: legacyArea * 1_000_000,
        areaM2: legacyArea,
        lines: [strProp(el, 'Tag'), strProp(el, 'Name', '(room)'), `${legacyArea.toFixed(1)} m²`]
          .filter((s) => s.length > 0),
      });
    }
  }
  return out;
}
