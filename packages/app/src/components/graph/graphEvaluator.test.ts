import { describe, it, expect } from 'vitest';
import { topoSort, evaluateGraph, dirtyPropagate } from './evaluator';
import type { GraphDefinition, GraphNodeData, GraphEdgeData } from '@opencad/document';

function makeNode(id: string, type: string, params: Record<string, unknown> = {}): GraphNodeData {
  return { id, type, params, position: { x: 0, y: 0 } };
}

function makeEdge(id: string, source: string, sourceHandle: string, target: string, targetHandle: string): GraphEdgeData {
  return { id, source, sourceHandle, target, targetHandle };
}

function makeGraph(nodes: GraphNodeData[], edges: GraphEdgeData[]): GraphDefinition {
  return { id: 'test', name: 'Test', nodes, edges };
}

describe('T-EXT-02: topoSort', () => {
  it('sorts a linear chain', () => {
    const nodes = [makeNode('a', 'Point'), makeNode('b', 'Point'), makeNode('c', 'Point')];
    const edges = [makeEdge('e1', 'a', 'point', 'b', 'start'), makeEdge('e2', 'b', 'point', 'c', 'end')];
    const order = topoSort(nodes, edges);
    expect(order).not.toBeNull();
    expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('b'));
    expect(order!.indexOf('b')).toBeLessThan(order!.indexOf('c'));
  });

  it('detects a simple cycle', () => {
    const nodes = [makeNode('a', 'Point'), makeNode('b', 'Point')];
    const edges = [
      makeEdge('e1', 'a', 'out', 'b', 'in'),
      makeEdge('e2', 'b', 'out', 'a', 'in'),
    ];
    expect(topoSort(nodes, edges)).toBeNull();
  });

  it('handles disconnected nodes', () => {
    const nodes = [makeNode('a', 'Point'), makeNode('b', 'NumberSlider')];
    const order = topoSort(nodes, []);
    expect(order).not.toBeNull();
    expect(order).toHaveLength(2);
  });

  it('returns all node IDs in the order', () => {
    const nodes = [makeNode('x', 'Box'), makeNode('y', 'Move'), makeNode('z', 'Point')];
    const edges = [makeEdge('e1', 'z', 'point', 'x', 'origin'), makeEdge('e2', 'x', 'box', 'y', 'geometry')];
    const order = topoSort(nodes, edges);
    expect(order).toHaveLength(3);
    expect(new Set(order)).toEqual(new Set(['x', 'y', 'z']));
  });
});

describe('T-EXT-02: evaluateGraph', () => {
  it('evaluates a NumberSlider node', () => {
    const graph = makeGraph(
      [makeNode('s', 'NumberSlider', { value: 42 })],
      [],
    );
    const result = evaluateGraph(graph);
    expect(result.errors.size).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.values.get('s:value')).toBe(42);
  });

  it('evaluates a Point node', () => {
    const graph = makeGraph(
      [makeNode('p', 'Point', { x: 1, y: 2, z: 3 })],
      [],
    );
    const result = evaluateGraph(graph);
    expect(result.values.get('p:point')).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('wires NumberSlider → Expression', () => {
    const nodes = [
      makeNode('s', 'NumberSlider', { value: 5 }),
      makeNode('e', 'Expression', { expr: 'x * 3' }),
    ];
    const edges = [makeEdge('edge1', 's', 'value', 'e', 'x')];
    const result = evaluateGraph(makeGraph(nodes, edges));
    expect(result.errors.size).toBe(0);
    expect(result.values.get('e:result')).toBe(15);
  });

  it('records error for unknown node type', () => {
    const graph = makeGraph([makeNode('u', 'NonExistent')], []);
    const result = evaluateGraph(graph);
    expect(result.errors.has('u')).toBe(true);
  });

  it('marks cycle nodes as errored', () => {
    const nodes = [makeNode('a', 'Point'), makeNode('b', 'Point')];
    const edges = [makeEdge('e1', 'a', 'out', 'b', 'in'), makeEdge('e2', 'b', 'out', 'a', 'in')];
    const result = evaluateGraph(makeGraph(nodes, edges));
    expect(result.errors.size).toBeGreaterThan(0);
  });

  it('passes null for unconnected optional inputs', () => {
    const graph = makeGraph([makeNode('l', 'Line')], []);
    const result = evaluateGraph(graph);
    expect(result.values.get('l:line')).toBeNull();
  });

  it('evaluates Range node correctly', () => {
    const graph = makeGraph(
      [makeNode('r', 'Range', { from: 0, to: 4, steps: 4 })],
      [],
    );
    const result = evaluateGraph(graph);
    const list = result.values.get('r:list') as number[];
    expect(list).toHaveLength(5);
    expect(list[0]).toBe(0);
    expect(list[4]).toBe(4);
  });

  it('evaluates Expression sandboxed rejection', () => {
    const graph = makeGraph(
      [makeNode('e', 'Expression', { expr: 'process.exit(0)' })],
      [],
    );
    const result = evaluateGraph(graph);
    expect(result.values.get('e:result')).toBeNull();
  });

  it('evaluates ArrayLinear producing a list', () => {
    const nodes = [
      makeNode('b', 'Box', { sizeX: 100, sizeY: 100, sizeZ: 100 }),
      makeNode('a', 'ArrayLinear', { count: 3, stepX: 200, stepY: 0, stepZ: 0 }),
    ];
    const edges = [makeEdge('e1', 'b', 'box', 'a', 'geometry')];
    const result = evaluateGraph(makeGraph(nodes, edges));
    const list = result.values.get('a:list') as unknown[];
    expect(list).toHaveLength(3);
  });
});

describe('T-EXT-02: dirtyPropagate', () => {
  it('marks changed node and all downstream nodes dirty', () => {
    const nodes = [makeNode('a', 'Point'), makeNode('b', 'Line'), makeNode('c', 'Polyline')];
    const edges = [makeEdge('e1', 'a', 'point', 'b', 'start'), makeEdge('e2', 'b', 'line', 'c', 'points')];
    const dirty = dirtyPropagate(makeGraph(nodes, edges), 'a');
    expect(dirty.has('a')).toBe(true);
    expect(dirty.has('b')).toBe(true);
    expect(dirty.has('c')).toBe(true);
  });

  it('does not mark upstream nodes dirty', () => {
    const nodes = [makeNode('a', 'Point'), makeNode('b', 'Line'), makeNode('c', 'Polyline')];
    const edges = [makeEdge('e1', 'a', 'point', 'b', 'start'), makeEdge('e2', 'b', 'line', 'c', 'points')];
    const dirty = dirtyPropagate(makeGraph(nodes, edges), 'b');
    expect(dirty.has('a')).toBe(false);
    expect(dirty.has('b')).toBe(true);
    expect(dirty.has('c')).toBe(true);
  });

  it('handles isolated node', () => {
    const nodes = [makeNode('a', 'Point'), makeNode('b', 'NumberSlider')];
    const dirty = dirtyPropagate(makeGraph(nodes, []), 'a');
    expect(dirty.has('a')).toBe(true);
    expect(dirty.has('b')).toBe(false);
  });
});
