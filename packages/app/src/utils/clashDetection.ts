/**
 * T-MEP-001: Clash Detection
 *
 * Automatic clash detection between structural and MEP elements.
 * Uses axis-aligned bounding box (AABB) intersection for fast detection.
 */
import type { ElementSchema } from '@opencad/document';

export const enum ClashSeverity {
  Hard = 'hard',    // Physical intersection — must resolve
  Soft = 'soft',    // Clearance violation — review recommended
}

export interface BoundingBox {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

export interface ClashResult {
  id: string;
  elementAId: string;
  elementBId: string;
  severity: ClashSeverity;
  description: string;
  location: { x: number; y: number; z: number };
}

/** Compute the AABB for an element based on its geometry. Returns null if geometry is unavailable. */
export function getBoundingBox(element: ElementSchema): BoundingBox | null {
  const geoData = (element.geometry?.data ?? {}) as Record<string, unknown>;

  switch (element.type) {
    case 'wall': {
      const sp = geoData.startPoint as { x: number; y: number; z: number } | undefined;
      const ep = geoData.endPoint as { x: number; y: number; z: number } | undefined;
      const thickness = (geoData.thickness as number | undefined) ?? 200;
      const height = (geoData.height as number | undefined) ?? 3000;
      if (!sp || !ep) return null;

      const half = thickness / 2;
      const dx = ep.x - sp.x;
      const dy = ep.y - sp.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return null;

      // Perpendicular direction for wall thickness
      const nx = (-dy / len) * half;
      const ny = (dx / len) * half;

      const xs = [sp.x + nx, sp.x - nx, ep.x + nx, ep.x - nx];
      const ys = [sp.y + ny, sp.y - ny, ep.y + ny, ep.y - ny];

      return {
        minX: Math.min(...xs), maxX: Math.max(...xs),
        minY: Math.min(...ys), maxY: Math.max(...ys),
        minZ: Math.min(sp.z, ep.z), maxZ: Math.max(sp.z, ep.z) + height,
      };
    }

    case 'column': {
      const pos = geoData.position as { x: number; y: number; z: number } | undefined;
      const width = (geoData.width as number | undefined) ?? 400;
      const depth = (geoData.depth as number | undefined) ?? 400;
      const height = (geoData.height as number | undefined) ?? 3000;
      if (!pos) return null;
      return {
        minX: pos.x - width / 2, maxX: pos.x + width / 2,
        minY: pos.y - depth / 2, maxY: pos.y + depth / 2,
        minZ: pos.z, maxZ: pos.z + height,
      };
    }

    case 'beam': {
      const sp = geoData.startPoint as { x: number; y: number; z: number } | undefined;
      const ep = geoData.endPoint as { x: number; y: number; z: number } | undefined;
      const bWidth = (geoData.width as number | undefined) ?? 200;
      const bHeight = (geoData.height as number | undefined) ?? 400;
      if (!sp || !ep) return null;
      return {
        minX: Math.min(sp.x, ep.x) - bWidth / 2,
        maxX: Math.max(sp.x, ep.x) + bWidth / 2,
        minY: Math.min(sp.y, ep.y) - bWidth / 2,
        maxY: Math.max(sp.y, ep.y) + bWidth / 2,
        minZ: Math.min(sp.z, ep.z) - bHeight,
        maxZ: Math.max(sp.z, ep.z),
      };
    }

    case 'slab': {
      const pts = geoData.points as Array<{ x: number; y: number }> | undefined;
      const z = (geoData.elevation as number | undefined) ?? 0;
      const thickness = (geoData.thickness as number | undefined) ?? 250;
      if (!pts || pts.length === 0) return null;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      return {
        minX: Math.min(...xs), maxX: Math.max(...xs),
        minY: Math.min(...ys), maxY: Math.max(...ys),
        minZ: z, maxZ: z + thickness,
      };
    }

    default:
      return null;
  }
}

/** Returns true if two AABBs strictly intersect (not just touching). */
export function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.minX < b.maxX && a.maxX > b.minX &&
    a.minY < b.maxY && a.maxY > b.minY &&
    a.minZ < b.maxZ && a.maxZ > b.minZ
  );
}

/** The clearance threshold in mm for soft clash detection. */
const SOFT_CLASH_CLEARANCE = 50;

/**
 * Returns true if two AABBs are within the soft-clash clearance zone
 * (within 50mm of each other) but do NOT strictly intersect.
 */
export function boxesWithinClearance(a: BoundingBox, b: BoundingBox, clearance: number = SOFT_CLASH_CLEARANCE): boolean {
  if (boxesIntersect(a, b)) return false;

  const expanded: BoundingBox = {
    minX: a.minX - clearance,
    maxX: a.maxX + clearance,
    minY: a.minY - clearance,
    maxY: a.maxY + clearance,
    minZ: a.minZ - clearance,
    maxZ: a.maxZ + clearance,
  };

  return boxesIntersect(expanded, b);
}

let clashCounter = 0;

/** Detect all hard and soft clashes between elements using AABB intersection. */
export function detectClashes(elements: ElementSchema[]): ClashResult[] {
  const clashes: ClashResult[] = [];
  const boxes = elements.map((el) => ({ el, box: getBoundingBox(el) }));

  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    if (!a.box) continue;

    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      if (!b.box) continue;

      if (boxesIntersect(a.box, b.box)) {
        // Hard clash — physical intersection
        const cx = (Math.max(a.box.minX, b.box.minX) + Math.min(a.box.maxX, b.box.maxX)) / 2;
        const cy = (Math.max(a.box.minY, b.box.minY) + Math.min(a.box.maxY, b.box.maxY)) / 2;
        const cz = (Math.max(a.box.minZ, b.box.minZ) + Math.min(a.box.maxZ, b.box.maxZ)) / 2;

        clashes.push({
          id: `clash-${++clashCounter}`,
          elementAId: a.el.id,
          elementBId: b.el.id,
          severity: ClashSeverity.Hard,
          description: `Hard clash between ${a.el.type} "${a.el.id}" and ${b.el.type} "${b.el.id}"`,
          location: { x: cx, y: cy, z: cz },
        });
      } else if (boxesWithinClearance(a.box, b.box)) {
        // Soft clash — clearance violation (within 50mm)
        const cx = (a.box.minX + a.box.maxX + b.box.minX + b.box.maxX) / 4;
        const cy = (a.box.minY + a.box.maxY + b.box.minY + b.box.maxY) / 4;
        const cz = (a.box.minZ + a.box.maxZ + b.box.minZ + b.box.maxZ) / 4;

        clashes.push({
          id: `clash-${++clashCounter}`,
          elementAId: a.el.id,
          elementBId: b.el.id,
          severity: ClashSeverity.Soft,
          description: `Soft clash: ${a.el.type} "${a.el.id}" and ${b.el.type} "${b.el.id}" are within ${SOFT_CLASH_CLEARANCE}mm`,
          location: { x: cx, y: cy, z: cz },
        });
      }
    }
  }

  return clashes;
}
