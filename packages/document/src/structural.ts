/**
 * Structural Elements
 *
 * Provides typed creation functions for foundations, footings,
 * reinforcement, trusses, and bracing elements used in structural BIM.
 */

// ─── Foundation ───────────────────────────────────────────────────────────────

export type FoundationType = 'strip' | 'raft' | 'pad' | 'pile_cap';
export type SoilBearingClass = 'I' | 'II' | 'III';

export interface FoundationSchema {
  id: string;
  type: 'foundation';
  foundationType: FoundationType;
  width: number;          // mm
  depth: number;          // mm (below grade)
  thickness: number;      // mm
  length: number;         // mm (for strip foundations)
  material: string;
  concreteGrade: string;  // e.g., 'C25/30'
  soilBearing: number;    // kPa
  soilClass: SoilBearingClass;
  reinforced: boolean;
  coverDepth: number;     // mm cover to rebar
  position: { x: number; y: number; z: number };
}

export function createFoundation(params: {
  foundationType?: FoundationType;
  width?: number;
  depth?: number;
  thickness?: number;
  length?: number;
  material?: string;
  concreteGrade?: string;
  soilBearing?: number;
  soilClass?: SoilBearingClass;
  reinforced?: boolean;
  coverDepth?: number;
  position?: { x: number; y: number; z: number };
}): FoundationSchema {
  return {
    id: crypto.randomUUID(),
    type: 'foundation',
    foundationType: params.foundationType ?? 'strip',
    width: params.width ?? 600,
    depth: params.depth ?? 900,
    thickness: params.thickness ?? 250,
    length: params.length ?? 1000,
    material: params.material ?? 'Concrete',
    concreteGrade: params.concreteGrade ?? 'C25/30',
    soilBearing: params.soilBearing ?? 150,
    soilClass: params.soilClass ?? 'II',
    reinforced: params.reinforced ?? true,
    coverDepth: params.coverDepth ?? 50,
    position: params.position ?? { x: 0, y: 0, z: 0 },
  };
}

export function foundationVolume(f: FoundationSchema): number {
  return f.width * f.thickness * f.length;
}

export function foundationBearingCapacity(f: FoundationSchema): number {
  // Simple capacity: bearing pressure × area (kN)
  return (f.soilBearing * f.width * f.length) / 1_000_000;
}

// ─── Footing ──────────────────────────────────────────────────────────────────

export type FootingShape = 'square' | 'rectangular' | 'circular';

export interface FootingSchema {
  id: string;
  type: 'footing';
  shape: FootingShape;
  width: number;       // mm
  depth: number;       // mm (plan dimension for rectangular)
  thickness: number;   // mm
  diameter: number;    // mm (for circular)
  concreteGrade: string;
  rebarCount: number;
  rebarDiameter: number;  // mm
  position: { x: number; y: number; z: number };
}

export function createFooting(params: {
  shape?: FootingShape;
  width?: number;
  depth?: number;
  thickness?: number;
  diameter?: number;
  concreteGrade?: string;
  rebarCount?: number;
  rebarDiameter?: number;
  position?: { x: number; y: number; z: number };
}): FootingSchema {
  const shape = params.shape ?? 'square';
  const width = params.width ?? 800;
  return {
    id: crypto.randomUUID(),
    type: 'footing',
    shape,
    width,
    depth: params.depth ?? width,
    thickness: params.thickness ?? 300,
    diameter: params.diameter ?? width,
    concreteGrade: params.concreteGrade ?? 'C25/30',
    rebarCount: params.rebarCount ?? 6,
    rebarDiameter: params.rebarDiameter ?? 16,
    position: params.position ?? { x: 0, y: 0, z: 0 },
  };
}

export function footingVolume(f: FootingSchema): number {
  if (f.shape === 'circular') {
    return Math.PI * (f.diameter / 2) ** 2 * f.thickness;
  }
  return f.width * f.depth * f.thickness;
}

// ─── Reinforcement ────────────────────────────────────────────────────────────

export type RebarType = 'A193' | 'A615' | 'A706' | 'B500B' | 'B500C';
export type RebarShape = 'straight' | 'bent_L' | 'bent_U' | 'stirrup' | 'spiral';

export interface RebarSchema {
  id: string;
  type: 'reinforcement';
  rebarType: RebarType;
  shape: RebarShape;
  diameter: number;       // mm
  length: number;         // mm total length
  weight: number;         // kg
  spacing?: number;       // mm (for distributed bars)
  quantity: number;
  coverDepth: number;     // mm
  bendAngle?: number;     // degrees (for bent bars)
  hostElementId?: string; // the concrete element being reinforced
}

