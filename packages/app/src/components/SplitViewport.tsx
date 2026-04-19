import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Square, Columns, LayoutGrid, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';
import { useViewport } from '../hooks/useViewport';
import { useThreeViewport } from '../hooks/useThreeViewport';
import { ContextMenu } from './contextMenu/ContextMenu';
import { useDocumentStore } from '../stores/documentStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type LayoutMode = 'single' | 'split' | 'quad';

interface PaneDefinition {
  type: 'floor-plan' | '3d' | 'section';
  label: string;
}

interface SplitViewportProps {
  viewType: 'floor-plan' | '3d' | 'section';
}

// ─── Floor Plan pane ──────────────────────────────────────────────────────────

interface FloorPlanCanvasProps {
  isViewOnly?: boolean;
}

function FloorPlanCanvas({ isViewOnly = false }: FloorPlanCanvasProps) {
  const {
    canvasRef,
    containerRef,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasDoubleClick,
  } = useViewport();

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onMouseDown={isViewOnly ? undefined : handleCanvasMouseDown}
        onMouseMove={isViewOnly ? undefined : handleCanvasMouseMove}
        onMouseUp={isViewOnly ? undefined : handleCanvasMouseUp}
        onMouseLeave={isViewOnly ? undefined : handleCanvasMouseUp}
        onDoubleClick={isViewOnly ? undefined : handleCanvasDoubleClick}
      />
      <div className="viewport-corner bottom-left">
        <span className="viewport-info">
          {isViewOnly ? 'View only' : 'Draw: drag · Pan: middle-drag · Zoom: scroll'}
        </span>
      </div>
    </div>
  );
}

// ─── 3D / Section pane ────────────────────────────────────────────────────────

interface ThreeDViewProps {
  viewType: 'floor-plan' | '3d' | 'section';
  label: string;
  isViewOnly?: boolean;
}

