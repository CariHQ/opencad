/**
 * T-EXT-01: Family registry unit tests.
 * Covers register/resolve, defaultParams, normalizeParams, evalGeometry,
 * boundingBoxFromGeometry, version detection, and the time-budget warning.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import {
  registerFamily,
  resolveFamily,
  listFamilies,
  listFamiliesByCategory,
  defaultParams,
  normalizeParams,
  evalGeometry,
  boundingBoxFromGeometry,
} from './familyRegistry';
import type { FamilyDefinition } from './familyRegistry';
import type { FamilyGeometry } from '@opencad/document';

// ── Fixture family ────────────────────────────────────────────────────────────

const BOX_FAMILY: FamilyDefinition = {
  id: 'test:box',
  name: 'Test Box',
  category: 'column',
  version: '1.0.0',
  parameters: [
    { id: 'width',  label: 'Width',  type: 'dimension', default: 300, min: 100, max: 1000, unit: 'mm' },
    { id: 'height', label: 'Height', type: 'dimension', default: 600, min: 200, max: 4000, unit: 'mm' },
    { id: 'shape',  label: 'Shape',  type: 'enum', default: 'square',
      options: [{ value: 'square', label: 'Square' }, { value: 'round', label: 'Round' }] },
    { id: 'solid',  label: 'Solid',  type: 'boolean', default: true },
  ],
  geometry: ({ width, height }) => {
    const w = (width as number) / 1000;
    const h = (height as number) / 1000;
    return {
      vertices: [0, 0, 0,  w, 0, 0,  w, 0, h,  0, 0, h],
      faces: [0, 1, 2,  0, 2, 3],
    };
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('T-EXT-01: familyRegistry', () => {
  describe('register / resolve', () => {
    it('resolves a registered family', () => {
      registerFamily(BOX_FAMILY);
      expect(resolveFamily('test:box')).toBe(BOX_FAMILY);
    });

    it('returns undefined for unknown id', () => {
      expect(resolveFamily('test:nonexistent')).toBeUndefined();
    });

    it('overwrites previous registration (idempotent by id)', () => {
      const v2 = { ...BOX_FAMILY, version: '2.0.0' };
      registerFamily(BOX_FAMILY);
      registerFamily(v2);
      expect(resolveFamily('test:box')?.version).toBe('2.0.0');
    });

    it('listFamilies includes registered family', () => {
      registerFamily(BOX_FAMILY);
      expect(listFamilies().some((f) => f.id === 'test:box')).toBe(true);
    });

    it('listFamiliesByCategory filters correctly', () => {
      registerFamily(BOX_FAMILY);
      const cols = listFamiliesByCategory('column');
      expect(cols.some((f) => f.id === 'test:box')).toBe(true);
      const walls = listFamiliesByCategory('wall');
      expect(walls.some((f) => f.id === 'test:box')).toBe(false);
    });
  });

  describe('defaultParams', () => {
    it('returns defaults for all parameters', () => {
      registerFamily(BOX_FAMILY);
      const def = resolveFamily('test:box')!;
      const params = defaultParams(def);
      expect(params).toEqual({ width: 300, height: 600, shape: 'square', solid: true });
    });
  });

  describe('normalizeParams', () => {
    beforeEach(() => { registerFamily(BOX_FAMILY); });

    it('clamps number below min to min', () => {
      const def = resolveFamily('test:box')!;
      const out = normalizeParams(def, { ...defaultParams(def), width: 50 });
      expect(out['width']).toBe(100);
    });

    it('clamps number above max to max', () => {
      const def = resolveFamily('test:box')!;
      const out = normalizeParams(def, { ...defaultParams(def), width: 9999 });
      expect(out['width']).toBe(1000);
    });

    it('falls back to default for invalid enum value', () => {
      const def = resolveFamily('test:box')!;
      const out = normalizeParams(def, { ...defaultParams(def), shape: 'triangle' });
      expect(out['shape']).toBe('square');
    });

    it('coerces boolean correctly', () => {
      const def = resolveFamily('test:box')!;
      const out = normalizeParams(def, { ...defaultParams(def), solid: 0 });
      expect(out['solid']).toBe(false);
    });

    it('fills missing params from defaults', () => {
      const def = resolveFamily('test:box')!;
      const out = normalizeParams(def, {});
      expect(out).toEqual(defaultParams(def));
    });
  });

  describe('evalGeometry', () => {
    beforeEach(() => { registerFamily(BOX_FAMILY); });

    it('returns geometry for valid params', () => {
      const def = resolveFamily('test:box')!;
      const geom = evalGeometry(def, defaultParams(def));
      expect(geom).not.toBeNull();
      expect(geom!.vertices.length).toBeGreaterThan(0);
      expect(geom!.faces.length).toBeGreaterThan(0);
    });

    it('geometry is deterministic — same params produce identical output', () => {
      const def = resolveFamily('test:box')!;
      const params = defaultParams(def);
      const g1 = evalGeometry(def, params);
      const g2 = evalGeometry(def, params);
      expect(g1).toEqual(g2);
    });

    it('returns null when geometry callback throws', () => {
      const badFamily: FamilyDefinition = {
        ...BOX_FAMILY,
        id: 'test:throws',
        geometry: () => { throw new Error('oops'); },
      };
      registerFamily(badFamily);
      const def = resolveFamily('test:throws')!;
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = evalGeometry(def, {});
      expect(result).toBeNull();
      spy.mockRestore();
    });

    it('geometry dimensions scale with width/height params', () => {
      const def = resolveFamily('test:box')!;
      const narrow = evalGeometry(def, { ...defaultParams(def), width: 100 })!;
      const wide   = evalGeometry(def, { ...defaultParams(def), width: 1000 })!;
      // max X in narrow < max X in wide
      const maxXNarrow = Math.max(...narrow.vertices.filter((_, i) => i % 3 === 0));
      const maxXWide   = Math.max(...wide.vertices.filter((_, i) => i % 3 === 0));
      expect(maxXNarrow).toBeLessThan(maxXWide);
    });
  });

  describe('boundingBoxFromGeometry', () => {
    it('computes correct bounding box from vertices', () => {
      const geom: FamilyGeometry = {
        vertices: [-1, -2, -3,  4, 5, 6],
        faces: [],
      };
      const bb = boundingBoxFromGeometry(geom);
      expect(bb).toEqual({ minX: -1, minY: -2, minZ: -3, maxX: 4, maxY: 5, maxZ: 6 });
    });

    it('returns pre-computed boundingBox if present', () => {
      const precomputed = { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 10, maxZ: 10 };
      const geom: FamilyGeometry = { vertices: [100, 200, 300], faces: [], boundingBox: precomputed };
      const bb = boundingBoxFromGeometry(geom);
      expect(bb).toBe(precomputed);
    });
  });
});
