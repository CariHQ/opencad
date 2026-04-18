/**
 * Three.js geometry test helpers
 * Used by T-3D-001 through T-3D-005
 */

import * as THREE from 'three';

/**
 * Compute the signed volume of a tetrahedron from origin to a triangle face.
 * Formula: V = (v1 · (v2 × v3)) / 6
 */
function signedTetraVolume(
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  v3: THREE.Vector3,
): number {
  return v1.dot(new THREE.Vector3().crossVectors(v2, v3)) / 6.0;
}

/**
 * Compute the volume of a closed BufferGeometry by summing signed tetrahedral volumes.
 * Requires an indexed or non-indexed geometry with position attribute.
 * Returns the absolute volume.
 */
export function computeVolume(geometry: THREE.BufferGeometry): number {
  // Ensure we work with a non-indexed copy for simplicity
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes['position'] as THREE.BufferAttribute | undefined;
  if (!pos) return 0;

  let volume = 0;
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();

  const triCount = pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    v1.fromBufferAttribute(pos, i * 3);
    v2.fromBufferAttribute(pos, i * 3 + 1);
    v3.fromBufferAttribute(pos, i * 3 + 2);
    volume += signedTetraVolume(v1, v2, v3);
  }

  return Math.abs(volume);
}

/**
 * Edge key for manifold check — canonical ordering so (a,b) == (b,a).
 */
function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Check if a geometry is manifold: every edge shared by exactly 2 triangles.
 * Returns true when manifold, false otherwise.
 *
 * Uses position-based vertex merging so that geometries with per-face vertex
 * duplication (like THREE.BoxGeometry, which uses separate vertices per face
 * for UV/normal independence) are handled correctly.
 */
export function isManifold(geometry: THREE.BufferGeometry): boolean {
  // Always work through position-merging so coincident verts across face
  // boundaries are treated as the same topological vertex.
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes['position'] as THREE.BufferAttribute | undefined;
  if (!pos) return false;

  const vertMap = new Map<string, number>();
  const getIdx = (i: number): number => {
    // Round to 2 decimal places to tolerate floating-point noise
    const x = Math.round(pos.getX(i) * 100);
    const y = Math.round(pos.getY(i) * 100);
    const z = Math.round(pos.getZ(i) * 100);
    const key = `${x},${y},${z}`;
    if (!vertMap.has(key)) vertMap.set(key, vertMap.size);
    return vertMap.get(key)!;
  };

  const counts = new Map<string, number>();
  const addEdge = (a: number, b: number) => {
    const key = edgeKey(a, b);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  const triCount = pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const a = getIdx(i * 3);
    const b = getIdx(i * 3 + 1);
    const c = getIdx(i * 3 + 2);
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  for (const count of counts.values()) {
    if (count !== 2) return false;
  }
  return true;
}
