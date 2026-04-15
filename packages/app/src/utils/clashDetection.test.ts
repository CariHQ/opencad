/**
 * T-MEP-001: Clash Detection Tests
 *
 * Tests for automatic clash detection between structural and MEP elements.
 * Verifies geometry intersection detection and report generation.
 */
import { describe, it, expect } from 'vitest';
import {
  detectClashes,
  ClashResult,
  ClashSeverity,
  getBoundingBox,
  boxesIntersect,
} from './clashDetection';
import type { ElementSchema } from '@opencad/document';

const BASE_META = {
  createdAt: 0,
  updatedAt: 0,
  createdBy: 'test',
  version: { clock: {} },
};

const BASE_TRANSFORM = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const BASE_BBOX = {
  min: { _type: 'Point3D' as const, x: 0, y: 0, z: 0 },
  max: { _type: 'Point3D' as const, x: 0, y: 0, z: 0 },
};

function makeWall(id: string, x1: number, y1: number, x2: number, y2: number, thickness = 200): ElementSchema {
  return {
    id,
    type: 'wall',
    layerId: 'layer-1',
    levelId: null,
    geometry: {
      type: 'mesh',
      data: {
        startPoint: { x: x1, y: y1, z: 0 },
        endPoint: { x: x2, y: y2, z: 0 },
        thickness,
        height: 3000,
      },
    },
    properties: {},
    propertySets: [],
    transform: BASE_TRANSFORM,
    boundingBox: BASE_BBOX,
    visible: true,
    locked: false,
    metadata: { id, ...BASE_META },
  };
}

function makeColumn(id: string, x: number, y: number, size = 400): ElementSchema {
  return {
    id,
    type: 'column',
    layerId: 'layer-1',
    levelId: null,
    geometry: {
      type: 'mesh',
      data: {
        position: { x, y, z: 0 },
        width: size,
        depth: size,
        height: 3000,
      },
    },
    properties: {},
    propertySets: [],
    transform: BASE_TRANSFORM,
    boundingBox: BASE_BBOX,
    visible: true,
    locked: false,
    metadata: { id, ...BASE_META },
  };
}

function makeBeam(id: string, x1: number, y1: number, x2: number, y2: number, height = 400): ElementSchema {
  return {
    id,
    type: 'beam',
    layerId: 'layer-1',
    levelId: null,
    geometry: {
      type: 'mesh',
      data: {
        startPoint: { x: x1, y: y1, z: 2800 },
        endPoint: { x: x2, y: y2, z: 2800 },
        width: 200,
        height,
      },
    },
    properties: {},
    propertySets: [],
    transform: BASE_TRANSFORM,
    boundingBox: BASE_BBOX,
    visible: true,
    locked: false,
    metadata: { id, ...BASE_META },
  };
}

