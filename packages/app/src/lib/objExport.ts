/**
 * 3D export — OBJ + MTL serialiser (T-IO-049 / #342).
 *
 * Pure serialisers that emit Wavefront OBJ + MTL text from a list of
 * meshes. Intentionally independent from three.js so the same code
 * paths can run in Node, Workers, and browser contexts. FBX and glTF
 * exports come later using the three-addons shipped exporters; OBJ
 * is the no-dependency baseline.
 */

export interface Vertex { x: number; y: number; z: number }
export interface Face   { /** 0-indexed vertex indices, 3+ per face. */ indices: number[] }

export interface MeshGroup {
  name: string;
  material?: string;   // MTL material reference
  vertices: Vertex[];
  faces: Face[];
  /** Optional vertex normals (indices parallel to `vertices`). */
  normals?: Vertex[];
}

export interface MaterialDef {
  name: string;
  /** Ambient colour [0..1]. */
  Ka?: [number, number, number];
  /** Diffuse colour [0..1]. */
  Kd?: [number, number, number];
  /** Specular colour [0..1]. */
  Ks?: [number, number, number];
  /** Dissolve (0=transparent, 1=opaque). */
  d?: number;
}

export type CoordSystem = 'y-up' | 'z-up';

/**
 * Serialise a list of MeshGroups to an OBJ file. Uses 'mtllib' when
 * a non-empty `mtlFileName` is given.
 */
export function serializeOBJ(
  groups: MeshGroup[],
  opts: {
    coordSystem?: CoordSystem;
    mtlFileName?: string;
    /** Scale factor applied to every vertex. Use 0.001 to convert mm → m. */
    unitScale?: number;
  } = {},
): string {
  const coord = opts.coordSystem ?? 'y-up';
  const scale = opts.unitScale ?? 1;
  const lines: string[] = [];
  lines.push('# OpenCAD OBJ export');
  if (opts.mtlFileName) lines.push(`mtllib ${opts.mtlFileName}`);
  let vertexOffset = 0;
  let normalOffset = 0;
  for (const group of groups) {
    lines.push(`o ${group.name}`);
    if (group.material) lines.push(`usemtl ${group.material}`);
    for (const v of group.vertices) {
      const [x, y, z] = coord === 'y-up'
        ? [v.x, v.y, v.z]
        : [v.x, v.z, -v.y];
      lines.push(`v ${(x * scale).toFixed(6)} ${(y * scale).toFixed(6)} ${(z * scale).toFixed(6)}`);
    }
    if (group.normals) {
      for (const n of group.normals) {
        lines.push(`vn ${n.x.toFixed(6)} ${n.y.toFixed(6)} ${n.z.toFixed(6)}`);
      }
    }
    for (const f of group.faces) {
      // OBJ is 1-indexed + file-wide, so offset by prior groups' vertex count.
      const idxs = f.indices.map((i) => group.normals
        ? `${i + 1 + vertexOffset}//${i + 1 + normalOffset}`
        : `${i + 1 + vertexOffset}`);
      lines.push(`f ${idxs.join(' ')}`);
    }
    vertexOffset += group.vertices.length;
    if (group.normals) normalOffset += group.normals.length;
  }
  return lines.join('\n') + '\n';
}

export function serializeMTL(materials: MaterialDef[]): string {
  const lines: string[] = ['# OpenCAD MTL'];
  for (const m of materials) {
    lines.push(`newmtl ${m.name}`);
    if (m.Ka) lines.push(`Ka ${m.Ka.map((v) => v.toFixed(4)).join(' ')}`);
    if (m.Kd) lines.push(`Kd ${m.Kd.map((v) => v.toFixed(4)).join(' ')}`);
    if (m.Ks) lines.push(`Ks ${m.Ks.map((v) => v.toFixed(4)).join(' ')}`);
    if (m.d !== undefined) lines.push(`d ${m.d.toFixed(4)}`);
  }
  return lines.join('\n') + '\n';
}
