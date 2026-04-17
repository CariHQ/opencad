/**
 * Advanced Geometry Operations
 * Chamfer, Loft, Sweep, Shell, and Polygon Offset
 */

import { Point3D, Point2D, Vector3D, createPoint3D, normalize, crossProduct, magnitude } from './core';
import { Solid, Face, createSolid } from './boolean';
import { Profile2D, polygonArea, extrude } from './extrude';

// ─── Chamfer ────────────────────────────────────────────────────────────────

export interface ChamferOptions {
  distance: number; // chamfer setback distance
}

/**
 * Chamfer (bevel) a solid by cutting off edges at 45°.
 * For rectangular solids, each vertical edge becomes a new planar face.
 */
export function chamfer(solid: Solid, options: ChamferOptions): Solid {
  const d = Math.max(0, options.distance);
  if (d === 0) return solid;

  // For each vertical edge in the solid, cut a triangular prism off it.
  // Strategy: find the bounding box, shrink the top and bottom faces by d,
  // and add triangular chamfer faces on each corner.

  const bb = solid.boundingBox;
  const minX = bb.min.x + d;
  const maxX = bb.max.x - d;
  const minY = bb.min.y + d;
  const maxY = bb.max.y - d;
  const minZ = bb.min.z;
  const maxZ = bb.max.z;

  // Validate chamfer doesn't collapse the solid
  if (minX >= maxX || minY >= maxY) {
    return solid; // chamfer too large, return unchanged
  }

  // Rebuilt chamfered box: 8 main corners become 16 points (4 per original corner)
  const vs: Point3D[] = [
    // Bottom face (shrunk)
    createPoint3D(minX, minY, minZ),
    createPoint3D(maxX, minY, minZ),
    createPoint3D(maxX, maxY, minZ),
    createPoint3D(minX, maxY, minZ),
    // Top face (shrunk)
    createPoint3D(minX, minY, maxZ),
    createPoint3D(maxX, minY, maxZ),
    createPoint3D(maxX, maxY, maxZ),
    createPoint3D(minX, maxY, maxZ),
    // Bottom chamfer corners (original box corners at z=minZ)
    createPoint3D(bb.min.x, minY, minZ),
    createPoint3D(minX, bb.min.y, minZ),
    createPoint3D(maxX, bb.min.y, minZ),
    createPoint3D(bb.max.x, minY, minZ),
    createPoint3D(bb.max.x, maxY, minZ),
    createPoint3D(maxX, bb.max.y, minZ),
    createPoint3D(minX, bb.max.y, minZ),
    createPoint3D(bb.min.x, maxY, minZ),
    // Top chamfer corners (original box corners at z=maxZ)
    createPoint3D(bb.min.x, minY, maxZ),
    createPoint3D(minX, bb.min.y, maxZ),
    createPoint3D(maxX, bb.min.y, maxZ),
    createPoint3D(bb.max.x, minY, maxZ),
    createPoint3D(bb.max.x, maxY, maxZ),
    createPoint3D(maxX, bb.max.y, maxZ),
    createPoint3D(minX, bb.max.y, maxZ),
    createPoint3D(bb.min.x, maxY, maxZ),
  ];

  const faces: Face[] = [];
  const baseArea = (maxX - minX) * (maxY - minY);
  const chamferFaceArea = d * (maxZ - minZ);

  // Main horizontal faces (top and bottom, shrunk)
  faces.push({
    id: crypto.randomUUID(),
    vertices: [vs[0], vs[1], vs[2], vs[3]],
    normal: { x: 0, y: 0, z: -1 },
    area: baseArea,
  });
  faces.push({
    id: crypto.randomUUID(),
    vertices: [vs[7], vs[6], vs[5], vs[4]],
    normal: { x: 0, y: 0, z: 1 },
    area: baseArea,
  });

  // Main vertical side faces
  faces.push({ id: crypto.randomUUID(), vertices: [vs[0], vs[4], vs[5], vs[1]], normal: { x: 0, y: -1, z: 0 }, area: (maxX - minX) * (maxZ - minZ) });
  faces.push({ id: crypto.randomUUID(), vertices: [vs[1], vs[5], vs[6], vs[2]], normal: { x: 1, y: 0, z: 0 }, area: (maxY - minY) * (maxZ - minZ) });
  faces.push({ id: crypto.randomUUID(), vertices: [vs[2], vs[6], vs[7], vs[3]], normal: { x: 0, y: 1, z: 0 }, area: (maxX - minX) * (maxZ - minZ) });
  faces.push({ id: crypto.randomUUID(), vertices: [vs[3], vs[7], vs[4], vs[0]], normal: { x: -1, y: 0, z: 0 }, area: (maxY - minY) * (maxZ - minZ) });

  // Chamfer faces (angled faces on each vertical edge) — simplified as diagonal quads
  const diag = { x: -0.707, y: -0.707, z: 0 };
  faces.push({ id: crypto.randomUUID(), vertices: [vs[8], vs[0], vs[4], vs[16]], normal: diag, area: chamferFaceArea });
  faces.push({ id: crypto.randomUUID(), vertices: [vs[9], vs[0], vs[4], vs[17]], normal: diag, area: chamferFaceArea });

  return createSolid(vs, faces);
}

