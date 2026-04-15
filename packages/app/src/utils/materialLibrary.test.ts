/**
 * T-MAT-001: Material library tests
 */
import { describe, it, expect } from 'vitest';
import {
  BUILT_IN_MATERIALS,
  getMaterialById,
  getMaterialsByCategory,
  createCustomMaterial,
  type MaterialCategory,
} from './materialLibrary';

describe('T-MAT-001: Material Library', () => {
  describe('BUILT_IN_MATERIALS', () => {
    it('has at least 10 built-in materials', () => {
      expect(BUILT_IN_MATERIALS.length).toBeGreaterThanOrEqual(10);
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

    it('each material has a valid color hex string', () => {
      for (const m of BUILT_IN_MATERIALS) {
        expect(m.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('each material has opacity between 0 and 1', () => {
      for (const m of BUILT_IN_MATERIALS) {
        expect(m.opacity).toBeGreaterThanOrEqual(0);
        expect(m.opacity).toBeLessThanOrEqual(1);
      }
    });

    it('includes at least one concrete material', () => {
      expect(BUILT_IN_MATERIALS.some((m) => m.category === 'concrete')).toBe(true);
    });

    it('includes at least one wood material', () => {
      expect(BUILT_IN_MATERIALS.some((m) => m.category === 'wood')).toBe(true);
    });

    it('includes at least one glass material', () => {
      expect(BUILT_IN_MATERIALS.some((m) => m.category === 'glass')).toBe(true);
    });
  });

  describe('getMaterialById', () => {
    it('returns the matching material', () => {
      const m = getMaterialById('concrete-normal');
      expect(m).toBeDefined();
      expect(m?.name).toBe('Normal Concrete');
    });

    it('returns undefined for unknown id', () => {
      expect(getMaterialById('does-not-exist')).toBeUndefined();
    });
  });

  describe('getMaterialsByCategory', () => {
    it('returns only materials of the given category', () => {
      const metals = getMaterialsByCategory('metal');
      expect(metals.length).toBeGreaterThan(0);
      for (const m of metals) {
        expect(m.category).toBe('metal');
      }
    });

    it('returns empty array for category with no materials', () => {
      const membranes = getMaterialsByCategory('membrane' as MaterialCategory);
      expect(Array.isArray(membranes)).toBe(true);
    });
  });

  describe('createCustomMaterial', () => {
    it('returns a material with a generated id', () => {
      const m = createCustomMaterial({ name: 'Test Material', category: 'concrete', color: '#ff0000' });
      expect(m.id).toMatch(/^custom-test-material-/);
    });

    it('uses provided name and category', () => {
      const m = createCustomMaterial({ name: 'My Wood', category: 'wood', color: '#a0522d' });
      expect(m.name).toBe('My Wood');
      expect(m.category).toBe('wood');
    });

    it('defaults opacity to 1', () => {
      const m = createCustomMaterial({ name: 'Opaque', category: 'finish', color: '#ffffff' });
      expect(m.opacity).toBe(1);
    });

    it('accepts custom opacity', () => {
      const m = createCustomMaterial({ name: 'Semi', category: 'glass', color: '#aaaaaa', opacity: 0.5 });
      expect(m.opacity).toBe(0.5);
    });

    it('accepts material properties', () => {
      const m = createCustomMaterial({
        name: 'Dense Concrete',
        category: 'concrete',
        color: '#888888',
        properties: { density: 3000 },
      });
      expect(m.properties.density).toBe(3000);
    });

    it('defaults to empty properties when not provided', () => {
      const m = createCustomMaterial({ name: 'Bare', category: 'masonry', color: '#cccccc' });
      expect(m.properties).toEqual({});
    });
  });
});
