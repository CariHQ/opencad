/**
 * Geometric Primitives
 * Basic 3D shapes: Box, Sphere, Cylinder, etc.
 */

import { Point3D, createPoint3D } from './core';
import { Solid, Face, createSolid } from './boolean';

export function createBox(width: number, height: number, depth: number): Solid {
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;

  const vertices: Point3D[] = [
    createPoint3D(-hw, -hh, -hd), // 0: back-bottom-left
    createPoint3D(hw, -hh, -hd), // 1: back-bottom-right
    createPoint3D(hw, hh, -hd), // 2: back-top-right
    createPoint3D(-hw, hh, -hd), // 3: back-top-left
    createPoint3D(-hw, -hh, hd), // 4: front-bottom-left
    createPoint3D(hw, -hh, hd), // 5: front-bottom-right
    createPoint3D(hw, hh, hd), // 6: front-top-right
    createPoint3D(-hw, hh, hd), // 7: front-top-left
  ];

  const faces: Face[] = [
    // Bottom
    {
      id: crypto.randomUUID(),
      vertices: [vertices[0], vertices[1], vertices[2], vertices[3]],
      normal: { x: 0, y: 0, z: -1 },
      area: width * depth,
    },
    // Top
    {
      id: crypto.randomUUID(),
      vertices: [vertices[4], vertices[7], vertices[6], vertices[5]],
      normal: { x: 0, y: 0, z: 1 },
      area: width * depth,
    },
    // Front
    {
      id: crypto.randomUUID(),
      vertices: [vertices[4], vertices[5], vertices[6], vertices[7]],
      normal: { x: 0, y: -1, z: 0 },
      area: width * height,
    },
    // Back
    {
      id: crypto.randomUUID(),
      vertices: [vertices[1], vertices[0], vertices[3], vertices[2]],
      normal: { x: 0, y: 1, z: 0 },
      area: width * height,
    },
    // Right
    {
      id: crypto.randomUUID(),
      vertices: [vertices[5], vertices[1], vertices[2], vertices[6]],
      normal: { x: 1, y: 0, z: 0 },
      area: depth * height,
    },
    // Left
    {
      id: crypto.randomUUID(),
      vertices: [vertices[0], vertices[4], vertices[7], vertices[3]],
      normal: { x: -1, y: 0, z: 0 },
      area: depth * height,
    },
  ];

  return createSolid(vertices, faces);
}

export function createSphere(radius: number, segments: number = 16, rings: number = 8): Solid {
  const vertices: Point3D[] = [];
  const faces: Face[] = [];

  vertices.push(createPoint3D(0, 0, radius));

  for (let i = 1; i < rings; i++) {
    const phi = (i * Math.PI) / rings;
    const y = radius * Math.cos(phi);
    const ringRadius = radius * Math.sin(phi);

    for (let j = 0; j < segments; j++) {
      const theta = (j * 2 * Math.PI) / segments;
      const x = ringRadius * Math.cos(theta);
      const z = ringRadius * Math.sin(theta);
      vertices.push(createPoint3D(x, y, z));
    }
  }

  vertices.push(createPoint3D(0, 0, -radius));

  const topStart = 1;
  const bottomStart = 1 + (rings - 2) * segments;

  for (let j = 0; j < segments; j++) {
    const j1 = (j + 1) % segments;
    const v0 = 0;
    const v1 = topStart + j;
    const v2 = topStart + j1;

    const face = createTriangleFace(vertices[v0], vertices[v1], vertices[v2]);
    face.normal = normalizeNormal({
      x: vertices[v1].x,
      y: vertices[v1].y,
      z: vertices[v1].z,
    });
    faces.push(face);
  }

  for (let i = 0; i < rings - 2; i++) {
    const ringStart = topStart + i * segments;
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      const v0 = ringStart + j;
      const v1 = ringStart + j + segments;
      const v2 = ringStart + j1 + segments;
      const v3 = ringStart + j1;

      faces.push(createQuadFace(vertices[v0], vertices[v1], vertices[v2], vertices[v3]));
    }
  }

  for (let j = 0; j < segments; j++) {
    const j1 = (j + 1) % segments;
    const v0 = bottomStart + j;
    const v1 = bottomStart + j1;
    const v2 = vertices.length - 1;

    const face = createTriangleFace(vertices[v0], vertices[v1], vertices[v2]);
    face.normal = normalizeNormal({
      x: -vertices[v0].x,
      y: -vertices[v0].y,
      z: -vertices[v0].z,
    });
    faces.push(face);
  }

  return createSolid(vertices, faces);
}

function createTriangleFace(v0: Point3D, v1: Point3D, v2: Point3D): Face {
  const area = triangleArea(v0, v1, v2);
  return {
    id: crypto.randomUUID(),
    vertices: [v0, v1, v2],
    normal: { x: 0, y: 0, z: 0 },
    area,
  };
}

function createQuadFace(v0: Point3D, v1: Point3D, v2: Point3D, v3: Point3D): Face {
  const area = quadArea(v0, v1, v2, v3);
  return {
    id: crypto.randomUUID(),
    vertices: [v0, v1, v2, v3],
    normal: { x: 0, y: 0, z: 0 },
    area,
  };
}

function triangleArea(a: Point3D, b: Point3D, c: Point3D): number {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const cross = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  return Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z) / 2;
}

function quadArea(v0: Point3D, v1: Point3D, v2: Point3D, v3: Point3D): number {
  return triangleArea(v0, v1, v2) + triangleArea(v0, v2, v3);
}

function normalizeNormal(n: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  z: number;
} {
  const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: n.x / len, y: n.y / len, z: n.z / len };
}

export function createCylinder(radius: number, height: number, segments: number = 16): Solid {
  const vertices: Point3D[] = [];
  const faces: Face[] = [];

  const bottomCenter = createPoint3D(0, 0, 0);
  const topCenter = createPoint3D(0, 0, height);

  vertices.push(bottomCenter, topCenter);

  for (let i = 0; i < segments; i++) {
    const theta = (i * 2 * Math.PI) / segments;
    const x = radius * Math.cos(theta);
    const y = radius * Math.sin(theta);
    vertices.push(createPoint3D(x, y, 0));
  }

  for (let i = 0; i < segments; i++) {
    const theta = (i * 2 * Math.PI) / segments;
    const x = radius * Math.cos(theta);
    const y = radius * Math.sin(theta);
    vertices.push(createPoint3D(x, y, height));
  }

  const bottomFace: Face = {
    id: crypto.randomUUID(),
    vertices: [],
    normal: { x: 0, y: 0, z: -1 },
    area: Math.PI * radius * radius,
  };
  for (let i = segments - 1; i >= 0; i--) {
    bottomFace.vertices.push(vertices[2 + i]);
  }
  faces.push(bottomFace);

  const topFace: Face = {
    id: crypto.randomUUID(),
    vertices: [],
    normal: { x: 0, y: 0, z: 1 },
    area: Math.PI * radius * radius,
  };
  for (let i = 0; i < segments; i++) {
    topFace.vertices.push(vertices[2 + segments + i]);
  }
  faces.push(topFace);

  for (let i = 0; i < segments; i++) {
    const i1 = (i + 1) % segments;
    const v0 = vertices[2 + i];
    const v1 = vertices[2 + i1];
    const v2 = vertices[2 + segments + i1];
    const v3 = vertices[2 + segments + i];

    faces.push(createQuadFace(v0, v1, v2, v3));
  }

  return createSolid(vertices, faces);
}