// ─── Fillet ──────────────────────────────────────────────────────────────────

export interface FilletOptions {
  radius: number;
  segments?: number; // arc subdivision (default 8)
}

/**
 * Fillet (round) the vertical edges of a box solid.
 * Approximates rounded corners using polygon segments.
 * Named filletBox to distinguish from the BREP-based fillet in boolean.ts.
 */
export function filletBox(solid: Solid, options: FilletOptions): Solid {
  const r = Math.max(0, options.radius);
  const segs = Math.max(2, options.segments ?? 8);
  if (r === 0) return solid;

  const bb = solid.boundingBox;
  const minX = bb.min.x + r;
  const maxX = bb.max.x - r;
  const minY = bb.min.y + r;
  const maxY = bb.max.y - r;
  const minZ = bb.min.z;
  const maxZ = bb.max.z;

  if (minX >= maxX || minY >= maxY) return solid;

  // Build the filleted profile as a rounded-rectangle polygon
  const profile2D: Point2D[] = [];
  const corners = [
    { cx: minX, cy: minY, startAngle: Math.PI, endAngle: 1.5 * Math.PI },
    { cx: maxX, cy: minY, startAngle: 1.5 * Math.PI, endAngle: 2 * Math.PI },
    { cx: maxX, cy: maxY, startAngle: 0, endAngle: 0.5 * Math.PI },
    { cx: minX, cy: maxY, startAngle: 0.5 * Math.PI, endAngle: Math.PI },
  ];

  for (const corner of corners) {
    for (let s = 0; s <= segs; s++) {
      const angle = corner.startAngle + (s / segs) * (corner.endAngle - corner.startAngle);
      profile2D.push({ x: corner.cx + r * Math.cos(angle), y: corner.cy + r * Math.sin(angle), _type: 'Point2D' });
    }
  }

  const profile: Profile2D = { outer: profile2D, holes: [] };
  const height = maxZ - minZ;

  return extrude(profile, height);
}

// ─── Loft ────────────────────────────────────────────────────────────────────

export interface LoftOptions {
  closed?: boolean;
  ruled?: boolean; // if true, uses ruled surface (linear interpolation between sections)
}

/**
 * Create a solid by lofting through a sequence of 2D cross-sections.
 * Each section is placed at an increasing Z height.
 */
