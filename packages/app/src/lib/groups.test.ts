/**
 * T-MOD-023 groups tests (GitHub issue #316).
 *
 *   T-MOD-023-001 — createGroup records members + returns new group
 *   T-MOD-023-002 — ungroup restores members at top level
 *   T-MOD-023-003 — nested group: expandGroup flattens recursively
 *   T-MOD-023-004 — resolveSelection 'group' mode returns all members
 *   T-MOD-023-005 — resolveSelection 'individual' mode returns only click
 */
import { describe, it, expect } from 'vitest';
import {
  createGroup, ungroup, expandGroup, topmostGroup, resolveSelection,
  type Group,
} from './groups';

describe('T-MOD-023: groups', () => {
  it('T-MOD-023-001: createGroup returns group + membership', () => {
    const { group, membership } = createGroup(['a', 'b', 'c'], 'Kitchen', {});
    expect(group.name).toBe('Kitchen');
    expect(group.children).toEqual(['a', 'b', 'c']);
    expect(Object.keys(membership.directGroup)).toEqual(['a', 'b', 'c']);
    expect(membership.directGroup.a).toBe(group.id);
  });

  it('T-MOD-023-002: ungroup removes the group + preserves members', () => {
    const g: Group = { id: 'g1', name: 'X', children: ['a', 'b'] };
    const result = ungroup('g1', { g1: g });
    expect(result.g1).toBeUndefined();
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('T-MOD-023-002b: ungroup promotes children in parent group', () => {
    const inner: Group = { id: 'inner', name: 'i', children: ['a', 'b'], parentId: 'outer' };
    const outer: Group = { id: 'outer', name: 'o', children: ['inner', 'c'] };
    const result = ungroup('inner', { inner, outer });
    expect(result.inner).toBeUndefined();
    expect(result.outer!.children).toEqual(['a', 'b', 'c']);
  });

  it('T-MOD-023-003: expandGroup flattens nested groups', () => {
    const inner: Group = { id: 'i', name: 'i', children: ['a', 'b'] };
    const outer: Group = { id: 'o', name: 'o', children: ['i', 'c'] };
    expect(expandGroup('o', { i: inner, o: outer })).toEqual(['a', 'b', 'c']);
  });

  it('T-MOD-023-004: resolveSelection "group" mode selects all siblings', () => {
    const g: Group = { id: 'g', name: 'k', children: ['a', 'b', 'c'] };
    expect(resolveSelection('a', { g }, 'group')).toEqual(['a', 'b', 'c']);
  });

  it('T-MOD-023-005: resolveSelection "individual" mode selects only the click', () => {
    const g: Group = { id: 'g', name: 'k', children: ['a', 'b', 'c'] };
    expect(resolveSelection('a', { g }, 'individual')).toEqual(['a']);
  });

  it('topmostGroup walks parent chain', () => {
    const inner: Group = { id: 'i', name: 'i', children: ['a'], parentId: 'o' };
    const outer: Group = { id: 'o', name: 'o', children: ['i'] };
    expect(topmostGroup('a', { i: inner, o: outer })?.id).toBe('o');
  });

  it('elements with no group resolve to themselves', () => {
    expect(resolveSelection('loose', {}, 'group')).toEqual(['loose']);
  });
});
