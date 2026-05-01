/**
 * T-EXT-01 example: Parametric Column family.
 *
 * Parameters: shape (round/square), diameter/side, height.
 */
import { defineFamily } from '../defineFamily';
import type { ParamValue, FamilyGeometry } from '../defineFamily';

const SEGMENTS = 16; // polygon approximation for round columns

function buildColumnGeometry(shape: string, size: number, height: number): FamilyGeometry {
  const s = size / 1000;  // mm → m
  const h = height / 1000;
  const vertices: number[] = [];
  const faces: number[] = [];

  if (shape === 'square') {
    const r = s / 2;
    // Simple box: -r..+r in x/y, 0..h in z
    const base = 0;
    vertices.push(
      -r, -r, 0,   r, -r, 0,   r,  r, 0,  -r,  r, 0, // bottom
      -r, -r, h,   r, -r, h,   r,  r, h,  -r,  r, h, // top
    );
    faces.push(
      base,   base+2, base+1,   base,   base+3, base+2, // bottom cap
      base+4, base+5, base+6,   base+4, base+6, base+7, // top cap
      base,   base+1, base+5,   base,   base+5, base+4, // side 1
      base+1, base+2, base+6,   base+1, base+6, base+5, // side 2
      base+2, base+3, base+7,   base+2, base+7, base+6, // side 3
      base+3, base,   base+4,   base+3, base+4, base+7, // side 4
    );
  } else {
    // Round column — polygon prism
    const r = s / 2;
    const N = SEGMENTS;
    // Bottom ring
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      vertices.push(Math.cos(a) * r, Math.sin(a) * r, 0);
    }
    // Top ring
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      vertices.push(Math.cos(a) * r, Math.sin(a) * r, h);
    }
    // Bottom cap (fan)
    const centreBottom = vertices.length / 3;
    vertices.push(0, 0, 0);
    for (let i = 0; i < N; i++) faces.push(centreBottom, i, (i + 1) % N);
    // Top cap (fan)
    const centreTop = vertices.length / 3;
    vertices.push(0, 0, h);
    for (let i = 0; i < N; i++) faces.push(centreTop, N + (i + 1) % N, N + i);
    // Side quads
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      faces.push(i, j, N + j,   i, N + j, N + i);
    }
  }

  return { vertices, faces };
}

defineFamily({
  id: 'builtin:parametric-column',
  name: 'Parametric Column',
  category: 'column',
  version: '1.0.0',
  parameters: [
    { id: 'shape',  label: 'Shape',    type: 'enum',      default: 'square',
      options: [{ value: 'square', label: 'Square' }, { value: 'round', label: 'Round' }] },
    { id: 'size',   label: 'Size',     type: 'dimension', default: 300, min: 100, max: 1200, step: 25, unit: 'mm' },
    { id: 'height', label: 'Height',   type: 'dimension', default: 3000, min: 500, max: 12000, step: 100, unit: 'mm' },
  ],
  geometry: (params: Record<string, ParamValue>) =>
    buildColumnGeometry(
      params['shape'] as string,
      params['size'] as number,
      params['height'] as number,
    ),
  ui: {
    order: ['shape', 'size', 'height'],
    groups: [{ id: 'geometry', label: 'Geometry', params: ['shape', 'size', 'height'] }],
  },
});
