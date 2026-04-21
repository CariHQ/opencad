/**
 * Parametric object library — T-PAR-013 (#306).
 *
 * A ParametricObjectManifest declares parameters + geometry primitives.
 * Primitive fields can reference parameters via `{{name}}` tokens.
 * resolvePrimitives(manifest, params) expands tokens to concrete numbers.
 */

export interface ParamDef {
  name: string;
  type: 'number' | 'string' | 'boolean';
  default: number | string | boolean;
  min?: number;
  max?: number;
  description?: string;
}

export type Primitive =
  | { kind: 'box';       size: [NumExpr, NumExpr, NumExpr]; material?: string; offset?: [NumExpr, NumExpr, NumExpr] }
  | { kind: 'cylinder';  radius: NumExpr; height: NumExpr; material?: string; offset?: [NumExpr, NumExpr, NumExpr] }
  | { kind: 'revolve';   profile: Array<[NumExpr, NumExpr]>; segments?: number; material?: string }
  | { kind: 'sweep';     profile: Array<[NumExpr, NumExpr]>; path: Array<[NumExpr, NumExpr, NumExpr]>; material?: string };

/** NumExpr is either a raw number or a `{{param}}` reference. */
export type NumExpr = number | string;

export interface ParametricObjectManifest {
  id: string;
  name: string;
  category: 'plumbing' | 'kitchen' | 'furniture' | 'lighting' | 'fixture' | 'appliance';
  parameters: ParamDef[];
  primitives: Primitive[];
  /** 2D symbol (SVG path) rendered in plan. */
  symbol?: { path: string; scaleWithBbox?: boolean };
  metadata?: { vendor?: string; tags?: string[] };
}

export interface ResolvedPrimitive {
  kind: Primitive['kind'];
  material?: string;
  offset?: [number, number, number];
  size?: [number, number, number];
  radius?: number;
  height?: number;
  profile?: Array<[number, number]>;
  path?: Array<[number, number, number]>;
  segments?: number;
}

/** Evaluate a NumExpr using the provided params — numbers pass through,
 *  `{{name}}` strings resolve from the params map. */
