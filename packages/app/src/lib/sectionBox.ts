/**
 * T-VP-002: Section Box
 *
 * Defines a 3D axis-aligned bounding box used to clip the Three.js scene.
 * When enabled, only geometry inside the box is rendered.
 */

export interface SectionBox {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  enabled: boolean;
}

export const DEFAULT_SECTION_BOX: SectionBox = {
  minX: -50,
  minY: -50,
  minZ: 0,
  maxX: 50,
  maxY: 50,
  maxZ: 30,
  enabled: false,
};

/**
 * Returns true if the point (x, y, z) is inside the section box.
 *
 * Rules:
 * - If the box is disabled, always returns true (everything is visible).
 * - If the box is degenerate (min > max on any axis), treat as disabled.
 */
export function sectionBoxContains(
  box: SectionBox,
  x: number,
  y: number,
  z: number,
): boolean {
  if (!box.enabled) return true;

  // Degenerate box (inverted bounds) — treat as disabled
  if (box.minX > box.maxX || box.minY > box.maxY || box.minZ > box.maxZ) {
    return true;
  }

  return (
    x >= box.minX && x <= box.maxX &&
    y >= box.minY && y <= box.maxY &&
    z >= box.minZ && z <= box.maxZ
  );
}

/**
 * Computes a SectionBox that bounds all provided elements with 10% padding on each side.
 * Returns DEFAULT_SECTION_BOX when the array is empty.
 */
export function sectionBoxFromElements(
  elements: Array<{ x?: number; y?: number; z?: number }>,
): SectionBox {
  if (elements.length === 0) {
    return { ...DEFAULT_SECTION_BOX };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const el of elements) {
    const x = el.x ?? 0;
    const y = el.y ?? 0;
    const z = el.z ?? 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const padX = (maxX - minX) * 0.1;
  const padY = (maxY - minY) * 0.1;
  const padZ = (maxZ - minZ) * 0.1;

  return {
    minX: minX - padX,
    minY: minY - padY,
    minZ: minZ - padZ,
    maxX: maxX + padX,
    maxY: maxY + padY,
    maxZ: maxZ + padZ,
    enabled: true,
  };
}
