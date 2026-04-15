/**
 * meshFactory — 3D mesh geometry builders for BIM elements
 * Used by useThreeViewport to convert document elements to Three.js geometry descriptors
 */

export interface Vec3 { x: number; y: number; z: number; }
export interface Vec2 { x: number; y: number; }

export interface MeshDescriptor {
  type: 'box' | 'extrusion' | 'cylinder' | 'custom';
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  geometry: BoxGeometry | ExtrusionGeometry | CylinderGeometry;
}

export interface BoxGeometry {
  kind: 'box';
  width: number;
  height: number;
  depth: number;
}

export interface ExtrusionGeometry {
  kind: 'extrusion';
  profile: Vec2[];
  depth: number;
}

export interface CylinderGeometry {
  kind: 'cylinder';
  radiusTop: number;
  radiusBottom: number;
  height: number;
  segments: number;
}

export interface WallMeshOptions {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  height: number;
  elevation?: number;
}

export function buildWallMesh(options: WallMeshOptions): MeshDescriptor {
  const { startX, startY, endX, endY, thickness, height, elevation = 0 } = options;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const cx = (startX + endX) / 2;
  const cy = (startY + endY) / 2;

  return {
    type: 'box',
    position: { x: cx, y: elevation + height / 2, z: cy },
    rotation: { x: 0, y: -angle, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    geometry: { kind: 'box', width: length, height, depth: thickness },
  };
}

export interface SlabMeshOptions {
  points: Vec2[];
  thickness: number;
  elevation?: number;
}

export function buildSlabMesh(options: SlabMeshOptions): MeshDescriptor {
  const { points, thickness, elevation = 0 } = options;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return {
    type: 'extrusion',
    position: { x: cx, y: elevation - thickness / 2, z: cy },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    geometry: {
      kind: 'extrusion',
      profile: points.map((p) => ({ x: p.x - cx, y: p.y - cy })),
      depth: thickness,
    },
  };
}

export interface ColumnMeshOptions {
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  elevation?: number;
  section?: 'square' | 'round' | 'rectangular';
}

export function buildColumnMesh(options: ColumnMeshOptions): MeshDescriptor {
  const { x, y, width, depth, height, elevation = 0, section = 'square' } = options;

  if (section === 'round') {
    return {
      type: 'cylinder',
      position: { x, y: elevation + height / 2, z: y },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      geometry: { kind: 'cylinder', radiusTop: width / 2, radiusBottom: width / 2, height, segments: 16 },
    };
  }

  return {
    type: 'box',
    position: { x, y: elevation + height / 2, z: y },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    geometry: { kind: 'box', width, height, depth },
  };
}

export interface BeamMeshOptions {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  depth: number;
  elevation?: number;
}

export function buildBeamMesh(options: BeamMeshOptions): MeshDescriptor {
  const { startX, startY, endX, endY, width, depth, elevation = 0 } = options;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const cx = (startX + endX) / 2;
  const cy = (startY + endY) / 2;

  return {
    type: 'box',
    position: { x: cx, y: elevation - depth / 2, z: cy },
    rotation: { x: 0, y: -angle, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    geometry: { kind: 'box', width: length, height: depth, depth: width },
  };
}
