/**
 * T-MOD-003 parseLength tests (GitHub issue #296).
 *
 * parseLength is exported from @opencad/shared and used by the coord box
 * overlay (and later the properties panel) so a user can type "4.5m",
 * "15'-3"", "900mm", or a bare number and always get millimetres out.
 * Test lives in the app package because shared has no vitest runner
 * configured — the function is pure, so where the test lives doesn't
 * matter for correctness.
 *
 * Cases:
 *   T-MOD-003-001 — bare integer is mm
 *   T-MOD-003-002 — metres with unit suffix
 *   T-MOD-003-003 — feet-only notation
 *   T-MOD-003-004 — feet-and-inches
 *   T-MOD-003-005 — invalid → null
 */
import { describe, it, expect } from 'vitest';
import { parseLength } from '@opencad/shared';

describe('T-MOD-003: parseLength', () => {
  it('T-MOD-003-001: parseLength("4500") = 4500', () => {
    expect(parseLength('4500')).toBe(4500);
  });

  it('T-MOD-003-002: parseLength("4.5m") = 4500', () => {
    expect(parseLength('4.5m')).toBe(4500);
    expect(parseLength('4.5 m')).toBe(4500);
  });

  it('T-MOD-003-003: parseLength("15\'") ≈ 4572 (15 ft)', () => {
    expect(parseLength("15'")).toBeCloseTo(4572, 1);
  });

  it('T-MOD-003-004: parseLength("15\'-3\"") ≈ 4648.2 (15 ft 3 in)', () => {
    expect(parseLength('15\'-3"')).toBeCloseTo(4648.2, 1);
    expect(parseLength('15\'3"')).toBeCloseTo(4648.2, 1);
  });

  it('T-MOD-003-005: invalid inputs return null', () => {
    expect(parseLength('abc')).toBeNull();
    expect(parseLength('')).toBeNull();
    expect(parseLength(null)).toBeNull();
    expect(parseLength(undefined)).toBeNull();
  });

  // Edge cases — not required by the spec but documented behaviour
  it('parses common unit suffixes', () => {
    expect(parseLength('45cm')).toBe(450);
    expect(parseLength('3in')).toBeCloseTo(76.2, 1);
    expect(parseLength('1km')).toBe(1_000_000);
    expect(parseLength('900mm')).toBe(900);
  });

  it('parses inch fractions', () => {
    expect(parseLength('1/2"')).toBeCloseTo(12.7, 2);
    expect(parseLength('5 1/2"')).toBeCloseTo(139.7, 1);
  });

  it('parses bare decimals as mm', () => {
    expect(parseLength('1234.5')).toBe(1234.5);
  });
});
