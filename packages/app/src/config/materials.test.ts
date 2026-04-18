/**
 * T-BIM-001: Material library catalog tests
 */
import { describe, it, expect } from 'vitest';
import { MATERIALS, MATERIAL_CATEGORIES, type MaterialDef } from './materials';

describe('T-BIM-001: materials catalog', () => {
  it('has at least 15 materials', () => {
    expect(MATERIALS.length).toBeGreaterThanOrEqual(15);
  });

  it('each material has all required fields', () => {
    for (const m of MATERIALS) {
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);
      expect(typeof m.name).toBe('string');
      expect(m.name.length).toBeGreaterThan(0);
      expect(typeof m.category).toBe('string');
      expect(m.category.length).toBeGreaterThan(0);
      expect(typeof m.color).toBe('string');
      expect(m.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof m.density).toBe('number');
      expect(typeof m.thermalConductivity).toBe('number');
      expect(typeof m.embodiedCarbon).toBe('number');
      expect(typeof m.cost).toBe('number');
    }
  });

  it('all categories are represented', () => {
    const presentCategories = new Set<string>(MATERIALS.map((m) => m.category));
    const requiredCategories = ['concrete', 'masonry', 'steel', 'wood', 'glass', 'insulation', 'finish'];
    for (const cat of requiredCategories) {
      expect(presentCategories.has(cat)).toBe(true);
    }
  });

  it('densities are positive numbers', () => {
    for (const m of MATERIALS) {
      expect(m.density).toBeGreaterThan(0);
    }
  });

  it('embodied carbon values are positive', () => {
    for (const m of MATERIALS) {
      expect(m.embodiedCarbon).toBeGreaterThan(0);
    }
  });

  it('each material has a unique id', () => {
    const ids = MATERIALS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cost values are positive', () => {
    for (const m of MATERIALS) {
      expect(m.cost).toBeGreaterThan(0);
    }
  });

  it('thermal conductivity values are positive', () => {
    for (const m of MATERIALS) {
      expect(m.thermalConductivity).toBeGreaterThan(0);
    }
  });

  it('MATERIAL_CATEGORIES includes all + the 7 categories', () => {
    expect(MATERIAL_CATEGORIES).toContain('all');
    expect(MATERIAL_CATEGORIES).toContain('concrete');
    expect(MATERIAL_CATEGORIES).toContain('masonry');
    expect(MATERIAL_CATEGORIES).toContain('steel');
    expect(MATERIAL_CATEGORIES).toContain('wood');
    expect(MATERIAL_CATEGORIES).toContain('glass');
    expect(MATERIAL_CATEGORIES).toContain('insulation');
    expect(MATERIAL_CATEGORIES).toContain('finish');
  });

  it('MaterialDef type has required shape', () => {
    // Type-level check — if this compiles, the shape is correct
    const sample: MaterialDef = {
      id: 'test',
      name: 'Test',
      category: 'concrete',
      color: '#ffffff',
      density: 100,
      thermalConductivity: 1.0,
      embodiedCarbon: 0.1,
      cost: 10,
    };
    expect(sample.id).toBe('test');
  });
});
