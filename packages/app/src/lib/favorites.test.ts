/**
 * T-MOD-026 favorites tests (GitHub issue #319).
 *
 *   T-MOD-026-001 — createFavorite returns stable-ish entry
 *   T-MOD-026-002 — applyFavorite returns {tool, params}
 *   T-MOD-026-003 — starter set has ≥ 4 wall favorites
 */
import { describe, it, expect } from 'vitest';
import {
  createFavorite, mergeFavorites, favoritesForTool, applyFavorite, seedStarterFavorites,
} from './favorites';

describe('T-MOD-026: favorites', () => {
  it('T-MOD-026-001: createFavorite carries tool / name / params', () => {
    const f = createFavorite('wall', 'Custom', { thickness: 200 });
    expect(f.tool).toBe('wall');
    expect(f.name).toBe('Custom');
    expect(f.params.thickness).toBe(200);
    expect(f.id).toMatch(/^fav-wall-/);
  });

  it('T-MOD-026-002: applyFavorite returns tool + params', () => {
    const f = createFavorite('door', 'X', { width: 900 });
    expect(applyFavorite(f)).toEqual({ tool: 'door', params: { width: 900 } });
  });

  it('T-MOD-026-003: starter set has 4 wall favorites', () => {
    const starters = seedStarterFavorites();
    expect(favoritesForTool(starters, 'wall')).toHaveLength(4);
  });

  it('mergeFavorites: project favorite overrides same-id user favorite', () => {
    const userFav = createFavorite('wall', 'From User', { thickness: 100 });
    userFav.id = 'shared-id';
    const projectFav = { ...createFavorite('wall', 'From Project', { thickness: 200 }), id: 'shared-id' };
    const merged = mergeFavorites([userFav], [projectFav]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.name).toBe('From Project');
  });

  it('mergeFavorites sorts alphabetically by name', () => {
    const a = createFavorite('wall', 'Alpha', {});
    const b = createFavorite('wall', 'Beta', {});
    const c = createFavorite('wall', 'Cappa', {});
    const merged = mergeFavorites([b, c, a], []);
    expect(merged.map((f) => f.name)).toEqual(['Alpha', 'Beta', 'Cappa']);
  });

  it('favoritesForTool filters by tool name', () => {
    const starters = seedStarterFavorites();
    expect(favoritesForTool(starters, 'door')).toHaveLength(2);
    expect(favoritesForTool(starters, 'window')).toHaveLength(2);
  });
});
