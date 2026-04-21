import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Columns, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';
import { useViewport } from '../hooks/useViewport';
import { useThreeViewport } from '../hooks/useThreeViewport';
import { useDocumentStore } from '../stores/documentStore';
import { ContextMenu } from './contextMenu/ContextMenu';
import {
  getContextMenuItems,
  type ContextMenuGroup,
  type ElementContext,
} from './contextMenu/contextMenuItems';

// ─── Floor Plan pane ──────────────────────────────────────────────────────────
// Always mounted — CSS visibility controls show/hide so canvas state is never lost.

function FloorPlanCanvas() {
  const {
    canvasRef,
    containerRef,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasDoubleClick,
  } = useViewport();

  const { selectedIds, setActiveTool, undo, redo } = useDocumentStore();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuGroup;
  } | null>(null);

  const onContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const ctx: ElementContext =
        selectedIds.length > 1 ? 'multi'
        : selectedIds.length === 1 ? 'wall'
        : 'empty';
      setMenu({ x: e.clientX, y: e.clientY, items: getContextMenuItems('2d', ctx) });
    },
    [selectedIds],
  );

  const onAction = useCallback(
    (actionId: string) => {
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
      if (actionId === 'undo') { undo(); return; }
      if (actionId === 'redo') { redo(); return; }
      if (actionId === 'select-all') {
        const st = useDocumentStore.getState();
        const ids = Object.keys(st.document?.content.elements ?? {});
        st.setSelectedIds(ids);
        return;
      }
    },
    [setActiveTool, undo, redo],
  );

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={onContextMenu}
      />
      <div className="viewport-corner bottom-left">
        <span className="viewport-info">Draw: drag · Pan: middle-drag · Zoom: scroll</span>
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          viewportW={window.innerWidth}
          viewportH={window.innerHeight}
          items={menu.items}
          onAction={onAction}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

// ─── 3D / Section pane ────────────────────────────────────────────────────────
// Always mounted so the Three.js scene persists across view switches.
// `viewType` drives camera preset changes only — component never remounts.

interface ThreeDViewProps {
  viewType: 'floor-plan' | '3d' | 'section';
  label: string;
  isSplit: boolean;
  onToggleSplit: () => void;
}

