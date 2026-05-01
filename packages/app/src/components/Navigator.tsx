import React, { useState } from 'react';
import {
  ChevronRight,
  Layers,
  Home,
  Box,
  Scissors,
  Building2,
  BrickWall,
  Square,
  DoorOpen,
  AppWindow,
  Hash,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  ArrowUpDown,
  Minus,
  Camera,
  Filter,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';
import { useSceneStore } from '../stores/sceneStore';
import type { ElementType } from '@opencad/document';

// Display labels for category filter — subset of ElementType values used in the model
const CATEGORY_LABELS: Partial<Record<ElementType, string>> = {
  wall: 'Walls',
  door: 'Doors',
  window: 'Windows',
  slab: 'Slabs',
  roof: 'Roofs',
  column: 'Columns',
  beam: 'Beams',
  stair: 'Stairs',
  ramp: 'Ramps',
  railing: 'Railings',
  space: 'Spaces',
  mass: 'Mass',
  annotation: 'Annotations',
  dimension: 'Dimensions',
  text: 'Text',
  ceiling: 'Ceilings',
  foundation: 'Foundation',
};

export function Navigator() {
  const { t } = useTranslation('panels');
  const { t: tc } = useTranslation('common');
  const {
    document: doc,
    selectedIds,
    setSelectedIds,
    updateLayer,
    addLayer,
    deleteRendering,
    hideElement,
    unhideElement,
  } = useDocumentStore();
  const { temporaryHide, hiddenCategories, toggleCategory, resetCategoryFilter, resetTemporaryHide } = useSceneStore();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    views: true,
    levels: true,
    layers: true,
    elements: true,
    filter: false,
  });
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const levels = doc?.organization.levels ? Object.values(doc.organization.levels) : [];
  const layers = doc?.organization.layers ? Object.values(doc.organization.layers) : [];
  const elements = doc?.content.elements ? Object.values(doc.content.elements) : [];
  const renderings = doc?.presentation.views
    ? Object.values(doc.presentation.views).filter((v) => v.type === 'render')
    : [];

  const filteredElements = search
    ? elements.filter((el) => {
        const q = search.toLowerCase();
        const name = (el.properties?.Name?.value as string | undefined) ?? '';
        return (
          el.type.toLowerCase().includes(q) ||
          el.id.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q)
        );
      })
    : elements;

  // Count elements per category (for filter badges)
  const categoryCounts = new Map<ElementType, number>();
  for (const el of elements) {
    categoryCounts.set(el.type as ElementType, (categoryCounts.get(el.type as ElementType) ?? 0) + 1);
  }
  const activeCategories = [...categoryCounts.keys()];

  const tempHideActive = temporaryHide.hidden.size > 0 || temporaryHide.isolated !== null;

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'wall':    return <BrickWall size={14} />;
      case 'door':    return <DoorOpen size={14} />;
      case 'window':  return <AppWindow size={14} />;
      case 'slab':    return <Square size={14} />;
      default:        return <Hash size={14} />;
    }
  };

  return (
    <div className="navigator">
      <div className="navigator-header">
        <span className="navigator-title">{t('navigator.title')}</span>
        {hiddenCategories.size > 0 && (
          <span className="nav-filter-badge" title={t('navigator.filterActive', { defaultValue: 'Category filter active' })}>
            <Filter size={10} />
            {hiddenCategories.size}
          </span>
        )}
      </div>

      {/* Temporary-hide active banner */}
      {tempHideActive && (
        <div className="nav-temp-hide-banner">
          <span>{t('navigator.tempHideActive', { defaultValue: 'Temporary hide active' })}</span>
          <button
            className="nav-temp-hide-reset"
            onClick={resetTemporaryHide}
            title={t('navigator.resetTempHide', { defaultValue: 'Reset temporary hide' })}
          >
            <X size={11} />
          </button>
        </div>
      )}

      <div className="navigator-search">
        <input
          className="navigator-search-input"
          placeholder={t('navigator.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="navigator-content">
        {/* Views */}
        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('views')}>
            <span className={`expand-icon ${expanded.views ? 'expanded' : ''}`}>
              <ChevronRight size={12} />
            </span>
            <span className="item-icon">
              <Layers size={14} />
            </span>
            <span className="item-name">{t('navigator.views')}</span>
          </div>
          {expanded.views && (
            <div className="nav-children">
              <div className="nav-item view">
                <span className="item-icon"><Home size={14} /></span>
                <span className="item-name">{tc('view.floorPlan', { defaultValue: 'Floor Plan' })}</span>
              </div>
              <div className="nav-item view">
                <span className="item-icon"><Box size={14} /></span>
                <span className="item-name">{tc('view.threeD', { defaultValue: '3D View' })}</span>
              </div>
              <div className="nav-item view">
                <span className="item-icon"><Scissors size={14} /></span>
                <span className="item-name">{tc('view.sectionAA', { defaultValue: 'Section A-A' })}</span>
              </div>
              <div className="nav-item view">
                <span className="item-icon"><Building2 size={14} /></span>
                <span className="item-name">{tc('view.layout1', { defaultValue: 'Layout 1' })}</span>
              </div>
              {renderings.map((view) => (
                <div
                  key={view.id}
                  className="nav-item view nav-item--render"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-opencad-view', view.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  title={view.name}
                >
                  {view.render?.png ? (
                    <img className="nav-render-thumb" src={view.render.png} alt="" />
                  ) : (
                    <span className="item-icon"><Camera size={14} /></span>
                  )}
                  <span className="item-name">{view.name}</span>
                  <button
                    className="nav-render-delete"
                    aria-label={t('navigator.deleteRendering', { defaultValue: 'Delete rendering' })}
                    title={t('navigator.deleteRendering', { defaultValue: 'Delete rendering' })}
                    onClick={(e) => { e.stopPropagation(); deleteRendering(view.id); }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Levels */}
        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('levels')}>
            <span className={`expand-icon ${expanded.levels ? 'expanded' : ''}`}>
              <ChevronRight size={12} />
            </span>
            <span className="item-icon"><ArrowUpDown size={14} /></span>
            <span className="item-name">{t('navigator.levels')}</span>
            <span className="item-count">{levels.length}</span>
          </div>
          {expanded.levels && (
            <div className="nav-children">
              {levels
                .sort((a, b) => a.order - b.order)
                .map((level) => (
                  <div
                    key={level.id}
                    className={`nav-item level ${selectedIds.includes(level.id) ? 'selected' : ''}`}
                    onClick={() => setSelectedIds([level.id])}
                  >
                    <span className="item-icon"><Minus size={14} /></span>
                    <span className="item-name">{level.name}</span>
                    <span className="item-meta">{level.elevation.toFixed(0)}m</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Layers */}
        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('layers')}>
            <span className={`expand-icon ${expanded.layers ? 'expanded' : ''}`}>
              <ChevronRight size={12} />
            </span>
            <span className="item-icon"><Layers size={14} /></span>
            <span className="item-name">{t('navigator.layers')}</span>
            <button
              className="nav-icon-btn"
              title={t('layers.newLayer', { defaultValue: 'New layer' })}
              onClick={(e) => {
                e.stopPropagation();
                const colors = ['#808080', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
                addLayer({ name: `Layer ${layers.length + 1}`, color: colors[layers.length % colors.length] });
              }}
            >
              <Plus size={11} />
            </button>
            <span className="item-count">{layers.length}</span>
          </div>
          {expanded.layers && (
            <div className="nav-children">
              {layers
                .sort((a, b) => a.order - b.order)
                .map((layer) => {
                  const layerElements = filteredElements.filter((e) => e.layerId === layer.id);
                  const layerExpanded = expandedLayers[layer.id] ?? true;
                  return (
                    <React.Fragment key={layer.id}>
                      <div
                        className="nav-item layer"
                        onClick={() => setExpandedLayers((prev) => ({ ...prev, [layer.id]: !layerExpanded }))}
                      >
                        <span className={`expand-icon ${layerExpanded ? 'expanded' : ''}`}>
                          <ChevronRight size={12} />
                        </span>
                        <span className="layer-color-dot" style={{ background: layer.color }} />
                        <span className="item-name">{layer.name}</span>
                        <button
                          className="nav-icon-btn"
                          title={layer.visible
                            ? t('layers.hideLayer', { defaultValue: 'Hide layer' })
                            : t('layers.showLayer', { defaultValue: 'Show layer' })}
                          onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                        >
                          {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button
                          className="nav-icon-btn"
                          title={layer.locked
                            ? t('layers.unlockLayer', { defaultValue: 'Unlock layer' })
                            : t('layers.lockLayer', { defaultValue: 'Lock layer' })}
                          onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                        >
                          {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                        </button>
                        <span className="item-count">{layerElements.length}</span>
                      </div>
                      {layerExpanded && layerElements.slice(0, 50).map((element) => {
                        const isHidden = element.visible === false;
                        const layerOff = !layer.visible;
                        return (
                          <div
                            key={element.id}
                            className={`nav-item element nav-child-indent ${selectedIds.includes(element.id) ? 'selected' : ''} ${isHidden ? 'nav-item--hidden' : ''}`}
                            onClick={() => setSelectedIds([element.id])}
                          >
                            <span className="item-icon">{getElementIcon(element.type)}</span>
                            <span className="item-name">
                              {(element.properties?.Name?.value as string | undefined) ||
                                `${element.type} ${element.id.slice(0, 6)}`}
                            </span>
                            <button
                              className="nav-icon-btn"
                              title={layerOff
                                ? t('navigator.layerHidden', { defaultValue: 'Layer is hidden' })
                                : isHidden
                                  ? t('navigator.showElement', { defaultValue: 'Show element' })
                                  : t('navigator.hideElement', { defaultValue: 'Hide element' })}
                              disabled={layerOff}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isHidden) unhideElement(element.id);
                                else hideElement(element.id);
                              }}
                            >
                              {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
            </div>
          )}
        </div>

        {/* Elements (flat list, respects search) */}
        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('elements')}>
            <span className={`expand-icon ${expanded.elements ? 'expanded' : ''}`}>
              <ChevronRight size={12} />
            </span>
            <span className="item-icon"><BrickWall size={14} /></span>
            <span className="item-name">{t('navigator.elements')}</span>
            <span className="item-count">{filteredElements.length}</span>
          </div>
          {expanded.elements && (
            <div className="nav-children">
              {filteredElements.slice(0, 50).map((element) => {
                const isHidden = element.visible === false;
                const layer = doc?.organization.layers[element.layerId];
                const layerOff = !layer?.visible;
                return (
                  <div
                    key={element.id}
                    className={`nav-item element ${selectedIds.includes(element.id) ? 'selected' : ''} ${isHidden ? 'nav-item--hidden' : ''}`}
                    onClick={() => setSelectedIds([element.id])}
                  >
                    <span className="item-icon">{getElementIcon(element.type)}</span>
                    <span className="item-name">
                      {(element.properties?.Name?.value as string | undefined) ||
                        `${element.type} ${element.id.slice(0, 6)}`}
                    </span>
                    <button
                      className="nav-icon-btn"
                      title={layerOff
                        ? t('navigator.layerHidden', { defaultValue: 'Layer is hidden' })
                        : isHidden
                          ? t('navigator.showElement', { defaultValue: 'Show element' })
                          : t('navigator.hideElement', { defaultValue: 'Hide element' })}
                      disabled={layerOff}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isHidden) unhideElement(element.id);
                        else hideElement(element.id);
                      }}
                    >
                      {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                );
              })}
              {filteredElements.length > 50 && (
                <div className="nav-item more">
                  <span className="item-name">+{filteredElements.length - 50} more…</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* T-VIS-04: Category filter */}
        {activeCategories.length > 0 && (
          <div className="nav-section">
            <div className="nav-item folder" onClick={() => toggleExpanded('filter')}>
              <span className={`expand-icon ${expanded.filter ? 'expanded' : ''}`}>
                <ChevronRight size={12} />
              </span>
              <span className="item-icon"><Filter size={14} /></span>
              <span className="item-name">{t('navigator.filter', { defaultValue: 'Filter' })}</span>
              {hiddenCategories.size > 0 && (
                <>
                  <span className="item-count">{hiddenCategories.size} hidden</span>
                  <button
                    className="nav-icon-btn"
                    title={t('navigator.resetFilter', { defaultValue: 'Reset filter' })}
                    onClick={(e) => { e.stopPropagation(); resetCategoryFilter(); }}
                  >
                    <X size={11} />
                  </button>
                </>
              )}
            </div>
            {expanded.filter && (
              <div className="nav-children">
                {activeCategories.sort().map((cat) => {
                  const isHidden = hiddenCategories.has(cat);
                  const label = CATEGORY_LABELS[cat] ?? cat;
                  const count = categoryCounts.get(cat) ?? 0;
                  return (
                    <div
                      key={cat}
                      className={`nav-item nav-filter-row ${isHidden ? 'nav-item--hidden' : ''}`}
                      onClick={() => toggleCategory(cat)}
                      role="checkbox"
                      aria-checked={!isHidden}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? toggleCategory(cat) : undefined}
                    >
                      <span className="item-icon">
                        {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </span>
                      <span className="item-name">{label}</span>
                      <span className="item-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
