/**
 * T-EXT-02: Visual programming node registry.
 *
 * Defines the metadata (inputs, outputs, eval function) for each built-in
 * node type. The evaluator resolves dependencies at runtime.
 */
import type { SocketType } from '@opencad/document';

export interface SocketDef {
  id: string;
  label: string;
  type: SocketType;
  /** True = this socket accepts multiple connections (list accumulation). */
  multi?: boolean;
}

export interface ParamDef {
  id: string;
  label: string;
  type: 'number' | 'string' | 'boolean';
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
}

export type NodeValue =
  | number
  | string
  | boolean
  | Record<string, unknown>   // geometry objects, document payloads
  | NodeValue[]               // list
  | null;

export interface NodeDefinition {
  type: string;
  label: string;
  category: 'geometry' | 'transforms' | 'boolean' | 'parametric' | 'document';
  inputs: SocketDef[];
  outputs: SocketDef[];
  params?: ParamDef[];
  /** Pure evaluation function. Returns a Record of outputId → value. */
  evaluate: (
    inputs: Record<string, NodeValue>,
    params: Record<string, unknown>,
  ) => Record<string, NodeValue>;
}

// ── Geometry primitives ──────────────────────────────────────────────────────

const GEOMETRY_NODES: NodeDefinition[] = [
  {
    type: 'Point',
    label: 'Point',
    category: 'geometry',
    inputs: [],
    params: [
      { id: 'x', label: 'X', type: 'number', default: 0 },
      { id: 'y', label: 'Y', type: 'number', default: 0 },
      { id: 'z', label: 'Z', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'point', label: 'Point', type: 'point' }],
    evaluate: (_, params) => ({ point: { x: Number(params['x'] ?? 0), y: Number(params['y'] ?? 0), z: Number(params['z'] ?? 0) } }),
  },
  {
    type: 'Line',
    label: 'Line',
    category: 'geometry',
    inputs: [
      { id: 'start', label: 'Start', type: 'point' },
      { id: 'end',   label: 'End',   type: 'point' },
    ],
    outputs: [{ id: 'line', label: 'Line', type: 'curve' }],
    evaluate: (inputs) => ({
      line: inputs['start'] && inputs['end']
        ? { start: inputs['start'], end: inputs['end'] }
        : null,
    }),
  },
  {
    type: 'Polyline',
    label: 'Polyline',
    category: 'geometry',
    inputs: [{ id: 'points', label: 'Points', type: 'point', multi: true }],
    outputs: [{ id: 'polyline', label: 'Polyline', type: 'curve' }],
    evaluate: (inputs) => ({ polyline: inputs['points'] ?? null }),
  },
  {
    type: 'Rectangle',
    label: 'Rectangle',
    category: 'geometry',
    params: [
      { id: 'width',  label: 'Width',  type: 'number', default: 1000, min: 1 },
      { id: 'height', label: 'Height', type: 'number', default: 1000, min: 1 },
    ],
    inputs: [{ id: 'origin', label: 'Origin', type: 'point' }],
    outputs: [{ id: 'rectangle', label: 'Rectangle', type: 'surface' }],
    evaluate: (inputs, params) => ({
      rectangle: {
        origin: inputs['origin'] ?? { x: 0, y: 0, z: 0 },
        width: Number(params['width'] ?? 1000),
        height: Number(params['height'] ?? 1000),
        type: 'rectangle',
      },
    }),
  },
  {
    type: 'Circle',
    label: 'Circle',
    category: 'geometry',
    params: [{ id: 'radius', label: 'Radius', type: 'number', default: 500, min: 1 }],
    inputs: [{ id: 'center', label: 'Center', type: 'point' }],
    outputs: [{ id: 'circle', label: 'Circle', type: 'curve' }],
    evaluate: (inputs, params) => ({
      circle: { center: inputs['center'] ?? { x: 0, y: 0, z: 0 }, radius: Number(params['radius'] ?? 500), type: 'circle' },
    }),
  },
  {
    type: 'Box',
    label: 'Box',
    category: 'geometry',
    params: [
      { id: 'sizeX', label: 'Size X', type: 'number', default: 1000, min: 1 },
      { id: 'sizeY', label: 'Size Y', type: 'number', default: 1000, min: 1 },
      { id: 'sizeZ', label: 'Size Z', type: 'number', default: 1000, min: 1 },
    ],
    inputs: [{ id: 'origin', label: 'Origin', type: 'point' }],
    outputs: [{ id: 'box', label: 'Box', type: 'brep' }],
    evaluate: (inputs, params) => ({
      box: {
        origin: inputs['origin'] ?? { x: 0, y: 0, z: 0 },
        sizeX: Number(params['sizeX'] ?? 1000),
        sizeY: Number(params['sizeY'] ?? 1000),
        sizeZ: Number(params['sizeZ'] ?? 1000),
        type: 'box',
      },
    }),
  },
  {
    type: 'Sphere',
    label: 'Sphere',
    category: 'geometry',
    params: [{ id: 'radius', label: 'Radius', type: 'number', default: 500, min: 1 }],
    inputs: [{ id: 'center', label: 'Center', type: 'point' }],
    outputs: [{ id: 'sphere', label: 'Sphere', type: 'brep' }],
    evaluate: (inputs, params) => ({
      sphere: { center: inputs['center'] ?? { x: 0, y: 0, z: 0 }, radius: Number(params['radius'] ?? 500), type: 'sphere' },
    }),
  },
  {
    type: 'Cylinder',
    label: 'Cylinder',
    category: 'geometry',
    params: [
      { id: 'radius', label: 'Radius', type: 'number', default: 300, min: 1 },
      { id: 'height', label: 'Height', type: 'number', default: 1000, min: 1 },
    ],
    inputs: [{ id: 'base', label: 'Base', type: 'point' }],
    outputs: [{ id: 'cylinder', label: 'Cylinder', type: 'brep' }],
    evaluate: (inputs, params) => ({
      cylinder: {
        base: inputs['base'] ?? { x: 0, y: 0, z: 0 },
        radius: Number(params['radius'] ?? 300),
        height: Number(params['height'] ?? 1000),
        type: 'cylinder',
      },
    }),
  },
];

