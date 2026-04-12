/**
 * Geometry Core Types and Utilities
 * Fundamental geometry operations for 2D/3D modeling
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Point3D extends Vector3D {
  _type: 'Point3D';
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Point2D extends Vector2D {
  _type: 'Point2D';
}

export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
}

export interface Transform {
  translation: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
}

export function createPoint3D(x: number, y: number, z: number): Point3D {
  return { x, y, z, _type: 'Point3D' };
}

export function createPoint2D(x: number, y: number): Point2D {
  return { x, y, _type: 'Point2D' };
}

export function addVectors(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtractVectors(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVector(v: Vector3D, s: number): Vector3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dotProduct(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossProduct(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function magnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalize(v: Vector3D): Vector3D {
  const mag = magnitude(v);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return scaleVector(v, 1 / mag);
}

export function distance(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distance2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function midpoint(a: Point3D, b: Point3D): Point3D {
  return createPoint3D((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(a: Point3D, b: Point3D, t: number): Point3D {
  return createPoint3D(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
}

export function createBoundingBox(min: Point3D, max: Point3D): BoundingBox3D {
  return { min, max };
}

export function expandBoundingBox(box: BoundingBox3D, point: Point3D): BoundingBox3D {
  return {
    min: createPoint3D(
      Math.min(box.min.x, point.x),
      Math.min(box.min.y, point.y),
      Math.min(box.min.z, point.z)
    ),
    max: createPoint3D(
      Math.max(box.max.x, point.x),
      Math.max(box.max.y, point.y),
      Math.max(box.max.z, point.z)
    ),
  };
}

export function boundingBoxVolume(box: BoundingBox3D): number {
  const dx = box.max.x - box.min.x;
  const dy = box.max.y - box.min.y;
  const dz = box.max.z - box.min.z;
  return Math.abs(dx * dy * dz);
}

export function boundingBoxCenter(box: BoundingBox3D): Point3D {
  return midpoint(box.min, box.max);
}

export function isPointInBoundingBox(point: Point3D, box: BoundingBox3D): boolean {
  return (
    point.x >= box.min.x &&
    point.x <= box.max.x &&
    point.y >= box.min.y &&
    point.y <= box.max.y &&
    point.z >= box.min.z &&
    point.z <= box.max.z
  );
}
