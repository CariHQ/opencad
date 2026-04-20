/**
 * 3D display filter / partial structure — T-VIZ-038 (#331).
 *
 * Solo / hide toolbar + type / material / property filters layered on
 * top of any existing visibility. Transient (view-state, not document
 * state) but serializable as a preset the user can save.
 */

import type { ElementSchema } from '@opencad/document';

export interface DisplayFilter {
  /** Only elements whose type is in this set pass. Empty → no filter. */
  types?: string[];
  /** Only elements whose Material prop is in this set pass. */
  materials?: string[];
  /** Property predicates (same shape as clashRules ElementFilter.where). */
  where?: Array<{ key: string; op: '=' | '!='; value: string | number | boolean }>;
  /** Explicit element ids to SHOW regardless of other filters (Solo). */
  soloIds?: string[];
  /** Explicit element ids to HIDE regardless of other filters. */
  hideIds?: string[];
}

export interface FilterPreset {
  id: string;
  name: string;
  filter: DisplayFilter;
}

function prop(el: ElementSchema, key: string): unknown {
  return (el.properties as Record<string, { value: unknown }>)[key]?.value;
}

/** Apply a filter to one element → is it visible? */
export function isVisible(el: ElementSchema, filter: DisplayFilter): boolean {
  // Solo takes absolute precedence: only listed ids show.
  if (filter.soloIds && filter.soloIds.length > 0) {
    return filter.soloIds.includes(el.id);
  }
  if (filter.hideIds?.includes(el.id)) return false;
  if (filter.types && filter.types.length > 0 && !filter.types.includes(el.type)) return false;
  if (filter.materials && filter.materials.length > 0) {
    const m = prop(el, 'Material');
    if (typeof m !== 'string' || !filter.materials.includes(m)) return false;
  }
  if (filter.where) {
    for (const pred of filter.where) {
      const v = prop(el, pred.key);
      if (pred.op === '=' && v !== pred.value) return false;
      if (pred.op === '!=' && v === pred.value) return false;
    }
  }
  return true;
}

/** Filter a list of elements. */
export function applyFilter(elements: ElementSchema[], filter: DisplayFilter): ElementSchema[] {
  return elements.filter((el) => isVisible(el, filter));
}

/** Built-in presets. */
export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'all', name: 'All', filter: {} },
  { id: 'structural', name: 'Structural Only', filter: {
    types: ['wall', 'column', 'beam', 'slab', 'roof', 'stair'],
  }},
  { id: 'envelope', name: 'Envelope', filter: {
    types: ['wall', 'slab', 'roof', 'door', 'window', 'curtain_wall'],
  }},
  { id: 'mep', name: 'MEP Only', filter: {
    types: ['duct', 'pipe', 'conduit', 'cable_tray', 'hvac', 'plumbing'],
  }},
];