// ── Transforms ────────────────────────────────────────────────────────────────

const TRANSFORM_NODES: NodeDefinition[] = [
  {
    type: 'Move',
    label: 'Move',
    category: 'transforms',
    params: [
      { id: 'dx', label: 'ΔX', type: 'number', default: 0 },
      { id: 'dy', label: 'ΔY', type: 'number', default: 0 },
      { id: 'dz', label: 'ΔZ', type: 'number', default: 0 },
    ],
    inputs: [{ id: 'geometry', label: 'Geometry', type: 'any' }],
    outputs: [{ id: 'geometry', label: 'Geometry', type: 'any' }],
    evaluate: (inputs, params) => ({
      geometry: inputs['geometry']
        ? { ...inputs['geometry'] as object, _move: { dx: params['dx'], dy: params['dy'], dz: params['dz'] } }
        : null,
    }),
  },
  {
    type: 'Rotate',
    label: 'Rotate',
    category: 'transforms',
    params: [
      { id: 'angle', label: 'Angle (°)', type: 'number', default: 0 },
      { id: 'axis',  label: 'Axis',      type: 'string', default: 'Z' },
    ],
    inputs: [{ id: 'geometry', label: 'Geometry', type: 'any' }],
    outputs: [{ id: 'geometry', label: 'Geometry', type: 'any' }],
    evaluate: (inputs, params) => ({
      geometry: inputs['geometry']
        ? { ...inputs['geometry'] as object, _rotate: { angle: params['angle'], axis: params['axis'] } }
        : null,
    }),
  },
  {
    type: 'Scale',
    label: 'Scale',
    category: 'transforms',
    params: [{ id: 'factor', label: 'Factor', type: 'number', default: 1, min: 0.001 }],
    inputs: [{ id: 'geometry', label: 'Geometry', type: 'any' }],
    outputs: [{ id: 'geometry', label: 'Geometry', type: 'any' }],
    evaluate: (inputs, params) => ({
      geometry: inputs['geometry']
        ? { ...inputs['geometry'] as object, _scale: params['factor'] }
        : null,
    }),
  },
  {
    type: 'ArrayLinear',
    label: 'Array (Linear)',
    category: 'transforms',
    params: [
      { id: 'count', label: 'Count', type: 'number', default: 3, min: 1, max: 100 },
      { id: 'stepX', label: 'Step X', type: 'number', default: 1000 },
      { id: 'stepY', label: 'Step Y', type: 'number', default: 0 },
      { id: 'stepZ', label: 'Step Z', type: 'number', default: 0 },
    ],
    inputs: [{ id: 'geometry', label: 'Geometry', type: 'any' }],
    outputs: [{ id: 'list', label: 'List', type: 'list' }],
    evaluate: (inputs, params) => {
      if (!inputs['geometry']) return { list: [] };
      const count = Math.max(1, Math.round(Number(params['count'] ?? 3)));
      const items: NodeValue[] = [];
      for (let i = 0; i < count; i++) {
        items.push({ ...inputs['geometry'] as object, _offset: {
          x: i * Number(params['stepX'] ?? 1000),
          y: i * Number(params['stepY'] ?? 0),
          z: i * Number(params['stepZ'] ?? 0),
        } });
      }
      return { list: items };
    },
  },
  {
    type: 'ArrayPolar',
    label: 'Array (Polar)',
    category: 'transforms',
    params: [
      { id: 'count',  label: 'Count',  type: 'number', default: 6, min: 2, max: 360 },
      { id: 'radius', label: 'Radius', type: 'number', default: 2000, min: 1 },
    ],
    inputs: [{ id: 'geometry', label: 'Geometry', type: 'any' }],
    outputs: [{ id: 'list', label: 'List', type: 'list' }],
    evaluate: (inputs, params) => {
      if (!inputs['geometry']) return { list: [] };
      const count = Math.max(2, Math.round(Number(params['count'] ?? 6)));
      const r = Number(params['radius'] ?? 2000);
      const items: NodeValue[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        items.push({ ...inputs['geometry'] as object, _polarOffset: { x: Math.cos(angle) * r, y: Math.sin(angle) * r, z: 0 } });
      }
      return { list: items };
    },
  },
];

