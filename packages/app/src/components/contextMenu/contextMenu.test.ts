/**
 * T-ROLE-004: Context menu role gating tests
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect } from 'vitest';
import { expect as vitestExpect } from 'vitest';
vitestExpect.extend(jestDomMatchers);
import { getContextMenuItems } from './contextMenuDefs';
import { getCanForRole } from '../../hooks/useRole';

describe('T-ROLE-004: getContextMenuItems role gating', () => {
  it('owner context menu has zero radial items', () => {
    const can = getCanForRole('owner');
    const { radial } = getContextMenuItems('viewport', {}, can);
    expect(radial.length).toBe(0);
  });

  it('owner context menu has only Properties in list items', () => {
    const can = getCanForRole('owner');
    const { list } = getContextMenuItems('viewport', {}, can);
    expect(list.length).toBe(1);
    expect(list[0]!.label).toBe('Properties');
  });

  it('architect context menu has full radial items', () => {
    const can = getCanForRole('architect');
    const { radial } = getContextMenuItems('viewport', {}, can);
    expect(radial.length).toBeGreaterThan(0);
  });

  it('structural engineer sees section/annotation items', () => {
    const can = getCanForRole('structural');
    const { radial } = getContextMenuItems('viewport', {}, can);
    const labels = radial.map((i) => i.action);
    expect(labels.some((a) => a.includes('section') || a.includes('dimension'))).toBe(true);
  });

  it('structural engineer does not see wall/door items', () => {
    const can = getCanForRole('structural');
    const { radial } = getContextMenuItems('viewport', {}, can);
    const labels = radial.map((i) => i.action);
    expect(labels.some((a) => a.includes('wall'))).toBe(false);
    expect(labels.some((a) => a.includes('door'))).toBe(false);
  });

  it('without can predicate returns full menu for backward compat', () => {
    const { radial } = getContextMenuItems('viewport', {});
    expect(radial.length).toBeGreaterThan(0);
  });
});