function ThreeDView({ viewType, label, isViewOnly = false }: ThreeDViewProps) {
  const {
    containerRef, setViewPreset, zoomIn, zoomOut, zoomToFit,
    setSectionBox, sectionPosition, setSectionPosition, sectionDirection, setSectionDirection,
    contextMenuState, closeContextMenu,
  } = useThreeViewport({ isViewOnly });
  const { setActiveTool, deleteElement, setSelectedIds, selectedIds } = useDocumentStore();

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
      // Default the horizontal cut to mid-wall height (~1.5 m) so a typical
      // building shows an interior cutaway rather than being fully clipped.
      setSectionPosition(1500);
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

      {/* Camera preset + zoom controls (always top-right) */}
      {!isViewOnly && (
        <div className="viewport-corner top-right" style={{ zIndex: 5, display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* View presets — hidden in section view */}
          {viewType !== 'section' && (
            <>
              <button className="viewport-control-btn" onClick={() => setViewPreset('top')}   title="Top view (1)">T</button>
              <button className="viewport-control-btn" onClick={() => setViewPreset('front')} title="Front view (2)">F</button>
              <button className="viewport-control-btn" onClick={() => setViewPreset('right')} title="Right view (3)">R</button>
              <button className="viewport-control-btn" onClick={() => setViewPreset('3d')}    title="Perspective (4)">3D</button>
              <span className="viewport-control-sep" />
            </>
          )}
          <button className="viewport-control-btn" onClick={zoomToFit}                       title="Zoom to fit (0)"><Maximize  size={12} /></button>
          <button className="viewport-control-btn" onClick={zoomIn}                          title="Zoom in (+)"><ZoomIn    size={12} /></button>
          <button className="viewport-control-btn" onClick={zoomOut}                         title="Zoom out (-)"><ZoomOut   size={12} /></button>
          <button className="viewport-control-btn" onClick={() => zoomToFitRef.current()}    title="Reset camera"><RotateCcw size={12} /></button>
          {/* Section axis selector — shown only in section view, right of zoom buttons */}
          {viewType === 'section' && (
            <>
              <span className="viewport-control-sep" />
              {(['x', 'z', 'y'] as const).map((dir) => (
                <button
                  key={dir}
                  className={`viewport-control-btn${sectionDirection === dir ? ' active' : ''}`}
                  onClick={() => setSectionDirection(dir)}
                  title={`Cut along ${dir.toUpperCase()} axis`}
                >
                  {dir.toUpperCase()}
                </button>
              ))}
              <span className="section-cut-pos">{Math.round(sectionPosition)} mm</span>
            </>
          )}
        </div>
      )}

      {/* Section slider — slim bar at bottom, full width, no header row */}
      {viewType === 'section' && !isViewOnly && (
        <div className="section-cut-bar">
          <input
            className="section-cut-slider"
            type="range"
            min={-20000}
            max={20000}
            step={100}
            value={sectionPosition}
            onChange={(e) => setSectionPosition(Number(e.target.value))}
            title="Drag to move the section cut plane"
          />
        </div>
      )}

      <div className="viewport-corner bottom-left" style={{ zIndex: 5, pointerEvents: 'none' }}>
        <span className="viewport-info">
          {isViewOnly
            ? 'View only'
            : viewType === 'section'
              ? 'Section: drag slider · Orbit: drag · Pan: middle-drag · Zoom: scroll/pinch'
              : 'Orbit: drag · Pan: middle/right-drag · Zoom: scroll/pinch · Arrows: pan · Fit: 0'}
        </span>
      </div>

      {/* Context menu — shown on right-click */}
      {contextMenuState && (
        <ContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          viewportW={window.innerWidth}
          viewportH={window.innerHeight}
          items={contextMenuState.items}
          onClose={closeContextMenu}
          onAction={(action) => {
            closeContextMenu();
            if (action === 'delete') {
              selectedIds.forEach((id) => deleteElement(id));
              setSelectedIds([]);
            } else if (action === 'select') {
              setActiveTool('select');
            } else if (action === 'deselect') {
              setSelectedIds([]);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Pane renderer ───────────────────────────────────────────────────────────

interface ViewPaneProps {
  pane: PaneDefinition;
  isViewOnly: boolean;
}

function ViewPane({ pane, isViewOnly }: ViewPaneProps) {
  if (pane.type === 'floor-plan') {
    return <FloorPlanCanvas isViewOnly={isViewOnly} />;
  }
  return <ThreeDView viewType={pane.type} label={pane.label} isViewOnly={isViewOnly} />;
}

// ─── Pane definitions per layout ─────────────────────────────────────────────

function getPanes(layout: LayoutMode, viewType: SplitViewportProps['viewType']): PaneDefinition[] {
  switch (layout) {
    case 'single':
      return [{ type: viewType, label: viewType === 'section' ? 'Section' : viewType === '3d' ? '3D View' : 'Floor Plan' }];
    case 'split':
      return [
        { type: 'floor-plan', label: '2D' },
        { type: '3d', label: '3D' },
      ];
    case 'quad':
      return [
        { type: 'floor-plan', label: 'Floor Plan' },
        { type: '3d', label: '3D View' },
        { type: 'section', label: 'Section' },
        { type: '3d', label: 'Perspective' },
      ];
  }
}

// ─── CSS grid style per layout ────────────────────────────────────────────────

function getGridStyle(layout: LayoutMode): React.CSSProperties {
  switch (layout) {
    case 'single':
      return { gridTemplateColumns: '1fr' };
    case 'split':
      return { gridTemplateColumns: '1fr 1fr' };
    case 'quad':
      return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
  }
}

// ─── SplitViewport ────────────────────────────────────────────────────────────

export function SplitViewport({ viewType = '3d' }: SplitViewportProps) {
  const [layout, setLayout] = useState<LayoutMode>('single');
  const [activePane, setActivePane] = useState<number>(0);

  const panes = getPanes(layout, viewType);

  const handleLayoutChange = useCallback((newLayout: LayoutMode) => {
    setLayout(newLayout);
    setActivePane(0);
  }, []);

  const handlePaneClick = useCallback((index: number) => {
    setActivePane(index);
  }, []);

  return (
    <div className="split-viewport-container">
      {/* ── Layout picker toolbar ── */}
      <div className="split-viewport-layout-picker" data-testid="split-viewport-layout-picker">
        <button
          className={`viewport-control-btn${layout === 'single' ? ' active' : ''}`}
          title="Single view"
          onClick={() => handleLayoutChange('single')}
        >
          <Square size={14} />
        </button>
        <button
          className={`viewport-control-btn${layout === 'split' ? ' active' : ''}`}
          title="2-up split view"
          onClick={() => handleLayoutChange('split')}
        >
          <Columns size={14} />
        </button>
        <button
          className={`viewport-control-btn${layout === 'quad' ? ' active' : ''}`}
          title="4-up quad view"
          onClick={() => handleLayoutChange('quad')}
        >
          <LayoutGrid size={14} />
        </button>
      </div>

      {/* ── Viewport grid ── */}
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          ...getGridStyle(layout),
        }}
      >
        {panes.map((pane, index) => {
          const isActive = index === activePane;
          const isViewOnly = !isActive;
          // Include pane.type in the key so React cleanly remounts when the
          // view type changes (prevents stale section state from flashing).
          // For quad layout two panes share type '3d', so keep the index there.
          const paneKey = layout === 'single' ? pane.type : `${layout}-${pane.type}-${index}`;

          return (
            <div
              key={paneKey}
              data-testid="split-viewport-pane"
              data-view-only={String(isViewOnly)}
              className={`split-viewport-pane${isActive ? ' split-viewport-pane--active' : ''}`}
              onClick={() => handlePaneClick(index)}
            >
              <ViewPane pane={pane} isViewOnly={isViewOnly} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
