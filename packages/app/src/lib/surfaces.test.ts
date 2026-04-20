/**
 * T-MOD-028 surfaces tests (GitHub issue #321).
 *
 *   T-MOD-028-001 — surface schema has id/name/color/roughness/metalness
 *   T-MOD-028-002 — explicit exterior assignment wins over defaults
 *   T-MOD-028-003 — unassigned falls back to building-material default
 */
import { describe, it, expect } from 'vitest';
import { BUILT_IN_SURFACES, resolveSurface } from './surfaces';

describe('T-MOD-028: surfaces', () => {
  it('T-MOD-028-001: BUILT_IN_SURFACES entries carry PBR fields', () => {
    for (const s of BUILT_IN_SURFACES) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.color).toMatch(/^#[0-9a-f]{3,6}$/i);
      expect(s.roughness).toBeGreaterThanOrEqual(0);
      expect(s.roughness).toBeLessThanOrEqual(1);
      expect(s.metalness).toBeGreaterThanOrEqual(0);
      expect(s.metalness).toBeLessThanOrEqual(1);
    }
  });

  it('T-MOD-028-002: explicit exterior assignment wins over defaults', () => {
    const s = resolveSurface(
      'exterior',
      { exterior: 'wood-walnut' },
      'Concrete',
    );
    expect(s?.id).toBe('wood-walnut');
  });

  it('"both" applies when face-specific is absent', () => {
    const s = resolveSurface(
      'exterior',
      { both: 'stone-slate' },
      'Concrete',
    );
    expect(s?.id).toBe('stone-slate');
  });

  it('T-MOD-028-003: no assignment → falls back to building-material default', () => {
    expect(resolveSurface('exterior', undefined, 'Concrete')?.id).toBe('stone-limestone');
    expect(resolveSurface('interior', undefined, 'Clear Glass')?.id).toBe('glazing-clear');
  });

  it('unknown material + no assignment → null', () => {
    expect(resolveSurface('exterior', undefined, 'Unobtainium')).toBeNull();
  });

  it('unknown surface id in assignment falls through to default', () => {
    expect(resolveSurface('exterior', { exterior: 'does-not-exist' }, 'Concrete')?.id)
      .toBe('stone-limestone');
  });

  it('all glazings are low-roughness', () => {
    for (const s of BUILT_IN_SURFACES.filter((x) => x.category === 'glazing')) {
      expect(s.roughness).toBeLessThan(0.9);
    }
  });

  it('all metals have high metalness', () => {
    for (const s of BUILT_IN_SURFACES.filter((x) => x.category === 'metal')) {
      expect(s.metalness).toBeGreaterThan(0.5);
    }
  });
});
