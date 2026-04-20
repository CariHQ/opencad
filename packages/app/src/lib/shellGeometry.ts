/**
 * Shell — freeform curved surfaces (T-MOD-017 / #310).
 *
 * Four construction methods: revolve, extrude, loft, sweep. Each
 * returns a triangle-soup mesh ready for Three.js BufferGeometry.
 */

export interface Vec3 { x: number; y: number; z: number }
export interface Mesh { vertices: Vec3[]; triangles: number[] }

/** Helper to emit a quad as two triangles. */
function quad(tris: number[], a: number, b: number, c: number, d: number): void {
  tris.push(a, b, c, a, c, d);
}

/**
 * Revolve a profile around an axis (v1: Y axis only). The profile is
 * a list of points in (r, y) where r = radius from the axis.
 */
export function revolveMesh(
  profile: Array<{ r: number; y: number }>,
  segments: number = 32,
): Mesh {
  const verts: Vec3[] = [];
  const tris: number[] = [];
  const n = profile.length;
  for (let s = 0; s <= segments; s++) {
    const a = (s / segments) * Math.PI * 2;
    const c = Math.cos(a), si = Math.sin(a);
    for (const p of profile) {
      verts.push({ x: p.r * c, y: p.y, z: p.r * si });
    }
  }
  for (let s = 0; s < segments; s++) {
    for (let i = 0; i < n - 1; i++) {
      const a = s * n + i;
      const b = a + 1;
      const c = (s + 1) * n + i;
      const d = c + 1;
      quad(tris, a, c, d, b);
    }
  }
  return { vertices: verts, triangles: tris };
}

/**
 * Extrude a 2D profile along a straight vector.
 */
export function extrudeMesh(
  profile: Array<{ x: number; y: number }>,
  extrude: Vec3,
): Mesh {
  const verts: Vec3[] = [];
  const tris: number[] = [];
  const n = profile.length;
  for (const p of profile) verts.push({ x: p.x, y: p.y, z: 0 });
  for (const p of profile) verts.push({ x: p.x + extrude.x, y: p.y + extrude.y, z: 0 + extrude.z });
  // Side quads
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    quad(tris, i, next, n + next, n + i);
  }
  // Simple triangle fan for caps (concave polygons caveated)
  for (let i = 1; i < n - 1; i++) {
    tris.push(0, i, i + 1);                    // bottom cap
    tris.push(n, n + i + 1, n + i);            // top cap (reverse order)
  }
  return { vertices: verts, triangles: tris };
}

/**
 * Loft between two equal-vertex-count profiles.
 */
export function loftMesh(
  profileA: Vec3[],
  profileB: Vec3[],
): Mesh {
  if (profileA.length !== profileB.length) {
    throw new Error('loftMesh: profile vertex counts must match');
  }
  const verts = [...profileA, ...profileB];
  const tris: number[] = [];
  const n = profileA.length;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    quad(tris, i, next, n + next, n + i);
  }
  return { vertices: verts, triangles: tris };
}

/**
 * Sweep a 2D profile along a polyline path (v1: straight segments).
 */
export function sweepMesh(
  profile: Array<{ x: number; y: number }>,
  path: Vec3[],
): Mesh {
  if (path.length < 2) return { vertices: [], triangles: [] };
  const verts: Vec3[] = [];
  const tris: number[] = [];
  const n = profile.length;

  // Emit ring at each path point. Profile is laid in XY, translated to
  // the path point.
  for (const p of path) {
    for (const q of profile) {
      verts.push({ x: p.x + q.x, y: p.y + q.y, z: p.z });
    }
  }
  // Connect consecutive rings
  for (let s = 0; s < path.length - 1; s++) {
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const a = s * n + i;
      const b = s * n + next;
      const c = (s + 1) * n + next;
      const d = (s + 1) * n + i;
      quad(tris, a, b, c, d);
    }
  }
  return { vertices: verts, triangles: tris };
}
