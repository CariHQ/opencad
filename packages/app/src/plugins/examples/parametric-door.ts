/**
 * T-EXT-01 example: Parametric Door family.
 *
 * Parameters: width, height, frameThickness, handed (left/right).
 * Geometry: rectangular door panel + frame as a simple mesh.
 */
import { defineFamily } from '../defineFamily';
import type { ParamValue, FamilyGeometry } from '../defineFamily';

function buildDoorGeometry(
  width: number,
  height: number,
  frameThickness: number,
  _handed: string,
): FamilyGeometry {
  const w = width / 1000;   // mm → m
  const h = height / 1000;
  const ft = frameThickness / 1000;
  const depth = 0.05; // 50mm panel depth

  // Door panel (full width × height rectangle)
  const vertices: number[] = [];
  const faces: number[] = [];

  // Helper: push a box (axis-aligned)
  function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
    const base = vertices.length / 3;
    // 8 corners
    vertices.push(
      x0, y0, z0,  x1, y0, z0,  x1, y1, z0,  x0, y1, z0, // front face
      x0, y0, z1,  x1, y0, z1,  x1, y1, z1,  x0, y1, z1, // back face
    );
    // 6 faces × 2 triangles
    faces.push(
      base, base+1, base+2,  base, base+2, base+3,  // front
      base+4, base+6, base+5,  base+4, base+7, base+6, // back
      base, base+4, base+5,  base, base+5, base+1,  // bottom
      base+3, base+2, base+6,  base+3, base+6, base+7, // top
      base, base+3, base+7,  base, base+7, base+4,  // left
      base+1, base+5, base+6,  base+1, base+6, base+2, // right
    );
  }

  // Door slab (inset from frame)
  box(ft, 0, ft, w - ft, depth, h - ft);
  // Frame: top rail
  box(0, 0, h - ft, w, depth, h);
  // Frame: bottom rail
  box(0, 0, 0, w, depth, ft);
  // Frame: left stile
  box(0, 0, 0, ft, depth, h);
  // Frame: right stile
  box(w - ft, 0, 0, w, depth, h);

  return { vertices, faces };
}

defineFamily({
  id: 'builtin:parametric-door',
  name: 'Parametric Door',
  category: 'door',
  version: '1.0.0',
  parameters: [
    { id: 'width',          label: 'Width',           type: 'dimension', default: 900,  min: 600,  max: 2400, step: 50,  unit: 'mm' },
    { id: 'height',         label: 'Height',          type: 'dimension', default: 2100, min: 1800, max: 3000, step: 50,  unit: 'mm' },
    { id: 'frameThickness', label: 'Frame Thickness', type: 'dimension', default: 60,   min: 30,   max: 120,  step: 5,   unit: 'mm' },
    { id: 'handed',         label: 'Handing',         type: 'enum',      default: 'left',
      options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
  ],
  geometry: (params: Record<string, ParamValue>) =>
    buildDoorGeometry(
      params['width'] as number,
      params['height'] as number,
      params['frameThickness'] as number,
      params['handed'] as string,
    ),
  ui: {
    order: ['width', 'height', 'frameThickness', 'handed'],
    groups: [
      { id: 'dimensions', label: 'Dimensions', params: ['width', 'height'] },
      { id: 'frame',      label: 'Frame',      params: ['frameThickness', 'handed'] },
    ],
  },
});
