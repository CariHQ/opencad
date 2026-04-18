/**
 * T-MEP-001: Clash Detection (lib/)
 *
 * Detects axis-aligned bounding-box overlaps between structural and MEP elements.
 */
import type { ElementSchema } from '@opencad/document';

export interface Clash {
  elementAId: string;
  elementBId: string;
  severity: 'hard' | 'soft';
  overlapVolume: number; // m³, 0 for touching/soft clashes
}

export interface BBox {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

function getNumericProp(el: ElementSchema, key: string): number | undefined {
  const prop = el.properties[key];
  if (prop && prop.type === 'number' && typeof prop.value === 'number') {
    return prop.value;
  }
  return undefined;
}

/**
 * Builds an AABB from el.x, el.y, el.z (position) and el.width/height/depth.
 * Falls back to 1m (1.0) on any missing dimension.
 * The element position (x, y, z) represents the minimum corner of the box.
 */
export function elementBBox(el: ElementSchema): BBox {
  const x = getNumericProp(el, 'x') ?? 0;
  const y = getNumericProp(el, 'y') ?? 0;
  const z = getNumericProp(el, 'z') ?? 0;
  const width = getNumericProp(el, 'width') ?? 1;
  const height = getNumericProp(el, 'height') ?? 1;
  const depth = getNumericProp(el, 'depth') ?? 1;

  // Use 1m default for zero/missing dimensions
  const w = width > 0 ? width : 1;
  const h = height > 0 ? height : 1;
  const d = depth > 0 ? depth : 1;

  return {
    minX: x,
    maxX: x + w,
    minY: y,
    maxY: y + h,
    minZ: z,
    maxZ: z + d,
  };
}

function boxesOverlap(a: BBox, b: BBox): boolean {
  return (
    a.minX < b.maxX && a.maxX > b.minX &&
    a.minY < b.maxY && a.maxY > b.minY &&
    a.minZ < b.maxZ && a.maxZ > b.minZ
  );
}

function overlapVolume(a: BBox, b: BBox): number {
  const dx = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const dy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  const dz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
  if (dx <= 0 || dy <= 0 || dz <= 0) return 0;
  return dx * dy * dz;
}

function boxesTouching(a: BBox, b: BBox, tolerance: number): boolean {
  if (boxesOverlap(a, b)) return false;

  // Expand A by tolerance in all directions
  const expanded: BBox = {
    minX: a.minX - tolerance,
    maxX: a.maxX + tolerance,
    minY: a.minY - tolerance,
    maxY: a.maxY + tolerance,
    minZ: a.minZ - tolerance,
    maxZ: a.maxZ + tolerance,
  };

  return boxesOverlap(expanded, b);
}

/**
 * Detects clashes between structural and MEP element sets.
 *
 * @param structural Structural elements (walls, columns, beams, slabs, etc.)
 * @param mep MEP elements (ducts, pipes, conduits, cable trays, etc.)
 * @param tolerance Soft-clash gap tolerance in metres (default 0.05 m)
 */
export function detectClashes(
  structural: ElementSchema[],
  mep: ElementSchema[],
  tolerance: number = 0.05,
): Clash[] {
  const clashes: Clash[] = [];

  for (const s of structural) {
    const boxS = elementBBox(s);

    for (const m of mep) {
      const boxM = elementBBox(m);

      if (boxesOverlap(boxS, boxM)) {
        clashes.push({
          elementAId: s.id,
          elementBId: m.id,
          severity: 'hard',
          overlapVolume: overlapVolume(boxS, boxM),
        });
      } else if (boxesTouching(boxS, boxM, tolerance)) {
        clashes.push({
          elementAId: s.id,
          elementBId: m.id,
          severity: 'soft',
          overlapVolume: 0,
        });
      }
    }
  }

  return clashes;
}
