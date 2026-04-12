import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

export function PropertiesPanel() {
  const { document: doc, selectedIds } = useDocumentStore();

  if (!doc || selectedIds.length === 0) {
    return (
      <div className="panel properties-panel">
        <div className="panel-header">
          <h3>Properties</h3>
        </div>
        <div className="panel-content empty">
          <p>Select an element to view properties</p>
        </div>
      </div>
    );
  }

  const selectedElement = doc.elements[selectedIds[0]];
  if (!selectedElement) return null;

  return (
    <div className="panel properties-panel">
      <div className="panel-header">
        <h3>Properties</h3>
        <span className="count">{selectedIds.length} selected</span>
      </div>
      <div className="panel-content">
        <div className="property-group">
          <h4>General</h4>
          <div className="property-row">
            <label>Type</label>
            <span className="value">{selectedElement.type}</span>
          </div>
          <div className="property-row">
            <label>ID</label>
            <span className="value id">{selectedElement.id.slice(0, 8)}</span>
          </div>
        </div>

        <div className="property-group">
          <h4>Transform</h4>
          <div className="property-row">
            <label>X</label>
            <span className="value">{selectedElement.transform.translation.x.toFixed(1)}</span>
          </div>
          <div className="property-row">
            <label>Y</label>
            <span className="value">{selectedElement.transform.translation.y.toFixed(1)}</span>
          </div>
          <div className="property-row">
            <label>Z</label>
            <span className="value">{selectedElement.transform.translation.z.toFixed(1)}</span>
          </div>
        </div>

        <div className="property-group">
          <h4>Properties</h4>
          {Object.entries(selectedElement.properties).map(([key, prop]) => (
            <div key={key} className="property-row">
              <label>{key}</label>
              <span className="value">
                {String(prop.value)}
                {prop.unit && <span className="unit"> {prop.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
