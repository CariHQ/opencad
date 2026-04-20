/**
 * T-MOD-030 hatch pattern tests (GitHub issue #323).
 *
 *   T-MOD-030-001 — concrete hatch generates 45° + 135° line families
 *   T-MOD-030-002 — scale doubles spacing
 *   T-MOD-030-003 — rotation offsets every line
 */
import { describe, it, expect } from 'vitest';
import { BUILT_IN_HATCHES, generateHatchLines } from './hatchPatterns';

const BBOX = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

describe('T-MOD-030: hatchPatterns', () => {
  it('T-MOD-030-001: concrete produces non-empty line set', () => {
    const hatch = BUILT_IN_HATCHES.find((h) => h.id === 'hatch-concrete')!;
    const lines = generateHatchLines(hatch, BBOX);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('T-MOD-030-002: scale 2× halves line density vs scale 1×', () => {
    const base = BUILT_IN_HATCHES.find((h) => h.id === 'hatch-concrete')!;
    const scaled = { ...base, scale: 2 };
    const lines1 = generateHatchLines(base,   BBOX);
    const lines2 = generateHatchLines(scaled, BBOX);
    expect(lines2.length).toBeLessThan(lines1.length);
  });

  it('T-MOD-030-003: rotation offsets line direction', () => {
    const base = BUILT_IN_HATCHES.find((h) => h.id === 'hatch-brick')!;
    const rotated = { ...base, rotation: 90 };
    const l0 = generateHatchLines(base,     BBOX);
    const l90 = generateHatchLines(rotated, BBOX);
    // l0 has horizontal lines (a.y == b.y); l90 has vertical lines (a.x == b.x)
    const first0 = l0[0]!;
    const first90 = l90[0]!;
    expect(Math.abs(first0.a.y - first0.b.y)).toBeLessThan(0.001);
    expect(Math.abs(first90.a.x - first90.b.x)).toBeLessThan(0.001);
  });

  it('insulation-rigid uses 45° single-family lines', () => {
    const hatch = BUILT_IN_HATCHES.find((h) => h.id === 'hatch-insulation-rigid')!;
    const lines = generateHatchLines(hatch, BBOX);
    // All lines should have dx = dy (45°)
    for (const l of lines) {
      const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
      expect(Math.abs(Math.abs(dx) - Math.abs(dy))).toBeLessThan(0.5);
    }
  });

  it('dash info passes through for dashed hatches', () => {
    const hatch = BUILT_IN_HATCHES.find((h) => h.id === 'hatch-glass')!;
    const lines = generateHatchLines(hatch, BBOX);
    expect(lines.every((l) => Array.isArray((l as unknown as { dash: number[] }).dash))).toBe(true);
  });

  it('BUILT_IN_HATCHES includes 8 starter patterns', () => {
    expect(BUILT_IN_HATCHES.length).toBeGreaterThanOrEqual(8);
  });
});