export function loft(profiles: Profile2D[], heights: number[], _options: LoftOptions = {}): Solid {
  if (profiles.length < 2) {
    throw new Error('Loft requires at least 2 profiles');
  }
  if (profiles.length !== heights.length) {
    throw new Error('Number of profiles must equal number of heights');
  }

  const vertices: Point3D[] = [];
  const faces: Face[] = [];

  // Store per-profile vertices
  const profileVerts: Point3D[][] = [];

  for (let pi = 0; pi < profiles.length; pi++) {
    const prof = profiles[pi];
    const z = heights[pi];
    const verts: Point3D[] = prof.outer.map((p) => createPoint3D(p.x, p.y, z));
    profileVerts.push(verts);
    vertices.push(...verts);
  }

  // Bottom cap (first profile)
  const bottom = profileVerts[0];
  if (bottom.length >= 3) {
    const bottomArea = polygonArea(profiles[0].outer);
    faces.push({
      id: crypto.randomUUID(),
      vertices: [...bottom],
      normal: { x: 0, y: 0, z: -1 },
      area: bottomArea,
    });
  }

  // Top cap (last profile)
  const top = profileVerts[profileVerts.length - 1];
  if (top.length >= 3) {
    const topArea = polygonArea(profiles[profiles.length - 1].outer);
    faces.push({
      id: crypto.randomUUID(),
      vertices: [...top].reverse(),
      normal: { x: 0, y: 0, z: 1 },
      area: topArea,
    });
  }

  // Side faces: connect consecutive sections
  for (let pi = 0; pi < profiles.length - 1; pi++) {
    const lower = profileVerts[pi];
    const upper = profileVerts[pi + 1];
    const nLower = lower.length;
    const nUpper = upper.length;
    // Use the smaller count for connectivity
    const n = Math.min(nLower, nUpper);

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const v0 = lower[i];
      const v1 = upper[i];
      const v2 = upper[j];
      const v3 = lower[j];

      // Compute face normal via cross product
      const a = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const b = { x: v3.x - v0.x, y: v3.y - v0.y, z: v3.z - v0.z };
      const normal = normalize(crossProduct(a, b));

      const dx1 = v1.x - v0.x, dy1 = v1.y - v0.y, dz1 = v1.z - v0.z;
      const dx2 = v2.x - v0.x, dy2 = v2.y - v0.y, dz2 = v2.z - v0.z;
      const area = 0.5 * magnitude(crossProduct(
        { x: dx1, y: dy1, z: dz1 },
        { x: dx2, y: dy2, z: dz2 }
      ));

      faces.push({ id: crypto.randomUUID(), vertices: [v0, v1, v2, v3], normal, area });
    }
  }

  return createSolid(vertices, faces);
}

// ─── Sweep ───────────────────────────────────────────────────────────────────

export interface SweepPath {
  points: Point3D[];
}

/**
 * Sweep a 2D profile along a 3D path.
 * The profile is perpendicular to the path at each point.
 */
