/**
 * Three.js Viewport Inner Component
 * Loaded lazily to keep Three.js out of the initial bundle.
 * Issue #6: Code splitting for Three.js
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useThreeViewport, type ViewPreset } from '../hooks/useThreeViewport';
import { ZoomIn, ZoomOut, Maximize, Box } from 'lucide-react';
import { SectionBoxPanel } from './SectionBoxPanel';

interface ThreeViewportInnerProps {
  onViewChange?: (preset: ViewPreset) => void;
}

export function ThreeViewportInner({ onViewChange }: ThreeViewportInnerProps) {
  const { t } = useTranslation('common');
  const {
    containerRef,
    setViewPreset,
    zoomIn,
    zoomOut,
    zoomToFit,
    sectionBox,
    setSectionBox,
    sectionPosition: _sectionPosition,
    setSectionPosition,
    sectionDirection: _sectionDirection,
    setSectionDirection,
    saveSectionView,
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
            title={t('viewport.presetView', { preset: p, defaultValue: '{{preset}} View' })}
          >
            {p === '3d' ? '3D' : p[0]!.toUpperCase()}
          </button>
        ))}
        <button className="viewport-control-btn" onClick={zoomIn} title={t('viewport.zoomIn', { defaultValue: 'Zoom In' })}>
          <ZoomIn size={14} />
        </button>
        <button className="viewport-control-btn" onClick={zoomOut} title={t('viewport.zoomOut', { defaultValue: 'Zoom Out' })}>
          <ZoomOut size={14} />
        </button>
        <button className="viewport-control-btn" onClick={zoomToFit} title={t('viewport.fit', { defaultValue: 'Fit' })}>
          <Maximize size={14} />
        </button>
        <button
          className={`viewport-control-btn ${sectionBox ? 'active' : ''}`}
          onClick={() => setSectionBox(!sectionBox)}
          title={t('viewport.sectionBox', { defaultValue: 'Section Box' })}
        >
          <Box size={14} />
        </button>
      </div>
      {sectionBox && (
        <div className="section-box-overlay">
          <SectionBoxPanel
            onToggle={(en) => setSectionBox(en)}
            onPositionChange={setSectionPosition}
            onDirectionChange={setSectionDirection}
            onSaveView={saveSectionView}
          />
        </div>
      )}
    </>
  );
}
