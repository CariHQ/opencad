/**
 * T-RENDER-001: PBR material configuration tests
 *
 * Verifies that MATERIAL_PBR_PARAMS contains physically valid roughness/metalness
 * values and that all material IDs are consistent with the MATERIAL_CATEGORIES
 * used by the built-in material library.
 */
import { describe, it, expect } from 'vitest';
import { MATERIAL_PBR_PARAMS, PBR_MATERIAL_IDS } from './pbrMaterials';
import { MATERIAL_CATEGORIES } from '../lib/materials';

describe('T-RENDER-001: PBR materials', () => {
  it('MATERIAL_PBR_PARAMS is a non-empty object', () => {
    expect(Object.keys(MATERIAL_PBR_PARAMS).length).toBeGreaterThan(0);
  });

  it('MATERIAL_PBR_PARAMS has roughness between 0 and 1 for all materials', () => {
    for (const [id, params] of Object.entries(MATERIAL_PBR_PARAMS)) {
      expect(params.roughness, `${id}.roughness out of range`).toBeGreaterThanOrEqual(0);
      expect(params.roughness, `${id}.roughness out of range`).toBeLessThanOrEqual(1);
    }
  });

  it('MATERIAL_PBR_PARAMS has metalness between 0 and 1 for all materials', () => {
    for (const [id, params] of Object.entries(MATERIAL_PBR_PARAMS)) {
      expect(params.metalness, `${id}.metalness out of range`).toBeGreaterThanOrEqual(0);
      expect(params.metalness, `${id}.metalness out of range`).toBeLessThanOrEqual(1);
    }
  });

  it('MATERIAL_PBR_PARAMS color values are valid 0x-prefixed hex numbers', () => {
    for (const [id, params] of Object.entries(MATERIAL_PBR_PARAMS)) {
      expect(typeof params.color, `${id}.color not a number`).toBe('number');
      expect(params.color, `${id}.color negative`).toBeGreaterThanOrEqual(0);
      expect(params.color, `${id}.color exceeds 0xffffff`).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('all material IDs in MATERIAL_PBR_PARAMS exist in MATERIAL_CATEGORIES', () => {
    for (const id of Object.keys(MATERIAL_PBR_PARAMS)) {
      expect(
        MATERIAL_CATEGORIES,
        `"${id}" not found in MATERIAL_CATEGORIES`
      ).toContain(id);
    }
  });

  it('PBR_MATERIAL_IDS is an array matching keys of MATERIAL_PBR_PARAMS', () => {
    const paramKeys = Object.keys(MATERIAL_PBR_PARAMS).sort();
    expect([...PBR_MATERIAL_IDS].sort()).toEqual(paramKeys);
  });

  it('contains Concrete PBR entry', () => {
    expect(MATERIAL_PBR_PARAMS).toHaveProperty('Concrete');
  });

  it('contains Steel PBR entry', () => {
    expect(MATERIAL_PBR_PARAMS).toHaveProperty('Metal');
  });

  it('contains Wood (Timber) PBR entry', () => {
    expect(MATERIAL_PBR_PARAMS).toHaveProperty('Timber');
  });

  it('contains Glass PBR entry', () => {
    expect(MATERIAL_PBR_PARAMS).toHaveProperty('Glass');
  });

  it('contains Masonry PBR entry', () => {
    expect(MATERIAL_PBR_PARAMS).toHaveProperty('Masonry');
  });

  it('Glass has very low roughness (transparent/smooth surface)', () => {
    expect(MATERIAL_PBR_PARAMS['Glass']!.roughness).toBeLessThan(0.2);
  });

  it('Metal category has high metalness (>= 0.7)', () => {
    expect(MATERIAL_PBR_PARAMS['Metal']!.metalness).toBeGreaterThanOrEqual(0.7);
  });

  it('Concrete has zero metalness', () => {
    expect(MATERIAL_PBR_PARAMS['Concrete']!.metalness).toBe(0);
  });

  it('Timber has zero metalness', () => {
    expect(MATERIAL_PBR_PARAMS['Timber']!.metalness).toBe(0);
  });
});

describe('T-RENDER-001: PBR environment lighting config', () => {
  it('PBR config module is importable without errors', () => {
    // If the import at top of file succeeded, the module loaded cleanly
    expect(MATERIAL_PBR_PARAMS).toBeDefined();
  });
});
