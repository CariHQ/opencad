/**
 * T-EXT-02: Thin wrapper that manages graph list/selection for AppLayout.
 */
import React, { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { GraphDefinition } from '@opencad/document';
import { useDocumentStore } from '../../stores/documentStore';
import { GraphPanel } from './GraphPanel';

export function GraphPanelWrapper(): React.ReactElement {
  const document = useDocumentStore((s) => s.document);
  const saveGraph = useDocumentStore((s) => s.saveGraph);
  const deleteGraph = useDocumentStore((s) => s.deleteGraph);

  const graphs: GraphDefinition[] = document?.library?.graphs ?? [];
  const [activeId, setActiveId] = useState<string | null>(graphs[0]?.id ?? null);

  const active = graphs.find((g) => g.id === activeId) ?? null;

  const createGraph = useCallback(() => {
    const graph: GraphDefinition = {
      id: nanoid(),
      name: 'Untitled Graph',
      nodes: [],
      edges: [],
    };
    saveGraph(graph);
    setActiveId(graph.id);
  }, [saveGraph]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteGraph(id);
      setActiveId((prev) => {
        if (prev !== id) return prev;
        const remaining = graphs.filter((g) => g.id !== id);
        return remaining[0]?.id ?? null;
      });
    },
    [deleteGraph, graphs],
  );

  if (!document) {
    return <div className="graph-panel-wrapper--empty">No document open.</div>;
  }

  return (
    <div className="graph-panel-wrapper">
      {/* Graph list header */}
      <div className="graph-panel-wrapper__header">
        <span className="graph-panel-wrapper__title">Graphs</span>
        <button
          className="graph-panel-wrapper__new-btn"
          onClick={createGraph}
          aria-label="New graph"
          title="New graph"
        >
          + New
        </button>
      </div>

      {/* Graph selector tabs */}
      {graphs.length > 0 && (
        <div className="graph-panel-wrapper__tabs" role="tablist" aria-label="Graph tabs">
          {graphs.map((g) => (
            <div key={g.id} className={`graph-panel-wrapper__tab${activeId === g.id ? ' active' : ''}`}>
              <button
                role="tab"
                aria-selected={activeId === g.id}
                onClick={() => setActiveId(g.id)}
                className="graph-panel-wrapper__tab-btn"
              >
                {g.name}
              </button>
              <button
                className="graph-panel-wrapper__tab-delete"
                onClick={() => handleDelete(g.id)}
                aria-label={`Delete ${g.name}`}
                title={`Delete ${g.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Canvas */}
      {active ? (
        <GraphPanel
          key={active.id}
          graph={active}
          onSave={saveGraph}
        />
      ) : (
        <div className="graph-panel-wrapper--empty">
          <p>No graphs yet.</p>
          <button onClick={createGraph}>Create your first graph</button>
        </div>
      )}
    </div>
  );
}
