import React, { useState } from 'react';

interface Level {
  id: string;
  name: string;
}

interface MobileViewerProps {
  projectName: string;
  levels?: Level[];
  elementCount?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

type ViewMode = 'floor-plan' | '3d';

export function MobileViewer({ projectName, levels = [], elementCount, onZoomIn, onZoomOut }: MobileViewerProps) {
  const [activeView, setActiveView] = useState<ViewMode>('3d');
  const [selectedLevel, setSelectedLevel] = useState(levels[0]?.id ?? null);

  return (
    <div className="mobile-viewer" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="mobile-header" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="mobile-project-name" style={{ fontWeight: 600, flex: 1 }}>{projectName}</span>
        <span className="read-only-badge" style={{ fontSize: 11, background: '#f0f0f0', padding: '2px 6px', borderRadius: 3 }}>
          Read-only
        </span>
        {typeof elementCount === 'number' && (
          <span className="element-count" style={{ fontSize: 11, opacity: 0.7 }}>{elementCount} elements</span>
        )}
      </header>

      <div className="mobile-view-tabs" style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
        <button
          aria-label="Floor Plan view"
          className={`tab-btn ${activeView === 'floor-plan' ? 'active' : ''}`}
          onClick={() => setActiveView('floor-plan')}
          style={{ flex: 1, padding: '8px', background: activeView === 'floor-plan' ? '#e3eaff' : 'transparent' }}
        >
          Floor Plan
        </button>
        <button
          aria-label="3D view"
          className={`tab-btn ${activeView === '3d' ? 'active' : ''}`}
          onClick={() => setActiveView('3d')}
          style={{ flex: 1, padding: '8px', background: activeView === '3d' ? '#e3eaff' : 'transparent' }}
        >
          3D
        </button>
      </div>

      {levels.length > 0 && (
        <div className="mobile-level-bar" style={{ padding: '4px 8px', display: 'flex', gap: 4, overflowX: 'auto' }}>
          {levels.map((lvl) => (
            <button
              key={lvl.id}
              className={`level-btn ${selectedLevel === lvl.id ? 'active' : ''}`}
              onClick={() => setSelectedLevel(lvl.id)}
              style={{ padding: '2px 8px', fontSize: 12, borderRadius: 3 }}
            >
              {lvl.name}
            </button>
          ))}
        </div>
      )}

      <div className="mobile-viewport" style={{ flex: 1, position: 'relative', background: '#f5f5f5' }}>
        <div className="mobile-zoom-controls" style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            aria-label="Zoom in"
            className="btn-zoom-in"
            onClick={onZoomIn}
            style={{ width: 40, height: 40, fontSize: 20, borderRadius: 6 }}
          >
            +
          </button>
          <button
            aria-label="Zoom out"
            className="btn-zoom-out"
            onClick={onZoomOut}
            style={{ width: 40, height: 40, fontSize: 20, borderRadius: 6 }}
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}
