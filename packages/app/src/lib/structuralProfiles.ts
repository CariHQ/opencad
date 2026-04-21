/**
 * Complex structural profiles — T-MOD-020 (#313).
 *
 * A Profile is a 2D cross-section polygon (outer loop + optional inner
 * holes) used to sweep beams or extrude columns. The catalogue ships
 * standard steel shapes (W, HSS, C, L) at their published dimensions
 * (AISC/ISO), plus helpers for area + section properties.
 */

export interface Point2D { x: number; y: number }

export interface Profile {
  id: string;
  name: string;
  category: 'W' | 'HSS' | 'C' | 'L' | 'round' | 'rect' | 'custom';
  /** Outer polygon (CCW). Units: mm. */
  outer: Point2D[];
  /** Optional hole polygons (CW). */
  holes?: Point2D[][];
  /** Published cross-section area in mm² (for validation + takeoff). */
  publishedAreaMm2?: number;
}

/** Polygon area — shoelace formula. Negative for CW. */
export function polygonArea(poly: Point2D[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j]!.x + poly[i]!.x) * (poly[j]!.y - poly[i]!.y);
  }
  return Math.abs(a) / 2;
}

/** Total cross-section area of a profile (outer minus holes). */
export function profileArea(profile: Profile): number {
  const outerA = polygonArea(profile.outer);
  const holesA = (profile.holes ?? []).reduce((acc, h) => acc + polygonArea(h), 0);
  return outerA - holesA;
}

/** Volume of a straight sweep of the profile along length `lenMm`. */
export function sweepVolume(profile: Profile, lenMm: number): number {
  return profileArea(profile) * lenMm;
}

/** Build an I-beam (W-shape) profile by dimensions. */
export function buildWShape(params: {
  id: string; name: string;
  depth: number;   // overall depth, mm
  bf: number;      // flange width, mm
  tw: number;      // web thickness
  tf: number;      // flange thickness
  publishedAreaMm2?: number;
}): Profile {
  const { depth: d, bf, tw, tf } = params;
  // Outer polygon of an I-beam (CCW starting bottom-left of bottom flange).
  const hbf = bf / 2;
  const htw = tw / 2;
  const outer: Point2D[] = [
    { x: -hbf, y: -d / 2 },
    { x:  hbf, y: -d / 2 },
    { x:  hbf, y: -d / 2 + tf },
    { x:  htw, y: -d / 2 + tf },
    { x:  htw, y:  d / 2 - tf },
    { x:  hbf, y:  d / 2 - tf },
    { x:  hbf, y:  d / 2 },
    { x: -hbf, y:  d / 2 },
    { x: -hbf, y:  d / 2 - tf },
    { x: -htw, y:  d / 2 - tf },
    { x: -htw, y: -d / 2 + tf },
    { x: -hbf, y: -d / 2 + tf },
  ];
  return { id: params.id, name: params.name, category: 'W', outer, publishedAreaMm2: params.publishedAreaMm2 };
}

/** Build a rectangular hollow section (HSS) profile. */
export function buildHSS(params: {
  id: string; name: string;
  outerW: number; outerH: number;
  wallThickness: number;
  publishedAreaMm2?: number;
}): Profile {
  const { outerW, outerH, wallThickness: t } = params;
  const ox = outerW / 2, oy = outerH / 2;
  const ix = ox - t, iy = oy - t;
  const outer: Point2D[] = [
    { x: -ox, y: -oy }, { x: ox, y: -oy }, { x: ox, y: oy }, { x: -ox, y: oy },
  ];
  const inner: Point2D[] = [
    { x: -ix, y: -iy }, { x: -ix, y: iy }, { x: ix, y: iy }, { x: ix, y: -iy },
  ];
  return { id: params.id, name: params.name, category: 'HSS', outer, holes: [inner], publishedAreaMm2: params.publishedAreaMm2 };
}

/** Built-in catalogue of standard profiles (subset — a starter set). */
export const BUILT_IN_PROFILES: Profile[] = [
  // AISC W-shapes (dimensions from AISC Steel Construction Manual, rounded).
  buildWShape({ id: 'W8x31',   name: 'W8×31',   depth: 203, bf: 203, tw: 7.24, tf: 11.0,  publishedAreaMm2: 5870 }),
  buildWShape({ id: 'W10x49',  name: 'W10×49',  depth: 254, bf: 254, tw: 8.64, tf: 14.2,  publishedAreaMm2: 9290 }),
  buildWShape({ id: 'W12x50',  name: 'W12×50',  depth: 310, bf: 205, tw: 9.4,  tf: 16.3,  publishedAreaMm2: 9480 }),
  buildWShape({ id: 'W14x90',  name: 'W14×90',  depth: 356, bf: 368, tw: 11.2, tf: 18.0,  publishedAreaMm2: 17100 }),
  // AISC HSS (square + rect).
  buildHSS({ id: 'HSS4x4x1/4', name: 'HSS4×4×¼',       outerW: 102, outerH: 102, wallThickness: 6.35, publishedAreaMm2: 2230 }),
  buildHSS({ id: 'HSS6x6x3/8', name: 'HSS6×6×⅜',       outerW: 152, outerH: 152, wallThickness: 9.5,  publishedAreaMm2: 4990 }),
  buildHSS({ id: 'HSS8x4x1/4', name: 'HSS8×4×¼',       outerW: 203, outerH: 102, wallThickness: 6.35, publishedAreaMm2: 3610 }),
  // Solid rectangular (architectural column).
  {
    id: 'col-300x300', name: 'Concrete 300×300', category: 'rect',
    outer: [
      { x: -150, y: -150 }, { x: 150, y: -150 },
      { x:  150, y:  150 }, { x: -150, y:  150 },
    ],
    publishedAreaMm2: 90000,
  },
  // Round (circular column) — 300 mm diameter, 32-sided approximation.
  {
    id: 'col-round-300', name: 'Round 300 mm Ø', category: 'round',
    outer: Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * 2 * Math.PI;
      return { x: 150 * Math.cos(a), y: 150 * Math.sin(a) };
    }),
    publishedAreaMm2: Math.PI * 150 * 150,
  },
];
