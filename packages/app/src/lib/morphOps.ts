/**
 * Morph — free-form mesh operations (T-MOD-018 / #311).
 *
 * Operations on a plain vertex/face mesh: seed primitive, push-pull
 * face, vertex drag, edge bevel, split face, extrude face. Pure math
 * — the interactive edit mode in the viewport consumes these.
 */

export interface Vec3 { x: number; y: number; z: number }
export interface MorphMesh {
  vertices: Vec3[];
  /** Each face lists 3+ vertex indices (CCW from the outside). */
  faces: number[][];
}

/** Seed a box morph — 8 vertices, 6 quads. */
export function seedBox(size: Vec3 = { x: 1, y: 1, z: 1 }): MorphMesh {
  const { x, y, z } = size;
  const vs: Vec3[] = [
    { x: 0, y: 0, z: 0 }, { x, y: 0, z: 0 },
    { x, y,    z: 0 },    { x: 0, y, z: 0 },
    { x: 0, y: 0, z },    { x, y: 0, z },
    { x, y,    z },       { x: 0, y, z    },
  ];
  const fs: number[][] = [
    [0, 3, 2, 1],  // bottom (-z)
    [4, 5, 6, 7],  // top    (+z)
    [0, 1, 5, 4],  // front  (-y)
    [2, 3, 7, 6],  // back   (+y)
    [0, 4, 7, 3],  // left   (-x)
    [1, 2, 6, 5],  // right  (+x)
  ];
  return { vertices: vs, faces: fs };
}

/** Translate every vertex of one face by `delta`. */
export function pushPullFace(
  mesh: MorphMesh, faceIndex: number, delta: Vec3,
): MorphMesh {
  if (faceIndex < 0 || faceIndex >= mesh.faces.length) return mesh;
  const face = mesh.faces[faceIndex]!;
  const moved = new Set(face);
  const newVertices = mesh.vertices.map((v, i) =>
    moved.has(i) ? { x: v.x + delta.x, y: v.y + delta.y, z: v.z + delta.z } : v);
  return { ...mesh, vertices: newVertices };
}

/** Move a single vertex by `delta`. */
export function moveVertex(mesh: MorphMesh, vertexIndex: number, delta: Vec3): MorphMesh {
  const v = mesh.vertices[vertexIndex];
  if (!v) return mesh;
  const nv = { x: v.x + delta.x, y: v.y + delta.y, z: v.z + delta.z };
  return { ...mesh, vertices: mesh.vertices.map((x, i) => (i === vertexIndex ? nv : x)) };
}

/**
 * Bevel a specific edge by inserting two new vertices along the adjacent
 * faces and replacing the edge with a new face. Approximation valid for
 * axis-aligned cases; covers the common case of a box edge bevel.
 */
export function bevelEdge(
  mesh: MorphMesh, edge: [number, number], offset: number,
): MorphMesh {
  const [a, b] = edge;
  const va = mesh.vertices[a]; const vb = mesh.vertices[b];
  if (!va || !vb) return mesh;
  // Two new vertices along the edge, offset inward by `offset`.
  const dx = vb.x - va.x, dy = vb.y - va.y, dz = vb.z - va.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const ux = dx / len, uy = dy / len, uz = dz / len;
  const na: Vec3 = { x: va.x + ux * offset, y: va.y + uy * offset, z: va.z + uz * offset };
  const nb: Vec3 = { x: vb.x - ux * offset, y: vb.y - uy * offset, z: vb.z - uz * offset };
  const newVerts = [...mesh.vertices, na, nb];
  const nai = newVerts.length - 2;
  const nbi = newVerts.length - 1;

  // Rewrite any face that contains edge (a,b) to route through (a, na, nb, b)
  // plus one new "chamfer strip" face connecting them.
  const newFaces: number[][] = mesh.faces.map((face) => {
    const i = face.indexOf(a);
    const j = face.indexOf(b);
    if (i < 0 || j < 0) return face;
    // Only rewrite when a and b are adjacent in this face
    const adjacent = (face[(i + 1) % face.length] === b) || (face[(j + 1) % face.length] === a);
    if (!adjacent) return face;
    return face.flatMap((idx) => (idx === a ? [a, nai] : idx === b ? [nbi, b] : [idx]));
  });
  // Chamfer strip face
  newFaces.push([a, nai, nbi, b]);
  return { vertices: newVerts, faces: newFaces };
}

/**
 * Split a face along a line between two of its vertex indices. The two
 * halves become separate faces. Works only when the indices are part of
 * the same face AND not adjacent (i.e., not an existing edge).
 */
export function splitFace(
  mesh: MorphMesh, faceIndex: number, fromVertex: number, toVertex: number,
): MorphMesh {
  const face = mesh.faces[faceIndex];
  if (!face) return mesh;
  const i = face.indexOf(fromVertex);
  const j = face.indexOf(toVertex);
  if (i < 0 || j < 0) return mesh;
  if (Math.abs(i - j) <= 1 || (i === 0 && j === face.length - 1) || (j === 0 && i === face.length - 1)) {
    return mesh; // already an edge, can't split along it
  }
  const a = Math.min(i, j), b = Math.max(i, j);
  const faceA = face.slice(a, b + 1);
  const faceB = [...face.slice(b), ...face.slice(0, a + 1)];
  const next = mesh.faces.slice();
  next.splice(faceIndex, 1, faceA, faceB);
  return { ...mesh, faces: next };
}

/**
 * Extrude a face: translate its vertices by `delta` and add side faces
 * connecting the original edges to the new positions. The original face
 * becomes the new "top" face at the extruded position.
 */
export function extrudeFace(
  mesh: MorphMesh, faceIndex: number, delta: Vec3,
): MorphMesh {
  const face = mesh.faces[faceIndex];
  if (!face) return mesh;
  // Duplicate the face's vertices, translated.
  const oldToNew = new Map<number, number>();
  const newVerts = [...mesh.vertices];
  for (const idx of face) {
    const v = mesh.vertices[idx]!;
    newVerts.push({ x: v.x + delta.x, y: v.y + delta.y, z: v.z + delta.z });
    oldToNew.set(idx, newVerts.length - 1);
  }
  const newTopFace = face.map((i) => oldToNew.get(i)!);
  // Side faces: one per edge of the original face.
  const sideFaces: number[][] = [];
  for (let i = 0; i < face.length; i++) {
    const a = face[i]!;
    const b = face[(i + 1) % face.length]!;
    const na = oldToNew.get(a)!;
    const nb = oldToNew.get(b)!;
    sideFaces.push([a, b, nb, na]);
  }
  // Replace original face with new top-face, append side faces.
  const nextFaces = mesh.faces.slice();
  nextFaces.splice(faceIndex, 1, newTopFace);
  nextFaces.push(...sideFaces);
  return { vertices: newVerts, faces: nextFaces };
}