describe('T-MEP-001: Clash Detection', () => {
  describe('getBoundingBox', () => {
    it('computes bounding box for a wall', () => {
      const wall = makeWall('w1', 0, 0, 5000, 0);
      const box = getBoundingBox(wall);
      expect(box).not.toBeNull();
      expect(box!.minX).toBeLessThanOrEqual(0);
      expect(box!.maxX).toBeGreaterThanOrEqual(5000);
    });

    it('computes bounding box for a column', () => {
      const col = makeColumn('c1', 1000, 1000);
      const box = getBoundingBox(col);
      expect(box).not.toBeNull();
      expect(box!.minX).toBeLessThan(1000);
      expect(box!.maxX).toBeGreaterThan(1000);
    });

    it('returns null for elements without geometry data', () => {
      const el: ElementSchema = {
        id: 'e1',
        type: 'wall',
        layerId: 'l1',
        levelId: null,
        geometry: { type: 'mesh', data: {} },
        properties: {},
        propertySets: [],
        transform: BASE_TRANSFORM,
        boundingBox: BASE_BBOX,
        visible: true,
        locked: false,
        metadata: { id: 'e1', ...BASE_META },
      };
      expect(getBoundingBox(el)).toBeNull();
    });
  });

  describe('boxesIntersect', () => {
    it('detects intersection when boxes overlap', () => {
      const a = { minX: 0, minY: 0, minZ: 0, maxX: 1000, maxY: 1000, maxZ: 1000 };
      const b = { minX: 500, minY: 500, minZ: 0, maxX: 1500, maxY: 1500, maxZ: 1000 };
      expect(boxesIntersect(a, b)).toBe(true);
    });

    it('returns false when boxes are adjacent (touching edges)', () => {
      const a = { minX: 0, minY: 0, minZ: 0, maxX: 1000, maxY: 1000, maxZ: 1000 };
      const b = { minX: 1000, minY: 0, minZ: 0, maxX: 2000, maxY: 1000, maxZ: 1000 };
      expect(boxesIntersect(a, b)).toBe(false);
    });

    it('returns false when boxes are completely separated', () => {
      const a = { minX: 0, minY: 0, minZ: 0, maxX: 500, maxY: 500, maxZ: 500 };
      const b = { minX: 600, minY: 600, minZ: 0, maxX: 1200, maxY: 1200, maxZ: 500 };
      expect(boxesIntersect(a, b)).toBe(false);
    });
  });

  describe('detectClashes', () => {
    it('returns empty array when no elements', () => {
      const result = detectClashes([]);
      expect(result).toEqual([]);
    });

    it('returns empty array when single element', () => {
      const result = detectClashes([makeWall('w1', 0, 0, 5000, 0)]);
      expect(result).toEqual([]);
    });

    it('detects clash between overlapping column and wall', () => {
      const wall = makeWall('w1', 0, -100, 5000, -100, 200);
      // Column at x=2500, y=0 — overlaps wall if wall occupies y=-100 to +100
      const col = makeColumn('c1', 2500, 0, 400);
      const clashes = detectClashes([wall, col]);
      expect(clashes.length).toBeGreaterThan(0);
      const clash = clashes[0];
      expect([clash.elementAId, clash.elementBId]).toContain('w1');
      expect([clash.elementAId, clash.elementBId]).toContain('c1');
    });

    it('does not report clash for non-overlapping elements', () => {
      const wall1 = makeWall('w1', 0, 0, 5000, 0);
      const wall2 = makeWall('w2', 0, 5000, 5000, 5000);
      const clashes = detectClashes([wall1, wall2]);
      expect(clashes).toHaveLength(0);
    });

    it('detects clash between beam and column', () => {
      const beam = makeBeam('b1', 0, 0, 5000, 0);
      const col = makeColumn('c1', 2500, 0, 400);
      const clashes = detectClashes([beam, col]);
      expect(clashes.length).toBeGreaterThan(0);
    });

    it('assigns correct severity for hard clashes', () => {
      const wall = makeWall('w1', 0, -100, 5000, -100, 200);
      const col = makeColumn('c1', 2500, 0, 400);
      const clashes = detectClashes([wall, col]);
      const hardClashes = clashes.filter((c) => c.severity === ClashSeverity.Hard);
      expect(hardClashes.length).toBeGreaterThan(0);
    });

    it('each clash result has required fields', () => {
      const wall = makeWall('w1', 0, -100, 5000, -100, 200);
      const col = makeColumn('c1', 2500, 0, 400);
      const clashes = detectClashes([wall, col]);
      expect(clashes.length).toBeGreaterThan(0);
      const clash: ClashResult = clashes[0];
      expect(clash).toHaveProperty('id');
      expect(clash).toHaveProperty('elementAId');
      expect(clash).toHaveProperty('elementBId');
      expect(clash).toHaveProperty('severity');
      expect(clash).toHaveProperty('description');
      expect(clash).toHaveProperty('location');
    });

    it('generates unique IDs for each clash', () => {
      const wall = makeWall('w1', 0, -100, 5000, -100, 200);
      const col1 = makeColumn('c1', 1000, 0, 400);
      const col2 = makeColumn('c2', 3000, 0, 400);
      const clashes = detectClashes([wall, col1, col2]);
      const ids = clashes.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('does not report self-clashes', () => {
      const col = makeColumn('c1', 1000, 1000, 400);
      const clashes = detectClashes([col]);
      expect(clashes).toHaveLength(0);
    });

    it('does not report duplicate clashes (A vs B and B vs A)', () => {
      const wall = makeWall('w1', 0, -100, 5000, -100, 200);
      const col = makeColumn('c1', 2500, 0, 400);
      const clashes = detectClashes([wall, col]);
      // Should only report each pair once
      const pairs = clashes.map((c) => [c.elementAId, c.elementBId].sort().join('|'));
      const uniquePairs = new Set(pairs);
      expect(uniquePairs.size).toBe(pairs.length);
    });
  });
});