// ── Boolean ops ───────────────────────────────────────────────────────────────

const BOOLEAN_NODES: NodeDefinition[] = [
  {
    type: 'Union',
    label: 'Union',
    category: 'boolean',
    inputs: [
      { id: 'a', label: 'A', type: 'brep' },
      { id: 'b', label: 'B', type: 'brep' },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'brep' }],
    evaluate: (inputs) => ({
      result: inputs['a'] && inputs['b']
        ? { type: 'boolean_union', a: inputs['a'], b: inputs['b'] }
        : null,
    }),
  },
  {
    type: 'Difference',
    label: 'Difference',
    category: 'boolean',
    inputs: [
      { id: 'a', label: 'A (base)', type: 'brep' },
      { id: 'b', label: 'B (cutter)', type: 'brep' },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'brep' }],
    evaluate: (inputs) => ({
      result: inputs['a'] && inputs['b']
        ? { type: 'boolean_difference', a: inputs['a'], b: inputs['b'] }
        : null,
    }),
  },
  {
    type: 'Intersect',
    label: 'Intersect',
    category: 'boolean',
    inputs: [
      { id: 'a', label: 'A', type: 'brep' },
      { id: 'b', label: 'B', type: 'brep' },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'brep' }],
    evaluate: (inputs) => ({
      result: inputs['a'] && inputs['b']
        ? { type: 'boolean_intersect', a: inputs['a'], b: inputs['b'] }
        : null,
    }),
  },
];

// ── Parametric ────────────────────────────────────────────────────────────────

