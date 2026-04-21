import { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, Box } from 'lucide-react';
import { useViewport } from '../hooks/useViewport';
import { useThreeViewport } from '../hooks/useThreeViewport';
import { useCursorBroadcast } from '../hooks/useCursorBroadcast';
import { ViewCube } from './ViewCube';
import { CoordBox, type CoordField, type CoordBoxValues } from './CoordBox';
import { RemoteCursors } from './RemoteCursors';

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
    handleCanvasWheel,
    activeTool,
    drawingState,
    commitFromCoordBox,
    cancelDrawing,
  } = useViewport();

  // ─── Coord-box overlay (T-MOD-003 / #296) ───────────────────────────────
  // Follows the cursor in screen pixels while a drag-based drawing tool is
  // mid-drag. The hook keeps drawing state in world coords; we track screen
  // coords via a ref updated by onMouseMove below so the overlay can float.
  const coordScreenRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [coordScreen, setCoordScreen] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const DRAG_COORD_TOOLS = new Set(['wall', 'line', 'rectangle', 'beam', 'dimension']);
  const showCoordBox = !!(drawingState?.isDrawing && drawingState.startPoint && DRAG_COORD_TOOLS.has(activeTool));
  const coordFields: CoordField[] =
    activeTool === 'rectangle' ? ['width', 'height'] : ['length', 'angle'];
  const coordPreview: CoordBoxValues = (() => {
    if (!drawingState?.startPoint) return {};
    const sp = drawingState.startPoint;
    const cp = drawingState.currentPoint ?? sp;
    if (activeTool === 'rectangle') {
      return { width: Math.abs(cp.x - sp.x), height: Math.abs(cp.y - sp.y) };
    }
    const dx = cp.x - sp.x, dy = cp.y - sp.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return { length, angle };
  })();
  useEffect(() => { if (showCoordBox) setCoordScreen(coordScreenRef.current); }, [drawingState?.currentPoint, showCoordBox]);
  const {
    containerRef: threeContainerRef,
    setViewPreset,
    zoomIn,
    zoomOut,
    zoomToFit,
    sectionBox,
    setSectionBox,
  } = useThreeViewport();

  // Broadcast local cursor on every viewport mousemove so collaborators
  // see it; safe no-op when no sync connection is open.
  useCursorBroadcast(containerRef);

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
          onMouseMove={(e) => {
            const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
            coordScreenRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            handleCanvasMouseMove(e);
          }}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onDoubleClick={handleCanvasDoubleClick}
          onWheel={handleCanvasWheel}
        />
      )}
      {!show3D && showCoordBox && (
        <CoordBox
          x={coordScreen.x}
          y={coordScreen.y}
          preview={coordPreview}
          fields={coordFields}
          onCommit={commitFromCoordBox}
          onCancel={cancelDrawing}
        />
      )}
      <RemoteCursors />
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
            {show3D && <ViewCube setViewPreset={setViewPreset} />}
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
              <span>Zoom: scroll | Pan: middle-drag | Ctrl: snap off</span>
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
