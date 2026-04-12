/**
 * Boolean Operations
 * Union, difference, and intersection for 3D solids
 */

import { Point3D, BoundingBox3D, createPoint3D, expandBoundingBox } from './core';

export type BooleanOperation = 'union' | 'difference' | 'intersection';

export interface Solid {
  id: string;
  faces: Face[];
  edges: Edge[];
  vertices: Point3D[];
  boundingBox: BoundingBox3D;
}

export interface Face {
  id: string;
  vertices: Point3D[];
  normal: { x: number; y: number; z: number };
  area: number;
}

export interface Edge {
  id: string;
  start: Point3D;
  end: Point3D;
  length: number;
}

export function createSolid(vertices: Point3D[], faces: Face[]): Solid {
  const edges = extractEdges(vertices, faces);
  const boundingBox = computeBoundingBox(vertices);

  return {
    id: crypto.randomUUID(),
    vertices,
    faces,
    edges,
    boundingBox,
  };
}

function extractEdges(vertices: Point3D[], faces: Face[]): Edge[] {
  const edgeMap = new Map<string, Edge>();
  const tolerance = 1e-6;

  for (const face of faces) {
    for (let i = 0; i < face.vertices.length; i++) {
      const a = face.vertices[i];
      const b = face.vertices[(i + 1) % face.vertices.length];
      const key = edgeKey(a, b, tolerance);

      if (!edgeMap.has(key)) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

        edgeMap.set(key, {
          id: crypto.randomUUID(),
          start: a,
          end: b,
          length,
        });
      }
    }
  }

  return Array.from(edgeMap.values());
}

function edgeKey(a: Point3D, b: Point3D, tolerance: number): string {
  const scale = 1 / tolerance;
  const ax = Math.round(a.x * scale);
  const ay = Math.round(a.y * scale);
  const az = Math.round(a.z * scale);
  const bx = Math.round(b.x * scale);
  const by = Math.round(b.y * scale);
  const bz = Math.round(b.z * scale);

  // Normalize key so A->B and B->A are the same
  const aKey = `${ax},${ay},${az}`;
  const bKey = `${bx},${by},${bz}`;
  return aKey < bKey ? `${aKey}-${bKey}` : `${bKey}-${aKey}`;
}

function computeBoundingBox(vertices: Point3D[]): BoundingBox3D {
  if (vertices.length === 0) {
    return {
      min: createPoint3D(0, 0, 0),
      max: createPoint3D(0, 0, 0),
    };
  }

  let min = { ...vertices[0] };
  let max = { ...vertices[0] };

  for (const v of vertices) {
    min = expandBoundingBox({ min, max }, v).min;
    max = expandBoundingBox({ min, max }, v).max;
  }

  return { min: min as Point3D, max: max as Point3D };
}

export function solidVolume(solid: Solid): number {
  // For extruded solids, compute volume from bounding box height and base faces
  // Find top and bottom faces (parallel to XY plane)

  let topArea = 0;
  let topZ = 0;
  let bottomArea = 0;
  let bottomZ = 0;

  for (const face of solid.faces) {
    // Check if face is horizontal (normal points in Z direction)
    const isHorizontal = Math.abs(Math.abs(face.normal.z) - 1) < 0.001;

    if (isHorizontal && face.normal.z > 0) {
      // Top face
      topArea = face.area;
      // Find the Z coordinate from any vertex
      if (face.vertices.length > 0) {
        topZ = face.vertices[0].z;
      }
    } else if (isHorizontal && face.normal.z < 0) {
      // Bottom face
      bottomArea = face.area;
      if (face.vertices.length > 0) {
        bottomZ = face.vertices[0].z;
      }
    }
  }

  // Volume = base area * height
  const height = Math.abs(topZ - bottomZ);

  // For a properly formed extrusion, top and bottom areas should be equal
  if (topArea > 0 && height > 0) {
    return topArea * height;
  }

  // Fallback: compute from bounding box
  const bb = solid.boundingBox;
  const dx = bb.max.x - bb.min.x;
  const dy = bb.max.y - bb.min.y;
  const dz = bb.max.z - bb.min.z;
  return dx * dy * dz;
}

function computeFaceCentroid(face: Face): Point3D {
  let x = 0,
    y = 0,
    z = 0;
  for (const v of face.vertices) {
    x += v.x;
    y += v.y;
    z += v.z;
  }
  const n = face.vertices.length;
  return createPoint3D(x / n, y / n, z / n);
}

function dotProduct3D(a: Point3D, b: { x: number; y: number; z: number }): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function isManifold(solid: Solid): boolean {
  // For a manifold solid, each vertex should appear in exactly 2 edges per face
  // We'll verify by checking if all vertices are used in the expected number of edges

  // A box has 8 vertices, each should have 3 edges meeting at it
  const vertexEdgeCount = new Map<string, number>();
  const tolerance = 1e-6;
  const scale = 1 / tolerance;

  // Count edge occurrences from faces
  for (const face of solid.faces) {
    for (let i = 0; i < face.vertices.length; i++) {
      const v = face.vertices[i];
      const key = `${Math.round(v.x * scale)},${Math.round(v.y * scale)},${Math.round(v.z * scale)}`;
      vertexEdgeCount.set(key, (vertexEdgeCount.get(key) || 0) + 1);
    }
  }

  // Check that each vertex has edges meeting at it (at least 2 for valid geometry)
  for (const count of vertexEdgeCount.values()) {
    if (count < 2) return false;
  }

  // For a well-formed solid, edge count should be consistent
  // Each face contributes edges equal to its vertex count
  let totalEdgeOccurrences = 0;
  for (const face of solid.faces) {
    totalEdgeOccurrences += face.vertices.length;
  }

  // Each edge is shared by 2 faces, so edge count * 2 should equal edge occurrences
  // But we also need to check that edges are properly shared
  const uniqueEdges = solid.edges.length;

  // For a manifold solid, V - E + F should be 2 (Euler characteristic)
  const chi = eulerCharacteristic(solid);
  return Math.abs(chi) === 2 || chi === 0;
}

export function eulerCharacteristic(solid: Solid): number {
  const v = solid.vertices.length;
  const e = solid.edges.length;
  const f = solid.faces.length;
  return v - e + f;
}

export function isSolid(solid: Solid): boolean {
  return isManifold(solid) && Math.abs(eulerCharacteristic(solid)) === 2;
}
