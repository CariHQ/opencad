/**
 * Geometry Types
 * Core geometry definitions for 2D/3D modeling
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D extends Vector2D {
  readonly _type: 'Point2D';
}

export interface Point3D extends Vector3D {
  readonly _type: 'Point3D';
}

export interface BoundingBox2D {
  min: Point2D;
  max: Point2D;
}

export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
}

export type Axis = 'x' | 'y' | 'z';

export interface Transform {
  translation: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
}

export interface Plane {
  origin: Point3D;
  normal: Vector3D;
  xAxis: Vector3D;
  yAxis: Vector3D;
}

export interface Matrix4x4 {
  m: number[];
}

export type CurveType = 'line' | 'arc' | 'circle' | 'ellipse' | 'bezier' | 'spline' | 'polyline';

export interface Line2D {
  _type: 'Line2D';
  start: Point2D;
  end: Point2D;
}

export interface Line3D {
  _type: 'Line3D';
  start: Point3D;
  end: Point3D;
}

export interface Circle {
  _type: 'Circle';
  center: Point3D;
  radius: number;
  normal: Vector3D;
}

export interface Arc {
  _type: 'Arc';
  center: Point3D;
  radius: number;
  startAngle: number;
  endAngle: number;
  normal: Vector3D;
}

export interface Polyline2D {
  _type: 'Polyline2D';
  points: Point2D[];
  closed: boolean;
}

export interface Polyline3D {
  _type: 'Polyline3D';
  points: Point3D[];
  closed: boolean;
}

export interface BezierCurve {
  _type: 'BezierCurve';
  controlPoints: Point3D[];
  degree: number;
}

export interface NurbsCurve {
  _type: 'NurbsCurve';
  controlPoints: Point3D[];
  knots: number[];
  weights: number[];
  degree: number;
}

export type Curve2D = Line2D | Circle | Arc | Polyline2D;
export type Curve3D = Line3D | Circle | Arc | Polyline3D | BezierCurve | NurbsCurve;

export interface Polygon2D {
  _type: 'Polygon2D';
  outer: Polyline2D;
  holes: Polyline2D[];
}

export interface Polygon3D {
  _type: 'Polygon3D';
  outer: Polyline3D;
  holes: Polyline3D[];
}

export interface Surface {
  _type: 'Surface';
  boundary: Curve3D[];
  trimDomain: { u: [number, number]; v: [number, number] };
}

export interface BrepSolid {
  _type: 'BrepSolid';
  faces: Surface[];
  edges: Curve3D[];
  vertices: Point3D[];
  isManifold: boolean;
  volume: number;
  surfaceArea: number;
}

export interface Mesh {
  _type: 'Mesh';
  vertices: Vector3D[];
  faces: number[][];
  normals: Vector3D[];
  uvs: Vector2D[];
}

export type GeometryType =
  | 'Point'
  | 'Line'
  | 'Arc'
  | 'Circle'
  | 'Polyline'
  | 'Polygon'
  | 'Bezier'
  | 'NurbsCurve'
  | 'Surface'
  | 'BrepSolid'
  | 'Mesh';

export interface Geometry {
  id: string;
  type: GeometryType;
  transform: Transform;
  boundingBox: BoundingBox3D;
}

export function createPoint2D(x: number, y: number): Point2D {
  return { x, y, _type: 'Point2D' };
}

export function createPoint3D(x: number, y: number, z: number): Point3D {
  return { x, y, z };
}

export function createLine2D(start: Point2D, end: Point2D): Line2D {
  return { _type: 'Line2D', start, end };
}

export function createLine3D(start: Point3D, end: Point3D): Line3D {
  return { _type: 'Line3D', start, end };
}

export function distance2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distance3D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function midpoint2D(a: Point2D, b: Point2D): Point2D {
  return createPoint2D((a.x + b.x) / 2, (a.y + b.y) / 2);
}

export function midpoint3D(a: Point3D, b: Point3D): Point3D {
  return createPoint3D((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

export function crossProduct(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function dotProduct(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function normalize(v: Vector3D): Vector3D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
