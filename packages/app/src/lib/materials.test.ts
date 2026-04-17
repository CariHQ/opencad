/**
 * Materials Library Tests
 * T-BIM-010: Built-in material library
 */
import { describe, it, expect } from 'vitest';
import { BUILT_IN_MATERIALS, MATERIAL_CATEGORIES } from './materials';

describe('T-BIM-010: BUILT_IN_MATERIALS', () => {
  it('has at least 100 materials', () => {
    expect(BUILT_IN_MATERIALS.length).toBeGreaterThanOrEqual(100);
  });

  it('each material has a unique id', () => {
    const ids = BUILT_IN_MATERIALS.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('each material has a non-empty name', () => {
    for (const m of BUILT_IN_MATERIALS) {
      expect(m.name.length).toBeGreaterThan(0);
    }
  });

  it('each material has a non-empty category', () => {
    for (const m of BUILT_IN_MATERIALS) {
      expect(m.category.length).toBeGreaterThan(0);
    }
  });

  it('roughness is between 0 and 1', () => {
    for (const m of BUILT_IN_MATERIALS) {
      expect(m.roughness).toBeGreaterThanOrEqual(0);
      expect(m.roughness).toBeLessThanOrEqual(1);
    }
  });

  it('metalness is between 0 and 1', () => {
    for (const m of BUILT_IN_MATERIALS) {
      expect(m.metalness).toBeGreaterThanOrEqual(0);
      expect(m.metalness).toBeLessThanOrEqual(1);
    }
  });

  it('costPerM2 is positive', () => {
    for (const m of BUILT_IN_MATERIALS) {
      expect(m.costPerM2).toBeGreaterThan(0);
    }
  });

  it('color is a valid hex string', () => {
    const hexRegex = /^#[0-9a-f]{6}$/i;
    for (const m of BUILT_IN_MATERIALS) {
      expect(m.color).toMatch(hexRegex);
    }
  });

  it('unit is a non-empty string', () => {
    for (const m of BUILT_IN_MATERIALS) {
      expect(m.unit.length).toBeGreaterThan(0);
    }
  });

  it('includes concrete materials', () => {
    const concrete = BUILT_IN_MATERIALS.filter((m) => m.category === 'Concrete');
    expect(concrete.length).toBeGreaterThan(0);
  });

  it('includes metal materials', () => {
    const metals = BUILT_IN_MATERIALS.filter((m) => m.category === 'Metal');
    expect(metals.length).toBeGreaterThan(0);
  });

  it('includes glass materials', () => {
    const glass = BUILT_IN_MATERIALS.filter((m) => m.category === 'Glass');
    expect(glass.length).toBeGreaterThan(0);
  });

  it('includes timber materials', () => {
    const timber = BUILT_IN_MATERIALS.filter((m) => m.category === 'Timber');
    expect(timber.length).toBeGreaterThan(0);
  });

  it('includes masonry materials', () => {
    const masonry = BUILT_IN_MATERIALS.filter((m) => m.category === 'Masonry');
    expect(masonry.length).toBeGreaterThan(0);
  });
});

describe('T-BIM-010: MATERIAL_CATEGORIES', () => {
  it('is a sorted array of strings', () => {
    const sorted = [...MATERIAL_CATEGORIES].sort();
    expect(MATERIAL_CATEGORIES).toEqual(sorted);
  });

  it('each category appears at least once in BUILT_IN_MATERIALS', () => {
    for (const cat of MATERIAL_CATEGORIES) {
      const found = BUILT_IN_MATERIALS.some((m) => m.category === cat);
      expect(found).toBe(true);
    }
  });

  it('contains Concrete category', () => {
    expect(MATERIAL_CATEGORIES).toContain('Concrete');
  });

  it('contains Metal category', () => {
    expect(MATERIAL_CATEGORIES).toContain('Metal');
  });

  it('contains Glass category', () => {
    expect(MATERIAL_CATEGORIES).toContain('Glass');
  });

  it('has no duplicate categories', () => {
    const unique = new Set(MATERIAL_CATEGORIES);
    expect(unique.size).toBe(MATERIAL_CATEGORIES.length);
  });
});
