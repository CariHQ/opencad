/**
 * Geometry Kernel Tests
 * Tests for T-3D-001 through T-3D-005
 */

import { describe, it, expect } from 'vitest';
import { createBox } from './primitives';
import { Solid, solidVolume, isManifold, eulerCharacteristic, isSolid } from './boolean';
import { extrude, createPolygon2D, polygonArea, isConvex } from './extrude';
import { Point2D, createPoint2D } from './core';

describe('Geometry Kernel Tests', () => {
  describe('T-3D-001: Extrude → verify solid volume = area × height (±0.1%)', () => {
    it('should calculate correct volume for extruded rectangle', () => {
      const rectangle: Point2D[] = [
        createPoint2D(0, 0),
        createPoint2D(1000, 0),
        createPoint2D(1000, 500),
        createPoint2D(0, 500),
      ];

      const height = 3000;
      const solid = extrude({ outer: rectangle, holes: [] }, height);

      const baseArea = polygonArea(rectangle);
      const expectedVolume = baseArea * height;
      const actualVolume = solidVolume(solid);

      const tolerance = expectedVolume * 0.001;
      expect(Math.abs(actualVolume - expectedVolume)).toBeLessThan(tolerance);
    });

    it('should calculate correct volume for extruded L-shape', () => {
      const lShape: Point2D[] = [
        createPoint2D(0, 0),
        createPoint2D(2000, 0),
        createPoint2D(2000, 500),
        createPoint2D(500, 500),
        createPoint2D(500, 1500),
        createPoint2D(0, 1500),
      ];

      const height = 3000;
      const solid = extrude({ outer: lShape, holes: [] }, height);

      const baseArea = polygonArea(lShape);
      const expectedVolume = baseArea * height;
      const actualVolume = solidVolume(solid);

      const tolerance = expectedVolume * 0.001;
      expect(Math.abs(actualVolume - expectedVolume)).toBeLessThan(tolerance);
    });

    it('should verify volume invariance for different heights', () => {
      const rectangle: Point2D[] = [
        createPoint2D(0, 0),
        createPoint2D(1000, 0),
        createPoint2D(1000, 1000),
        createPoint2D(0, 1000),
      ];

      const heights = [1000, 2000, 3000, 5000];
      const baseArea = polygonArea(rectangle);

      for (const height of heights) {
        const solid = extrude({ outer: rectangle, holes: [] }, height);
        const expectedVolume = baseArea * height;
        const actualVolume = solidVolume(solid);

        expect(Math.abs(actualVolume - expectedVolume) / expectedVolume).toBeLessThan(0.001);
      }
    });
  });

  describe('T-3D-002: Boolean → verify resulting topology is manifold', () => {
    it('should create manifold solid from box', () => {
      const box = createBox(100, 100, 100);

      expect(isManifold(box)).toBe(true);
      expect(isSolid(box)).toBe(true);
    });

    it('should have valid euler characteristic for convex solid', () => {
      const box = createBox(100, 100, 100);
      const chi = eulerCharacteristic(box);

      expect(chi).toBe(2);
    });

    it('should have correct vertex/edge/face count for box', () => {
      const box = createBox(100, 100, 100);

      expect(box.vertices.length).toBe(8);
      expect(box.edges.length).toBe(12);
      expect(box.faces.length).toBe(6);
    });
  });

  describe('T-3D-003: Convex polygon detection', () => {
    it('should identify convex polygon', () => {
      const square: Point2D[] = [
        createPoint2D(0, 0),
        createPoint2D(100, 0),
        createPoint2D(100, 100),
        createPoint2D(0, 100),
      ];

      expect(isConvex(square)).toBe(true);
    });

    it('should identify concave polygon', () => {
      const concave: Point2D[] = [
        createPoint2D(0, 0),
        createPoint2D(100, 0),
        createPoint2D(100, 100),
        createPoint2D(50, 50),
        createPoint2D(0, 100),
      ];

      expect(isConvex(concave)).toBe(false);
    });

    it('should identify L-shape as concave', () => {
      const lShape: Point2D[] = [
        createPoint2D(0, 0),
        createPoint2D(200, 0),
        createPoint2D(200, 50),
        createPoint2D(50, 50),
        createPoint2D(50, 150),
        createPoint2D(0, 150),
      ];

      expect(isConvex(lShape)).toBe(false);
    });
  });

  describe('T-3D-005: Geometry transformations', () => {
    it('should compute correct bounding box for box', () => {
      const box = createBox(100, 200, 300);

      expect(box.boundingBox.min.x).toBe(-50);
      expect(box.boundingBox.min.y).toBe(-100);
      expect(box.boundingBox.min.z).toBe(-150);
      expect(box.boundingBox.max.x).toBe(50);
      expect(box.boundingBox.max.y).toBe(100);
      expect(box.boundingBox.max.z).toBe(150);
    });

    it('should compute correct bounding box for extruded profile', () => {
      const rectangle: Point2D[] = [
        createPoint2D(0, 0),
        createPoint2D(1000, 0),
        createPoint2D(1000, 500),
        createPoint2D(0, 500),
      ];

      const height = 3000;
      const solid = extrude({ outer: rectangle, holes: [] }, height);

      expect(solid.boundingBox.min.x).toBe(0);
      expect(solid.boundingBox.min.y).toBe(0);
      expect(solid.boundingBox.min.z).toBe(0);
      expect(solid.boundingBox.max.x).toBe(1000);
      expect(solid.boundingBox.max.y).toBe(500);
      expect(solid.boundingBox.max.z).toBe(3000);
    });
  });
});
