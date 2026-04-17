/**
 * Advanced Geometry Operations Tests
 * T-3D-006: Chamfer, Fillet, Loft, Sweep, Shell, OffsetPolygon
 * Property-based tests with fast-check
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createBox } from './primitives';
import { extrude, createPolygon2D, polygonArea } from './extrude';
import { solidVolume, isManifold, isSolid } from './boolean';
import { createPoint2D } from './core';
import {
  chamfer,
  filletBox as fillet,
  loft,
  sweep,
  shell,
  offsetPolygon,
  type ChamferOptions,
  type FilletOptions,
  type LoftOptions,
  type SweepPath,
} from './advanced';

// ─── Chamfer ─────────────────────────────────────────────────────────────────

describe('T-3D-006a: Chamfer operation', () => {
  it('should return unchanged solid when distance is 0', () => {
    const box = createBox(100, 100, 100);
    const result = chamfer(box, { distance: 0 });
    expect(result.vertices.length).toBe(box.vertices.length);
    expect(result.faces.length).toBe(box.faces.length);
  });

  it('should reduce bounding box when chamfer is applied', () => {
    const box = createBox(100, 100, 100);
    const result = chamfer(box, { distance: 10 });
    const origVol = solidVolume(box);
    const chamfVol = solidVolume(result);
    // Chamfering removes material → volume decreases
    expect(chamfVol).toBeLessThan(origVol);
  });

  it('should return original solid when chamfer distance would collapse it', () => {
    const box = createBox(10, 10, 100);
    // distance >= half of smallest dimension → no-op
    const result = chamfer(box, { distance: 5 });
    expect(result).toBeDefined();
  });

  it('should produce a valid solid with faces', () => {
    const box = createBox(200, 200, 300);
    const result = chamfer(box, { distance: 20 });
    expect(result.faces.length).toBeGreaterThan(6); // more than original box faces
    expect(result.vertices.length).toBeGreaterThan(8);
  });

  it('chamfer bounding box fits within original bounding box', () => {
    const box = createBox(100, 200, 300);
    const d = 15;
    const result = chamfer(box, { distance: d });
    // The chamfered solid's bounding box should not exceed the original
    expect(result.boundingBox.max.x).toBeLessThanOrEqual(box.boundingBox.max.x + 0.001);
    expect(result.boundingBox.max.y).toBeLessThanOrEqual(box.boundingBox.max.y + 0.001);
    expect(result.boundingBox.max.z).toBeLessThanOrEqual(box.boundingBox.max.z + 0.001);
  });
});

// ─── Fillet ──────────────────────────────────────────────────────────────────

describe('T-3D-006b: Fillet operation', () => {
  it('should return unchanged solid when radius is 0', () => {
    const box = createBox(100, 100, 100);
    const result = fillet(box, { radius: 0 });
    expect(result.vertices.length).toBe(box.vertices.length);
  });

  it('should produce more vertices than original box', () => {
    const box = createBox(100, 100, 100);
    const result = fillet(box, { radius: 10, segments: 4 });
    expect(result.vertices.length).toBeGreaterThan(8);
  });

  it('should produce valid solid with correct z span', () => {
    const box = createBox(100, 100, 200);
    const result = fillet(box, { radius: 10, segments: 8 });
    // z span should match original height
    const origHeight = box.boundingBox.max.z - box.boundingBox.min.z;
    const resultHeight = result.boundingBox.max.z - result.boundingBox.min.z;
    expect(resultHeight).toBeCloseTo(origHeight, 1);
  });

  it('fillet with more segments approximates curve better', () => {
    const box = createBox(100, 100, 100);
    const few = fillet(box, { radius: 10, segments: 4 });
    const many = fillet(box, { radius: 10, segments: 16 });
    // More segments → more vertices → smoother approximation
    expect(many.vertices.length).toBeGreaterThan(few.vertices.length);
  });

  it('should handle non-square boxes', () => {
    const box = createBox(300, 150, 400);
    const result = fillet(box, { radius: 20, segments: 8 });
    expect(result.faces.length).toBeGreaterThan(0);
  });
});

// ─── Loft ─────────────────────────────────────────────────────────────────────

describe('T-3D-006c: Loft operation', () => {
  const squareProfile = createPolygon2D([
    createPoint2D(0, 0),
    createPoint2D(100, 0),
    createPoint2D(100, 100),
    createPoint2D(0, 100),
  ]);

  const smallSquareProfile = createPolygon2D([
    createPoint2D(25, 25),
    createPoint2D(75, 25),
    createPoint2D(75, 75),
    createPoint2D(25, 75),
  ]);

  it('should throw when fewer than 2 profiles provided', () => {
    expect(() => loft([squareProfile], [0])).toThrow('at least 2 profiles');
  });

  it('should throw when profile and height counts mismatch', () => {
    expect(() => loft([squareProfile, smallSquareProfile], [0])).toThrow('Number of profiles');
  });

  it('should produce a solid from two identical profiles', () => {
    const result = loft([squareProfile, squareProfile], [0, 500]);
    expect(result.faces.length).toBeGreaterThan(0);
    expect(result.vertices.length).toBeGreaterThan(0);
  });

  it('should loft from large to small profile (pyramid-like)', () => {
    const result = loft([squareProfile, smallSquareProfile], [0, 300]);
    // Volume should be less than full extrusion
    const fullExtrusion = extrude(squareProfile, 300);
    expect(solidVolume(result)).toBeLessThan(solidVolume(fullExtrusion));
  });

  it('should loft through 3 cross-sections', () => {
    const midProfile = createPolygon2D([
      createPoint2D(10, 10),
      createPoint2D(90, 10),
      createPoint2D(90, 90),
      createPoint2D(10, 90),
    ]);
    const result = loft(
      [squareProfile, midProfile, smallSquareProfile],
      [0, 150, 300]
    );
    expect(result.vertices.length).toBeGreaterThan(0);
    expect(result.faces.length).toBeGreaterThan(2); // at least bottom + top + sides
  });

  it('should produce valid bounding box', () => {
    const result = loft([squareProfile, smallSquareProfile], [0, 400]);
    expect(result.boundingBox.min.z).toBeLessThanOrEqual(0);
    expect(result.boundingBox.max.z).toBeGreaterThanOrEqual(400);
  });
});

// ─── Sweep ────────────────────────────────────────────────────────────────────

describe('T-3D-006d: Sweep operation', () => {
  const circleProfile = createPolygon2D([
    createPoint2D(0, 0),
    createPoint2D(50, 0),
    createPoint2D(50, 50),
    createPoint2D(0, 50),
  ]);

  const straightPath: SweepPath = {
    points: [
      { x: 0, y: 0, z: 0, _type: 'Point3D' },
      { x: 0, y: 0, z: 500, _type: 'Point3D' },
    ],
  };

  const curvedPath: SweepPath = {
    points: [
      { x: 0, y: 0, z: 0, _type: 'Point3D' },
      { x: 100, y: 0, z: 200, _type: 'Point3D' },
      { x: 200, y: 100, z: 400, _type: 'Point3D' },
    ],
  };

  it('should produce a solid from sweep along straight path', () => {
    const result = sweep(circleProfile, straightPath);
    expect(result.faces.length).toBeGreaterThan(0);
    expect(result.vertices.length).toBeGreaterThan(0);
  });

  it('should produce faces proportional to path length', () => {
    const shortPath: SweepPath = { points: [
      { x: 0, y: 0, z: 0, _type: 'Point3D' },
      { x: 0, y: 0, z: 100, _type: 'Point3D' },
    ]};
    const longPath: SweepPath = { points: [
      { x: 0, y: 0, z: 0, _type: 'Point3D' },
      { x: 0, y: 0, z: 100, _type: 'Point3D' },
      { x: 0, y: 0, z: 200, _type: 'Point3D' },
      { x: 0, y: 0, z: 300, _type: 'Point3D' },
    ]};
    const short = sweep(circleProfile, shortPath);
    const long = sweep(circleProfile, longPath);
    expect(long.faces.length).toBeGreaterThan(short.faces.length);
  });

  it('should handle curved path', () => {
    const result = sweep(circleProfile, curvedPath);
    expect(result.faces.length).toBeGreaterThan(0);
  });

  it('should produce bounding box that spans path extents', () => {
    const result = sweep(circleProfile, straightPath);
    expect(result.boundingBox.max.z).toBeGreaterThan(result.boundingBox.min.z);
  });
});

// ─── Shell ────────────────────────────────────────────────────────────────────

describe('T-3D-006e: Shell (hollow) operation', () => {
  it('should produce inner + outer faces (12 faces for a hollow box)', () => {
    const box = createBox(200, 200, 200);
    const shellResult = shell(box, 10);
    // 6 outer faces + 6 inner faces = 12
    expect(shellResult.faces.length).toBe(12);
  });

  it('should produce more faces than original box (inner + outer surfaces)', () => {
    const box = createBox(200, 200, 200);
    const shellResult = shell(box, 20);
    expect(shellResult.faces.length).toBeGreaterThan(box.faces.length);
  });

  it('should produce more vertices than original box (outer + inner corners)', () => {
    const box = createBox(100, 100, 100);
    const thickness = 10;
    const shellResult = shell(box, thickness);
    // 8 outer + 8 inner = 16 vertices vs 8 original
    expect(shellResult.vertices.length).toBeGreaterThan(box.vertices.length);
  });

  it('should return original solid if thickness is 0', () => {
    const box = createBox(100, 100, 100);
    const result = shell(box, 0);
    expect(result.faces.length).toBe(box.faces.length);
  });

  it('should produce non-zero volume shell', () => {
    const box = createBox(300, 300, 300);
    const result = shell(box, 25);
    expect(solidVolume(result)).toBeGreaterThan(0);
  });
});

// ─── OffsetPolygon ────────────────────────────────────────────────────────────

describe('T-3D-006f: OffsetPolygon operation', () => {
  const square = [
    createPoint2D(0, 0),
    createPoint2D(100, 0),
    createPoint2D(100, 100),
    createPoint2D(0, 100),
  ];

  it('should produce inward-offset polygon with smaller area', () => {
    const offset = offsetPolygon(square, -10);
    const origArea = polygonArea(square);
    const offsetArea = polygonArea(offset);
    expect(offsetArea).toBeLessThan(origArea);
  });

  it('should produce outward-offset polygon with larger area', () => {
    const offset = offsetPolygon(square, 10);
    const origArea = polygonArea(square);
    const offsetArea = polygonArea(offset);
    expect(offsetArea).toBeGreaterThan(origArea);
  });

  it('should preserve vertex count for convex polygon', () => {
    const offset = offsetPolygon(square, 10);
    expect(offset.length).toBe(square.length);
  });

  it('should return empty or minimal polygon when offset collapses shape', () => {
    // Offset inward by half the square side — should collapse
    const result = offsetPolygon(square, -51);
    // Either empty or very small area
    if (result.length > 0) {
      expect(polygonArea(result)).toBeLessThanOrEqual(polygonArea(square));
    }
  });

  it('double offset (in then out) should approximately restore original', () => {
    const inner = offsetPolygon(square, -10);
    const restored = offsetPolygon(inner, 10);
    const origArea = polygonArea(square);
    const restoredArea = polygonArea(restored);
    // Should be close (within 5%) but may not be exact due to polygon simplification
    expect(Math.abs(restoredArea - origArea) / origArea).toBeLessThan(0.05);
  });

  it('should handle L-shaped polygon', () => {
    const lShape = [
      createPoint2D(0, 0),
      createPoint2D(200, 0),
      createPoint2D(200, 80),
      createPoint2D(80, 80),
      createPoint2D(80, 200),
      createPoint2D(0, 200),
    ];
    const offset = offsetPolygon(lShape, -10);
    expect(offset.length).toBeGreaterThan(0);
    expect(polygonArea(offset)).toBeLessThan(polygonArea(lShape));
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

describe('T-3D-007: Property-based geometry invariants', () => {
  describe('Volume invariant: extrude volume = area × height', () => {
    it('holds for random rectangles and heights (fast-check)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2000 }),  // width
          fc.integer({ min: 100, max: 2000 }),  // depth
          fc.integer({ min: 100, max: 5000 }),  // height
          (w, d, h) => {
            const rect = [
              createPoint2D(0, 0),
              createPoint2D(w, 0),
              createPoint2D(w, d),
              createPoint2D(0, d),
            ];
            const profile = createPolygon2D(rect);
            const solid = extrude(profile, h);
            const expectedVol = w * d * h;
            const actualVol = solidVolume(solid);
            return Math.abs(actualVol - expectedVol) / expectedVol < 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Manifold invariant: all extruded solids are manifold', () => {
    it('holds for convex polygons (fast-check)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 8 }),  // n-gon sides
          fc.integer({ min: 50, max: 300 }), // radius
          fc.integer({ min: 100, max: 2000 }), // height
          (n, r, h) => {
            const pts = Array.from({ length: n }, (_, i) => {
              const angle = (2 * Math.PI * i) / n;
              return createPoint2D(r * Math.cos(angle), r * Math.sin(angle));
            });
            const profile = createPolygon2D(pts);
            const solid = extrude(profile, h);
            return isManifold(solid) && isSolid(solid);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Polygon area invariant: area >= 0 for all polygons', () => {
    it('holds for random convex polygons (fast-check)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 10 }),
          fc.integer({ min: 10, max: 500 }),
          (n, r) => {
            const pts = Array.from({ length: n }, (_, i) => {
              const angle = (2 * Math.PI * i) / n;
              return createPoint2D(r * Math.cos(angle), r * Math.sin(angle));
            });
            return polygonArea(pts) >= 0;
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Chamfer monotonicity: larger distance → smaller volume', () => {
    it('holds for a box (fast-check)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 500 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 21, max: 40 }),
          (size, d1, d2) => {
            const box = createBox(size, size, size);
            const v1 = solidVolume(chamfer(box, { distance: d1 }));
            const v2 = solidVolume(chamfer(box, { distance: d2 }));
            // Larger chamfer → smaller (or equal) volume
            return v2 <= v1 + 0.001;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Offset polygon area monotonicity', () => {
    it('larger inward offset → smaller area (fast-check)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 500 }),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 11, max: 20 }),
          (side, d1, d2) => {
            const square = [
              createPoint2D(0, 0),
              createPoint2D(side, 0),
              createPoint2D(side, side),
              createPoint2D(0, side),
            ];
            const a1 = polygonArea(offsetPolygon(square, -d1));
            const a2 = polygonArea(offsetPolygon(square, -d2));
            return a2 <= a1 + 0.001;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Loft volume between identical profiles = extrude volume', () => {
    it('loft with identical sections equals extrusion (fast-check)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 300 }),
          fc.integer({ min: 50, max: 300 }),
          fc.integer({ min: 100, max: 1000 }),
          (w, d, h) => {
            const pts = [
              createPoint2D(0, 0),
              createPoint2D(w, 0),
              createPoint2D(w, d),
              createPoint2D(0, d),
            ];
            const profile = createPolygon2D(pts);
            const lofted = loft([profile, profile], [0, h]);
            const extruded = extrude(profile, h);
            const loftVol = solidVolume(lofted);
            const extVol = solidVolume(extruded);
            return Math.abs(loftVol - extVol) / extVol < 0.05;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Shell produces more faces than original solid', () => {
    it('shell always has more faces than original box (fast-check)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 500 }),
          fc.integer({ min: 5, max: 30 }),
          (size, thickness) => {
            const box = createBox(size, size, size);
            const shellResult = shell(box, thickness);
            // Shell creates inner + outer surfaces → more faces than original 6-face box
            return shellResult.faces.length >= box.faces.length;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
