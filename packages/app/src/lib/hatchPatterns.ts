/**
 * Hatch patterns — T-MOD-030 (#323).
 *
 * A hatch is a named pattern of parallel or crossing lines that fills
 * a 2D polygon with its material marking (concrete stippling, steel
 * crosshatch, insulation zigzag, etc.). This module exposes the
 * pattern schema + a line-generator that clips pattern lines to a
 * polygon so the viewport can stroke them directly.
 */

export interface HatchLine {
  /** Angle in degrees, 0 = horizontal, 90 = vertical. */
  angle: number;
  /** Perpendicular offset between repeated lines (world mm). */
  spacing: number;
  /** Optional dash pattern in world mm, e.g. [10, 5] for dashed. */
  dash?: number[];
}

export interface Hatch {
  id: string;
  name: string;
  /** One or more line families combined to form the full pattern. */
  lines: HatchLine[];
  /** Uniform scale multiplier applied to spacing + dash. */
  scale: number;
  /** Whole-pattern rotation in degrees (added to each line angle). */
  rotation: number;
}

/** Starter set covering the most common drawing conventions. */
export const BUILT_IN_HATCHES: Hatch[] = [
  { id: 'hatch-concrete', name: 'Concrete', scale: 1, rotation: 0, lines: [
    { angle: 45, spacing: 100 }, { angle: 135, spacing: 100 },
  ]},
  { id: 'hatch-brick', name: 'Brick', scale: 1, rotation: 0, lines: [
    { angle: 0, spacing: 80 },
  ]},
  { id: 'hatch-insulation-rigid', name: 'Rigid Insulation', scale: 1, rotation: 0, lines: [
    { angle: 45, spacing: 40 },
  ]},
  { id: 'hatch-insulation-batt', name: 'Batt Insulation', scale: 1, rotation: 0, lines: [
    { angle: 45, spacing: 20, dash: [5, 5] },
    { angle: 135, spacing: 20, dash: [5, 5] },
  ]},
  { id: 'hatch-earth', name: 'Earth', scale: 1, rotation: 0, lines: [
    { angle: 45, spacing: 50, dash: [10, 10] },
    { angle: 0, spacing: 100 },
  ]},
  { id: 'hatch-steel', name: 'Steel', scale: 1, rotation: 0, lines: [
    { angle: 45, spacing: 30 }, { angle: 135, spacing: 30 },
  ]},
  { id: 'hatch-timber', name: 'Timber Grain', scale: 1, rotation: 0, lines: [
    { angle: 0, spacing: 15 },
  ]},
  { id: 'hatch-glass', name: 'Glass', scale: 1, rotation: 0, lines: [
    { angle: 0, spacing: 30, dash: [3, 3] },
  ]},
];

export interface LineSegment { a: { x: number; y: number }; b: { x: number; y: number } }

/**
 * Generate hatch lines that fall inside a polygon. Each hatch line
 * family produces a stripe of parallel lines covering the polygon's
 * bounding box; lines are then clipped to the polygon via segment
 * clipping. v1 uses a simple bbox tile without true polygon clipping —
 * callers can clip visually via canvas clipping region.
 */
export function generateHatchLines(
  hatch: Hatch,
  polygonBBox: { minX: number; minY: number; maxX: number; maxY: number },
): Array<LineSegment & { dash?: number[] }> {
  const out: Array<LineSegment & { dash?: number[] }> = [];
  const cx = (polygonBBox.minX + polygonBBox.maxX) / 2;
  const cy = (polygonBBox.minY + polygonBBox.maxY) / 2;
  const bw = polygonBBox.maxX - polygonBBox.minX;
  const bh = polygonBBox.maxY - polygonBBox.minY;
  const half = Math.hypot(bw, bh) / 2 + 20; // a bit of margin

  for (const line of hatch.lines) {
    const spacing = line.spacing * hatch.scale;
    if (spacing < 0.01) continue;
    const rad = ((line.angle + hatch.rotation) * Math.PI) / 180;
    // Line direction
    const dx = Math.cos(rad), dy = Math.sin(rad);
    // Perpendicular
    const nx = -dy, ny = dx;
    // Number of lines to cover the bbox diagonal
    const n = Math.ceil((half * 2) / spacing) + 2;
    for (let i = -Math.floor(n / 2); i <= Math.ceil(n / 2); i++) {
      const ox = cx + nx * spacing * i;
      const oy = cy + ny * spacing * i;
      const a = { x: ox - dx * half, y: oy - dy * half };
      const b = { x: ox + dx * half, y: oy + dy * half };
      out.push(line.dash ? { a, b, dash: line.dash.map((v) => v * hatch.scale) } : { a, b });
    }
  }
  return out;
}
