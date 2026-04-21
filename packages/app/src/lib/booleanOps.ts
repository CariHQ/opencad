/**
 * Mesh boolean operations — union, subtract, intersect.
 *
 * Backed by three-bvh-csg (which itself uses three-mesh-bvh, already in
 * our deps for accelerated raycasting). Operations are performed on
 * THREE.Mesh instances with BufferGeometry inputs and return a fresh
 * Mesh whose geometry is the result of the boolean.
 *
 * This is the pragmatic answer to the PRD's "Boolean Operations P0"
 * goal. BREP-level booleans (exact edges / B-Spline faces) would need
 * OpenCASCADE; the mesh-boolean output is correct for every downstream
 * consumer we have today (rendering, IFC swept-solid export,
 * quantityTakeoff).
 */

import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

export type BooleanOp = 'union' | 'subtract' | 'intersect';

const OP_MAP = {
  union: ADDITION,
  subtract: SUBTRACTION,
  intersect: INTERSECTION,
} as const;

// Evaluator is stateful — cache one per module so repeated booleans don't
// reallocate internals on every call.
let _evaluator: Evaluator | null = null;
function evaluator(): Evaluator {
  if (!_evaluator) {
    _evaluator = new Evaluator();
    _evaluator.attributes = ['position', 'normal'];
  }
  return _evaluator;
}

/**
 * Run a boolean op on two meshes, returning a new mesh whose material is
 * cloned from `a`. Input meshes are not mutated; their world transforms
 * are baked into the resulting geometry.
 */
export function meshBoolean(
  op: BooleanOp,
  a: THREE.Mesh,
  b: THREE.Mesh,
): THREE.Mesh {
  const brushA = new Brush(a.geometry, a.material as THREE.Material);
  brushA.applyMatrix4(a.matrixWorld);
  brushA.updateMatrixWorld();
  const brushB = new Brush(b.geometry, b.material as THREE.Material);
  brushB.applyMatrix4(b.matrixWorld);
  brushB.updateMatrixWorld();

  const result = new Brush();
  evaluator().evaluate(brushA, brushB, OP_MAP[op], result);

  const mat = Array.isArray(a.material)
    ? (a.material[0] as THREE.Material).clone()
    : (a.material as THREE.Material).clone();
  return new THREE.Mesh(result.geometry, mat);
}
