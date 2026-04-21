/**
 * Mesh terrain / site topography — T-MOD-019 (#312).
 *
 * Triangulates a set of (x, y, z) survey points into a terrain mesh
 * (Bowyer-Watson Delaunay), computes cut/fill against a proposed
 * building footprint, and emits contour line segments at a given
 * interval.
 *
 * Pure — no THREE.js / DOM dependencies.
 */

export interface Point2D { x: number; y: number }
export interface Point3D extends Point2D { z: number }

export interface TriangleIdx { a: number; b: number; c: number }

export interface TerrainMesh {
  points: Point3D[];
  triangles: TriangleIdx[];
}

/**
 * Bowyer-Watson Delaunay triangulation on the (x, y) projection.
 * O(n²) — fine for up to a few thousand points.
 */
export function triangulate(points: Point3D[]): TerrainMesh {
  if (points.length < 3) return { points: [...points], triangles: [] };

  // Compute a super-triangle that contains every point.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const dx = maxX - minX, dy = maxY - minY;
  const dmax = Math.max(dx, dy) * 10;
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  const verts: Point3D[] = [...points];
  verts.push({ x: midX - dmax, y: midY - dmax, z: 0 });
  verts.push({ x: midX,        y: midY + dmax, z: 0 });
  verts.push({ x: midX + dmax, y: midY - dmax, z: 0 });
  const superA = points.length;
  const superB = points.length + 1;
  const superC = points.length + 2;

  let triangles: TriangleIdx[] = [{ a: superA, b: superB, c: superC }];

  for (let i = 0; i < points.length; i++) {
    const p = verts[i]!;
    const badTris: TriangleIdx[] = [];
    for (const t of triangles) {
      if (inCircumcircle(verts[t.a]!, verts[t.b]!, verts[t.c]!, p)) badTris.push(t);
    }
    // Find polygon boundary
    const edges: Array<[number, number]> = [];
    for (const t of badTris) {
      const e: Array<[number, number]> = [[t.a, t.b], [t.b, t.c], [t.c, t.a]];
      for (const edge of e) {
        const shared = badTris.some((other) => other !== t && other !== undefined && edgeInTriangle(other, edge));
        if (!shared) edges.push(edge);
      }
    }
    triangles = triangles.filter((t) => !badTris.includes(t));
    for (const [a, b] of edges) triangles.push({ a, b, c: i });
  }

  // Drop any triangle touching the super-triangle
  const resultTris = triangles.filter((t) => t.a < points.length && t.b < points.length && t.c < points.length);
  return { points, triangles: resultTris };
}

/**
 * Orientation-agnostic circumcircle test: compute the triangle's
 * circumcenter + radius, then distance-test. Robust regardless of
 * whether the triangle is CW or CCW (the determinant form flips sign
 * on orientation).
 */
function inCircumcircle(a: Point2D, b: Point2D, c: Point2D, p: Point2D): boolean {
  const ax = a.x, ay = a.y;
  const bx = b.x, by = b.y;
  const cx = c.x, cy = c.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return false;   // degenerate (collinear)
  const ux = ((ax * ax + ay * ay) * (by - cy) +
              (bx * bx + by * by) * (cy - ay) +
              (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) +
              (bx * bx + by * by) * (ax - cx) +
              (cx * cx + cy * cy) * (bx - ax)) / d;
  const rSq = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);
  const dSq = (p.x - ux) * (p.x - ux) + (p.y - uy) * (p.y - uy);
  return dSq < rSq - 1e-9;
}

function edgeInTriangle(t: TriangleIdx, edge: [number, number]): boolean {
  const [a, b] = edge;
  const has = (x: number, y: number) => (x === t.a || x === t.b || x === t.c) && (y === t.a || y === t.b || y === t.c);
  return has(a, b);
}

/**
 * Cut/fill against a flat proposed slab.
 *   cut = volume of terrain ABOVE slabZ within footprint
 *   fill = volume of terrain BELOW slabZ within footprint
 * Footprint is a closed 2D polygon in XY.
 */
export function computeCutFill(
  mesh: TerrainMesh,
  footprint: Point2D[],
  slabZ: number,
): { cutM3: number; fillM3: number } {
  let cutMm3 = 0, fillMm3 = 0;
  for (const tri of mesh.triangles) {
    const a = mesh.points[tri.a]!, b = mesh.points[tri.b]!, c = mesh.points[tri.c]!;
    const centroid = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
    if (!pointInPolygon(centroid, footprint)) continue;
    const triArea = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
    const avgZ = (a.z + b.z + c.z) / 3;
    const dz = avgZ - slabZ;
    const vol = triArea * dz;
    if (vol > 0) cutMm3 += vol; else fillMm3 += -vol;
  }
  return { cutM3: cutMm3 / 1e9, fillM3: fillMm3 / 1e9 };
}

function pointInPolygon(pt: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i]!.x, yi = poly[i]!.y;
    const xj = poly[j]!.x, yj = poly[j]!.y;
    const denom = yj - yi;
    const cross = ((yi > pt.y) !== (yj > pt.y)) &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (denom === 0 ? 1e-9 : denom) + xi;
    if (cross) inside = !inside;
  }
  return inside;
}

/**
 * Generate contour line segments at a single elevation z. Walks every
 * triangle, finds where z crosses each edge, connects the crossings.
 */
export function generateContour(
  mesh: TerrainMesh, z: number,
): Array<{ a: Point2D; b: Point2D }> {
  const segments: Array<{ a: Point2D; b: Point2D }> = [];
  for (const tri of mesh.triangles) {
    const a = mesh.points[tri.a]!, b = mesh.points[tri.b]!, c = mesh.points[tri.c]!;
    const edges: Array<[Point3D, Point3D]> = [[a, b], [b, c], [c, a]];
    const crossings: Point2D[] = [];
    for (const [p, q] of edges) {
      if ((p.z - z) * (q.z - z) < 0) {
        const t = (z - p.z) / (q.z - p.z);
        crossings.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
      } else if (p.z === z) {
        crossings.push({ x: p.x, y: p.y });
      }
    }
    if (crossings.length >= 2) segments.push({ a: crossings[0]!, b: crossings[1]! });
  }
  return segments;
}
