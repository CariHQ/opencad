/**
 * Multi-plane roof geometry — T-MOD-011 (#304).
 *
 * Given a rectangular or simple-convex footprint + slope angle, emit
 * the set of roof planes (4 hips for a rectangle, or 2 hips + 2 gable
 * triangles when a side is set to 'gable'). Returns each plane's
 * polygon in 3D — consumers build meshes directly.
 */

export interface Point2D { x: number; y: number }
export interface Point3D { x: number; y: number; z: number }

export interface RoofPlane {
  /** Polygon defining the slanted face. */
  vertices: Point3D[];
  /** Slope angle in radians (pitch). */
  slopeAngle: number;
  /** Pitch direction — unit vector in XY (+X east, +Y north). */
  pitchDir: { x: number; y: number };
  kind: 'hip' | 'gable';
}

export interface RectangleRoofInput {
  /** Four corners of the footprint in order (CCW). */
  footprint: [Point2D, Point2D, Point2D, Point2D];
  slopeAngleDeg: number;
  /** Which sides render as vertical gable walls instead of hip slopes. */
  gableSides?: Array<'north' | 'south' | 'east' | 'west'>;
  /** Eave elevation (mm). */
  eaveZ?: number;
}

/**
 * Emit roof planes for a rectangular footprint + slope + optional gables.
 * Assumes the footprint is axis-aligned (sides parallel to world X/Y).
 */
