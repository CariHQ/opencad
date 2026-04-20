/**
 * Full dimension suite — T-DOC-033 (#326).
 *
 * Pure compute functions for every dimension kind a permit-set drawing
 * needs: linear (existing), angular, radial, diameter, arc-length,
 * chain/baseline, ordinate. Each returns numeric measurements plus a
 * formatted label string the 2D renderer displays.
 */

export interface Point { x: number; y: number }
export interface LineRef { a: Point; b: Point }
export interface CircleRef { centre: Point; radius: number }
export interface ArcRef {
  centre: Point;
  radius: number;
  startAngle: number; // radians
  endAngle: number;
}

export type DimensionKind =
  | 'linear' | 'angular' | 'radial' | 'diameter'
  | 'arc' | 'chain' | 'ordinate';

/** Angle between two infinite lines (unsigned, in [0, π/2]). */
export function angularDim(a: LineRef, b: LineRef): number {
  const aAng = Math.atan2(a.b.y - a.a.y, a.b.x - a.a.x);
  const bAng = Math.atan2(b.b.y - b.a.y, b.b.x - b.a.x);
  let diff = Math.abs(aAng - bAng);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  if (diff > Math.PI / 2) diff = Math.PI - diff; // acute angle
  return diff;
}

/** Radial dimension value — radius of a circle or arc in mm. */
export function radialDim(c: CircleRef | ArcRef): number {
  return c.radius;
}

/** Diameter dimension value. */
export function diameterDim(c: CircleRef | ArcRef): number {
  return c.radius * 2;
}

/** Arc length = radius × angle (radians) for an arc. */
export function arcLength(arc: ArcRef): number {
  let sweep = arc.endAngle - arc.startAngle;
  while (sweep < 0) sweep += 2 * Math.PI;
  while (sweep > 2 * Math.PI) sweep -= 2 * Math.PI;
  return arc.radius * sweep;
}

/**
 * Chain/baseline dimension: given a list of point positions along an axis
 * (already projected — callers project onto a baseline first), return the
 * set of segment lengths between consecutive points.
 */
export function chainDim(positions: number[]): number[] {
  if (positions.length < 2) return [];
  const sorted = [...positions].sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    out.push(sorted[i]! - sorted[i - 1]!);
  }
  return out;
}

/**
 * Ordinate dimension: pick an origin + a list of target points; return
 * each point's X and Y offset from the origin. Returns parallel arrays
 * so callers can align a table of X labels + Y labels.
 */
export function ordinateDim(
  origin: Point, targets: Point[],
): { xs: number[]; ys: number[] } {
  return {
    xs: targets.map((p) => p.x - origin.x),
    ys: targets.map((p) => p.y - origin.y),
  };
}

/**
 * Format a numeric value as a dimension label using current precision and
 * unit preferences. Pure — callers pick display options.
 */
export interface DimensionFormat {
  kind: DimensionKind;
  value: number | number[];   // radians for angular, mm for length dims
  precision?: number;         // decimal places
  prefix?: string;            // e.g. "R = " for radial
  suffix?: string;            // e.g. " mm"
  unit?: 'mm' | 'cm' | 'm' | 'deg' | 'rad';
}

export function formatDimension(fmt: DimensionFormat): string {
  const p = fmt.precision ?? 0;
  const prefix = fmt.prefix ?? '';
  const suffix = fmt.suffix ?? '';

  const fmtOne = (n: number): string => {
    if (fmt.kind === 'angular') {
      const deg = fmt.unit === 'rad' ? n : (n * 180 / Math.PI);
      const u = fmt.unit === 'rad' ? ' rad' : '°';
      return `${deg.toFixed(fmt.precision ?? 1)}${u}`;
    }
    let v = n;
    if (fmt.unit === 'cm') v = n / 10;
    else if (fmt.unit === 'm') v = n / 1000;
    return v.toFixed(p);
  };

  const body = Array.isArray(fmt.value)
    ? fmt.value.map(fmtOne).join(' | ')
    : fmtOne(fmt.value);
  return `${prefix}${body}${suffix}`;
}
