/**
 * T-EXT-02: Visual programming canvas (Grasshopper-lite).
 * Wraps @xyflow/react and wires it to the documentStore graph actions.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nanoid } from 'nanoid';
import type { GraphDefinition, GraphEdgeData, GraphNodeData } from '@opencad/document';
import { getNodeDefinition, listNodesByCategory } from './NodeRegistry';
import { evaluateGraph } from './evaluator';
import { GraphNodeComponent } from './GraphNode';

const NODE_TYPES = { graphNode: GraphNodeComponent };

type Category = 'geometry' | 'transforms' | 'boolean' | 'parametric' | 'document';
const CATEGORIES: Category[] = ['geometry', 'transforms', 'boolean', 'parametric', 'document'];

interface Props {
  graph: GraphDefinition;
  onSave: (graph: GraphDefinition) => void;
}

function toFlowNode(
  nodeData: GraphNodeData,
  onParamChange: (nodeId: string, paramId: string, value: unknown) => void,
  error?: string,
): Node {
  return {
    id: nodeData.id,
    type: 'graphNode',
    position: nodeData.position,
    data: { ...nodeData, onParamChange, error },
  };
}

function toFlowEdge(edge: GraphEdgeData): Edge {
  return {
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
    type: 'smoothstep',
  };
}

export function GraphPanel({ graph, onSave }: Props): React.ReactElement {
  const [evalErrors, setEvalErrors] = useState<Map<string, string>>(new Map());
  const [timedOut, setTimedOut] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onParamChange = useCallback(
    (nodeId: string, paramId: string, value: unknown) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, params: { ...(n.data as unknown as GraphNodeData).params, [paramId]: value } } }
            : n,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const initialNodes = useMemo(
    () => graph.nodes.map((n) => toFlowNode(n, onParamChange)),
    // onParamChange is stable — exclude from deps to avoid re-init on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.id],
  );
  const initialEdges = useMemo(
    () => graph.edges.map(toFlowEdge),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.id],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Re-evaluate whenever nodes or edges change
  useEffect(() => {
    const currentGraph: GraphDefinition = {
      ...graph,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.data as unknown as GraphNodeData).type,
        label: (n.data as unknown as GraphNodeData).label,
        params: (n.data as unknown as GraphNodeData).params ?? {},
        position: n.position,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? '',
        target: e.target,
        targetHandle: e.targetHandle ?? '',
      })),
    };

    const result = evaluateGraph(currentGraph);
    setEvalErrors(new Map(result.errors));
    setTimedOut(result.timedOut);

    // Debounce save to parent
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave(currentGraph), 300);
  }, [nodes, edges, graph, onSave]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: nanoid(),
        type: 'smoothstep',
        source: connection.source ?? '',
        target: connection.target ?? '',
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges],
  );

  const addNode = useCallback(
    (type: string) => {
      const def = getNodeDefinition(type);
      if (!def) return;
      const id = nanoid();
      const defaultParams: Record<string, unknown> = {};
      for (const p of def.params ?? []) defaultParams[p.id] = p.default;
      const newNode: Node = {
        id,
        type: 'graphNode',
        position: { x: 100, y: 100 },
        data: {
          id,
          type,
          label: def.label,
          params: defaultParams,
          position: { x: 100, y: 100 },
          onParamChange,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, onParamChange],
  );

  // Sync error banners into node data
  const nodesWithErrors = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, error: evalErrors.get(n.id) },
      })),
    [nodes, evalErrors],
  );

  const [palette, setPalette] = useState<Category | null>(null);

  return (
    <div className="graph-panel" role="region" aria-label="Visual programming graph">
      {/* Toolbar */}
      <div className="graph-panel__toolbar" role="toolbar" aria-label="Graph tools">
        <span className="graph-panel__toolbar-label">Add Node:</span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`graph-panel__cat-btn${palette === cat ? ' active' : ''}`}
            onClick={() => setPalette(palette === cat ? null : cat)}
            aria-expanded={palette === cat}
            aria-controls={`palette-${cat}`}
          >
            {cat}
          </button>
        ))}
        {timedOut && (
          <span className="graph-panel__timeout-warning" role="alert">
            Evaluation exceeded 500 ms — graph may be incomplete
          </span>
        )}
      </div>

      {/* Node palette */}
      {palette && (
        <div
          id={`palette-${palette}`}
          className="graph-panel__palette"
          role="listbox"
          aria-label={`${palette} nodes`}
        >
          {listNodesByCategory(palette).map((def) => (
            <button
              key={def.type}
              className="graph-panel__palette-item"
              role="option"
              aria-selected={false}
              onClick={() => { addNode(def.type); setPalette(null); }}
            >
              {def.label}
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="graph-panel__canvas">
        <ReactFlow
          nodes={nodesWithErrors}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          deleteKeyCode="Delete"
          aria-label="Node graph canvas"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
