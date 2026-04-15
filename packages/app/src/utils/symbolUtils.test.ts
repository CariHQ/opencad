/**
 * T-2D-010: Architectural symbol tests
 */
import { describe, it, expect } from 'vitest';
import {
  SYMBOLS,
  getNorthArrowPath,
  getScaleBarTicks,
  getDetailMarkerLabel,
} from './symbolUtils';

describe('T-2D-010: Architectural Symbols', () => {
  describe('SYMBOLS', () => {
    it('has exactly 5 symbols', () => {
      expect(SYMBOLS.length).toBe(5);
    });

    it('includes north-arrow', () => {
      expect(SYMBOLS.some((s) => s.id === 'north-arrow')).toBe(true);
    });

    it('includes scale-bar', () => {
      expect(SYMBOLS.some((s) => s.id === 'scale-bar')).toBe(true);
    });

    it('includes detail-marker', () => {
      expect(SYMBOLS.some((s) => s.id === 'detail-marker')).toBe(true);
    });

    it('each symbol has a positive defaultSize', () => {
      for (const s of SYMBOLS) {
        expect(s.defaultSize).toBeGreaterThan(0);
      }
    });

    it('each symbol has a non-empty name', () => {
      for (const s of SYMBOLS) {
        expect(s.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getNorthArrowPath', () => {
    it('returns a non-empty string', () => {
      const path = getNorthArrowPath();
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });

    it('contains SVG path commands', () => {
      const path = getNorthArrowPath();
      expect(path).toMatch(/[ML]/);
    });

    it('default rotation is 0 degrees', () => {
      const path0 = getNorthArrowPath({ rotation: 0 });
      const path360 = getNorthArrowPath({ rotation: 360 });
      // At 0 and 360 degrees the paths should be equivalent
      expect(path0).toBe(path360);
    });

    it('rotation 90 produces different path than 0', () => {
      const path0 = getNorthArrowPath({ rotation: 0 });
      const path90 = getNorthArrowPath({ rotation: 90 });
      expect(path0).not.toBe(path90);
    });

    it('size parameter affects the path', () => {
      const small = getNorthArrowPath({ size: 20 });
      const large = getNorthArrowPath({ size: 80 });
      expect(small).not.toBe(large);
    });
  });

  describe('getScaleBarTicks', () => {
    it('returns divisions + 1 ticks', () => {
      const ticks = getScaleBarTicks({ totalLength: 1000, divisions: 4 });
      expect(ticks.length).toBe(5);
    });

    it('first tick is at x = 0', () => {
      const ticks = getScaleBarTicks({ totalLength: 2000, divisions: 4 });
      expect(ticks[0]?.x).toBe(0);
    });

    it('last tick x equals totalLength × pixelsPerMm', () => {
      const ticks = getScaleBarTicks({ totalLength: 1000, divisions: 4, pixelsPerMm: 2 });
      expect(ticks[ticks.length - 1]?.x).toBe(2000);
    });

    it('uses 4 divisions by default', () => {
      const ticks = getScaleBarTicks({ totalLength: 500 });
      expect(ticks.length).toBe(5);
    });

    it('labels include units', () => {
      const ticks = getScaleBarTicks({ totalLength: 1000, divisions: 2 });
      const labels = ticks.map((t) => t.label);
      expect(labels.some((l) => l.includes('mm') || l.includes('m'))).toBe(true);
    });

    it('converts to meters for labels ≥ 1000mm', () => {
      const ticks = getScaleBarTicks({ totalLength: 2000, divisions: 2 });
      expect(ticks[ticks.length - 1]?.label).toMatch(/m/);
    });
  });

  describe('getDetailMarkerLabel', () => {
    it('formats number and sheetRef', () => {
      expect(getDetailMarkerLabel({ number: 3, sheetRef: 'A-201' })).toBe('3 / A-201');
    });

    it('uses just the number when no sheetRef', () => {
      expect(getDetailMarkerLabel({ number: 5 })).toBe('5');
    });

    it('accepts string number', () => {
      expect(getDetailMarkerLabel({ number: '2A', sheetRef: 'S-101' })).toBe('2A / S-101');
    });
  });
});
