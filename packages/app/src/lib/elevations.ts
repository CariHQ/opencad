/**
 * Named elevations — T-DOC-006 (#299).
 *
 * Each elevation is a named orthographic view of the model looking along
 * a cardinal (or user-specified) compass direction. This module exports
 * the default seed set and the camera parameters that drive the view.
 *
 * Coordinate convention:
 *   - World is right-handed. X = east, Y = up, Z = south.
 *   - "North elevation" = camera north of the building looking south.
 */

export type Compass = 'N' | 'S' | 'E' | 'W' | 'custom';

export interface ElevationSpec {
  id: string;
  name: string;
  compass: Compass;
  /** Degrees clockwise from north (0 = N, 90 = E). Only used when compass='custom'. */
  angleDeg?: number;
  /** Camera distance from model centre — defaults to max(width, depth) × 2. */
  cameraDistance?: number;
  /** Optional crop box (world mm) to limit rendered content. */
  cropBox?: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };
}

export interface Vec3 { x: number; y: number; z: number }
export interface CameraParams {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  /** Orthographic half-width + half-height in world mm. */
  orthoHalfWidth: number;
  orthoHalfHeight: number;
}

/**
 * Seed the four cardinal elevations on new-project creation.
 */
export const DEFAULT_ELEVATIONS: ElevationSpec[] = [
  { id: 'elev-north', name: 'North Elevation', compass: 'N' },
  { id: 'elev-south', name: 'South Elevation', compass: 'S' },
  { id: 'elev-east',  name: 'East Elevation',  compass: 'E' },
  { id: 'elev-west',  name: 'West Elevation',  compass: 'W' },
];

/**
 * Compute the camera position + orientation for an elevation. Given a
 * model bounding box, the camera sits outside the bbox at the chosen
 * direction and looks toward the centre. Up is always world-+Y.
 */
export function cameraParamsFor(
  elev: ElevationSpec,
  bbox: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number },
): CameraParams {
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const cz = (bbox.minZ + bbox.maxZ) / 2;
  const w = bbox.maxX - bbox.minX;
  const h = bbox.maxY - bbox.minY;
  const d = bbox.maxZ - bbox.minZ;
  const dist = elev.cameraDistance ?? Math.max(w, d) * 2;

  const angleDeg =
    elev.compass === 'N' ?   0 :
    elev.compass === 'E' ?  90 :
    elev.compass === 'S' ? 180 :
    elev.compass === 'W' ? 270 :
    (elev.angleDeg ?? 0);

  const rad = (angleDeg * Math.PI) / 180;
  // +Z is south in our convention; at angle 0 (N) camera sits at +N (= -Z).
  const dirX = Math.sin(rad);
  const dirZ = -Math.cos(rad);
  return {
    position: { x: cx + dirX * dist, y: cy,              z: cz + dirZ * dist },
    target:   { x: cx,                 y: cy,              z: cz                 },
    up:       { x: 0, y: 1, z: 0 },
    // Orthographic frustum sized to fit the horizontal perpendicular to
    // the view direction + vertical extent, with a small margin.
    orthoHalfWidth:  Math.max(Math.max(w, d) * 0.55, 100),
    orthoHalfHeight: Math.max(h * 0.55, 100),
  };
}
