/**
 * Core Geometry Tests
 * T-3D-010: Vector and point operations
 */
import { describe, it, expect } from 'vitest';
import {
  createPoint3D,
  createPoint2D,
  addVectors,
  subtractVectors,
  scaleVector,
  dotProduct,
  crossProduct,
  magnitude,
  normalize,
  distance,
  distance2D,
  midpoint,
  lerp,
  lerpPoint,
  createBoundingBox,
  expandBoundingBox,
  boundingBoxVolume,
  boundingBoxCenter,
  isPointInBoundingBox,
} from './core';

describe('T-3D-010: createPoint3D', () => {
  it('creates a point with correct coordinates', () => {
    const p = createPoint3D(1, 2, 3);
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
    expect(p.z).toBe(3);
  });

  it('_type is Point3D', () => {
    const p = createPoint3D(0, 0, 0);
    expect(p._type).toBe('Point3D');
  });
});

describe('T-3D-010: createPoint2D', () => {
  it('creates a point with correct coordinates', () => {
    const p = createPoint2D(5, 7);
    expect(p.x).toBe(5);
    expect(p.y).toBe(7);
  });

  it('_type is Point2D', () => {
    const p = createPoint2D(0, 0);
    expect(p._type).toBe('Point2D');
  });
});

describe('T-3D-010: addVectors', () => {
  it('adds two vectors', () => {
    const result = addVectors({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
    expect(result).toEqual({ x: 5, y: 7, z: 9 });
  });
});

describe('T-3D-010: subtractVectors', () => {
  it('subtracts two vectors', () => {
    const result = subtractVectors({ x: 5, y: 7, z: 9 }, { x: 1, y: 2, z: 3 });
    expect(result).toEqual({ x: 4, y: 5, z: 6 });
  });
});

describe('T-3D-010: scaleVector', () => {
  it('scales a vector by scalar', () => {
    const result = scaleVector({ x: 1, y: 2, z: 3 }, 2);
    expect(result).toEqual({ x: 2, y: 4, z: 6 });
  });

  it('scale by 0 returns zero vector', () => {
    const result = scaleVector({ x: 5, y: 5, z: 5 }, 0);
    expect(result).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('T-3D-010: dotProduct', () => {
  it('computes dot product', () => {
    expect(dotProduct({ x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(1);
  });

  it('perpendicular vectors have dot product 0', () => {
    expect(dotProduct({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0);
  });
});

describe('T-3D-010: crossProduct', () => {
  it('x cross y = z', () => {
    const result = crossProduct({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(0, 5);
    expect(result.z).toBeCloseTo(1, 5);
  });
});

describe('T-3D-010: magnitude', () => {
  it('computes magnitude of unit vector', () => {
    expect(magnitude({ x: 1, y: 0, z: 0 })).toBeCloseTo(1, 5);
  });

  it('computes magnitude of 3-4-5 vector', () => {
    expect(magnitude({ x: 3, y: 4, z: 0 })).toBeCloseTo(5, 5);
  });

  it('zero vector has magnitude 0', () => {
    expect(magnitude({ x: 0, y: 0, z: 0 })).toBe(0);
  });
});

describe('T-3D-010: normalize', () => {
  it('normalizes a vector to unit length', () => {
    const v = normalize({ x: 3, y: 4, z: 0 });
    expect(magnitude(v)).toBeCloseTo(1, 5);
  });

  it('normalized x component is correct', () => {
    const v = normalize({ x: 3, y: 4, z: 0 });
    expect(v.x).toBeCloseTo(0.6, 5);
    expect(v.y).toBeCloseTo(0.8, 5);
  });
});

describe('T-3D-010: distance', () => {
  it('distance between same point is 0', () => {
    const p = createPoint3D(1, 2, 3);
    expect(distance(p, p)).toBe(0);
  });

  it('distance between (0,0,0) and (1,0,0) is 1', () => {
    expect(distance(createPoint3D(0, 0, 0), createPoint3D(1, 0, 0))).toBeCloseTo(1, 5);
  });

  it('3D distance is computed correctly', () => {
    expect(distance(createPoint3D(0, 0, 0), createPoint3D(1, 1, 1))).toBeCloseTo(Math.sqrt(3), 5);
  });
});

describe('T-3D-010: distance2D', () => {
  it('2D distance between (0,0) and (3,4) is 5', () => {
    expect(distance2D(createPoint2D(0, 0), createPoint2D(3, 4))).toBeCloseTo(5, 5);
  });
});

describe('T-3D-010: midpoint', () => {
  it('midpoint of (0,0,0) and (2,4,6) is (1,2,3)', () => {
    const mid = midpoint(createPoint3D(0, 0, 0), createPoint3D(2, 4, 6));
    expect(mid.x).toBe(1);
    expect(mid.y).toBe(2);
    expect(mid.z).toBe(3);
  });
});

describe('T-3D-010: lerp', () => {
  it('lerp(0, 10, 0) = 0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });

  it('lerp(0, 10, 1) = 10', () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('lerp(0, 10, 0.5) = 5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe('T-3D-010: lerpPoint', () => {
  it('lerpPoint at t=0 returns point a', () => {
    const a = createPoint3D(0, 0, 0);
    const b = createPoint3D(10, 10, 10);
    const result = lerpPoint(a, b, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.z).toBe(0);
  });

  it('lerpPoint at t=0.5 returns midpoint', () => {
    const a = createPoint3D(0, 0, 0);
    const b = createPoint3D(10, 10, 10);
    const result = lerpPoint(a, b, 0.5);
    expect(result.x).toBe(5);
    expect(result.y).toBe(5);
    expect(result.z).toBe(5);
  });
});

describe('T-3D-010: bounding boxes', () => {
  const min = createPoint3D(0, 0, 0);
  const max = createPoint3D(4, 3, 2);
  const box = createBoundingBox(min, max);

  it('createBoundingBox sets min and max', () => {
    expect(box.min.x).toBe(0);
    expect(box.max.x).toBe(4);
  });

  it('boundingBoxVolume computes correctly', () => {
    expect(boundingBoxVolume(box)).toBeCloseTo(24, 5);
  });

  it('boundingBoxCenter is the midpoint', () => {
    const center = boundingBoxCenter(box);
    expect(center.x).toBeCloseTo(2, 5);
    expect(center.y).toBeCloseTo(1.5, 5);
    expect(center.z).toBeCloseTo(1, 5);
  });

  it('isPointInBoundingBox: interior point returns true', () => {
    const p = createPoint3D(2, 1.5, 1);
    expect(isPointInBoundingBox(p, box)).toBe(true);
  });

  it('isPointInBoundingBox: exterior point returns false', () => {
    const p = createPoint3D(5, 5, 5);
    expect(isPointInBoundingBox(p, box)).toBe(false);
  });

  it('expandBoundingBox expands to include new point', () => {
    const expanded = expandBoundingBox(box, createPoint3D(10, 10, 10));
    expect(expanded.max.x).toBe(10);
    expect(expanded.max.y).toBe(10);
    expect(expanded.max.z).toBe(10);
  });
});
