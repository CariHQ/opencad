/**
 * T-EXT-01: In-memory registry of FamilyDefinition objects.
 *
 * Family *definitions* are code — registered at runtime by plugins.
 * Family *instances* (params + familyId) live in the document.
 * This module only handles the definition side.
 */
import type { ElementType } from '@opencad/document';
import type { ParamSchema, ParamValue, FamilyGeometry } from '@opencad/document';

export type { ParamSchema, ParamValue, FamilyGeometry };

export interface FamilyUIGroup {
  id: string;
  label: string;
  params: string[];
}

export interface FamilyDefinition {
  id: string;
  name: string;
  category: ElementType;
  version: string;
  parameters: ParamSchema[];
  /** Pure, deterministic function — same params → same geometry. */
  geometry: (params: Record<string, ParamValue>) => FamilyGeometry;
  ui?: {
    order?: string[];
    groups?: FamilyUIGroup[];
  };
  /** Returns a data: URL for a small preview thumbnail. Optional. */
  previewThumbnail?: (params: Record<string, ParamValue>) => string;
}

const registry = new Map<string, FamilyDefinition>();

/** Register a family definition. Idempotent — same id overwrites. */
export function registerFamily(def: FamilyDefinition): void {
  registry.set(def.id, def);
}

/** Resolve a registered family by id. Returns undefined if not found. */
export function resolveFamily(id: string): FamilyDefinition | undefined {
  return registry.get(id);
}

/** All currently registered families. */
export function listFamilies(): FamilyDefinition[] {
  return [...registry.values()];
}

/** Families filtered by element category. */
export function listFamiliesByCategory(category: ElementType): FamilyDefinition[] {
  return [...registry.values()].filter((f) => f.category === category);
}

/** Build a params record with all defaults filled in. */
export function defaultParams(def: FamilyDefinition): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const p of def.parameters) out[p.id] = p.default;
  return out;
}

/** Clamp/coerce params to be valid against the definition. Returns a fresh copy. */
export function normalizeParams(
  def: FamilyDefinition,
  raw: Record<string, ParamValue>,
): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const schema of def.parameters) {
    let v = raw[schema.id] ?? schema.default;
    if (schema.type === 'number' || schema.type === 'dimension') {
      const n = typeof v === 'number' ? v : Number(v);
      if (schema.min !== undefined) v = Math.max(schema.min, n);
      else v = n;
      if (schema.max !== undefined) v = Math.min(schema.max, v as number);
    } else if (schema.type === 'boolean') {
      v = Boolean(v);
    } else if (schema.type === 'enum' && schema.options) {
      const values = schema.options.map((o) => o.value);
      if (!values.includes(v as string)) v = schema.default;
    }
    out[schema.id] = v;
  }
  return out;
}

/** Run the geometry callback with a 250ms timeout guard.
 *  Returns null if the callback throws or times out. */
export function evalGeometry(
  def: FamilyDefinition,
  params: Record<string, ParamValue>,
): FamilyGeometry | null {
  try {
    const start = performance.now();
    const geom = def.geometry(params);
    const elapsed = performance.now() - start;
    if (elapsed > 250) {
      console.warn(`[family] ${def.id} geometry took ${elapsed.toFixed(0)}ms (budget: 250ms)`);
    }
    return geom;
  } catch (err) {
    console.error(`[family] ${def.id} geometry callback threw:`, err);
    return null;
  }
}

/** Derive a bounding box from geometry vertices (min/max scan). */
export function boundingBoxFromGeometry(geom: FamilyGeometry): {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
} {
  if (geom.boundingBox) return geom.boundingBox;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < geom.vertices.length; i += 3) {
    const x = geom.vertices[i], y = geom.vertices[i + 1], z = geom.vertices[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}
