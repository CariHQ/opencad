import { useDocumentStore } from '../stores/documentStore';

export function PropertiesPanel() {
  const { document: doc, selectedIds } = useDocumentStore();

  if (!doc) return null;

  if (selectedIds.length === 0) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-title">Properties</span>
        </div>
        <div className="properties-content empty">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
            Select an element to view properties
          </p>
        </div>
      </div>
    );
  }

  const selectedElement = doc.elements[selectedIds[0]];
  if (!selectedElement) return null;

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <span className="panel-title">Properties</span>
        <div className="panel-actions">
          <button className="panel-action-btn" title="More">
            ⋮
          </button>
        </div>
      </div>
      <div className="properties-content">
        <div className="property-group">
          <div className="property-group-title">General</div>
          <div className="property-row">
            <span className="property-label">Type</span>
            <div className="property-value">
              <input type="text" className="property-input" value={selectedElement.type} disabled />
            </div>
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">Location</div>
          <div className="property-row">
            <span className="property-label">X</span>
            <div className="property-value">
              <input
                type="number"
                className="property-input"
                value={selectedElement.transform.translation.x.toFixed(1)}
              />
            </div>
          </div>
          <div className="property-row">
            <span className="property-label">Y</span>
            <div className="property-value">
              <input
                type="number"
                className="property-input"
                value={selectedElement.transform.translation.y.toFixed(1)}
              />
            </div>
          </div>
          <div className="property-row">
            <span className="property-label">Z</span>
            <div className="property-value">
              <input
                type="number"
                className="property-input"
                value={selectedElement.transform.translation.z.toFixed(1)}
              />
            </div>
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">Dimensions</div>
          {Object.entries(selectedElement.properties).map(([key, prop]) => (
            <div key={key} className="property-row">
              <span className="property-label">{key}</span>
              <div className="property-value">
                <input
                  type="text"
                  className="property-input"
                  value={`${prop.value}${prop.unit ? ' ' + prop.unit : ''}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
