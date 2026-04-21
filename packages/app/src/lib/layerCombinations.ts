/**
 * Layer Combinations + Graphic Overrides — T-VIZ-014 (#307).
 *
 * A LayerCombination is a named snapshot of layer visibility + lock
 * flags. A GraphicOverride is a rule (filter + style) that paints a
 * different appearance on matching elements while active. Both are
 * document-level so they sync via CRDT.
 */

import type { ElementSchema } from '@opencad/document';

export interface LayerState {
  visible: boolean;
  locked: boolean;
}

export interface LayerCombination {
  id: string;
  name: string;
  /** layerId → per-layer state. */
  layers: Record<string, LayerState>;
}

export interface OverrideStyle {
  strokeColor?: string;   // hex
  fillColor?: string;
  strokeWidth?: number;   // mm in world
  opacity?: number;       // 0..1
  hatchId?: string;
}

export interface ElementFilter {
  types?: string[];
  materials?: string[];
  levelIds?: string[];
  /** Property-predicate list. */
  where?: Array<{ key: string; op: '=' | '!=' | '>' | '<'; value: string | number }>;
}

export interface GraphicOverride {
  id: string;
  name: string;
  /** Lower = earlier; ties broken by order in list. */
  priority: number;
  filter: ElementFilter;
  style: OverrideStyle;
  enabled: boolean;
}

function matches(el: ElementSchema, filter: ElementFilter): boolean {
  if (filter.types && filter.types.length > 0 && !filter.types.includes(el.type)) return false;
  const props = el.properties as Record<string, { value: unknown }>;
  if (filter.materials && filter.materials.length > 0) {
    const m = props.Material?.value;
    if (typeof m !== 'string' || !filter.materials.includes(m)) return false;
  }
  if (filter.levelIds && filter.levelIds.length > 0) {
    if (!filter.levelIds.includes(el.levelId ?? '')) return false;
  }
  if (filter.where) {
    for (const p of filter.where) {
      const v = props[p.key]?.value;
      if (p.op === '=' && v !== p.value) return false;
      if (p.op === '!=' && v === p.value) return false;
      if (p.op === '>' && !(typeof v === 'number' && v > (p.value as number))) return false;
      if (p.op === '<' && !(typeof v === 'number' && v < (p.value as number))) return false;
    }
  }
  return true;
}

/**
 * Resolve which style to paint an element with. Walks overrides in
 * priority order (lowest first). Later (higher-priority) overrides
 * merge their style over earlier ones.
 */
export function resolveStyle(
  el: ElementSchema, overrides: GraphicOverride[],
): OverrideStyle {
  const sorted = [...overrides]
    .filter((o) => o.enabled)
    .sort((a, b) => a.priority - b.priority);
  let style: OverrideStyle = {};
  for (const o of sorted) {
    if (matches(el, o.filter)) style = { ...style, ...o.style };
  }
  return style;
}

/** Apply a combination — returns the layer ids that pass the visibility gate. */
export function visibleLayerIds(combo: LayerCombination): string[] {
  return Object.entries(combo.layers)
    .filter(([, s]) => s.visible)
    .map(([id]) => id);
}

/** Default combinations seeded on every new project. */
export const DEFAULT_COMBINATIONS: LayerCombination[] = [
  { id: 'combo-all',        name: 'All On',             layers: {} },
  { id: 'combo-structural', name: 'Structural Only',    layers: {} },
  { id: 'combo-arch',       name: 'Architectural Only', layers: {} },
];
