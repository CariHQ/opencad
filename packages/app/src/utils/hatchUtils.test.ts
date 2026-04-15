/**
 * T-2D-009: Hatch pattern tests
 */
import { describe, it, expect } from 'vitest';
import {
  HATCH_PATTERNS,
  getHatchPatternById,
  getHatchPatternsByType,
  generateHatchLines,
  getDefaultHatchColor,
} from './hatchUtils';

describe('T-2D-009: Hatch Patterns', () => {
  describe('HATCH_PATTERNS', () => {
    it('has at least 8 patterns', () => {
      expect(HATCH_PATTERNS.length).toBeGreaterThanOrEqual(8);
    });

    it('each pattern has a unique id', () => {
      const ids = HATCH_PATTERNS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('each pattern has a non-empty name', () => {
      for (const p of HATCH_PATTERNS) {
        expect(p.name.length).toBeGreaterThan(0);
      }
    });

    it('each pattern has a non-negative spacing', () => {
      for (const p of HATCH_PATTERNS) {
        expect(p.spacing).toBeGreaterThanOrEqual(0);
      }
    });

    it('includes solid pattern', () => {
      expect(HATCH_PATTERNS.some((p) => p.type === 'solid')).toBe(true);
    });

    it('includes brick pattern', () => {
      expect(HATCH_PATTERNS.some((p) => p.type === 'brick')).toBe(true);
    });

    it('includes cross-hatch pattern', () => {
      expect(HATCH_PATTERNS.some((p) => p.type === 'cross-hatch')).toBe(true);
    });
  });

  describe('getHatchPatternById', () => {
    it('returns matching pattern', () => {
      const p = getHatchPatternById('brick');
      expect(p).toBeDefined();
      expect(p?.name).toBe('Brick');
    });

    it('returns undefined for unknown id', () => {
      expect(getHatchPatternById('nonexistent')).toBeUndefined();
    });
  });

  describe('getHatchPatternsByType', () => {
    it('returns only patterns of given type', () => {
      const diagonals = getHatchPatternsByType('diagonal');
      expect(diagonals.length).toBeGreaterThan(0);
      for (const p of diagonals) {
        expect(p.type).toBe('diagonal');
      }
    });
  });

  describe('generateHatchLines', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };

    it('returns empty array for solid pattern', () => {
      const solid = getHatchPatternById('solid')!;
      const lines = generateHatchLines({ pattern: solid, bounds });
      expect(lines).toHaveLength(0);
    });

    it('returns lines for diagonal pattern', () => {
      const diagonal = getHatchPatternById('diagonal-45')!;
      const lines = generateHatchLines({ pattern: diagonal, bounds });
      expect(lines.length).toBeGreaterThan(0);
    });

    it('returns more lines for cross-hatch than single diagonal', () => {
      const diagonal = getHatchPatternById('diagonal-45')!;
      const crossHatch = getHatchPatternById('cross-hatch')!;
      const dLines = generateHatchLines({ pattern: diagonal, bounds });
      const cLines = generateHatchLines({ pattern: crossHatch, bounds });
      expect(cLines.length).toBeGreaterThan(dLines.length);
    });

    it('each line has numeric coordinates', () => {
      const brick = getHatchPatternById('brick')!;
      const lines = generateHatchLines({ pattern: brick, bounds });
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) {
        expect(typeof l.x1).toBe('number');
        expect(typeof l.y1).toBe('number');
        expect(typeof l.x2).toBe('number');
        expect(typeof l.y2).toBe('number');
      }
    });

    it('scale parameter affects line count spacing', () => {
      const diagonal = getHatchPatternById('diagonal-45')!;
      const smallScale = generateHatchLines({ pattern: diagonal, bounds, scale: 1 });
      const largeScale = generateHatchLines({ pattern: diagonal, bounds, scale: 5 });
      // Larger scale = wider spacing = fewer lines
      expect(largeScale.length).toBeLessThan(smallScale.length);
    });
  });

  describe('getDefaultHatchColor', () => {
    it('returns a string for any pattern', () => {
      for (const p of HATCH_PATTERNS) {
        const color = getDefaultHatchColor(p);
        expect(typeof color).toBe('string');
        expect(color.startsWith('#')).toBe(true);
      }
    });

    it('returns dark color for steel', () => {
      const steel = getHatchPatternById('steel')!;
      const color = getDefaultHatchColor(steel);
      expect(color).not.toBe('#ffffff');
    });
  });
});
