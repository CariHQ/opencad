/**
 * T-MOD-012 curtain-wall grid tests (GitHub issue #305).
 *
 *   T-MOD-012-001 — 4800 wall, gridV 0.25/0.5/0.75 → 4 panels × 1200
 *   T-MOD-012-002 — adding gridH 0.5 → 8 panels
 *   T-MOD-012-003 — values outside 0..1 are ignored
 *   T-MOD-012-004 — duplicate fractions collapse
 */
import { describe, it, expect } from 'vitest';
import { computeGridPanels, computeMullions } from './curtainWallGrid';

describe('T-MOD-012: curtain wall grid', () => {
  it('T-MOD-012-001: 4800×3000 with gridV [0.25,0.5,0.75] → 4 panels of 1200×3000', () => {
    const panels = computeGridPanels({ len: 4800, height: 3000, gridV: [0.25, 0.5, 0.75], gridH: [] });
    expect(panels).toHaveLength(4);
    for (const p of panels) {
      expect(p.width).toBeCloseTo(1200, 1);
      expect(p.height).toBe(3000);
    }
  });

  it('T-MOD-012-002: adding gridH [0.5] → 8 panels', () => {
    const panels = computeGridPanels({ len: 4800, height: 3000, gridV: [0.25, 0.5, 0.75], gridH: [0.5] });
    expect(panels).toHaveLength(8);
  });

  it('T-MOD-012-003: values outside 0..1 are ignored', () => {
    const panels = computeGridPanels({ len: 1000, height: 1000, gridV: [-1, 1.5, 0.5, 2], gridH: [] });
    // After filter → just [0.5] → 2 panels
    expect(panels).toHaveLength(2);
  });

  it('T-MOD-012-004: duplicate fractions collapse to one', () => {
    const panels = computeGridPanels({ len: 1000, height: 1000, gridV: [0.5, 0.5, 0.5], gridH: [] });
    expect(panels).toHaveLength(2);
  });

  it('no grid lines → single panel spanning the wall', () => {
    const panels = computeGridPanels({ len: 1000, height: 1000, gridV: [], gridH: [] });
    expect(panels).toHaveLength(1);
    expect(panels[0]!.width).toBe(1000);
    expect(panels[0]!.height).toBe(1000);
  });

  it('computeMullions returns V + H segments', () => {
    const mullions = computeMullions({ len: 4800, height: 3000, gridV: [0.5], gridH: [0.5] });
    expect(mullions).toHaveLength(2);
    const v = mullions.find((m) => m.axis === 'v')!;
    expect(v.position).toBe(2400);
    const h = mullions.find((m) => m.axis === 'h')!;
    expect(h.position).toBe(1500);
  });

  it('computeMullions excludes 0 + 1 fractions (those are wall edges)', () => {
    expect(computeMullions({ len: 1000, height: 1000, gridV: [0, 0.5, 1], gridH: [] })).toHaveLength(1);
  });
});
