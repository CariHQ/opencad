/**
 * Section slicer — T-DOC-005 (#298).
 *
 * Pure helper that computes cross-section polygons when a plane cuts
 * a mesh or a set of axis-aligned boxes. The section view consumes these
 * to draw the poché lines; the SVG export flattens them to paths.
 *
 * v1 scope: axis-aligned-box inputs (walls, slabs, roofs after
 * triangulation → back-to-boxes), axis-aligned cutting planes
 * (normal along X, Y, or Z). Non-axis-aligned planes + non-box meshes
 * follow once the section view needs them.
 */

export interface Point3D { x: number; y: number; z: number }
export interface Point2D { x: number; y: number }
export interface Box3D {
  min: Point3D; max: Point3D;
  /** optional tag to identify the source element back in the section view. */
  elementId?: string;
  material?: string;
}
/** Axis-aligned cutting plane, expressed as `axis === constant`. */
export type PlaneAxis = 'x' | 'y' | 'z';
export interface AxisPlane {
  axis: PlaneAxis;
  value: number;
}

/** Intersect an axis-aligned box with an axis-aligned plane → rectangle in the plane. */
export function sliceBoxAxisPlane(box: Box3D, plane: AxisPlane): Point2D[] | null {
  const { axis, value } = plane;
  if (axis === 'x') {
    if (value < box.min.x || value > box.max.x) return null;
    // Rectangle lives in YZ plane — return 4 points as {x: y_world, y: z_world}
    return [
      { x: box.min.y, y: box.min.z },
      { x: box.max.y, y: box.min.z },
      { x: box.max.y, y: box.max.z },
      { x: box.min.y, y: box.max.z },
    ];
  }
  if (axis === 'y') {
    if (value < box.min.y || value > box.max.y) return null;
    return [
      { x: box.min.x, y: box.min.z },
      { x: box.max.x, y: box.min.z },
      { x: box.max.x, y: box.max.z },
      { x: box.min.x, y: box.max.z },
    ];
  }
  // axis === 'z'
  if (value < box.min.z || value > box.max.z) return null;
  return [
    { x: box.min.x, y: box.min.y },
    { x: box.max.x, y: box.min.y },
    { x: box.max.x, y: box.max.y },
    { x: box.min.x, y: box.max.y },
  ];
}

export interface SliceResult {
  polygons: Array<{ elementId?: string; material?: string; points: Point2D[] }>;
}

/** Slice a list of boxes with one plane; only intersecting boxes appear. */
export function sliceBoxes(boxes: Box3D[], plane: AxisPlane): SliceResult {
  const polygons: SliceResult['polygons'] = [];
  for (const box of boxes) {
    const poly = sliceBoxAxisPlane(box, plane);
    if (poly) {
      polygons.push({ elementId: box.elementId, material: box.material, points: poly });
    }
  }
  return { polygons };
}

/**
 * Slice a composite wall (N axis-aligned layer boxes) — each layer
 * produces its own polygon in the slice result so the section view
 * can fill each layer with its own hatch.
 */
export function sliceCompositeWall(
  layers: Array<{ box: Box3D; material: string }>,
  plane: AxisPlane,
): SliceResult {
  const out: SliceResult['polygons'] = [];
  for (const layer of layers) {
    const poly = sliceBoxAxisPlane(layer.box, plane);
    if (poly) out.push({ elementId: layer.box.elementId, material: layer.material, points: poly });
  }
  return { polygons: out };
}
