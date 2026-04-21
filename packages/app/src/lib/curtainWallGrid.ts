/**
 * Curtain wall grid editor — T-MOD-012 (#305).
 *
 * A curtain wall is a grid of mullions + glass panels. Users position
 * horizontal mullions (fractions of wall height) + vertical mullions
 * (fractions of wall length). This module computes the panel rectangles
 * + the mullion line segments for rendering.
 */

export interface CurtainWallGrid {
  len: number;     // wall length, mm
  height: number;  // wall height, mm
  gridH: number[]; // horizontal mullion positions, fractions 0..1
  gridV: number[]; // vertical mullion positions, fractions 0..1
  mullionProfile?: { width: number; depth: number };  // default 50×120 mm
}

export interface Panel {
  x: number; y: number;      // bottom-left corner (mm) in wall-local 2D
  width: number; height: number;
  /** Optional per-panel material override (e.g. 'spandrel'). */
  override?: string;
}

export interface MullionSegment {
  axis: 'h' | 'v';
  /** Position along the perpendicular axis (mm). */
  position: number;
  /** Range along the mullion's own axis (mm). */
  start: number;
  end: number;
}

/**
 * Return the panel rectangles between the grid lines. Duplicates in
 * gridH/gridV are collapsed and values outside 0..1 are ignored.
 */
export function computeGridPanels(g: CurtainWallGrid): Panel[] {
  const xs = normaliseFractions([0, ...g.gridV, 1]).map((f) => f * g.len);
  const ys = normaliseFractions([0, ...g.gridH, 1]).map((f) => f * g.height);
  const panels: Panel[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      panels.push({
        x: xs[i]!, y: ys[j]!,
        width:  xs[i + 1]! - xs[i]!,
        height: ys[j + 1]! - ys[j]!,
      });
    }
  }
  return panels;
}

/**
 * Return every mullion segment (horizontal + vertical) between grid
 * fractions. Endpoints span the entire wall along that axis.
 */
export function computeMullions(g: CurtainWallGrid): MullionSegment[] {
  const gv = normaliseFractions(g.gridV).filter((f) => f > 0 && f < 1);
  const gh = normaliseFractions(g.gridH).filter((f) => f > 0 && f < 1);
  const mullions: MullionSegment[] = [];
  for (const fv of gv) {
    mullions.push({ axis: 'v', position: fv * g.len, start: 0, end: g.height });
  }
  for (const fh of gh) {
    mullions.push({ axis: 'h', position: fh * g.height, start: 0, end: g.len });
  }
  return mullions;
}

/** Normalise + dedupe + sort fractional positions. */
function normaliseFractions(xs: number[]): number[] {
  const clean = xs
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 1)
    .map((v) => Math.round(v * 1e6) / 1e6);        // round to 6 dp for dedup
  return Array.from(new Set(clean)).sort((a, b) => a - b);
}
