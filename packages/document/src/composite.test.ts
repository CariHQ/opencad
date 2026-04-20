/**
 * T-MOD-004 composite tests (GitHub issue #297).
 *
 * Cases:
 *   T-MOD-004-001 — compositeThickness sums layer thicknesses
 *   T-MOD-004-002 — validator rejects zero layers
 *   T-MOD-004-003 — validator rejects non-positive thickness
 *   T-MOD-004-004 — migrateLegacyWallToComposite on {Width, Material}
 *                   produces a one-layer composite with CompositeId reference
 *   T-MOD-004-005 — migration id is deterministic across identical inputs
 */
import { describe, it, expect } from 'vitest';
import {
  compositeThickness,
  validateComposite,
  migrateLegacyWallToComposite,
  BUILT_IN_COMPOSITES,
} from './composite';

describe('T-MOD-004: composite', () => {
  it('T-MOD-004-001: compositeThickness sums layer thicknesses', () => {
    expect(compositeThickness({ layers: [{ material: 'x', thickness: 100 }, { material: 'y', thickness: 50 }] })).toBe(150);
  });

  it('T-MOD-004-002: validator rejects zero layers', () => {
    const reasons = validateComposite({ name: 'Empty', layers: [] });
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.join('\n')).toMatch(/at least one layer/i);
  });

  it('T-MOD-004-003: validator rejects non-positive layer thickness', () => {
    const reasons = validateComposite({
      name: 'Bad',
      layers: [{ material: 'x', thickness: 0 }, { material: 'y', thickness: -5 }],
    });
    expect(reasons.filter((r) => r.includes('thickness')).length).toBe(2);
  });

  it('T-MOD-004-003b: validator rejects multiple core layers', () => {
    const reasons = validateComposite({
      name: 'TwoCores',
      layers: [
        { material: 'a', thickness: 10, core: true },
        { material: 'b', thickness: 10, core: true },
      ],
    });
    expect(reasons.filter((r) => /core/i.test(r)).length).toBe(1);
  });

  it('T-MOD-004-004: migrateLegacyWallToComposite produces a single-layer composite', () => {
    const result = migrateLegacyWallToComposite({
      Width:    { type: 'number', value: 300 },
      Material: { type: 'string', value: 'Concrete' },
    });
    expect(result).not.toBeNull();
    expect(result!.composite.layers).toHaveLength(1);
    expect(result!.composite.layers[0]!.thickness).toBe(300);
    expect(result!.composite.layers[0]!.material).toBe('Concrete');
    expect(result!.compositeId).toBe(result!.composite.id);
  });

  it('T-MOD-004-005: migration id is deterministic across identical inputs', () => {
    const a = migrateLegacyWallToComposite({
      Width:    { type: 'number', value: 150 },
      Material: { type: 'string', value: 'Plasterboard' },
    });
    const b = migrateLegacyWallToComposite({
      Width:    { type: 'number', value: 150 },
      Material: { type: 'string', value: 'Plasterboard' },
    });
    expect(a!.compositeId).toBe(b!.compositeId);
  });

  it('migrateLegacyWallToComposite is a no-op when CompositeId already set', () => {
    const result = migrateLegacyWallToComposite({
      Width:       { type: 'number', value: 300 },
      Material:    { type: 'string', value: 'Concrete' },
      CompositeId: { type: 'string', value: 'already-set' },
    });
    expect(result).toBeNull();
  });

  it('built-in composites are all valid', () => {
    for (const [id, c] of Object.entries(BUILT_IN_COMPOSITES)) {
      expect(validateComposite(c)).toEqual([]);
      // All built-ins have matching ids
      expect(c.id).toBe(id);
    }
  });

  it('built-in exterior composite totals 300 mm', () => {
    const ext = BUILT_IN_COMPOSITES['ext-300-brick-cavity-blockwork-plaster']!;
    expect(compositeThickness(ext)).toBe(300);
  });

  it('built-in interior composite totals 150 mm', () => {
    const int = BUILT_IN_COMPOSITES['int-150-plasterboard-stud-plasterboard']!;
    expect(compositeThickness(int)).toBe(150);
  });
});