export function sweep(profile: Profile2D, path: SweepPath): Solid {
  if (path.points.length < 2) {
    throw new Error('Sweep path requires at least 2 points');
  }
  if (profile.outer.length < 3) {
    throw new Error('Sweep profile requires at least 3 points');
  }

  const pathPts = path.points;
  const n = pathPts.length;
  const profilePts = profile.outer;
  const pn = profilePts.length;

  const vertices: Point3D[] = [];
  const faces: Face[] = [];

  // For each path point, place the profile in the plane perpendicular to the path direction
  const sectionVerts: Point3D[][] = [];

  for (let i = 0; i < n; i++) {
    // Compute tangent direction
    let tangent: Vector3D;
    if (i === 0) {
      const next = pathPts[1];
      tangent = { x: next.x - pathPts[0].x, y: next.y - pathPts[0].y, z: next.z - pathPts[0].z };
    } else if (i === n - 1) {
      const prev = pathPts[n - 2];
      tangent = { x: pathPts[n - 1].x - prev.x, y: pathPts[n - 1].y - prev.y, z: pathPts[n - 1].z - prev.z };
    } else {
      tangent = { x: pathPts[i + 1].x - pathPts[i - 1].x, y: pathPts[i + 1].y - pathPts[i - 1].y, z: pathPts[i + 1].z - pathPts[i - 1].z };
    }
    const t = normalize(tangent);

    // Choose up vector not parallel to tangent
    const worldUp: Vector3D = Math.abs(t.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
    const right = normalize(crossProduct(t, worldUp));
    const up = normalize(crossProduct(right, t));

    const origin = pathPts[i];
    const section: Point3D[] = profilePts.map((p) =>
      createPoint3D(
        origin.x + p.x * right.x + p.y * up.x,
        origin.y + p.x * right.y + p.y * up.y,
        origin.z + p.x * right.z + p.y * up.z
      )
    );

    sectionVerts.push(section);
    vertices.push(...section);
  }

  // End caps
  const bottomArea = polygonArea(profile.outer);
  faces.push({ id: crypto.randomUUID(), vertices: sectionVerts[0], normal: { x: 0, y: 0, z: -1 }, area: bottomArea });
  faces.push({ id: crypto.randomUUID(), vertices: [...sectionVerts[n - 1]].reverse(), normal: { x: 0, y: 0, z: 1 }, area: bottomArea });

  // Side quads
  for (let i = 0; i < n - 1; i++) {
    const lower = sectionVerts[i];
    const upper = sectionVerts[i + 1];

    for (let j = 0; j < pn; j++) {
      const k = (j + 1) % pn;
      const v0 = lower[j];
      const v1 = upper[j];
      const v2 = upper[k];
      const v3 = lower[k];

      const a = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const b = { x: v3.x - v0.x, y: v3.y - v0.y, z: v3.z - v0.z };
      const normal = normalize(crossProduct(a, b));

      faces.push({ id: crypto.randomUUID(), vertices: [v0, v1, v2, v3], normal, area: 0 });
    }
  }

  return createSolid(vertices, faces);
}

// ─── Shell ───────────────────────────────────────────────────────────────────

/**
 * Shell a solid — hollow it out by shrinking inward by the given thickness.
 * Works on box-shaped solids by creating an inner and outer shell.
 */
export function shell(solid: Solid, thickness: number): Solid {
  const t = Math.max(0, thickness);
  if (t === 0) return solid;
  const bb = solid.boundingBox;

  const outerMin = bb.min;
  const outerMax = bb.max;
  const innerMin = createPoint3D(outerMin.x + t, outerMin.y + t, outerMin.z + t);
  const innerMax = createPoint3D(outerMax.x - t, outerMax.y - t, outerMax.z - t);

  if (innerMin.x >= innerMax.x || innerMin.y >= innerMax.y || innerMin.z >= innerMax.z) {
    return solid; // too thin — return unchanged
  }

  // Create outer box vertices
  const outerVerts: Point3D[] = [
    createPoint3D(outerMin.x, outerMin.y, outerMin.z),
    createPoint3D(outerMax.x, outerMin.y, outerMin.z),
    createPoint3D(outerMax.x, outerMax.y, outerMin.z),
    createPoint3D(outerMin.x, outerMax.y, outerMin.z),
    createPoint3D(outerMin.x, outerMin.y, outerMax.z),
    createPoint3D(outerMax.x, outerMin.y, outerMax.z),
    createPoint3D(outerMax.x, outerMax.y, outerMax.z),
    createPoint3D(outerMin.x, outerMax.y, outerMax.z),
  ];

  // Create inner box vertices
  const innerVerts: Point3D[] = [
    createPoint3D(innerMin.x, innerMin.y, innerMin.z),
    createPoint3D(innerMax.x, innerMin.y, innerMin.z),
    createPoint3D(innerMax.x, innerMax.y, innerMin.z),
    createPoint3D(innerMin.x, innerMax.y, innerMin.z),
    createPoint3D(innerMin.x, innerMin.y, innerMax.z),
    createPoint3D(innerMax.x, innerMin.y, innerMax.z),
    createPoint3D(innerMax.x, innerMax.y, innerMax.z),
    createPoint3D(innerMin.x, innerMax.y, innerMax.z),
  ];

  const allVerts = [...outerVerts, ...innerVerts];
  const outerW = outerMax.x - outerMin.x;
  const outerD = outerMax.y - outerMin.y;
  const outerH = outerMax.z - outerMin.z;
  const outerArea = outerW * outerD;
  const innerW = innerMax.x - innerMin.x;
  const innerD = innerMax.y - innerMin.y;
  const innerH = innerMax.z - innerMin.z;
  const innerArea = innerW * innerD;

  const faces: Face[] = [
    // ─── Outer faces (6) ──────────────────────────────────────────────────────
    { id: crypto.randomUUID(), vertices: [outerVerts[0], outerVerts[1], outerVerts[2], outerVerts[3]], normal: { x: 0, y: 0, z: -1 }, area: outerArea },
    { id: crypto.randomUUID(), vertices: [outerVerts[7], outerVerts[6], outerVerts[5], outerVerts[4]], normal: { x: 0, y: 0, z: 1 }, area: outerArea },
    { id: crypto.randomUUID(), vertices: [outerVerts[0], outerVerts[4], outerVerts[5], outerVerts[1]], normal: { x: 0, y: -1, z: 0 }, area: outerW * outerH },
    { id: crypto.randomUUID(), vertices: [outerVerts[1], outerVerts[5], outerVerts[6], outerVerts[2]], normal: { x: 1, y: 0, z: 0 }, area: outerD * outerH },
    { id: crypto.randomUUID(), vertices: [outerVerts[2], outerVerts[6], outerVerts[7], outerVerts[3]], normal: { x: 0, y: 1, z: 0 }, area: outerW * outerH },
    { id: crypto.randomUUID(), vertices: [outerVerts[3], outerVerts[7], outerVerts[4], outerVerts[0]], normal: { x: -1, y: 0, z: 0 }, area: outerD * outerH },
    // ─── Inner faces (6, reversed normals) ────────────────────────────────────
    { id: crypto.randomUUID(), vertices: [innerVerts[3], innerVerts[2], innerVerts[1], innerVerts[0]], normal: { x: 0, y: 0, z: 1 }, area: innerArea },
    { id: crypto.randomUUID(), vertices: [innerVerts[4], innerVerts[5], innerVerts[6], innerVerts[7]], normal: { x: 0, y: 0, z: -1 }, area: innerArea },
    { id: crypto.randomUUID(), vertices: [innerVerts[1], innerVerts[5], innerVerts[4], innerVerts[0]], normal: { x: 0, y: 1, z: 0 }, area: innerW * innerH },
    { id: crypto.randomUUID(), vertices: [innerVerts[2], innerVerts[6], innerVerts[5], innerVerts[1]], normal: { x: -1, y: 0, z: 0 }, area: innerD * innerH },
    { id: crypto.randomUUID(), vertices: [innerVerts[3], innerVerts[7], innerVerts[6], innerVerts[2]], normal: { x: 0, y: -1, z: 0 }, area: innerW * innerH },
    { id: crypto.randomUUID(), vertices: [innerVerts[0], innerVerts[4], innerVerts[7], innerVerts[3]], normal: { x: 1, y: 0, z: 0 }, area: innerD * innerH },
  ];

  return createSolid(allVerts, faces);
}

// ─── Polygon offset ───────────────────────────────────────────────────────────

/**
 * Offset a 2D polygon inward (negative) or outward (positive) by a given distance.
 * Uses vertex normal averaging for convex polygons.
 */
export function offsetPolygon(points: Point2D[], distance: number): Point2D[] {
  const n = points.length;
  if (n < 3) return points;

  const result: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    // Edge vectors
    const e1x = curr.x - prev.x, e1y = curr.y - prev.y;
    const e2x = next.x - curr.x, e2y = next.y - curr.y;

    // Inward normals (rotate 90° inward)
    const len1 = Math.sqrt(e1x * e1x + e1y * e1y);
    const len2 = Math.sqrt(e2x * e2x + e2y * e2y);

    if (len1 === 0 || len2 === 0) {
      result.push({ ...curr });
      continue;
    }

    const n1x = e1y / len1, n1y = -e1x / len1;
    const n2x = e2y / len2, n2y = -e2x / len2;

    // Average of the two edge normals
    const nx = n1x + n2x;
    const ny = n1y + n2y;
    const nLen = Math.sqrt(nx * nx + ny * ny);

    if (nLen < 1e-10) {
      result.push({ ...curr });
      continue;
    }

    // Miter scale: dot(n, n1) to properly scale for sharp corners
    const dot = nx / nLen * n1x + ny / nLen * n1y;
    const scale = Math.abs(dot) < 1e-6 ? 1 : distance / dot;

    result.push({
      x: curr.x + nx / nLen * scale,
      y: curr.y + ny / nLen * scale,
      _type: 'Point2D',
    });
  }

  return result;
}
