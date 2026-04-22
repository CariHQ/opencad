import { Plus, Settings, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';

export function LayersPanel() {
  const { t } = useTranslation('panels');
  const { document: doc, addLayer, updateLayer } = useDocumentStore();

  if (!doc) return null;

  const layers = Object.values(doc.organization.layers).sort((a, b) => a.order - b.order);

  const handleToggleVisibility = (layerId: string, visible: boolean) => {
    updateLayer(layerId, { visible: !visible });
  };

  const handleAddLayer = () => {
    const name = `Layer ${layers.length + 1}`;
    const colors = ['#808080', '#4f46e5', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[layers.length % colors.length];
    addLayer({ name, color });
  };

  return (
    <div className="layers-panel">
      <div className="panel-header">
        <span className="panel-title">{t('layers.title', { defaultValue: 'Layers' })}</span>
        <div className="panel-actions">
          <button className="panel-action-btn" onClick={handleAddLayer} title={t('layers.addLayer', { defaultValue: 'Add Layer' })}>
            <Plus size={14} />
          </button>
          <button className="panel-action-btn" title={t('layers.settings', { defaultValue: 'Layer Settings' })}>
            <Settings size={14} />
          </button>
        </div>
      </div>
      <div className="layers-list">
        {layers.map((layer) => (
          <div key={layer.id} className={`layer-item ${layer.visible ? '' : 'hidden'}`}>
            <span className="layer-color" style={{ backgroundColor: layer.color }} />
            <span className="layer-name">{layer.name}</span>
            <button
              className={`layer-visibility ${layer.visible ? '' : 'hidden'}`}
              onClick={() => handleToggleVisibility(layer.id, layer.visible)}
              title={layer.visible ? t('layers.hideLayerShort', { defaultValue: 'Hide Layer' }) : t('layers.showLayerShort', { defaultValue: 'Show Layer' })}
            >
              {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