export function createRebar(params: {
  rebarType?: RebarType;
  shape?: RebarShape;
  diameter?: number;
  length: number;
  spacing?: number;
  quantity?: number;
  coverDepth?: number;
  bendAngle?: number;
  hostElementId?: string;
}): RebarSchema {
  const d = params.diameter ?? 16;
  // Unit weight of steel = 7850 kg/m³
  const crossSection = Math.PI * (d / 2) ** 2; // mm²
  const weight = (crossSection * params.length * params.quantity! / 1e9) * 7850;
  return {
    id: crypto.randomUUID(),
    type: 'reinforcement',
    rebarType: params.rebarType ?? 'B500B',
    shape: params.shape ?? 'straight',
    diameter: d,
    length: params.length,
    weight,
    spacing: params.spacing,
    quantity: params.quantity ?? 1,
    coverDepth: params.coverDepth ?? 25,
    bendAngle: params.bendAngle,
    hostElementId: params.hostElementId,
  };
}

export function rebarWeight(rebar: RebarSchema): number {
  const crossSection = Math.PI * (rebar.diameter / 2) ** 2;
  return (crossSection * rebar.length * rebar.quantity / 1e9) * 7850;
}

// ─── Truss ────────────────────────────────────────────────────────────────────

export type TrussType = 'pratt' | 'warren' | 'howe' | 'fink' | 'flat';
export type TrussMaterial = 'steel' | 'timber' | 'aluminium';

export interface TrussSchema {
  id: string;
  type: 'truss';
  trussType: TrussType;
  span: number;         // mm
  depth: number;        // mm overall depth
  spacing: number;      // mm centre-to-centre spacing between trusses
  pitch: number;        // degrees (0 for flat)
  material: TrussMaterial;
  topChordSection: string;   // e.g., 'L75x75x6' or '2x4'
  bottomChordSection: string;
  webSection: string;
  load: number;         // kN/m² design load
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
}

export function createTruss(params: {
  trussType?: TrussType;
  span: number;
  depth?: number;
  spacing?: number;
  pitch?: number;
  material?: TrussMaterial;
  topChordSection?: string;
  bottomChordSection?: string;
  webSection?: string;
  load?: number;
  startPoint?: { x: number; y: number; z: number };
  endPoint?: { x: number; y: number; z: number };
}): TrussSchema {
  const span = params.span;
  return {
    id: crypto.randomUUID(),
    type: 'truss',
    trussType: params.trussType ?? 'pratt',
    span,
    depth: params.depth ?? Math.round(span / 10),
    spacing: params.spacing ?? 1200,
    pitch: params.pitch ?? 0,
    material: params.material ?? 'steel',
    topChordSection: params.topChordSection ?? 'L75x75x6',
    bottomChordSection: params.bottomChordSection ?? 'L75x75x6',
    webSection: params.webSection ?? 'L50x50x5',
    load: params.load ?? 1.5,
    startPoint: params.startPoint ?? { x: 0, y: 0, z: 0 },
    endPoint: params.endPoint ?? { x: span, y: 0, z: 0 },
  };
}

export function trussRidgeHeight(truss: TrussSchema): number {
  return (truss.span / 2) * Math.tan((truss.pitch * Math.PI) / 180);
}

// ─── Brace ────────────────────────────────────────────────────────────────────

export type BraceType = 'x_brace' | 'v_brace' | 'k_brace' | 'knee_brace' | 'chevron';

export interface BraceSchema {
  id: string;
  type: 'brace';
  braceType: BraceType;
  section: string;     // e.g., 'HSS50x50x3'
  length: number;      // mm
  angle: number;       // degrees from horizontal
  material: string;
  axialCapacity: number;  // kN
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
}

export function createBrace(params: {
  braceType?: BraceType;
  section?: string;
  length: number;
  angle?: number;
  material?: string;
  axialCapacity?: number;
  startPoint?: { x: number; y: number; z: number };
  endPoint?: { x: number; y: number; z: number };
}): BraceSchema {
  return {
    id: crypto.randomUUID(),
    type: 'brace',
    braceType: params.braceType ?? 'x_brace',
    section: params.section ?? 'HSS50x50x3',
    length: params.length,
    angle: params.angle ?? 45,
    material: params.material ?? 'Steel',
    axialCapacity: params.axialCapacity ?? 100,
    startPoint: params.startPoint ?? { x: 0, y: 0, z: 0 },
    endPoint: params.endPoint ?? { x: params.length, y: 0, z: 0 },
  };
}
