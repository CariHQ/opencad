import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

export function Toolbar() {
  const { activeTool, setActiveTool } = useDocumentStore();

  const tools = [
    { id: 'select', label: 'Select', icon: '↖' },
    { id: 'line', label: 'Line', icon: '╱' },
    { id: 'rect', label: 'Rectangle', icon: '▢' },
    { id: 'circle', label: 'Circle', icon: '○' },
    { id: 'wall', label: 'Wall', icon: '▮' },
    { id: 'door', label: 'Door', icon: '⊢' },
    { id: 'window', label: 'Window', icon: '⊟' },
    { id: 'dimension', label: 'Dimension', icon: '↔' },
    { id: 'text', label: 'Text', icon: 'T' },
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">Tools</span>
        <div className="toolbar-tools">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar-button ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
