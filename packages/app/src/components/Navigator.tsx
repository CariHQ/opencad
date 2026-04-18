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
} from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';

export function Navigator() {
  const { document: doc, selectedIds, setSelectedIds, updateLayer, addLayer, renameProject } = useDocumentStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    views: true,
    levels: true,
    layers: true,
    elements: true,
  });
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEditingName = () => {
    setNameInput(doc?.name ?? 'Untitled Project');
    setEditingName(true);
  };

  const commitName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) renameProject(trimmed);
    setEditingName(false);
  };

  const levels = doc?.organization.levels ? Object.values(doc.organization.levels) : [];
  const layers = doc?.organization.layers ? Object.values(doc.organization.layers) : [];
  const elements = doc?.content.elements ? Object.values(doc.content.elements) : [];

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

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'wall':
        return <BrickWall size={14} />;
      case 'door':
        return <DoorOpen size={14} />;
      case 'window':
        return <AppWindow size={14} />;
      case 'slab':
        return <Square size={14} />;
      default:
        return <Hash size={14} />;
    }
  };

  return (
    <div className="navigator">
      <div className="navigator-header">
        {editingName ? (
          <input
            className="project-name-input"
            value={nameInput}
            autoFocus
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') setEditingName(false);
            }}
          />
        ) : (
          <span className="navigator-project-name" title="Double-click to rename" onDoubleClick={startEditingName}>
            {doc?.name ?? 'Untitled Project'}
          </span>
        )}
        <span className="navigator-title">Navigator</span>
      </div>

      <div className="navigator-search">
        <input
          className="navigator-search-input"
          placeholder="Search elements…"
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
            <span className="item-name">Views</span>
          </div>
          {expanded.views && (
            <div className="nav-children">
              <div className="nav-item view">
                <span className="item-icon">
                  <Home size={14} />
                </span>
                <span className="item-name">Floor Plan</span>
              </div>
              <div className="nav-item view">
                <span className="item-icon">
                  <Box size={14} />
                </span>
                <span className="item-name">3D View</span>
              </div>
              <div className="nav-item view">
                <span className="item-icon">
                  <Scissors size={14} />
                </span>
                <span className="item-name">Section A-A</span>
              </div>
              <div className="nav-item view">
                <span className="item-icon">
                  <Building2 size={14} />
                </span>
                <span className="item-name">Layout 1</span>
              </div>
            </div>
          )}
        </div>

        {/* Levels */}
        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('levels')}>
            <span className={`expand-icon ${expanded.levels ? 'expanded' : ''}`}>
              <ChevronRight size={12} />
            </span>
            <span className="item-icon">
              <ArrowUpDown size={14} />
            </span>
            <span className="item-name">Levels</span>
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
                    <span className="item-icon">
                      <Minus size={14} />
                    </span>
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
            <span className="item-icon">
              <Layers size={14} />
            </span>
            <span className="item-name">Layers</span>
            <button
              className="nav-icon-btn"
              title="Add layer"
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
                        <span
                          className="layer-color-dot"
                          style={{ background: layer.color }}
                        />
                        <span className="item-name">{layer.name}</span>
                        <button
                          className="nav-icon-btn"
                          title={layer.visible ? 'Hide layer (toggle visibility)' : 'Show layer (toggle visibility)'}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateLayer(layer.id, { visible: !layer.visible });
                          }}
                        >
                          {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button
                          className="nav-icon-btn"
                          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateLayer(layer.id, { locked: !layer.locked });
                          }}
                        >
                          {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                        </button>
                        <span className="item-count">{layerElements.length}</span>
                      </div>
                      {layerExpanded && layerElements.slice(0, 50).map((element) => (
                        <div
                          key={element.id}
                          className={`nav-item element nav-child-indent ${selectedIds.includes(element.id) ? 'selected' : ''}`}
                          onClick={() => setSelectedIds([element.id])}
                        >
                          <span className="item-icon">{getElementIcon(element.type)}</span>
                          <span className="item-name">
                            {(element.properties?.Name?.value as string | undefined) ||
                              `${element.type} ${element.id.slice(0, 6)}`}
                          </span>
                        </div>
                      ))}
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
            <span className="item-icon">
              <BrickWall size={14} />
            </span>
            <span className="item-name">Elements</span>
            <span className="item-count">{filteredElements.length}</span>
          </div>
          {expanded.elements && (
            <div className="nav-children">
              {filteredElements.slice(0, 50).map((element) => (
                <div
                  key={element.id}
                  className={`nav-item element ${selectedIds.includes(element.id) ? 'selected' : ''}`}
                  onClick={() => setSelectedIds([element.id])}
                >
                  <span className="item-icon">{getElementIcon(element.type)}</span>
                  <span className="item-name">
                    {(element.properties?.Name?.value as string | undefined) ||
                      `${element.type} ${element.id.slice(0, 6)}`}
                  </span>
                </div>
              ))}
              {filteredElements.length > 50 && (
                <div className="nav-item more">
                  <span className="item-name">+{filteredElements.length - 50} more…</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
