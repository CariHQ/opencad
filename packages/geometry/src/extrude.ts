/**
 * Extrude Operations
 * Create 3D solids from 2D profiles
 */

import { Point3D, Point2D, createPoint3D, Vector3D } from './core';
import { Solid, Face, createSolid } from './boolean';

export interface Profile2D {
  outer: Point2D[];
  holes: Point2D[][];
}

export function createPolygon2D(points: Point2D[]): Profile2D {
  return { outer: points, holes: [] };
}

export function polygonArea(outer: Point2D[]): number {
  let area = 0;
  const n = outer.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += outer[i].x * outer[j].y;
    area -= outer[j].x * outer[i].y;
  }

  return Math.abs(area) / 2;
}

export function isConvex(outer: Point2D[]): boolean {
  const n = outer.length;
  if (n < 3) return false;

  let sign: number | null = null;

  for (let i = 0; i < n; i++) {
    const a = outer[i];
    const b = outer[(i + 1) % n];
    const c = outer[(i + 2) % n];

    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);

    if (cross !== 0) {
      if (sign === null) {
        sign = cross > 0 ? 1 : -1;
      } else if ((cross > 0 ? 1 : -1) !== sign) {
        return false;
      }
    }
  }

  return true;
}

export function extrude(
  profile: Profile2D,
  height: number,
  axis: Vector3D = { x: 0, y: 0, z: 1 }
): Solid {
  const { outer, holes } = profile;
  const n = outer.length;

  const vertices: Point3D[] = [];
  const faces: Face[] = [];

  const bottomZ = 0;
  const topZ = height;
  const axisNorm = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
  const dir: Vector3D = {
    x: axis.x / axisNorm,
    y: axis.y / axisNorm,
    z: axis.z / axisNorm,
  };

  for (const point of outer) {
    vertices.push(createPoint3D(point.x, point.y, bottomZ));
    vertices.push(createPoint3D(point.x, point.y, topZ));
  }

  for (const hole of holes) {
    for (const point of hole) {
      vertices.push(createPoint3D(point.x, point.y, bottomZ));
      vertices.push(createPoint3D(point.x, point.y, topZ));
    }
  }

  const bottomFace: Face = {
    id: crypto.randomUUID(),
    vertices: outer.map((p) => createPoint3D(p.x, p.y, bottomZ)),
    normal: { x: -dir.x, y: -dir.y, z: -dir.z },
    area: polygonArea(outer),
  };
  faces.push(bottomFace);

  const topFace: Face = {
    id: crypto.randomUUID(),
    vertices: [...outer].reverse().map((p) => createPoint3D(p.x, p.y, topZ)),
    normal: dir,
    area: polygonArea(outer),
  };
  faces.push(topFace);

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const v0 = createPoint3D(outer[i].x, outer[i].y, bottomZ);
    const v1 = createPoint3D(outer[i].x, outer[i].y, topZ);
    const v2 = createPoint3D(outer[j].x, outer[j].y, topZ);
    const v3 = createPoint3D(outer[j].x, outer[j].y, bottomZ);

    const edgeNormal = computeSideNormal(v0, v1, v2);
    const area = computeQuadArea(v0, v1, v2, v3);

    faces.push({
      id: crypto.randomUUID(),
      vertices: [v0, v1, v2, v3],
      normal: edgeNormal,
      area,
    });
  }

  for (const hole of holes) {
    const holeN = hole.length;
    for (let i = 0; i < holeN; i++) {
      const j = (i + 1) % holeN;
      const v0 = createPoint3D(hole[i].x, hole[i].y, bottomZ);
      const v1 = createPoint3D(hole[i].x, hole[i].y, topZ);
      const v2 = createPoint3D(hole[j].x, hole[j].y, topZ);
      const v3 = createPoint3D(hole[j].x, hole[j].y, bottomZ);

      const edgeNormal = computeSideNormal(v0, v1, v2);
      const area = computeQuadArea(v0, v1, v2, v3);

      faces.push({
        id: crypto.randomUUID(),
        vertices: [v0, v1, v2, v3],
        normal: edgeNormal,
        area,
      });
    }
  }

  return createSolid(vertices, faces);
}

function computeSideNormal(
  v0: Point3D,
  v1: Point3D,
  v2: Point3D
): { x: number; y: number; z: number } {
  const a = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
  const b = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function computeQuadArea(v0: Point3D, v1: Point3D, v2: Point3D, v3: Point3D): number {
  const a = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
  const b = { x: v3.x - v0.x, y: v3.y - v0.y, z: v3.z - v0.z };
  const cross = {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
  return Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
}