const PARAMETRIC_NODES: NodeDefinition[] = [
  {
    type: 'NumberSlider',
    label: 'Number Slider',
    category: 'parametric',
    params: [
      { id: 'value', label: 'Value', type: 'number', default: 0 },
      { id: 'min',   label: 'Min',   type: 'number', default: 0 },
      { id: 'max',   label: 'Max',   type: 'number', default: 100 },
      { id: 'step',  label: 'Step',  type: 'number', default: 1, min: 0 },
    ],
    inputs: [],
    outputs: [{ id: 'value', label: 'Value', type: 'number' }],
    evaluate: (_, params) => ({ value: Number(params['value'] ?? 0) }),
  },
  {
    type: 'Range',
    label: 'Range',
    category: 'parametric',
    params: [
      { id: 'from',  label: 'From',  type: 'number', default: 0 },
      { id: 'to',    label: 'To',    type: 'number', default: 10 },
      { id: 'steps', label: 'Steps', type: 'number', default: 10, min: 1 },
    ],
    inputs: [],
    outputs: [{ id: 'list', label: 'List', type: 'list' }],
    evaluate: (_, params) => {
      const from  = Number(params['from']  ?? 0);
      const to    = Number(params['to']    ?? 10);
      const steps = Math.max(1, Math.round(Number(params['steps'] ?? 10)));
      const list: NodeValue[] = [];
      for (let i = 0; i <= steps; i++) list.push(from + (to - from) * (i / steps));
      return { list };
    },
  },
  {
    type: 'Panel',
    label: 'Panel',
    category: 'parametric',
    params: [{ id: 'text', label: 'Text', type: 'string', default: '' }],
    inputs: [{ id: 'data', label: 'Data', type: 'any' }],
    outputs: [{ id: 'text', label: 'Text', type: 'any' }],
    evaluate: (inputs, params) => ({
      text: inputs['data'] !== undefined && inputs['data'] !== null
        ? inputs['data']
        : String(params['text'] ?? ''),
    }),
  },
  {
    type: 'Expression',
    label: 'Expression',
    category: 'parametric',
    params: [{ id: 'expr', label: 'f(x)', type: 'string', default: 'x * 2' }],
    inputs: [{ id: 'x', label: 'x', type: 'number' }],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    evaluate: (inputs, params) => {
      const x = Number(inputs['x'] ?? 0);
      const expr = String(params['expr'] ?? 'x');
      // Sandboxed evaluation: only allow arithmetic operations, no function calls
      const safe = /^[\d\s+\-*/().,x]+$/.test(expr);
      if (!safe) return { result: null };
      try {
        // Replace x with the actual value — safe because we validated the regex
        const result = Function(`"use strict"; const x = ${x}; return (${expr});`)() as number;
        return { result: typeof result === 'number' && isFinite(result) ? result : null };
      } catch {
        return { result: null };
      }
    },
  },
];

// ── Document I/O ──────────────────────────────────────────────────────────────

const DOCUMENT_NODES: NodeDefinition[] = [
  {
    type: 'SelectElements',
    label: 'Select Elements',
    category: 'document',
    params: [{ id: 'type', label: 'Element Type', type: 'string', default: 'wall' }],
    inputs: [],
    outputs: [{ id: 'elements', label: 'Elements', type: 'list' }],
    evaluate: (_, params) => ({
      // Returns a stub — the graph panel injects live document elements at eval time
      elements: [{ type: 'element_query', elementType: params['type'] ?? 'wall' }],
    }),
  },
  {
    type: 'MaterialAssign',
    label: 'Material Assignment',
    category: 'document',
    params: [{ id: 'materialId', label: 'Material', type: 'string', default: 'Concrete' }],
    inputs: [{ id: 'elements', label: 'Elements', type: 'list' }],
    outputs: [{ id: 'elements', label: 'Elements', type: 'list' }],
    evaluate: (inputs, params) => ({
      elements: inputs['elements']
        ? (inputs['elements'] as NodeValue[]).map((e) => ({
            ...e as object, _material: params['materialId'] ?? 'Concrete',
          }))
        : [],
    }),
  },
  {
    type: 'OutputToElement',
    label: 'Output to Element',
    category: 'document',
    params: [
      { id: 'elementType', label: 'Type', type: 'string', default: 'column' },
      { id: 'layerId',     label: 'Layer ID', type: 'string', default: '' },
    ],
    inputs: [{ id: 'geometry', label: 'Geometry', type: 'any' }],
    outputs: [],
    evaluate: (inputs, params) => ({
      // Signal to the graph evaluator to create/update a document element
      _output: { geometry: inputs['geometry'], elementType: params['elementType'], layerId: params['layerId'] },
    }),
  },
];

// ── Registry ──────────────────────────────────────────────────────────────────

const ALL_NODES: NodeDefinition[] = [
  ...GEOMETRY_NODES,
  ...TRANSFORM_NODES,
  ...BOOLEAN_NODES,
  ...PARAMETRIC_NODES,
  ...DOCUMENT_NODES,
];

const nodeMap = new Map<string, NodeDefinition>(ALL_NODES.map((n) => [n.type, n]));

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return nodeMap.get(type);
}

export function listNodeDefinitions(): NodeDefinition[] {
  return ALL_NODES;
}

export function listNodesByCategory(category: NodeDefinition['category']): NodeDefinition[] {
  return ALL_NODES.filter((n) => n.category === category);
}
