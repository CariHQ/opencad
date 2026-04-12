import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

export function LayerPanel() {
  const { document: doc, selectedIds } = useDocumentStore();

  if (!doc) return null;

  const layers = Object.values(doc.layers).sort((a, b) => a.order - b.order);

  return (
    <div className="panel layer-panel">
      <div className="panel-header">
        <h3>Layers</h3>
        <span className="count">{layers.length}</span>
      </div>
      <div className="panel-content">
        <ul className="layer-list">
          {layers.map((layer) => (
            <li key={layer.id} className={`layer-item ${layer.visible ? '' : 'hidden'}`}>
              <span className="layer-color" style={{ backgroundColor: layer.color }} />
              <span className="layer-name">{layer.name}</span>
              <span className="layer-actions">
                <button
                  className="icon-btn"
                  onClick={() => {}}
                  title={layer.visible ? 'Hide' : 'Show'}
                >
                  {layer.visible ? '👁' : '👁‍🗨'}
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {}}
                  title={layer.locked ? 'Unlock' : 'Lock'}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
