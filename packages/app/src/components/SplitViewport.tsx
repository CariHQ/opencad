import React, { useState, useRef, useCallback } from 'react';
import { Columns } from 'lucide-react';
import { useViewport } from '../hooks/useViewport';
import { useThreeViewport } from '../hooks/useThreeViewport';

interface ViewportPaneProps {
  label: string;
  children: React.ReactNode;
}

function ViewportPane({ label, children }: ViewportPaneProps) {
  return (
    <div className="viewport-pane" data-testid="viewport-pane" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="viewport-corner top-left" style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, pointerEvents: 'none' }}>
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function FloorPlanPane() {
  const { canvasRef, containerRef, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, handleCanvasDoubleClick } = useViewport();
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        className="viewport-canvas"
        style={{ width: '100%', height: '100%' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
      />
    </div>
  );
}

function ThreeDPane() {
  const { containerRef } = useThreeViewport();
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  );
}

interface SplitViewportProps {
  viewType?: 'floor-plan' | '3d' | 'section';
}

export function SplitViewport({ viewType = '3d' }: SplitViewportProps) {
  const [isSplit, setIsSplit] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const label = viewType === 'floor-plan' ? 'Floor Plan' : viewType === 'section' ? 'Section' : '3D View';

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0.2, Math.min(0.8, (ev.clientX - rect.left) / rect.width));
      setSplitRatio(ratio);
    };

    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div ref={containerRef} className="split-viewport-container" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
      {/* Split toggle button */}
      <button
        className={`viewport-control-btn split-toggle ${isSplit ? 'active' : ''}`}
        title="Split view"
        onClick={() => setIsSplit((v) => !v)}
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
      >
        <Columns size={14} />
      </button>

      {isSplit ? (
        <>
          <div style={{ width: `${splitRatio * 100}%`, height: '100%' }}>
            <ViewportPane label="Floor Plan">
              <FloorPlanPane />
            </ViewportPane>
          </div>

          <div
            data-testid="split-divider"
            style={{ width: 4, height: '100%', cursor: 'col-resize', background: 'var(--border-color, #333)', flexShrink: 0 }}
            onMouseDown={handleDividerMouseDown}
          />

          <div style={{ flex: 1, height: '100%' }}>
            <ViewportPane label="3D View">
              <ThreeDPane />
            </ViewportPane>
          </div>
        </>
      ) : (
        <ViewportPane label={label}>
          {viewType === '3d' ? <ThreeDPane /> : <FloorPlanPane />}
        </ViewportPane>
      )}
    </div>
  );
}
