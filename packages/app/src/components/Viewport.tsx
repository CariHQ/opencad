import { ZoomIn, ZoomOut, Maximize, Box } from 'lucide-react';
import { useViewport } from '../hooks/useViewport';
import { useThreeViewport, ViewPreset } from '../hooks/useThreeViewport';
import { useRole } from '../hooks/useRole';

// Canvas coordinate constants — must match useViewport.ts
const VIEWPORT_SCALE = 20;

interface ViewportProps {
  viewType?: 'floor-plan' | '3d' | 'section';
}

export function Viewport({ viewType = '3d' }: ViewportProps) {
  const show3D = viewType === '3d';
  const toggleView = () => {}; // TODO: wire up to parent state
  const { isViewOnly } = useRole();

  const {
    canvasRef,
    containerRef,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasDoubleClick,
    activeTool,
    drawingText,
    textInputRef,
    confirmText,
    cancelText,
    viewRef,
  } = useViewport({ isViewOnly });
  const {
    containerRef: threeContainerRef,
    setViewPreset,
    zoomIn,
    zoomOut,
    zoomToFit,
    sectionBox,
    setSectionBox,
  } = useThreeViewport({ isViewOnly });

  const handleViewChange = (preset: ViewPreset) => {
    if (show3D) {
      setViewPreset(preset);
    }
  };

  // Compute screen position for the text overlay input from world-space coordinates.
  // Uses the same formula as worldToScreen in useViewport:
  //   sx = wx / SCALE + cw/2
  //   sy = ch/2 - wy / SCALE   (Y is flipped)
  const computeTextOverlayPosition = (): { left: number; top: number } => {
    if (!drawingText) return { left: 0, top: 0 };
    const canvas = canvasRef.current;
    const cw = canvas?.offsetWidth ?? 800;
    const ch = canvas?.offsetHeight ?? 600;
    const { zoom, panX, panY } = viewRef.current;
    return {
      left: drawingText.x * zoom / VIEWPORT_SCALE + cw / 2 + panX,
      top: ch / 2 + panY - drawingText.y * zoom / VIEWPORT_SCALE,
    };
  };

  return (
    <div className="viewport-container" ref={containerRef}>
      {show3D ? (
        <div
          ref={threeContainerRef}
          className={`viewport-canvas${isViewOnly ? ' viewport-canvas--view-only' : ''}`}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <>
          <canvas
            ref={canvasRef}
            className={`viewport-canvas${isViewOnly ? ' viewport-canvas--view-only' : ''}`}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onDoubleClick={handleCanvasDoubleClick}
          />
          {drawingText && (() => {
            const { left, top } = computeTextOverlayPosition();
            return (
              <input
                ref={textInputRef}
                data-testid="text-tool-input"
                style={{
                  position: 'absolute',
                  left,
                  top,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid currentColor',
                  outline: 'none',
                  color: 'inherit',
                  font: `14px sans-serif`,
                  minWidth: 80,
                  zIndex: 100,
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmText(e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    cancelText();
                  }
                }}
                onBlur={(e) => confirmText(e.currentTarget.value)}
                autoFocus
              />
            );
          })()}
        </>
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
            {isViewOnly ? (
              <span>View only — pan/zoom to navigate</span>
            ) : show3D ? (
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
