/**
 * Mesh Factory Tests
 * T-3D-007: BIM element mesh descriptors
 */
import { describe, it, expect } from 'vitest';
import {
  buildWallMesh,
  buildSlabMesh,
  buildColumnMesh,
  buildBeamMesh,
} from './meshFactory';

describe('T-3D-007: buildWallMesh', () => {
  it('returns a box type mesh', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 5, endY: 0, thickness: 0.2, height: 3 });
    expect(mesh.type).toBe('box');
  });

  it('geometry kind is box', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 5, endY: 0, thickness: 0.2, height: 3 });
    expect(mesh.geometry.kind).toBe('box');
  });

  it('geometry width equals wall length', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 4, endY: 0, thickness: 0.2, height: 3 });
    const geo = mesh.geometry as { kind: 'box'; width: number; height: number; depth: number };
    expect(geo.width).toBeCloseTo(4, 5);
  });

  it('geometry height equals wall height', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 5, endY: 0, thickness: 0.2, height: 3 });
    const geo = mesh.geometry as { kind: 'box'; height: number };
    expect(geo.height).toBe(3);
  });

  it('geometry depth equals wall thickness', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 5, endY: 0, thickness: 0.2, height: 3 });
    const geo = mesh.geometry as { kind: 'box'; depth: number };
    expect(geo.depth).toBeCloseTo(0.2, 5);
  });

  it('position is at center of wall', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 4, endY: 0, thickness: 0.2, height: 3 });
    expect(mesh.position.x).toBeCloseTo(2, 5);
  });

  it('position.y is at half height when elevation=0', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 4, endY: 0, thickness: 0.2, height: 3 });
    expect(mesh.position.y).toBeCloseTo(1.5, 5);
  });

  it('position.y includes elevation offset', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 4, endY: 0, thickness: 0.2, height: 3, elevation: 3 });
    expect(mesh.position.y).toBeCloseTo(4.5, 5);
  });

  it('diagonal wall has correct rotation', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 1, endY: 1, thickness: 0.2, height: 3 });
    expect(mesh.rotation.y).toBeCloseTo(-Math.PI / 4, 5);
  });

  it('scale is 1,1,1', () => {
    const mesh = buildWallMesh({ startX: 0, startY: 0, endX: 5, endY: 0, thickness: 0.2, height: 3 });
    expect(mesh.scale).toEqual({ x: 1, y: 1, z: 1 });
  });
});

describe('T-3D-007: buildSlabMesh', () => {
  const points = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }];

  it('returns an extrusion type mesh', () => {
    const mesh = buildSlabMesh({ points, thickness: 0.2 });
    expect(mesh.type).toBe('extrusion');
  });

  it('geometry kind is extrusion', () => {
    const mesh = buildSlabMesh({ points, thickness: 0.2 });
    expect(mesh.geometry.kind).toBe('extrusion');
  });

  it('geometry depth equals thickness', () => {
    const mesh = buildSlabMesh({ points, thickness: 0.3 });
    const geo = mesh.geometry as { kind: 'extrusion'; depth: number };
    expect(geo.depth).toBe(0.3);
  });

  it('geometry profile has same number of points', () => {
    const mesh = buildSlabMesh({ points, thickness: 0.2 });
    const geo = mesh.geometry as { kind: 'extrusion'; profile: { x: number; y: number }[] };
    expect(geo.profile).toHaveLength(points.length);
  });

  it('profile is centered at origin', () => {
    const mesh = buildSlabMesh({ points, thickness: 0.2 });
    const geo = mesh.geometry as { kind: 'extrusion'; profile: { x: number; y: number }[] };
    const avgX = geo.profile.reduce((s, p) => s + p.x, 0) / geo.profile.length;
    const avgY = geo.profile.reduce((s, p) => s + p.y, 0) / geo.profile.length;
    expect(avgX).toBeCloseTo(0, 5);
    expect(avgY).toBeCloseTo(0, 5);
  });

  it('position.y includes elevation offset', () => {
    const mesh = buildSlabMesh({ points, thickness: 0.2, elevation: 3 });
    expect(mesh.position.y).toBeCloseTo(3 - 0.1, 5);
  });
});

