import React, { useState } from 'react';
import {
  ChevronRight,
  Layers,
  Home,
  Box,
  Scissors,
  Building2,
  Gauge,
  BrickWall,
  Square,
  DoorOpen,
  AppWindow,
  Hash,
} from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';

export function Navigator() {
  const { document: doc, selectedIds, setSelectedIds } = useDocumentStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    views: true,
    levels: true,
    elements: true,
  });

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const levels = doc?.levels ? Object.values(doc.levels) : [];
  const elements = doc?.elements ? Object.values(doc.elements) : [];

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
        <span className="navigator-title">Navigator</span>
      </div>

      <div className="navigator-content">
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

        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('levels')}>
            <span className={`expand-icon ${expanded.levels ? 'expanded' : ''}`}>
              <ChevronRight size={12} />
            </span>
            <span className="item-icon">
              <Building2 size={14} />
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
                      <Gauge size={14} />
                    </span>
                    <span className="item-name">{level.name}</span>
                    <span className="item-meta">{level.elevation.toFixed(0)}m</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('elements')}>
            <span className={`expand-icon ${expanded.elements ? 'expanded' : ''}`}>
              <ChevronRight size={12} />
            </span>
            <span className="item-icon">
              <BrickWall size={14} />
            </span>
            <span className="item-name">Elements</span>
            <span className="item-count">{elements.length}</span>
          </div>
          {expanded.elements && (
            <div className="nav-children">
              {elements.slice(0, 50).map((element) => (
                <div
                  key={element.id}
                  className={`nav-item element ${selectedIds.includes(element.id) ? 'selected' : ''}`}
                  onClick={() => setSelectedIds([element.id])}
                >
                  <span className="item-icon">{getElementIcon(element.type)}</span>
                  <span className="item-name">
                    {element.properties?.Name?.value || `${element.type} ${element.id.slice(0, 6)}`}
                  </span>
                </div>
              ))}
              {elements.length > 50 && (
                <div className="nav-item more">
                  <span className="item-name">+{elements.length - 50} more...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
