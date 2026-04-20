/**
 * T-MOD-017 shell tests (GitHub issue #310).
 *
 *   T-MOD-017-001 — revolve produces ring × segments vertices
 *   T-MOD-017-003 — extrude of a unit square has 8 vertices + 6 quads = 12 tris
 *   T-MOD-017-004 — loft between two profiles produces the expected band
 */
import { describe, it, expect } from 'vitest';
import { revolveMesh, extrudeMesh, loftMesh, sweepMesh } from './shellGeometry';

describe('T-MOD-017: shellGeometry', () => {
  it('T-MOD-017-001: revolve of 2-point profile × 8 segments = 18 vertices', () => {
    const m = revolveMesh([{ r: 1, y: 0 }, { r: 1, y: 1 }], 8);
    // (segments + 1) × profileLength
    expect(m.vertices).toHaveLength(9 * 2);
    // 8 segments × 1 quad row × 2 tris = 16 tris
    expect(m.triangles).toHaveLength(16 * 3);
  });

  it('T-MOD-017-001b: revolve 2-point profile yields a vertex at (r, 0, 0)', () => {
    const m = revolveMesh([{ r: 2, y: 0 }, { r: 2, y: 1 }], 4);
    expect(m.vertices[0]!.x).toBeCloseTo(2);
    expect(m.vertices[0]!.z).toBeCloseTo(0);
  });

  it('T-MOD-017-003: extrude unit-square produces 8 verts + 12 tris', () => {
    const m = extrudeMesh(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      { x: 0, y: 0, z: 1 },
    );
    expect(m.vertices).toHaveLength(8);
    // 4 side quads = 8 tris + 2 caps × 2 tris = 12 total
    expect(m.triangles.length / 3).toBe(12);
  });

  it('T-MOD-017-004: loft between two 4-vertex profiles gives 4 side quads', () => {
    const a = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }];
    const b = a.map((p) => ({ x: p.x, y: p.y, z: p.z + 5 }));
    const m = loftMesh(a, b);
    expect(m.vertices).toHaveLength(8);
    expect(m.triangles.length / 3).toBe(8);  // 4 quads × 2 tris
  });

  it('loft throws on mismatched profile vertex counts', () => {
    expect(() => loftMesh(
      [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }],
    )).toThrow();
  });

  it('sweep profile along 3-point path produces 2 rings of connections', () => {
    const m = sweepMesh(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 10 }],
    );
    expect(m.vertices).toHaveLength(12);    // 3 path × 4 profile
    expect(m.triangles.length / 3).toBe(16); // 2 connections × 4 quads × 2
  });

  it('sweep along 1-point path returns empty mesh', () => {
    const m = sweepMesh([{ x: 0, y: 0 }, { x: 1, y: 0 }], [{ x: 0, y: 0, z: 0 }]);
    expect(m.vertices).toHaveLength(0);
  });

  it('revolve of a hemisphere profile converges to 2πr² as segments grow', () => {
    // Profile: quarter-circle r = 1
    const profile: Array<{ r: number; y: number }> = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI / 2;
      profile.push({ r: Math.cos(a), y: Math.sin(a) });
    }
    const m = revolveMesh(profile, 32);
    // Count triangle area approximately
    let surfaceArea = 0;
    for (let i = 0; i < m.triangles.length; i += 3) {
      const p0 = m.vertices[m.triangles[i]!]!;
      const p1 = m.vertices[m.triangles[i + 1]!]!;
      const p2 = m.vertices[m.triangles[i + 2]!]!;
      const ax = p1.x - p0.x, ay = p1.y - p0.y, az = p1.z - p0.z;
      const bx = p2.x - p0.x, by = p2.y - p0.y, bz = p2.z - p0.z;
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      surfaceArea += 0.5 * Math.hypot(cx, cy, cz);
    }
    // Analytical hemisphere surface area = 2πr² = 2π
    expect(surfaceArea).toBeGreaterThan(2 * Math.PI * 0.95);
    expect(surfaceArea).toBeLessThan(2 * Math.PI * 1.05);
  });
});
