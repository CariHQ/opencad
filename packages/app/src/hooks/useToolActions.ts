/**
 * Tool Actions
 * Mapping from active tool ID to default element creation properties
 * Issue #1: Wire up drawing tools in ToolShelf
 */

export interface ElementPosition {
  x: number;
  y: number;
}

export interface ElementCreationProps {
  type: string;
  layerId?: string;
  properties: Record<string, unknown>;
}

interface ToolDefaults {
  type: string;
  defaultProps: Record<string, unknown>;
}

const PLACEMENT_TOOLS: Record<string, ToolDefaults> = {
  wall: {
    type: 'wall',
    defaultProps: { width: 5, height: 3, thickness: 0.2, material: 'concrete' },
  },
  door: {
    type: 'door',
    defaultProps: { width: 0.9, height: 2.1, thickness: 0.05, swing: 'left' },
  },
  window: {
    type: 'window',
    defaultProps: { width: 1.2, height: 1.0, sillHeight: 0.9 },
  },
  slab: {
    type: 'slab',
    defaultProps: { width: 6, depth: 8, thickness: 0.25, elevation: 0 },
  },
  roof: {
    type: 'roof',
    defaultProps: { width: 8, depth: 10, pitch: 30, style: 'gabled' },
  },
  column: {
    type: 'column',
    defaultProps: { width: 0.3, depth: 0.3, height: 3 },
  },
  beam: {
    type: 'beam',
    defaultProps: { width: 0.2, height: 0.4, length: 5 },
  },
  stair: {
    type: 'stair',
    defaultProps: { width: 1.2, riserHeight: 0.18, treadDepth: 0.28, flights: 1 },
  },
};

/** Return the default element descriptor for a given tool id, or null for non-placement tools. */
export function getDefaultElementForTool(toolId: string): ToolDefaults | null {
  return PLACEMENT_TOOLS[toolId] ?? null;
}

/** Build the full `addElement` props for a given tool and placement position. */
export function buildElementProps(toolId: string, position: ElementPosition): ElementCreationProps {
  const defaults = PLACEMENT_TOOLS[toolId];
  return {
    type: defaults?.type ?? toolId,
    properties: {
      ...defaults?.defaultProps,
      x: position.x,
      y: position.y,
    },
  };
}

/** Keyboard shortcut → tool ID mapping */
export const TOOL_SHORTCUTS: Record<string, string> = {
  v: 'select',
  w: 'wall',
  d: 'door',
  n: 'window',
  s: 'slab',
  o: 'roof',
  k: 'column',
  b: 'beam',
  t: 'stair',
  l: 'line',
  r: 'rectangle',
  c: 'circle',
  a: 'arc',
  p: 'polygon',
};
