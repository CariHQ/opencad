/**
 * Parametric doors & windows — T-PAR-009 (#302).
 *
 * Doors and windows currently store flat {Width, Height, SillHeight}. Real
 * openings need richer structure: frame thickness, leaf count + panel
 * layout + handing for doors; pane grid + operation type + sill depth for
 * windows. This module provides the schema, defaults, validation, and a
 * migrator that upgrades legacy flat props in place.
 */

export type DoorPanelLayout = 'flush' | '2-panel' | '4-panel' | 'glass';
export type DoorHanding = 'L' | 'R';
export type WindowOperation = 'fixed' | 'casement' | 'awning' | 'double-hung' | 'sliding';

export interface DoorFrame {
  material: string;
  thickness: number; // mm
  profile?: string;  // optional profile id for complex profile T-MOD-020
}
export interface DoorLeaf {
  count: 1 | 2;
  material: string;
  panelLayout: DoorPanelLayout;
  handing: DoorHanding;
}
export interface DoorThreshold {
  material: string;
  depth: number; // mm
}
export interface DoorParametric {
  frame: DoorFrame;
  leaf: DoorLeaf;
  threshold?: DoorThreshold;
  /** Overall width + height of the rough opening (mm). */
  width: number;
  height: number;
}

export interface WindowFrame {
  material: string;
  thickness: number;
  profile?: string;
}
export interface WindowPanes {
  rows: number;
  cols: number;
}
export interface WindowSill {
  material: string;
  depth: number;
}
export interface WindowParametric {
  frame: WindowFrame;
  panes: WindowPanes;
  sill?: WindowSill;
  operation: WindowOperation;
  width: number;
  height: number;
  sillHeight: number;
}

/**
 * Validate a door spec. Returns reasons (empty when valid).
 */
export function validateDoor(d: Partial<DoorParametric>): string[] {
  const reasons: string[] = [];
  if (!d.frame || !d.leaf) reasons.push('Door must have frame and leaf.');
  if (d.leaf?.count !== undefined && d.leaf.count !== 1 && d.leaf.count !== 2) {
    reasons.push(`leaf.count ${d.leaf.count} out of scope — v1 supports 1 or 2.`);
  }
  if (d.width !== undefined && d.width <= 0) reasons.push('Door width must be > 0.');
  if (d.height !== undefined && d.height <= 0) reasons.push('Door height must be > 0.');
  return reasons;
}

export function validateWindow(w: Partial<WindowParametric>): string[] {
  const reasons: string[] = [];
  if (!w.frame) reasons.push('Window must have a frame.');
  if (w.panes && (w.panes.rows < 1 || w.panes.cols < 1)) {
    reasons.push('Window panes.rows and panes.cols must be ≥ 1.');
  }
  if (w.width !== undefined && w.width <= 0) reasons.push('Window width must be > 0.');
  if (w.height !== undefined && w.height <= 0) reasons.push('Window height must be > 0.');
  return reasons;
}

/** Migrate a legacy flat door property bag to the parametric schema. */
export function migrateLegacyDoor(
  props: Record<string, { type: string; value: unknown }>,
): DoorParametric {
  const num = (k: string, fb: number): number => {
    const v = props[k]?.value;
    return typeof v === 'number' ? v : fb;
  };
  const str = (k: string, fb: string): string => {
    const v = props[k]?.value;
    return typeof v === 'string' ? v : fb;
  };
  return {
    frame: { material: str('FrameMaterial', 'Wood'), thickness: num('FrameThickness', 45) },
    leaf: {
      count: 1,
      material: str('Material', 'Wood'),
      panelLayout: (str('PanelLayout', 'flush') as DoorPanelLayout),
      handing: (str('Handing', 'R') as DoorHanding),
    },
    width:  num('Width', 900),
    height: num('Height', 2100),
  };
}

export function migrateLegacyWindow(
  props: Record<string, { type: string; value: unknown }>,
): WindowParametric {
  const num = (k: string, fb: number): number => {
    const v = props[k]?.value;
    return typeof v === 'number' ? v : fb;
  };
  const str = (k: string, fb: string): string => {
    const v = props[k]?.value;
    return typeof v === 'string' ? v : fb;
  };
  return {
    frame: { material: str('FrameMaterial', 'Aluminium'), thickness: num('FrameThickness', 50) },
    panes: { rows: 1, cols: 1 },
    operation: (str('Operation', 'fixed') as WindowOperation),
    width: num('Width', 1200),
    height: num('Height', 1200),
    sillHeight: num('SillHeight', 900),
  };
}

/** Starter library of parametric door / window templates. */
export const DOOR_LIBRARY: Record<string, DoorParametric> = {
  'int-single-flush-900': {
    frame: { material: 'Wood', thickness: 45 },
    leaf:  { count: 1, material: 'Wood', panelLayout: 'flush', handing: 'R' },
    width: 900, height: 2100,
  },
  'ext-single-4panel-900': {
    frame: { material: 'Wood', thickness: 60 },
    leaf:  { count: 1, material: 'Wood', panelLayout: '4-panel', handing: 'R' },
    threshold: { material: 'Aluminium', depth: 150 },
    width: 900, height: 2100,
  },
  'ext-double-glass-1800': {
    frame: { material: 'Aluminium', thickness: 60 },
    leaf:  { count: 2, material: 'Aluminium', panelLayout: 'glass', handing: 'R' },
    threshold: { material: 'Aluminium', depth: 150 },
    width: 1800, height: 2100,
  },
};

export const WINDOW_LIBRARY: Record<string, WindowParametric> = {
  'casement-1200x1200-2x1': {
    frame: { material: 'Aluminium', thickness: 50 },
    panes: { rows: 2, cols: 1 },
    operation: 'casement',
    width: 1200, height: 1200, sillHeight: 900,
  },
  'fixed-2400x600': {
    frame: { material: 'Aluminium', thickness: 50 },
    panes: { rows: 1, cols: 3 },
    operation: 'fixed',
    width: 2400, height: 600, sillHeight: 1500,
  },
  'double-hung-1200x1800': {
    frame: { material: 'Wood', thickness: 50 },
    panes: { rows: 2, cols: 1 },
    operation: 'double-hung',
    width: 1200, height: 1800, sillHeight: 900,
  },
};