function evalExpr(expr: NumExpr, params: Record<string, number | string | boolean>): number {
  if (typeof expr === 'number') return expr;
  const match = /^\{\{(\w+)\}\}$/.exec(expr);
  if (match) {
    const v = params[match[1]!];
    if (typeof v === 'number') return v;
  }
  const n = Number(expr);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Resolve all parameter references in a manifest's primitives.
 * Parameters without a supplied value fall back to their declared default.
 */
export function resolvePrimitives(
  manifest: ParametricObjectManifest,
  userParams: Record<string, number | string | boolean> = {},
): ResolvedPrimitive[] {
  // Merge defaults + user params
  const resolved: Record<string, number | string | boolean> = {};
  for (const p of manifest.parameters) resolved[p.name] = p.default;
  for (const [k, v] of Object.entries(userParams)) resolved[k] = v;

  const out: ResolvedPrimitive[] = [];
  for (const prim of manifest.primitives) {
    switch (prim.kind) {
      case 'box':
        out.push({
          kind: 'box',
          size:   prim.size.map((e) => evalExpr(e, resolved)) as [number, number, number],
          offset: prim.offset?.map((e) => evalExpr(e, resolved)) as [number, number, number] | undefined,
          material: prim.material,
        });
        break;
      case 'cylinder':
        out.push({
          kind: 'cylinder',
          radius: evalExpr(prim.radius, resolved),
          height: evalExpr(prim.height, resolved),
          offset: prim.offset?.map((e) => evalExpr(e, resolved)) as [number, number, number] | undefined,
          material: prim.material,
        });
        break;
      case 'revolve':
        out.push({
          kind: 'revolve',
          profile: prim.profile.map((pair) => [evalExpr(pair[0], resolved), evalExpr(pair[1], resolved)]) as Array<[number, number]>,
          segments: prim.segments ?? 32,
          material: prim.material,
        });
        break;
      case 'sweep':
        out.push({
          kind: 'sweep',
          profile: prim.profile.map((pair) => [evalExpr(pair[0], resolved), evalExpr(pair[1], resolved)]) as Array<[number, number]>,
          path: prim.path.map((p) => [evalExpr(p[0], resolved), evalExpr(p[1], resolved), evalExpr(p[2], resolved)]) as Array<[number, number, number]>,
          material: prim.material,
        });
        break;
    }
  }
  return out;
}

/** Validate a manifest — structural checks only, no type-checking params. */
export function validateManifest(m: ParametricObjectManifest): string[] {
  const reasons: string[] = [];
  if (!m.id) reasons.push('Manifest must have an id.');
  if (!m.name) reasons.push('Manifest must have a name.');
  if (!m.primitives || m.primitives.length === 0) reasons.push('Manifest must declare at least one primitive.');
  const paramNames = new Set(m.parameters?.map((p) => p.name) ?? []);
  // Walk primitives and confirm every `{{name}}` resolves to a declared param
  const visit = (expr: NumExpr | undefined) => {
    if (typeof expr !== 'string') return;
    const match = /^\{\{(\w+)\}\}$/.exec(expr);
    if (match && !paramNames.has(match[1]!)) reasons.push(`Unknown parameter reference: ${match[0]}`);
  };
  for (const prim of m.primitives) {
    if (prim.kind === 'box')       prim.size.forEach(visit);
    if (prim.kind === 'cylinder')  { visit(prim.radius); visit(prim.height); }
    if (prim.kind === 'revolve')   prim.profile.forEach((p) => p.forEach(visit));
    if (prim.kind === 'sweep')     {
      prim.profile.forEach((p) => p.forEach(visit));
      prim.path.forEach((p) => p.forEach(visit));
    }
  }
  return reasons;
}

/** Starter library — 3 parametric objects so the library panel has content. */
export const BUILT_IN_PARAMETRIC_OBJECTS: ParametricObjectManifest[] = [
  {
    id: 'toilet-basic', name: 'Toilet (standard)', category: 'plumbing',
    parameters: [
      { name: 'tankWidth', type: 'number', default: 400, min: 300, max: 500 },
      { name: 'bowlLength', type: 'number', default: 700, min: 600, max: 800 },
      { name: 'tankHeight', type: 'number', default: 750, min: 700, max: 850 },
    ],
    primitives: [
      { kind: 'box', size: ['{{tankWidth}}', 200, '{{tankHeight}}'], material: 'White Ceramic' },
      { kind: 'box', size: ['{{tankWidth}}', '{{bowlLength}}', 400], material: 'White Ceramic', offset: [0, 200, 0] },
    ],
  },
  {
    id: 'sink-basic', name: 'Sink (kitchen)', category: 'kitchen',
    parameters: [
      { name: 'width',  type: 'number', default: 900, min: 600, max: 1200 },
      { name: 'depth',  type: 'number', default: 500, min: 400, max: 650 },
      { name: 'height', type: 'number', default: 200, min: 150, max: 300 },
    ],
    primitives: [
      { kind: 'box', size: ['{{width}}', '{{depth}}', '{{height}}'], material: 'Stainless Steel' },
    ],
  },
  {
    id: 'chair-basic', name: 'Chair (dining)', category: 'furniture',
    parameters: [
      { name: 'seatWidth',  type: 'number', default: 450, min: 400, max: 550 },
      { name: 'seatDepth',  type: 'number', default: 450, min: 400, max: 550 },
      { name: 'seatHeight', type: 'number', default: 450, min: 420, max: 480 },
      { name: 'backHeight', type: 'number', default: 850, min: 800, max: 1000 },
    ],
    primitives: [
      // Seat
      { kind: 'box', size: ['{{seatWidth}}', '{{seatDepth}}', 50], material: 'Wood', offset: [0, 0, '{{seatHeight}}'] },
      // Back
      { kind: 'box', size: ['{{seatWidth}}', 50, '{{backHeight}}'], material: 'Wood', offset: [0, '{{seatDepth}}', '{{seatHeight}}'] },
    ],
  },
];
