import { useRef, useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useViewport } from '../hooks/useViewport';
import { useThreeViewport } from '../hooks/useThreeViewport';
import { useCursorBroadcast } from '../hooks/useCursorBroadcast';
import { useDocumentStore } from '../stores/documentStore';
import { ViewCube } from './ViewCube';
import { CoordBox, type CoordField, type CoordBoxValues } from './CoordBox';
import { RemoteCursors } from './RemoteCursors';
import { ContextMenu } from './contextMenu/ContextMenu';
import { getContextMenuItems, type ContextMenuGroup, type ElementContext } from './contextMenu/contextMenuItems';

interface ViewportProps {
  viewType?: 'floor-plan' | '3d' | 'section';
}

export function Viewport({ viewType = '3d' }: ViewportProps) {
  const { t } = useTranslation('common');
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

  // ─── 2D context menu ────────────────────────────────────────────────────
  // 3D viewport has its own context menu inside useThreeViewport; wire one
  // into the 2D floor-plan canvas so right-click opens the same shell.
  const [contextMenu2D, setContextMenu2D] = useState<
    { x: number; y: number; items: ContextMenuGroup } | null
  >(null);
  const { selectedIds, setActiveTool, undo, redo } = useDocumentStore();
  const handleCanvas2DContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx: ElementContext = selectedIds.length > 1 ? 'multi'
      : selectedIds.length === 1 ? 'wall' // treat selection as a concrete element; most-common 2D target
      : 'empty';
    const items = getContextMenuItems('2d', ctx);
    setContextMenu2D({ x: e.clientX, y: e.clientY, items });
  }, [selectedIds]);
  const closeContextMenu2D = useCallback(() => setContextMenu2D(null), []);
  const handleContextMenuAction = useCallback((actionId: string) => {
    // Tool-switch shortcuts (insert-wall, insert-door, insert-window, insert-slab,
    // insert-column, insert-beam, insert-roof). Also primitive text/dim/line/rect
    // tools for plain 2D drafting. Anything else is left to the element-specific
    // handler down the line; for now swallow unknown actions.
    const toolForAction: Record<string, string | undefined> = {
      'insert-wall': 'wall', 'insert-door': 'door', 'insert-window': 'window',
      'insert-slab': 'slab', 'insert-column': 'column', 'insert-beam': 'beam',
      'insert-roof': 'roof', 'insert-stair': 'stair', 'insert-text': 'text',
      'insert-dimension': 'dimension', 'insert-line': 'line',
      'insert-rectangle': 'rectangle', 'insert-circle': 'circle',
    };
    const tool = toolForAction[actionId];
    if (tool) {
      setActiveTool(tool as Parameters<typeof setActiveTool>[0]);
      return;
    }
    if (actionId === 'undo')       { undo(); return; }
    if (actionId === 'redo')       { redo(); return; }
    if (actionId === 'zoom-fit')   { zoomToFit(); return; }
    if (actionId === 'select-all') {
      const st = useDocumentStore.getState();
      const ids = Object.keys(st.document?.content.elements ?? {});
      st.setSelectedIds(ids);
      return;
    }
  }, [setActiveTool, undo, redo, zoomToFit]);

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
          onContextMenu={handleCanvas2DContextMenu}
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
      {contextMenu2D && (
        <ContextMenu
          x={contextMenu2D.x}
          y={contextMenu2D.y}
          viewportW={window.innerWidth}
          viewportH={window.innerHeight}
          items={contextMenu2D.items}
          onAction={handleContextMenuAction}
          onClose={closeContextMenu2D}
        />
      )}
      <div className="viewport-overlay">
        <div className="viewport-corner top-left">
          <span>
            {viewType === 'floor-plan'
              ? t('view.floorPlan', { defaultValue: 'Floor Plan' })
              : viewType === 'section'
                ? t('view.section', { defaultValue: 'Section' })
                : t('view.threeD', { defaultValue: '3D View' })}
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
              <span>{t('viewport.info3D', { defaultValue: 'Orbit: drag | Pan: Shift+drag | Zoom: scroll | Fit: 0' })}</span>
            ) : (
              <span>{t('viewport.info2D', { defaultValue: 'Zoom: scroll | Pan: middle-drag | Ctrl: snap off' })}</span>
            )}
          </div>
        </div>
        <div className="viewport-corner bottom-right">
          <div className="viewport-controls">
            {show3D && (
              <>
                <button className="viewport-control-btn" onClick={zoomIn} title={t('viewport.zoomInWithShortcut', { defaultValue: 'Zoom In (+)' })}>
                  <ZoomIn size={14} />
                </button>
                <button className="viewport-control-btn" onClick={zoomOut} title={t('viewport.zoomOutWithShortcut', { defaultValue: 'Zoom Out (-)' })}>
                  <ZoomOut size={14} />
                </button>
                <button
                  className="viewport-control-btn"
                  onClick={zoomToFit}
                  title={t('viewport.zoomToFitWithShortcut', { defaultValue: 'Zoom to Fit (0)' })}
                >
                  <Maximize size={14} />
                </button>
                <button
                  className={`viewport-control-btn ${sectionBox ? 'active' : ''}`}
                  onClick={() => setSectionBox(!sectionBox)}
                  title={t('viewport.sectionBox', { defaultValue: 'Section Box' })}
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
