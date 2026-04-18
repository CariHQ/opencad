/**
 * Context menu smart positioning.
 *
 * The menu consists of two parts:
 *   1. A radial arc of primary action buttons orbiting the click point
 *   2. A secondary flat panel that extends from the arc in the "open" direction
 *
 * The open direction is chosen so that neither part overflows the viewport.
 * We use a quadrant system:
 *
 *   ┌──────────┬──────────┐
 *   │  TL      │  TR      │
 *   │ →right   │ →left    │
 *   │  ↓down   │  ↓down   │
 *   ├──────────┼──────────┤
 *   │  BL      │  BR      │
 *   │ →right   │ →left    │
 *   │  ↑up     │  ↑up     │
 *   └──────────┴──────────┘
 */

export type MenuQuadrant = 'TL' | 'TR' | 'BL' | 'BR';

export interface MenuPosition {
  /** Pixel coordinates of the radial arc centre (= click point, clamped to viewport) */
  cx: number;
  cy: number;
  /** Which quadrant the click point is in — drives arc orientation */
  quadrant: MenuQuadrant;
  /**
   * CSS transform-origin-style offset for the secondary panel,
   * expressed as { top?, bottom?, left?, right? } in pixels from the
   * panel's own corner, relative to the viewport.
   */
  panelAnchor: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

/** Radius of the radial arc in pixels */
export const RADIAL_RADIUS = 72;
/** Approximate height of the secondary panel (used for centering + overflow clamping) */
const PANEL_H = 180;
/** Approximate width of the secondary panel */
const PANEL_W = 200;
/** Clearance from viewport edge */
const EDGE_MARGIN = 12;
/** Gap between blue dot and the nearest edge of the secondary panel — matches radial icon visual spacing */
const PANEL_GAP = Math.round(RADIAL_RADIUS / 2);

export function computeMenuPosition(
  clickX: number,
  clickY: number,
  viewportW: number,
  viewportH: number,
): MenuPosition {
  // Clamp click point so the arc stays within the viewport
  const cx = Math.min(Math.max(clickX, RADIAL_RADIUS + EDGE_MARGIN), viewportW - RADIAL_RADIUS - EDGE_MARGIN);
  const cy = Math.min(Math.max(clickY, RADIAL_RADIUS + EDGE_MARGIN), viewportH - RADIAL_RADIUS - EDGE_MARGIN);

  const isRight  = cx > viewportW / 2;
  const isBottom = cy > viewportH / 2;

  const quadrant: MenuQuadrant =
    !isRight && !isBottom ? 'TL' :
     isRight && !isBottom ? 'TR' :
    !isRight &&  isBottom ? 'BL' : 'BR';

  // Secondary panel anchors.
  // Panel is always vertically centred on cy (blue dot): top = cy - PANEL_H/2, clamped.
  // Horizontal side is OPPOSITE to the radial fan:
  //   TL fan → RIGHT semicircle → panel goes LEFT  (right: CSS)
  //   TR fan → LEFT  semicircle → panel goes RIGHT (left:  CSS)
  //   BL fan → TOP   semicircle → panel goes RIGHT (left:  CSS)
  //   BR fan → TOP   semicircle → panel goes LEFT  (right: CSS)
  const panelTop = Math.min(Math.max(cy - PANEL_H / 2, EDGE_MARGIN), viewportH - PANEL_H - EDGE_MARGIN);

  // right: N → panel's right edge is N px from viewport right → panel sits LEFT of cx
  const rightCss = Math.min(viewportW - cx + PANEL_GAP, viewportW - PANEL_W - EDGE_MARGIN);
  // left: N → panel's left edge is N px from viewport left → panel sits RIGHT of cx
  const leftCss  = Math.min(cx + PANEL_GAP, viewportW - PANEL_W - EDGE_MARGIN);

  let panelAnchor: MenuPosition['panelAnchor'];
  if (quadrant === 'TL') {
    panelAnchor = { top: panelTop, right: rightCss };
  } else if (quadrant === 'TR') {
    panelAnchor = { top: panelTop, left: leftCss };
  } else if (quadrant === 'BL') {
    panelAnchor = { top: panelTop, left: leftCss };
  } else {
    panelAnchor = { top: panelTop, right: rightCss };
  }

  return { cx, cy, quadrant, panelAnchor };
}

/**
 * Maps a radial item index (0-based) to an SVG arc centre angle in radians,
 * given the number of items and the quadrant.
 *
 * The arc sweeps through ~180° in the "open" half of the quadrant so that
 * the buttons never overlap the click target.
 */
export function radialItemAngle(
  index: number,
  total: number,
  quadrant: MenuQuadrant,
): number {
  // Sweep range: a 180° arc starting from the base angle for the quadrant
  const _baseAngle: Record<MenuQuadrant, number> = {
    TL: Math.PI,        // left half  → opens right (0° to 180°, i.e. 3 o'clock to 9 o'clock going CW)
    TR: Math.PI,        // right half → opens left  (same arc, mirrored by negating cx offset)
    BL: -Math.PI / 2,   // bottom-left → opens up-right
    BR: -Math.PI / 2,   // bottom-right → opens up-left
  };

  // Arc for TL/TR: sweep from -90° to +90° (pointing right/left)
  // Arc for BL/BR: sweep from 180° to 360° / 0° (pointing up)
  const arcStart: Record<MenuQuadrant, number> = {
    TL: -Math.PI / 2,
    TR: -Math.PI / 2,
    BL: Math.PI,
    BR: Math.PI,
  };
  const arcSweep = Math.PI; // 180°

  const step = total > 1 ? arcSweep / (total - 1) : 0;
  const angle = arcStart[quadrant] + index * step;

  // Mirror horizontally for right-side quadrants
  if (quadrant === 'TR' || quadrant === 'BR') {
    return Math.PI - angle;
  }
  return angle;
}
