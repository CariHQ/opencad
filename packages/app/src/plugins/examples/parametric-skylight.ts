/**
 * T-EXT-01 example: Parametric Skylight family.
 *
 * Parameters: width, length, pitch (degrees), glassMaterial.
 */
import { defineFamily } from '../defineFamily';
import type { ParamValue, FamilyGeometry } from '../defineFamily';

function buildSkylightGeometry(width: number, length: number, pitch: number): FamilyGeometry {
  const w = width / 1000;   // mm → m
  const l = length / 1000;
  const pitchRad = (pitch * Math.PI) / 180;
  const ridgeHeight = (w / 2) * Math.tan(pitchRad);
  const frameDepth = 0.04; // 40mm frame

  const vertices: number[] = [];
  const faces: number[] = [];

  // Gable roof shape (ridge along length axis, apex at w/2):
  //   0: front-left-bottom  (-w/2,  0,    0)
  //   1: front-right-bottom (+w/2,  0,    0)
  //   2: front-ridge        (0,     0,    ridgeHeight)
  //   3: back-left-bottom   (-w/2,  l,    0)
  //   4: back-right-bottom  (+w/2,  l,    0)
  //   5: back-ridge         (0,     l,    ridgeHeight)
  vertices.push(
    -w/2, 0, 0,        // 0
     w/2, 0, 0,        // 1
     0,   0, ridgeHeight, // 2
    -w/2, l, 0,        // 3
     w/2, l, 0,        // 4
     0,   l, ridgeHeight, // 5
  );

  // Left glass pane: 0-2-5-3
  faces.push(0, 2, 5,   0, 5, 3);
  // Right glass pane: 1-4-5-2
  faces.push(1, 5, 4,   1, 2, 5);
  // Front gable: 0-1-2
  faces.push(0, 1, 2);
  // Back gable: 3-5-4
  faces.push(3, 5, 4);

  void frameDepth; // frame will be V2 refinement

  return { vertices, faces };
}

defineFamily({
  id: 'builtin:parametric-skylight',
  name: 'Parametric Skylight',
  category: 'skylight',
  version: '1.0.0',
  parameters: [
    { id: 'width',         label: 'Width',           type: 'dimension',    default: 1200, min: 400, max: 4000, step: 100, unit: 'mm' },
    { id: 'length',        label: 'Length',          type: 'dimension',    default: 2400, min: 600, max: 8000, step: 100, unit: 'mm' },
    { id: 'pitch',         label: 'Pitch',           type: 'dimension',    default: 20,   min: 5,   max: 60,   step: 1,   unit: '°' },
    { id: 'glassMaterial', label: 'Glass Material',  type: 'material-ref', default: 'Glass' },
  ],
  geometry: (params: Record<string, ParamValue>) =>
    buildSkylightGeometry(
      params['width'] as number,
      params['length'] as number,
      params['pitch'] as number,
    ),
  ui: {
    order: ['width', 'length', 'pitch', 'glassMaterial'],
    groups: [
      { id: 'dimensions', label: 'Dimensions', params: ['width', 'length', 'pitch'] },
      { id: 'materials',  label: 'Materials',  params: ['glassMaterial'] },
    ],
  },
});
