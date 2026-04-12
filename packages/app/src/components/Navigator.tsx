import React, { useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';

interface TreeItem {
  id: string;
  name: string;
  type: 'folder' | 'view' | 'element' | 'level';
  children?: TreeItem[];
  expanded?: boolean;
}

export function Navigator() {
  const { document: doc } = useDocumentStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    views: true,
    levels: true,
    elements: false,
  });
  const [selected, setSelected] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const levels = doc?.levels ? Object.values(doc.levels) : [];
  const elements = doc?.elements ? Object.values(doc.elements) : [];

  return (
    <div className="navigator">
      <div className="navigator-header">
        <span className="navigator-title">Navigator</span>
      </div>

      <div className="navigator-content">
        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('views')}>
            <span className={`expand-icon ${expanded.views ? 'expanded' : ''}`}>▶</span>
            <span className="item-icon">📋</span>
            <span className="item-name">Views</span>
          </div>
          {expanded.views && (
            <div className="nav-children">
              <div className="nav-item view">
                <span className="item-icon">🏠</span>
                <span className="item-name">Floor Plan</span>
              </div>
              <div className="nav-item view">
                <span className="item-icon">🎥</span>
                <span className="item-name">3D View</span>
              </div>
              <div className="nav-item view">
                <span className="item-icon">✂️</span>
                <span className="item-name">Section A-A</span>
              </div>
              <div className="nav-item view">
                <span className="item-icon">📐</span>
                <span className="item-name">Layout 1</span>
              </div>
            </div>
          )}
        </div>

        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('levels')}>
            <span className={`expand-icon ${expanded.levels ? 'expanded' : ''}`}>▶</span>
            <span className="item-icon">🏢</span>
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
                    className={`nav-item level ${selected === level.id ? 'selected' : ''}`}
                    onClick={() => setSelected(level.id)}
                  >
                    <span className="item-icon">📶</span>
                    <span className="item-name">{level.name}</span>
                    <span className="item-meta">{level.elevation.toFixed(0)}m</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="nav-section">
          <div className="nav-item folder" onClick={() => toggleExpanded('elements')}>
            <span className={`expand-icon ${expanded.elements ? 'expanded' : ''}`}>▶</span>
            <span className="item-icon">🧱</span>
            <span className="item-name">Elements</span>
            <span className="item-count">{elements.length}</span>
          </div>
          {expanded.elements && (
            <div className="nav-children">
              {elements.slice(0, 50).map((element) => (
                <div
                  key={element.id}
                  className={`nav-item element ${selected === element.id ? 'selected' : ''}`}
                  onClick={() => setSelected(element.id)}
                >
                  <span className="item-icon">
                    {element.type === 'wall'
                      ? '▮'
                      : element.type === 'door'
                        ? '⊟'
                        : element.type === 'window'
                          ? '▭'
                          : '◻'}
                  </span>
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