export function rectangleRoof(input: RectangleRoofInput): RoofPlane[] {
  const slope = (input.slopeAngleDeg * Math.PI) / 180;
  const eave = input.eaveZ ?? 0;
  const gables = new Set(input.gableSides ?? []);

  // Bounding box of the footprint
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of input.footprint) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const width = maxX - minX, depth = maxY - minY;
  const ridgeZ = eave + (Math.min(width, depth) / 2) * Math.tan(slope);

  const planes: RoofPlane[] = [];

  // When both N and S are gables, the roof becomes a pitched gable along N-S
  // (ridge runs N-S at the top). Otherwise ridge is the longer centerline.
  const isHipAll = gables.size === 0;
  const onlyGableNS = gables.has('north') && gables.has('south') && !gables.has('east') && !gables.has('west');
  const onlyGableEW = gables.has('east')  && gables.has('west')  && !gables.has('north') && !gables.has('south');

  if (isHipAll) {
    // Standard 4-plane hip — ridge runs parallel to the long side
    const longAxisX = width >= depth;
    if (longAxisX) {
      const ridgeY0 = (minY + maxY) / 2 - (width / 2 - depth / 2) / 1; // x-extent of ridge
      void ridgeY0;
      const rx1 = minX + depth / 2;
      const rx2 = maxX - depth / 2;
      const rmidY = (minY + maxY) / 2;
      // South hip (minY side)
      planes.push({
        kind: 'hip', slopeAngle: slope, pitchDir: { x: 0, y: -1 },
        vertices: [
          { x: minX, y: minY, z: eave }, { x: maxX, y: minY, z: eave },
          { x: rx2,  y: rmidY, z: ridgeZ }, { x: rx1, y: rmidY, z: ridgeZ },
        ],
      });
      // North hip
      planes.push({
        kind: 'hip', slopeAngle: slope, pitchDir: { x: 0, y: 1 },
        vertices: [
          { x: rx1, y: rmidY, z: ridgeZ }, { x: rx2, y: rmidY, z: ridgeZ },
          { x: maxX, y: maxY, z: eave }, { x: minX, y: maxY, z: eave },
        ],
      });
      // West hip (triangle)
      planes.push({
        kind: 'hip', slopeAngle: slope, pitchDir: { x: -1, y: 0 },
        vertices: [
          { x: minX, y: minY, z: eave }, { x: rx1, y: rmidY, z: ridgeZ },
          { x: minX, y: maxY, z: eave },
        ],
      });
      // East hip (triangle)
      planes.push({
        kind: 'hip', slopeAngle: slope, pitchDir: { x: 1, y: 0 },
        vertices: [
          { x: maxX, y: minY, z: eave }, { x: maxX, y: maxY, z: eave },
          { x: rx2, y: rmidY, z: ridgeZ },
        ],
      });
    } else {
      const ry1 = minY + width / 2;
      const ry2 = maxY - width / 2;
      const rmidX = (minX + maxX) / 2;
      planes.push({
        kind: 'hip', slopeAngle: slope, pitchDir: { x: -1, y: 0 },
        vertices: [
          { x: minX, y: minY, z: eave }, { x: rmidX, y: ry1, z: ridgeZ },
          { x: rmidX, y: ry2, z: ridgeZ }, { x: minX, y: maxY, z: eave },
        ],
      });
      planes.push({
        kind: 'hip', slopeAngle: slope, pitchDir: { x: 1, y: 0 },
        vertices: [
          { x: rmidX, y: ry1, z: ridgeZ }, { x: maxX, y: minY, z: eave },
          { x: maxX, y: maxY, z: eave }, { x: rmidX, y: ry2, z: ridgeZ },
        ],
      });
      planes.push({
        kind: 'hip', slopeAngle: slope, pitchDir: { x: 0, y: -1 },
        vertices: [
          { x: minX, y: minY, z: eave }, { x: maxX, y: minY, z: eave },
          { x: rmidX, y: ry1, z: ridgeZ },
        ],
      });
      planes.push({
        kind: 'hip', slopeAngle: slope, pitchDir: { x: 0, y: 1 },
        vertices: [
          { x: rmidX, y: ry2, z: ridgeZ }, { x: maxX, y: maxY, z: eave },
          { x: minX, y: maxY, z: eave },
        ],
      });
    }
  } else if (onlyGableNS) {
    // Gable on N + S, hips on E + W. Ridge runs E-W along the mid-Y.
    const ridgeY = (minY + maxY) / 2;
    // West slope
    planes.push({
      kind: 'hip', slopeAngle: slope, pitchDir: { x: -1, y: 0 },
      vertices: [
        { x: minX, y: minY, z: eave }, { x: minX, y: maxY, z: eave },
        { x: maxX, y: ridgeY, z: ridgeZ }, // wait — ridge goes full length E-W
      ],
    });
    // Actually: for gable N+S, ridge runs N-S at center X.
    // Replace.
    planes.length = 0;
    const ridgeX = (minX + maxX) / 2;
    // East slope (sloping down to +X)
    planes.push({
      kind: 'hip', slopeAngle: slope, pitchDir: { x: 1, y: 0 },
      vertices: [
        { x: ridgeX, y: minY, z: ridgeZ }, { x: maxX, y: minY, z: eave },
        { x: maxX, y: maxY, z: eave }, { x: ridgeX, y: maxY, z: ridgeZ },
      ],
    });
    // West slope
    planes.push({
      kind: 'hip', slopeAngle: slope, pitchDir: { x: -1, y: 0 },
      vertices: [
        { x: minX, y: minY, z: eave }, { x: ridgeX, y: minY, z: ridgeZ },
        { x: ridgeX, y: maxY, z: ridgeZ }, { x: minX, y: maxY, z: eave },
      ],
    });
    // Gable triangles (vertical — z goes up to ridgeZ at center)
    planes.push({
      kind: 'gable', slopeAngle: Math.PI / 2, pitchDir: { x: 0, y: -1 },
      vertices: [
        { x: minX, y: minY, z: eave }, { x: maxX, y: minY, z: eave },
        { x: ridgeX, y: minY, z: ridgeZ },
      ],
    });
    planes.push({
      kind: 'gable', slopeAngle: Math.PI / 2, pitchDir: { x: 0, y: 1 },
      vertices: [
        { x: minX, y: maxY, z: eave }, { x: ridgeX, y: maxY, z: ridgeZ },
        { x: maxX, y: maxY, z: eave },
      ],
    });
  } else if (onlyGableEW) {
    // Gable on E + W — ridge runs E-W at mid-Y
    const ridgeY = (minY + maxY) / 2;
    planes.push({
      kind: 'hip', slopeAngle: slope, pitchDir: { x: 0, y: -1 },
      vertices: [
        { x: minX, y: minY, z: eave }, { x: maxX, y: minY, z: eave },
        { x: maxX, y: ridgeY, z: ridgeZ }, { x: minX, y: ridgeY, z: ridgeZ },
      ],
    });
    planes.push({
      kind: 'hip', slopeAngle: slope, pitchDir: { x: 0, y: 1 },
      vertices: [
        { x: minX, y: ridgeY, z: ridgeZ }, { x: maxX, y: ridgeY, z: ridgeZ },
        { x: maxX, y: maxY, z: eave }, { x: minX, y: maxY, z: eave },
      ],
    });
    planes.push({
      kind: 'gable', slopeAngle: Math.PI / 2, pitchDir: { x: -1, y: 0 },
      vertices: [
        { x: minX, y: minY, z: eave }, { x: minX, y: ridgeY, z: ridgeZ },
        { x: minX, y: maxY, z: eave },
      ],
    });
    planes.push({
      kind: 'gable', slopeAngle: Math.PI / 2, pitchDir: { x: 1, y: 0 },
      vertices: [
        { x: maxX, y: minY, z: eave }, { x: maxX, y: maxY, z: eave },
        { x: maxX, y: ridgeY, z: ridgeZ },
      ],
    });
  }

  return planes;
}
