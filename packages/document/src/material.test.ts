/**
 * Material Operations Tests
 * T-DOC-011: Material library operations
 */
import { describe, it, expect } from 'vitest';
import {
  createDefaultMaterials,
  getMaterialById,
  getMaterialsByCategory,
  MATERIAL_CATEGORIES,
} from './material';

describe('T-DOC-011: createDefaultMaterials', () => {
  it('returns a non-empty materials object', () => {
    const mats = createDefaultMaterials();
    expect(Object.keys(mats).length).toBeGreaterThan(0);
  });

  it('includes concrete material', () => {
    const mats = createDefaultMaterials();
    expect(mats['mat-concrete']).toBeDefined();
  });

  it('includes brick material', () => {
    const mats = createDefaultMaterials();
    expect(mats['mat-masonry-brick']).toBeDefined();
  });

  it('each material has id, name, category, properties', () => {
    const mats = createDefaultMaterials();
    for (const mat of Object.values(mats)) {
      expect(mat.id).toBeTruthy();
      expect(mat.name).toBeTruthy();
      expect(mat.category).toBeTruthy();
      expect(mat.properties).toBeDefined();
    }
  });

  it('each call returns a fresh object (not shared reference)', () => {
    const mats1 = createDefaultMaterials();
    const mats2 = createDefaultMaterials();
    expect(mats1).not.toBe(mats2);
  });
});

describe('T-DOC-011: getMaterialById', () => {
  it('returns the material with the given id', () => {
    const mats = createDefaultMaterials();
    const mat = getMaterialById(mats, 'mat-concrete');
    expect(mat?.name).toBe('Concrete');
  });

  it('returns undefined for unknown id', () => {
    const mats = createDefaultMaterials();
    expect(getMaterialById(mats, 'non-existent')).toBeUndefined();
  });
});

describe('T-DOC-011: getMaterialsByCategory', () => {
  it('returns materials in the given category', () => {
    const mats = createDefaultMaterials();
    const concrete = getMaterialsByCategory(mats, 'concrete');
    expect(concrete.length).toBeGreaterThan(0);
    for (const m of concrete) {
      expect(m.category).toBe('concrete');
    }
  });

  it('returns empty array for unknown category', () => {
    const mats = createDefaultMaterials();
    expect(getMaterialsByCategory(mats, 'unknown-cat')).toHaveLength(0);
  });
});

describe('T-DOC-011: MATERIAL_CATEGORIES', () => {
  it('is an array', () => {
    expect(Array.isArray(MATERIAL_CATEGORIES)).toBe(true);
  });

  it('includes concrete', () => {
    expect(MATERIAL_CATEGORIES).toContain('concrete');
  });

  it('includes metal', () => {
    expect(MATERIAL_CATEGORIES).toContain('metal');
  });

  it('includes wood', () => {
    expect(MATERIAL_CATEGORIES).toContain('wood');
  });

  it('includes glass', () => {
    expect(MATERIAL_CATEGORIES).toContain('glass');
  });
});
