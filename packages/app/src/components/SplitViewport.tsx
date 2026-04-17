import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Columns, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';
import { useViewport } from '../hooks/useViewport';
import { useThreeViewport } from '../hooks/useThreeViewport';
import { ContextMenu } from './contextMenu/ContextMenu';
import { useDocumentStore } from '../stores/documentStore';

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
      />
      <div className="viewport-corner bottom-left">
        <span className="viewport-info">Draw: drag · Pan: middle-drag · Zoom: scroll</span>
      </div>
    </div>
  );
}

// ─── 3D / Section pane ────────────────────────────────────────────────────────
// Always mounted so the Three.js scene persists across view switches.
// `viewType` drives camera preset changes only — component never remounts.

interface ThreeDViewProps {
  viewType: 'floor-plan' | '3d' | 'section';
  label: string;
}

function ThreeDView({ viewType, label }: ThreeDViewProps) {
  const {
    containerRef, setViewPreset, zoomIn, zoomOut, zoomToFit, getCameraTarget,
    setSectionBox, sectionPosition, setSectionPosition, sectionDirection, setSectionDirection,
  } = useThreeViewport();

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
      // Default cut at camera target — put the slice through the model centre
      const t = getCameraTarget();
      setSectionPosition(Math.round(t.z));
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
      </div>

      {/* Section cut controls — visible only in section view */}
      {viewType === 'section' && (
        <div style={{
          position: 'absolute', bottom: 32, left: 12, right: 12, zIndex: 10,
          background: 'var(--panel-bg, rgba(20,20,40,0.82))',
          borderRadius: 6, padding: '8px 10px',
        }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
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
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, opacity: 0.6, alignSelf: 'center' }}>
              {Math.round(sectionPosition)} mm
            </span>
          </div>
          <input
            type="range"
            min={-20000}
            max={20000}
            step={100}
            value={sectionPosition}
            onChange={(e) => setSectionPosition(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
      )}

      <div className="viewport-corner bottom-left" style={{ zIndex: 5, pointerEvents: 'none' }}>
        <span className="viewport-info">
          {viewType === 'section'
            ? 'Section: drag slider to move cut plane · Orbit: drag · Zoom: scroll'
            : 'Orbit: drag · Pan: middle-drag · Zoom: scroll · Fit: 0'}
        </span>
      </div>
    </div>
  );
}

// ─── SplitViewport ────────────────────────────────────────────────────────────

interface SplitViewportProps {
  viewType: 'floor-plan' | '3d' | 'section';
}

// ─── Floor Plan pane ──────────────────────────────────────────────────────────

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
        <ThreeDView viewType={viewType} label={threeLabel} />
      </div>

      {/* ── Split toggle ── */}
      <button
        className={`viewport-control-btn split-toggle${isSplit ? ' active' : ''}`}
        title="Split view: floor plan + 3D"
        onClick={() => setIsSplit((v) => !v)}
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 30 }}
      >
        <Columns size={14} />
      </button>
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