function ThreeDView({ viewType, label, isSplit, onToggleSplit }: ThreeDViewProps) {
  const {
    containerRef, setViewPreset, zoomIn, zoomOut, zoomToFit, getCameraTarget,
    setSectionBox, sectionPosition, setSectionPosition, sectionDirection, setSectionDirection,
    sceneBounds, contextMenuState, closeContextMenu,
  } = useThreeViewport();

  // Derive the slider range from the actual scene bounds for the current
  // axis. Falls back to ±20,000 mm when no document is loaded.
  const axisBounds = useMemo(() => {
    if (!sceneBounds) return { min: -20000, max: 20000 };
    const key = sectionDirection;
    const pad = 500;
    return {
      min: Math.floor(sceneBounds.min[key] - pad),
      max: Math.ceil(sceneBounds.max[key] + pad),
    };
  }, [sceneBounds, sectionDirection]);

  const zoomToFitRef = useRef(zoomToFit);
  zoomToFitRef.current = zoomToFit;

  // On first mount: wait two rAF ticks then zoom to fit
  useEffect(() => {
    let r2: number;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => { zoomToFitRef.current(); }); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Activate / deactivate section clipping when viewType changes
  useEffect(() => {
    if (viewType === 'section') {
      setSectionBox(true);
      // Default cut through the model's midpoint along the current axis so
      // the slider starts somewhere inside the model, not at z=0 which is
      // usually ground level.
      if (sceneBounds) {
        const key = sectionDirection;
        const mid = (sceneBounds.min[key] + sceneBounds.max[key]) / 2;
        setSectionPosition(Math.round(mid));
      } else {
        const t = getCameraTarget();
        setSectionPosition(Math.round(t.z));
      }
    } else {
      setSectionBox(false);
    }
  }, [viewType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Camera transitions on view-mode change
  const prevRef = useRef<typeof viewType>(viewType);
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = viewType;
    if (prev === viewType) return;
    if (viewType === 'section') setViewPreset('right');
    else if (viewType === '3d')  zoomToFitRef.current();
  }, [viewType, setViewPreset]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div className="viewport-corner top-left" style={{ zIndex: 5, pointerEvents: 'none' }}>{label}</div>

      {/* Camera preset + zoom controls */}
      <div className="viewport-corner top-right" style={{ zIndex: 5, display: 'flex', gap: 4 }}>
        {viewType !== 'section' && (
          <>
            <button className="viewport-control-btn" onClick={() => setViewPreset('top')}   title="Top view (1)">T</button>
            <button className="viewport-control-btn" onClick={() => setViewPreset('front')} title="Front view (2)">F</button>
            <button className="viewport-control-btn" onClick={() => setViewPreset('right')} title="Right view (3)">R</button>
            <button className="viewport-control-btn" onClick={() => setViewPreset('3d')}    title="Perspective (4)">3D</button>
          </>
        )}
        <button className="viewport-control-btn" onClick={zoomToFit}                       title="Zoom to fit (0)"><Maximize  size={12} /></button>
        <button className="viewport-control-btn" onClick={zoomIn}                          title="Zoom in (+)"><ZoomIn    size={12} /></button>
        <button className="viewport-control-btn" onClick={zoomOut}                         title="Zoom out (-)"><ZoomOut   size={12} /></button>
        <button className="viewport-control-btn" onClick={() => zoomToFitRef.current()}    title="Reset camera"><RotateCcw size={12} /></button>
        <button
          className={`viewport-control-btn${isSplit ? ' active' : ''}`}
          title="Split view: floor plan + 3D"
          onClick={onToggleSplit}
        >
          <Columns size={12} />
        </button>
      </div>

      {/* Section cut controls — visible only in section view */}
      {viewType === 'section' && (
        <div className="section-cut-overlay" role="group" aria-label="Section cut controls">
          <div className="section-cut-row">
            <div className="section-cut-axis" role="radiogroup" aria-label="Cut axis">
              {(['x', 'z', 'y'] as const).map((dir) => (
                <button
                  key={dir}
                  className={`section-cut-axis-btn${sectionDirection === dir ? ' active' : ''}`}
                  onClick={() => setSectionDirection(dir)}
                  title={`Cut along ${dir.toUpperCase()} axis`}
                  aria-pressed={sectionDirection === dir}
                >
                  {dir.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="section-cut-label">Position</div>
            <div className="section-cut-value">{Math.round(sectionPosition)} mm</div>
          </div>
          <input
            className="section-cut-slider"
            type="range"
            min={axisBounds.min}
            max={axisBounds.max}
            step={Math.max(10, Math.round((axisBounds.max - axisBounds.min) / 500))}
            value={sectionPosition}
            onChange={(e) => setSectionPosition(Number(e.target.value))}
            aria-label="Cut plane position"
          />
          <div className="section-cut-hint">
            Slider moves the cut plane · Drag to orbit · Shift+drag to pan · Scroll to zoom
          </div>
        </div>
      )}

      {viewType !== 'section' && (
        <div className="viewport-corner bottom-left" style={{ zIndex: 5, pointerEvents: 'none' }}>
          <span className="viewport-info">
            Orbit drag · Two-finger pan · Pinch/Ctrl-scroll zoom · Arrows orbit · Shift+Arrows pan · Alt fine · 0 fit · 1/2/3/4 views
          </span>
        </div>
      )}

      {contextMenuState && (
        <ContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          viewportW={window.innerWidth}
          viewportH={window.innerHeight}
          items={contextMenuState.items}
          onAction={closeContextMenu}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

// ─── SplitViewport ────────────────────────────────────────────────────────────

interface SplitViewportProps {
  viewType?: 'floor-plan' | '3d' | 'section';
}

export function SplitViewport({ viewType = '3d' }: SplitViewportProps) {
  const [isSplit, setIsSplit] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitRatio(Math.max(0.2, Math.min(0.8, (ev.clientX - rect.left) / rect.width)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // Pane visibility: always mounted, only CSS visibility/pointer-events change.
  // This keeps Three.js alive and prevents canvas re-initialization on view switch.
  const floorVisible = isSplit || viewType === 'floor-plan';
  const threeVisible = isSplit || viewType === '3d' || viewType === 'section';

  const threeLabel = isSplit
    ? '3D View'
    : viewType === 'section'
      ? 'Section'
      : '3D View';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* ── Floor Plan layer ── always mounted; CSS-hidden when inactive */}
      <div
        data-testid={floorVisible ? 'viewport-pane' : undefined}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: isSplit ? `calc(${splitRatio * 100}% - 2px)` : '100%',
          height: '100%',
          visibility: floorVisible ? 'visible' : 'hidden',
          pointerEvents: floorVisible ? 'auto' : 'none',
          zIndex: floorVisible ? 1 : 0,
        }}
      >
        {isSplit && (
          <div className="viewport-corner top-left" style={{ zIndex: 5, pointerEvents: 'none' }}>Floor Plan</div>
        )}
        <FloorPlanCanvas />
      </div>

      {/* ── Split divider ── */}
      {isSplit && (
        <div
          data-testid="split-divider"
          style={{
            position: 'absolute',
            left: `${splitRatio * 100}%`,
            top: 0,
            width: 4,
            height: '100%',
            cursor: 'col-resize',
            background: 'var(--border-color, #334)',
            zIndex: 20,
          }}
          onMouseDown={handleDividerMouseDown}
        />
      )}

      {/* ── 3D / Section layer ── always mounted; CSS-hidden when inactive */}
      <div
        data-testid={threeVisible ? 'viewport-pane' : undefined}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: isSplit ? `calc(${(1 - splitRatio) * 100}% - 2px)` : '100%',
          height: '100%',
          visibility: threeVisible ? 'visible' : 'hidden',
          pointerEvents: threeVisible ? 'auto' : 'none',
          zIndex: threeVisible ? 1 : 0,
        }}
      >
        <ThreeDView
          viewType={viewType}
          label={threeLabel}
          isSplit={isSplit}
          onToggleSplit={() => setIsSplit((v) => !v)}
        />
      </div>
    </div>
  );
}
