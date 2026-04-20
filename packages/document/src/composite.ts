/**
 * Composite structures (T-MOD-004 / GitHub #297).
 *
 * A composite is an ordered stack of layers: brick leaf / cavity /
 * insulation / blockwork / plaster for an exterior wall, or plasterboard
 * / stud / plasterboard for an interior partition. Walls/slabs/roofs
 * reference a composite by id instead of carrying a single flat material.
 */

import type { Composite } from './types';

/** Sum the layer thicknesses — used as the wall's Width at render time. */
export function compositeThickness(composite: Pick<Composite, 'layers'>): number {
  let total = 0;
  for (const layer of composite.layers) total += layer.thickness;
  return total;
}

/**
 * Validate a composite. Returns the array of reasons it fails validation,
 * empty array when it's valid. Used by schema load + ui edit commit.
 */
export function validateComposite(
  composite: Pick<Composite, 'layers' | 'name'>
): string[] {
  const reasons: string[] = [];
  if (!composite.layers || composite.layers.length === 0) {
    reasons.push('Composite must have at least one layer.');
  }
  for (let i = 0; i < (composite.layers ?? []).length; i++) {
    const l = composite.layers[i]!;
    if (!(l.thickness > 0)) {
      reasons.push(`Layer ${i} ("${l.material}") must have thickness > 0.`);
    }
  }
  const cores = (composite.layers ?? []).filter((l) => l.core === true).length;
  if (cores > 1) {
    reasons.push(`Composite has ${cores} core layers — at most one layer may be marked core.`);
  }
  return reasons;
}

/**
 * Built-in composites seeded on every new project. Covers the four
 * wall types the existing wall tool offers plus sensible defaults for
 * slabs and roofs.
 */
export const BUILT_IN_COMPOSITES: Record<string, Composite> = {
  'ext-300-brick-cavity-blockwork-plaster': {
    id: 'ext-300-brick-cavity-blockwork-plaster',
    name: 'Exterior — brick / cavity / blockwork / plaster (300 mm)',
    category: 'wall',
    layers: [
      { material: 'Brick',        thickness: 102.5, finish: 'exterior' },
      { material: 'Air Cavity',   thickness: 50 },
      { material: 'Mineral Wool', thickness: 100 },
      { material: 'Concrete',     thickness: 35, core: true },
      { material: 'Plasterboard', thickness: 12.5, finish: 'interior' },
    ],
  },
  'int-150-plasterboard-stud-plasterboard': {
    id: 'int-150-plasterboard-stud-plasterboard',
    name: 'Interior partition — plasterboard / stud / plasterboard (150 mm)',
    category: 'wall',
    layers: [
      { material: 'Plasterboard', thickness: 15,  finish: 'exterior' },
      { material: 'Air Cavity',   thickness: 120, core: true },
      { material: 'Plasterboard', thickness: 15,  finish: 'interior' },
    ],
  },
  'part-100-lightweight-partition': {
    id: 'part-100-lightweight-partition',
    name: 'Lightweight partition (100 mm)',
    category: 'wall',
    layers: [
      { material: 'Plasterboard', thickness: 12.5, finish: 'exterior' },
      { material: 'Air Cavity',   thickness: 75,   core: true },
      { material: 'Plasterboard', thickness: 12.5, finish: 'interior' },
    ],
  },
  'curt-60-glazing': {
    id: 'curt-60-glazing',
    name: 'Curtain wall — glazing (60 mm)',
    category: 'wall',
    layers: [
      { material: 'Clear Glass', thickness: 60, core: true, finish: 'both' },
    ],
  },
  'slab-200-concrete': {
    id: 'slab-200-concrete',
    name: 'Slab — concrete (200 mm)',
    category: 'slab',
    layers: [
      { material: 'Concrete', thickness: 200, core: true },
    ],
  },
  'roof-250-clay-tile-deck': {
    id: 'roof-250-clay-tile-deck',
    name: 'Roof — clay tile / deck / insulation (250 mm)',
    category: 'roof',
    layers: [
      { material: 'Clay Roof Tiles', thickness: 40,  finish: 'exterior' },
      { material: 'Timber',          thickness: 25 },
      { material: 'Mineral Wool',    thickness: 175, core: true },
      { material: 'Plasterboard',    thickness: 10,  finish: 'interior' },
    ],
  },
};

/**
 * Migration — turn a legacy wall element's flat {Width, Material} into an
 * inline single-layer composite plus a CompositeId reference. Idempotent:
 * if the element already has a CompositeId, returns null (no change).
 */
export function migrateLegacyWallToComposite(
  props: Record<string, { value: unknown; type: string; unit?: string }>
): { composite: Composite; compositeId: string } | null {
  if (typeof (props['CompositeId']?.value) === 'string' && props['CompositeId']?.value !== '') return null;

  const widthRaw = props['Width']?.value;
  const matRaw   = props['Material']?.value;
  const thickness = typeof widthRaw === 'number' ? widthRaw : 200;
  const material  = typeof matRaw === 'string' ? matRaw : 'Concrete';

  const id = `legacy-${Math.round(thickness)}-${material.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const composite: Composite = {
    id,
    name: `Legacy ${material} ${Math.round(thickness)} mm`,
    category: 'wall',
    layers: [{ material, thickness, core: true, finish: 'both' }],
  };
  return { composite, compositeId: id };
}
