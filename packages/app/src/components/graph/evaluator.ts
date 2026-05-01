/**
 * T-EXT-02: Graph evaluator.
 *
 * Performs topological sort, cycle detection, and dirty-propagation
 * evaluation of a visual programming DAG.
 */
import type { GraphDefinition, GraphNodeData, GraphEdgeData } from '@opencad/document';
import { getNodeDefinition } from './NodeRegistry';
import type { NodeValue } from './NodeRegistry';

export interface EvalResult {
  /** Output values keyed by "nodeId:outputId". */
  values: Map<string, NodeValue>;
  /** Nodes that errored during evaluation. */
  errors: Map<string, string>;
  /** Whether evaluation was aborted due to exceeding the time budget. */
  timedOut: boolean;
}

/** Maximum wall-clock ms allowed for a full graph evaluation. */
const EVAL_BUDGET_MS = 500;

/** Returns topological order of node IDs, or null if a cycle exists. */
export function topoSort(nodes: GraphNodeData[], edges: GraphEdgeData[]): string[] | null {
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const edge of edges) {
    if (!indegree.has(edge.target) || !adj.has(edge.source)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    adj.get(edge.source)!.push(edge.target);
  }

  const queue: string[] = [];
  for (const [id, deg] of indegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const neighbor of adj.get(id) ?? []) {
      const next = (indegree.get(neighbor) ?? 0) - 1;
      indegree.set(neighbor, next);
      if (next === 0) queue.push(neighbor);
    }
  }

  return order.length === nodes.length ? order : null;
}

/** Evaluates the full graph and returns all output values. */
export function evaluateGraph(graph: GraphDefinition): EvalResult {
  const result: EvalResult = { values: new Map(), errors: new Map(), timedOut: false };
  const start = performance.now();

  const order = topoSort(graph.nodes, graph.edges);
  if (order === null) {
    for (const node of graph.nodes) result.errors.set(node.id, 'Cycle detected');
    return result;
  }

  // Build edge lookup: targetNodeId+handleId → { sourceNodeId, sourceHandle }
  type EdgeRef = { sourceId: string; sourceHandle: string };
  const edgeIndex = new Map<string, EdgeRef[]>();
  for (const edge of graph.edges) {
    const key = `${edge.target}:${edge.targetHandle}`;
    const list = edgeIndex.get(key) ?? [];
    list.push({ sourceId: edge.source, sourceHandle: edge.sourceHandle });
    edgeIndex.set(key, list);
  }

  const nodeById = new Map<string, GraphNodeData>(graph.nodes.map((n) => [n.id, n]));

  for (const nodeId of order) {
    if (performance.now() - start > EVAL_BUDGET_MS) {
      result.timedOut = true;
      break;
    }

    const nodeData = nodeById.get(nodeId);
    if (!nodeData) continue;

    const def = getNodeDefinition(nodeData.type);
    if (!def) {
      result.errors.set(nodeId, `Unknown node type: ${nodeData.type}`);
      continue;
    }

    // Gather inputs
    const inputs: Record<string, NodeValue> = {};
    for (const socketDef of def.inputs) {
      const key = `${nodeId}:${socketDef.id}`;
      const refs = edgeIndex.get(key) ?? [];
      if (socketDef.multi) {
        inputs[socketDef.id] = refs
          .map((r) => result.values.get(`${r.sourceId}:${r.sourceHandle}`) ?? null)
          .filter((v) => v !== null);
      } else if (refs.length > 0) {
        inputs[socketDef.id] = result.values.get(`${refs[0].sourceId}:${refs[0].sourceHandle}`) ?? null;
      } else {
        inputs[socketDef.id] = null;
      }
    }

    try {
      const outputs = def.evaluate(inputs, nodeData.params ?? {});
      for (const [outputId, value] of Object.entries(outputs)) {
        result.values.set(`${nodeId}:${outputId}`, value as NodeValue);
      }
    } catch (err) {
      result.errors.set(nodeId, err instanceof Error ? err.message : String(err));
    }
  }

  return result;
}

/** Returns a new graph with dirty nodes cleared — used when a param changes. */
export function dirtyPropagate(
  graph: GraphDefinition,
  changedNodeId: string,
): Set<string> {
  const adj = new Map<string, string[]>(graph.nodes.map((n) => [n.id, []]));
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target);
  }

  const dirty = new Set<string>();
  const queue = [changedNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (dirty.has(id)) continue;
    dirty.add(id);
    for (const neighbor of adj.get(id) ?? []) {
      queue.push(neighbor);
    }
  }
  return dirty;
}
