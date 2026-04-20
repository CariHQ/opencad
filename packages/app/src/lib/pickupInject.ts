/**
 * Pick up / inject parameters (eyedropper) — T-MOD-025 (#318).
 *
 * Alt+click on an element captures its relevant parameters into a "held
 * params" bucket; Alt+Shift+click injects them into a target element of
 * the same type. This module exposes the pure parameter-extraction +
 * merge logic; the hook layer binds keyboard handlers.
 */

import type { ElementSchema } from '@opencad/document';

/** Per-type allowlist of properties that travel with pickup. Cross-type
 *  inject is a no-op — pasting wall params into a slab doesn't make
 *  sense. */
const PICKUP_KEYS: Record<string, string[]> = {
  wall:   ['Width', 'Height', 'Material', 'WallType', 'CompositeId', 'ElevationOffset'],
  slab:   ['Thickness', 'Material', 'SlabType', 'ElevationOffset'],
  roof:   ['Thickness', 'Material', 'SlopeAngle', 'ElevationOffset'],
  column: ['Height', 'Diameter', 'Width', 'SectionType', 'Material'],
  beam:   ['Height', 'Width', 'Material'],
  door:   ['Width', 'Height', 'Material', 'FrameType', 'Swing'],
  window: ['Width', 'Height', 'SillHeight', 'Material', 'FrameType'],
  stair:  ['Width', 'Length', 'TotalRise', 'Material'],
};

export interface HeldParams {
  type: string;
  params: Record<string, unknown>;
}

/** Extract the relevant parameters from an element for pickup. */
export function pickup(el: ElementSchema): HeldParams | null {
  const keys = PICKUP_KEYS[el.type];
  if (!keys) return null;
  const params: Record<string, unknown> = {};
  const props = el.properties as Record<string, { value: unknown }>;
  for (const k of keys) {
    if (props[k]?.value !== undefined) params[k] = props[k]!.value;
  }
  return { type: el.type, params };
}

/**
 * Inject held params into a target element. Cross-type injects are a
 * no-op (returns `null`). Same-type: returns a patch of properties to
 * merge into the target element.
 */
export function inject(
  target: ElementSchema, held: HeldParams,
): Record<string, { type: string; value: unknown }> | null {
  if (held.type !== target.type) return null;
  const keys = PICKUP_KEYS[target.type] ?? [];
  const patch: Record<string, { type: string; value: unknown }> = {};
  for (const k of keys) {
    if (held.params[k] !== undefined) {
      const v = held.params[k];
      const type = typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string';
      patch[k] = { type, value: v };
    }
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * Human-readable summary of held params for the status bar.
 *   "Wall 300 mm Concrete exterior"
 */
export function describeHeld(held: HeldParams): string {
  const parts: string[] = [held.type[0]!.toUpperCase() + held.type.slice(1)];
  if (typeof held.params.Width === 'number')    parts.push(`${held.params.Width} mm`);
  if (typeof held.params.Thickness === 'number') parts.push(`${held.params.Thickness} mm`);
  if (typeof held.params.Material === 'string') parts.push(held.params.Material as string);
  if (typeof held.params.WallType === 'string') parts.push(held.params.WallType as string);
  return parts.join(' ');
}
