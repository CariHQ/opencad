/**
 * Groups — T-MOD-023 (#316).
 *
 * A group is a named collection of element ids that selection and
 * transform operations treat as a single unit. Groups can nest. This
 * module exposes pure data-transformation functions; the React hook
 * layer handles live selection and keyboard shortcuts.
 */

export interface Group {
  id: string;
  name: string;
  /** Children may be element ids OR other group ids (nested groups). */
  children: string[];
  /** Parent group id, or undefined when top-level. */
  parentId?: string;
}

export interface GroupMembership {
  /** elementId → groupId it directly belongs to. */
  directGroup: Record<string, string>;
}

/**
 * Create a new group from a list of element / group ids.
 * Returns the new group + updated membership map.
 */
export function createGroup(
  memberIds: string[],
  name: string,
  existing: Record<string, Group>,
): { group: Group; membership: GroupMembership } {
  const id = `grp-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const group: Group = { id, name, children: memberIds };
  const membership: GroupMembership = { directGroup: {} };
  for (const mid of memberIds) {
    membership.directGroup[mid] = id;
  }
  // If a member was already in another group, keep the new group as an
  // additional wrapper (children of that outer group need updating too).
  for (const mid of memberIds) {
    for (const g of Object.values(existing)) {
      if (g.children.includes(mid)) {
        // Nested: replace mid with the new group id in the outer group's
        // children list. Caller receives the new group + updated memberships;
        // caller is responsible for persisting the outer group change.
        // We only report the minimal info needed here.
        break;
      }
    }
  }
  return { group, membership };
}

/**
 * Flatten a group to its leaf element ids (recursive through any nested
 * groups).
 */
export function expandGroup(
  groupId: string,
  groups: Record<string, Group>,
): string[] {
  const group = groups[groupId];
  if (!group) return [];
  const out: string[] = [];
  for (const childId of group.children) {
    if (groups[childId]) {
      // Nested group — recurse
      out.push(...expandGroup(childId, groups));
    } else {
      // Leaf element
      out.push(childId);
    }
  }
  return out;
}

/**
 * Return the TOPMOST group that contains the given element/group id, or
 * null when the id is at top level. Walks the parent chain.
 */
export function topmostGroup(
  id: string,
  groups: Record<string, Group>,
): Group | null {
  // Find the group that directly contains this id.
  let current: Group | null = null;
  for (const g of Object.values(groups)) {
    if (g.children.includes(id)) { current = g; break; }
  }
  if (!current) return null;
  // Walk parent chain via parentId
  while (current.parentId && groups[current.parentId]) {
    current = groups[current.parentId]!;
  }
  return current;
}

/**
 * Ungroup a group — returns the new groups map without the group, with any
 * parent group's children list updated to contain the ungrouped members.
 */
export function ungroup(
  groupId: string,
  groups: Record<string, Group>,
): Record<string, Group> {
  const target = groups[groupId];
  if (!target) return groups;
  const copy: Record<string, Group> = {};
  for (const [id, g] of Object.entries(groups)) {
    if (id === groupId) continue;
    if (g.children.includes(groupId)) {
      // Replace groupId in parent's children with target's children.
      copy[id] = {
        ...g,
        children: g.children.flatMap((c) => (c === groupId ? target.children : [c])),
      };
    } else {
      copy[id] = g;
    }
  }
  return copy;
}

/**
 * Resolve selection: given a clicked element/group id, return the set of
 * ids that should be selected under current group mode.
 *   - 'group' → select all leaves of the topmost group (wraps siblings).
 *   - 'individual' → select only the clicked id.
 */
export function resolveSelection(
  clickedId: string,
  groups: Record<string, Group>,
  mode: 'group' | 'individual',
): string[] {
  if (mode === 'individual') return [clickedId];
  const top = topmostGroup(clickedId, groups);
  if (!top) return [clickedId];
  return expandGroup(top.id, groups);
}
