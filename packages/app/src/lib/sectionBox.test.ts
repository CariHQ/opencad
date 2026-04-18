/**
 * T-VP-002: Section Box Tests
 *
 * Tests for the section box logic: containment checks and bounding from elements.
 */
import { describe, it, expect } from 'vitest';
import {
  sectionBoxContains,
  sectionBoxFromElements,
  DEFAULT_SECTION_BOX,
} from './sectionBox';
import type { SectionBox } from './sectionBox';

const BOX: SectionBox = {
  minX: 0, minY: 0, minZ: 0,
  maxX: 10, maxY: 10, maxZ: 10,
  enabled: true,
};

describe('T-VP-002: SectionBox logic', () => {
  it('T-VP-002-001: sectionBoxContains returns true for point inside', () => {
    expect(sectionBoxContains(BOX, 5, 5, 5)).toBe(true);
  });

  it('T-VP-002-002: sectionBoxContains returns false for point outside', () => {
    expect(sectionBoxContains(BOX, 15, 5, 5)).toBe(false);
  });

  it('T-VP-002-003: sectionBoxContains respects all 6 planes', () => {
    expect(sectionBoxContains(BOX, -1, 5, 5)).toBe(false);   // below minX
    expect(sectionBoxContains(BOX, 11, 5, 5)).toBe(false);   // above maxX
    expect(sectionBoxContains(BOX, 5, -1, 5)).toBe(false);   // below minY
    expect(sectionBoxContains(BOX, 5, 11, 5)).toBe(false);   // above maxY
    expect(sectionBoxContains(BOX, 5, 5, -1)).toBe(false);   // below minZ
    expect(sectionBoxContains(BOX, 5, 5, 11)).toBe(false);   // above maxZ
    expect(sectionBoxContains(BOX, 5, 5, 5)).toBe(true);     // inside
  });

  it('T-VP-002-004: sectionBoxFromElements returns box bounding all points', () => {
    const elements = [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 50, z: 20 },
      { x: -10, y: 80, z: 5 },
    ];
    const box = sectionBoxFromElements(elements);
    expect(box.minX).toBeLessThanOrEqual(-10);
    expect(box.maxX).toBeGreaterThanOrEqual(100);
    expect(box.minY).toBeLessThanOrEqual(0);
    expect(box.maxY).toBeGreaterThanOrEqual(80);
    expect(box.minZ).toBeLessThanOrEqual(0);
    expect(box.maxZ).toBeGreaterThanOrEqual(20);
  });

  it('T-VP-002-005: sectionBoxFromElements adds 10% padding', () => {
    const elements = [{ x: 0, y: 0, z: 0 }, { x: 100, y: 100, z: 100 }];
    const box = sectionBoxFromElements(elements);
    const rangeX = 100 - 0;
    const padding = rangeX * 0.1;
    expect(box.minX).toBeLessThanOrEqual(0 - padding);
    expect(box.maxX).toBeGreaterThanOrEqual(100 + padding);
  });

  it('T-VP-002-006: sectionBoxFromElements handles empty array (returns DEFAULT_SECTION_BOX)', () => {
    const box = sectionBoxFromElements([]);
    expect(box).toEqual(DEFAULT_SECTION_BOX);
  });

  it('T-VP-002-007: disabled box: sectionBoxContains always returns true when enabled=false', () => {
    const disabledBox: SectionBox = { ...BOX, enabled: false };
    expect(sectionBoxContains(disabledBox, 999, 999, 999)).toBe(true);
    expect(sectionBoxContains(disabledBox, -999, -999, -999)).toBe(true);
    expect(sectionBoxContains(disabledBox, 5, 5, 5)).toBe(true);
  });

  it('T-VP-002-008: box with min > max is treated as disabled', () => {
    const invertedBox: SectionBox = {
      minX: 50, minY: 50, minZ: 50,
      maxX: 10, maxY: 10, maxZ: 10,
      enabled: true,
    };
    // When min > max on any axis the box is degenerate — treat as disabled
    expect(sectionBoxContains(invertedBox, 999, 999, 999)).toBe(true);
    expect(sectionBoxContains(invertedBox, -999, -999, -999)).toBe(true);
  });
});