describe('T-3D-007: buildColumnMesh', () => {
  it('returns a box type mesh for square section', () => {
    const mesh = buildColumnMesh({ x: 0, y: 0, width: 0.4, depth: 0.4, height: 3 });
    expect(mesh.type).toBe('box');
  });

  it('returns a cylinder type mesh for round section', () => {
    const mesh = buildColumnMesh({ x: 0, y: 0, width: 0.4, depth: 0.4, height: 3, section: 'round' });
    expect(mesh.type).toBe('cylinder');
  });

  it('cylinder geometry has correct radius', () => {
    const mesh = buildColumnMesh({ x: 0, y: 0, width: 0.4, depth: 0.4, height: 3, section: 'round' });
    const geo = mesh.geometry as { kind: 'cylinder'; radiusTop: number; radiusBottom: number };
    expect(geo.radiusTop).toBeCloseTo(0.2, 5);
    expect(geo.radiusBottom).toBeCloseTo(0.2, 5);
  });

  it('box geometry matches width, depth, height', () => {
    const mesh = buildColumnMesh({ x: 5, y: 5, width: 0.5, depth: 0.3, height: 4 });
    const geo = mesh.geometry as { kind: 'box'; width: number; height: number; depth: number };
    expect(geo.width).toBe(0.5);
    expect(geo.height).toBe(4);
    expect(geo.depth).toBe(0.3);
  });

  it('position is at column center (x, y) coordinates', () => {
    const mesh = buildColumnMesh({ x: 3, y: 5, width: 0.4, depth: 0.4, height: 3 });
    expect(mesh.position.x).toBe(3);
    expect(mesh.position.z).toBe(5);
  });

  it('position.y is at half height', () => {
    const mesh = buildColumnMesh({ x: 0, y: 0, width: 0.4, depth: 0.4, height: 4 });
    expect(mesh.position.y).toBeCloseTo(2, 5);
  });
});

describe('T-3D-007: buildBeamMesh', () => {
  it('returns a box type mesh', () => {
    const mesh = buildBeamMesh({ startX: 0, startY: 0, endX: 6, endY: 0, width: 0.2, depth: 0.4 });
    expect(mesh.type).toBe('box');
  });

  it('geometry length equals beam span', () => {
    const mesh = buildBeamMesh({ startX: 0, startY: 0, endX: 6, endY: 0, width: 0.2, depth: 0.4 });
    const geo = mesh.geometry as { kind: 'box'; width: number };
    expect(geo.width).toBeCloseTo(6, 5);
  });

  it('geometry height equals beam depth', () => {
    const mesh = buildBeamMesh({ startX: 0, startY: 0, endX: 6, endY: 0, width: 0.2, depth: 0.4 });
    const geo = mesh.geometry as { kind: 'box'; height: number };
    expect(geo.height).toBe(0.4);
  });

  it('geometry depth equals beam width', () => {
    const mesh = buildBeamMesh({ startX: 0, startY: 0, endX: 6, endY: 0, width: 0.2, depth: 0.4 });
    const geo = mesh.geometry as { kind: 'box'; depth: number };
    expect(geo.depth).toBe(0.2);
  });

  it('position is at center of beam span', () => {
    const mesh = buildBeamMesh({ startX: 0, startY: 0, endX: 6, endY: 0, width: 0.2, depth: 0.4 });
    expect(mesh.position.x).toBeCloseTo(3, 5);
  });

  it('diagonal beam has correct rotation', () => {
    const mesh = buildBeamMesh({ startX: 0, startY: 0, endX: 1, endY: 1, width: 0.2, depth: 0.4 });
    expect(mesh.rotation.y).toBeCloseTo(-Math.PI / 4, 5);
  });
});
