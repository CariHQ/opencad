import { useDocumentStore } from '../stores/documentStore';

export function LayersPanel() {
  const { document: doc } = useDocumentStore();

  if (!doc) return null;

  const layers = Object.values(doc.layers).sort((a, b) => a.order - b.order);

  return (
    <div className="layers-panel">
      <div className="panel-header">
        <span className="panel-title">Layers</span>
        <div className="panel-actions">
          <button className="panel-action-btn" title="Add Layer">
            +
          </button>
          <button className="panel-action-btn" title="Layer Settings">
            ⚙
          </button>
        </div>
      </div>
      <div className="layers-list">
        {layers.map((layer) => (
          <div key={layer.id} className={`layer-item ${layer.visible ? '' : 'hidden'}`}>
            <span className="layer-color" style={{ backgroundColor: layer.color }} />
            <span className="layer-name">{layer.name}</span>
            <span className={`layer-visibility ${layer.visible ? '' : 'hidden'}`}>
              {layer.visible ? '👁' : '○'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
