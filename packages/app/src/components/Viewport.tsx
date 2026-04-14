import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Box } from 'lucide-react';
import { useViewport } from '../hooks/useViewport';
import { useThreeViewport, ViewPreset } from '../hooks/useThreeViewport';

interface ViewportProps {
  viewType?: 'floor-plan' | '3d' | 'section';
}

export function Viewport({ viewType = '3d' }: ViewportProps) {
  const show3D = viewType === '3d';
  const toggleView = () => {}; // TODO: wire up to parent state

  const {
    canvasRef,
    containerRef,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasDoubleClick,
    activeTool,
    drawingState,
  } = useViewport();
  const {
    containerRef: threeContainerRef,
    setViewPreset,
    zoomIn,
    zoomOut,
    zoomToFit,
    sectionBox,
    setSectionBox,
  } = useThreeViewport();

  const handleViewChange = (preset: ViewPreset) => {
    if (show3D) {
      setViewPreset(preset);
    }
  };

  return (
    <div className="viewport-container" ref={containerRef}>
      {show3D ? (
        <div
          ref={threeContainerRef}
          className="viewport-canvas"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="viewport-canvas"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onDoubleClick={handleCanvasDoubleClick}
        />
      )}
      <div className="viewport-overlay">
        <div className="viewport-corner top-left">
          <span>
            {viewType === 'floor-plan'
              ? 'Floor Plan'
              : viewType === 'section'
                ? 'Section'
                : '3D View'}
          </span>
          {activeTool !== 'select' && (
            <span className="active-tool-indicator"> | {activeTool}</span>
          )}
        </div>
        <div className="viewport-corner top-right">
          <div className="viewport-controls">
            {show3D && (
              <>
                <button
                  className="viewport-control-btn"
                  onClick={() => handleViewChange('top')}
                  title="Top View (1)"
                >
                  T
                </button>
                <button
                  className="viewport-control-btn"
                  onClick={() => handleViewChange('front')}
                  title="Front View (2)"
                >
                  F
                </button>
                <button
                  className="viewport-control-btn"
                  onClick={() => handleViewChange('right')}
                  title="Right View (3)"
                >
                  R
                </button>
                <button
                  className="viewport-control-btn"
                  onClick={() => handleViewChange('3d')}
                  title="3D View (4)"
                >
                  3D
                </button>
                <span style={{ width: 8 }} />
              </>
            )}
            <button className="view-toggle" onClick={toggleView}>
              {show3D ? '2D' : '3D'}
            </button>
          </div>
        </div>
        <div className="viewport-corner bottom-left">
          <div className="viewport-info">
            {show3D ? (
              <span>Orbit: drag | Pan: Shift+drag | Zoom: scroll | Fit: 0</span>
            ) : (
              <span>Draw: W L M | Ctrl+Z/Y undo | Ctrl snap</span>
            )}
          </div>
        </div>
        <div className="viewport-corner bottom-right">
          <div className="viewport-controls">
            {show3D && (
              <>
                <button className="viewport-control-btn" onClick={zoomIn} title="Zoom In (+)">
                  <ZoomIn size={14} />
                </button>
                <button className="viewport-control-btn" onClick={zoomOut} title="Zoom Out (-)">
                  <ZoomOut size={14} />
                </button>
                <button
                  className="viewport-control-btn"
                  onClick={zoomToFit}
                  title="Zoom to Fit (0)"
                >
                  <Maximize size={14} />
                </button>
                <button
                  className={`viewport-control-btn ${sectionBox ? 'active' : ''}`}
                  onClick={() => setSectionBox(!sectionBox)}
                  title="Section Box"
                >
                  <Box size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
