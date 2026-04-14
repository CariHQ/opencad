/**
 * Three.js Viewport Inner Component
 * Loaded lazily to keep Three.js out of the initial bundle.
 * Issue #6: Code splitting for Three.js
 */

import React from 'react';
import { useThreeViewport, type ViewPreset } from '../hooks/useThreeViewport';
import { ZoomIn, ZoomOut, Maximize, Box } from 'lucide-react';

interface ThreeViewportInnerProps {
  onViewChange?: (preset: ViewPreset) => void;
}

export function ThreeViewportInner({ onViewChange }: ThreeViewportInnerProps) {
  const {
    containerRef,
    setViewPreset,
    zoomIn,
    zoomOut,
    zoomToFit,
    sectionBox,
    setSectionBox,
  } = useThreeViewport();

  const handleViewChange = (preset: ViewPreset) => {
    setViewPreset(preset);
    onViewChange?.(preset);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="viewport-canvas"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="viewport-controls three-controls">
        {(['top', 'front', 'right', '3d'] as ViewPreset[]).map((p) => (
          <button
            key={p}
            className="viewport-control-btn"
            onClick={() => handleViewChange(p)}
            title={`${p} View`}
          >
            {p === '3d' ? '3D' : p[0]!.toUpperCase()}
          </button>
        ))}
        <button className="viewport-control-btn" onClick={zoomIn} title="Zoom In">
          <ZoomIn size={14} />
        </button>
        <button className="viewport-control-btn" onClick={zoomOut} title="Zoom Out">
          <ZoomOut size={14} />
        </button>
        <button className="viewport-control-btn" onClick={zoomToFit} title="Fit">
          <Maximize size={14} />
        </button>
        <button
          className={`viewport-control-btn ${sectionBox ? 'active' : ''}`}
          onClick={() => setSectionBox(!sectionBox)}
          title="Section Box"
        >
          <Box size={14} />
        </button>
      </div>
    </>
  );
}
