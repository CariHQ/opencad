/**
 * T-EXT-02: Custom node renderer for the visual programming canvas.
 */
import React, { useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '@opencad/document';
import { getNodeDefinition } from './NodeRegistry';

interface GraphNodeComponentData extends GraphNodeData {
  onParamChange: (nodeId: string, paramId: string, value: unknown) => void;
  error?: string;
}

export function GraphNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as GraphNodeComponentData;
  const def = getNodeDefinition(nodeData.type);

  const handleParamChange = useCallback(
    (paramId: string, value: unknown) => {
      nodeData.onParamChange(id, paramId, value);
    },
    [id, nodeData],
  );

  if (!def) {
    return (
      <div className="graph-node graph-node--error">
        <div className="graph-node__header">Unknown: {nodeData.type}</div>
      </div>
    );
  }

  const categoryColor: Record<string, string> = {
    geometry: 'var(--accent-primary)',
    transforms: '#f59e0b',
    boolean: '#ef4444',
    parametric: '#8b5cf6',
    document: '#10b981',
  };

  const accentColor = categoryColor[def.category] ?? 'var(--accent-primary)';

  return (
    <div
      className={`graph-node graph-node--${def.category}`}
      style={{ '--node-accent': accentColor } as React.CSSProperties}
    >
      {/* Input handles */}
      {def.inputs.map((input, i) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{ top: `${((i + 1) / (def.inputs.length + 1)) * 100}%` }}
          title={`${input.label} (${input.type})`}
        />
      ))}

      {/* Header */}
      <div className="graph-node__header">
        <span className="graph-node__label">{nodeData.label ?? def.label}</span>
        <span className="graph-node__category">{def.category}</span>
      </div>

      {/* Error banner */}
      {nodeData.error && (
        <div className="graph-node__error" role="alert" aria-label="Node error">
          {nodeData.error}
        </div>
      )}

      {/* Socket labels: inputs */}
      {def.inputs.map((input) => (
        <div key={input.id} className="graph-node__socket graph-node__socket--in">
          <span className="graph-node__socket-dot" data-type={input.type} />
          <span className="graph-node__socket-label">{input.label}</span>
        </div>
      ))}

      {/* Params */}
      {(def.params ?? []).map((param) => (
        <div key={param.id} className="graph-node__param">
          <label className="graph-node__param-label" htmlFor={`${id}-${param.id}`}>
            {param.label}
          </label>
          {param.type === 'boolean' ? (
            <input
              id={`${id}-${param.id}`}
              type="checkbox"
              checked={Boolean(nodeData.params?.[param.id] ?? param.default)}
              onChange={(e) => handleParamChange(param.id, e.target.checked)}
            />
          ) : param.type === 'number' ? (
            <input
              id={`${id}-${param.id}`}
              type="number"
              className="graph-node__param-input"
              value={String(nodeData.params?.[param.id] ?? param.default)}
              min={param.min}
              max={param.max}
              step={param.step ?? 1}
              onChange={(e) => handleParamChange(param.id, Number(e.target.value))}
            />
          ) : (
            <input
              id={`${id}-${param.id}`}
              type="text"
              className="graph-node__param-input"
              value={String(nodeData.params?.[param.id] ?? param.default)}
              onChange={(e) => handleParamChange(param.id, e.target.value)}
            />
          )}
        </div>
      ))}

      {/* Socket labels: outputs */}
      {def.outputs.map((output) => (
        <div key={output.id} className="graph-node__socket graph-node__socket--out">
          <span className="graph-node__socket-label">{output.label}</span>
          <span className="graph-node__socket-dot" data-type={output.type} />
        </div>
      ))}

      {/* Output handles */}
      {def.outputs.map((output, i) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{ top: `${((i + 1) / (def.outputs.length + 1)) * 100}%` }}
          title={`${output.label} (${output.type})`}
        />
      ))}
    </div>
  );
}
