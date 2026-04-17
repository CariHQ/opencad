/**
 * Geometric Primitives Tests
 * T-3D-001: createBox produces solid with 6 faces and correct dimensions
 * T-3D-002: createSphere produces a sphere solid
 * T-3D-003: createCylinder produces a cylinder solid
 */
import { describe, it, expect } from 'vitest';
import { createBox, createSphere, createCylinder } from './primitives';

describe('T-3D-001: createBox', () => {
  it('returns a solid', () => {
    const box = createBox(2, 3, 4);
    expect(box).toBeDefined();
    expect(box.vertices).toBeDefined();
    expect(box.faces).toBeDefined();
  });

  it('has 8 vertices', () => {
    const box = createBox(2, 3, 4);
    expect(box.vertices).toHaveLength(8);
  });

  it('has 6 faces', () => {
    const box = createBox(2, 3, 4);
    expect(box.faces).toHaveLength(6);
  });

  it('each face has 4 vertices', () => {
    const box = createBox(2, 3, 4);
    for (const face of box.faces) {
      expect(face.vertices).toHaveLength(4);
    }
  });

  it('each face has a normal vector', () => {
    const box = createBox(2, 3, 4);
    for (const face of box.faces) {
      expect(face.normal).toBeDefined();
    }
  });

  it('top and bottom face normals point in z direction', () => {
    const box = createBox(2, 3, 4);
    const zFaces = box.faces.filter((f) => Math.abs(f.normal.z) === 1);
    expect(zFaces).toHaveLength(2);
  });

  it('face areas are positive', () => {
    const box = createBox(2, 3, 4);
    for (const face of box.faces) {
      expect(face.area).toBeGreaterThan(0);
    }
  });

  it('top/bottom face areas equal width * depth', () => {
    const box = createBox(2, 3, 4);
    const topBottom = box.faces.filter((f) => Math.abs(f.normal.z) === 1);
    for (const face of topBottom) {
      expect(face.area).toBeCloseTo(2 * 4, 5); // width * depth
    }
  });

  it('vertices are symmetric around origin', () => {
    const box = createBox(2, 2, 2);
    const xs = box.vertices.map((v) => v.x);
    expect(Math.min(...xs)).toBeCloseTo(-1, 5);
    expect(Math.max(...xs)).toBeCloseTo(1, 5);
  });

  it('each face has a unique id', () => {
    const box = createBox(2, 3, 4);
    const ids = box.faces.map((f) => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(6);
  });
});

describe('T-3D-002: createSphere', () => {
  it('returns a solid', () => {
    const sphere = createSphere(1);
    expect(sphere).toBeDefined();
    expect(sphere.vertices).toBeDefined();
    expect(sphere.faces).toBeDefined();
  });

  it('has positive number of vertices', () => {
    const sphere = createSphere(1, 8, 4);
    expect(sphere.vertices.length).toBeGreaterThan(0);
  });

  it('has positive number of faces', () => {
    const sphere = createSphere(1, 8, 4);
    expect(sphere.faces.length).toBeGreaterThan(0);
  });

  it('all vertices are approximately at radius distance from origin', () => {
    const radius = 2;
    const sphere = createSphere(radius, 8, 4);
    for (const v of sphere.vertices) {
      const dist = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      expect(dist).toBeCloseTo(radius, 5);
    }
  });

  it('more segments produce more faces', () => {
    const sphere8 = createSphere(1, 8, 4);
    const sphere16 = createSphere(1, 16, 8);
    expect(sphere16.faces.length).toBeGreaterThan(sphere8.faces.length);
  });
});

describe('T-3D-003: createCylinder', () => {
  it('returns a solid', () => {
    const cyl = createCylinder(1, 3);
    expect(cyl).toBeDefined();
    expect(cyl.vertices).toBeDefined();
    expect(cyl.faces).toBeDefined();
  });

  it('has top and bottom cap faces', () => {
    const cyl = createCylinder(1, 3, 8);
    // 8 side quads + 2 caps = 10 faces
    const capFaces = cyl.faces.filter((f) => Math.abs(f.normal.z) === 1);
    expect(capFaces).toHaveLength(2);
  });

  it('bottom cap normal points in -z direction', () => {
    const cyl = createCylinder(1, 3, 8);
    const bottom = cyl.faces.find((f) => f.normal.z === -1);
    expect(bottom).toBeDefined();
  });

  it('top cap normal points in +z direction', () => {
    const cyl = createCylinder(1, 3, 8);
    const top = cyl.faces.find((f) => f.normal.z === 1);
    expect(top).toBeDefined();
  });

  it('cap area equals pi * r^2', () => {
    const radius = 2;
    const cyl = createCylinder(radius, 3, 8);
    const cap = cyl.faces.find((f) => f.normal.z === 1);
    expect(cap?.area).toBeCloseTo(Math.PI * radius * radius, 5);
  });

  it('vertices at z=0 are at the base', () => {
    const cyl = createCylinder(1, 5, 8);
    const baseVertices = cyl.vertices.filter((v) => v.z === 0);
    expect(baseVertices.length).toBeGreaterThan(0);
  });

  it('vertices at z=height are at the top', () => {
    const height = 5;
    const cyl = createCylinder(1, height, 8);
    const topVertices = cyl.vertices.filter((v) => v.z === height);
    expect(topVertices.length).toBeGreaterThan(0);
  });
});
