/**
 * Context menu item definitions and role-gated factory function.
 *
 * getContextMenuItems(viewport, elementContext, can?) returns:
 *   { radial: ContextMenuItem[], list: ContextMenuItem[] }
 *
 * Items whose `action` maps to a tool the role can't use are filtered out.
 * The `owner` role gets zero radial items and only "Properties" in the list.
 */

export interface ContextMenuItem {
  /** Machine-readable action identifier, e.g. "tool:wall" or "properties" */
  action: string;
  /** Human-readable label */
  label: string;
}

export interface ContextMenuResult {
  radial: ContextMenuItem[];
  list: ContextMenuItem[];
}

type CanFn = (action: string) => boolean;

/** All possible radial items, keyed by their tool action. */
const ALL_RADIAL_ITEMS: ContextMenuItem[] = [
  { action: 'tool:wall',       label: 'Wall' },
  { action: 'tool:door',       label: 'Door' },
  { action: 'tool:window',     label: 'Window' },
  { action: 'tool:column',     label: 'Column' },
  { action: 'tool:beam',       label: 'Beam' },
  { action: 'tool:slab',       label: 'Slab' },
  { action: 'tool:dimension',  label: 'Dimension' },
  { action: 'tool:section',    label: 'Section' },
  { action: 'tool:annotation', label: 'Annotation' },
  { action: 'tool:text',       label: 'Text' },
];

/** List items that are always present for all roles. */
const PROPERTIES_ITEM: ContextMenuItem = { action: 'properties', label: 'Properties' };

/** Additional list items available for roles with edit access. */
const ALL_LIST_ITEMS: ContextMenuItem[] = [
  { action: 'tool:select',    label: 'Select' },
  { action: 'tool:line',      label: 'Draw Line' },
  { action: 'tool:rectangle', label: 'Draw Rectangle' },
];

/**
 * Returns context menu items filtered by the given `can` predicate.
 *
 * @param _viewport  Identifier for the viewport type (reserved for future context-sensitivity)
 * @param _elementContext  Selected element context (reserved for future context-sensitivity)
 * @param can  Optional role-capability predicate; if omitted, all items are returned
 */
export function getContextMenuItems(
  _viewport: string,
  _elementContext: Record<string, unknown>,
  can?: CanFn
): ContextMenuResult {
  // No predicate → full menu (backward compat)
  if (!can) {
    return {
      radial: ALL_RADIAL_ITEMS,
      list: [PROPERTIES_ITEM, ...ALL_LIST_ITEMS],
    };
  }

  const radial = ALL_RADIAL_ITEMS.filter((item) => can(item.action));

  // List always contains Properties; add edit items only if role can use select
  const list: ContextMenuItem[] = [PROPERTIES_ITEM];
  if (can('tool:select')) {
    list.push(...ALL_LIST_ITEMS.filter((item) => can(item.action)));
  }

  return { radial, list };
}
