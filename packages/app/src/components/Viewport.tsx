import { useViewport } from '../hooks/useViewport';

interface ViewportProps {
  viewType?: 'floor-plan' | '3d' | 'section';
}

export function Viewport({ viewType = '3d' }: ViewportProps) {
  const { canvasRef, containerRef, handleCanvasClick } = useViewport();

  return (
    <div ref={containerRef} className="viewport-container">
      <canvas ref={canvasRef} className="viewport-canvas" onClick={handleCanvasClick} />
      <div className="viewport-overlay">
        <div className="viewport-corner top-left">
          <span>
            {viewType === 'floor-plan'
              ? 'Floor Plan'
              : viewType === 'section'
                ? 'Section'
                : '3D View'}
          </span>
        </div>
        <div className="viewport-corner top-right">
          <span>1:100</span>
        </div>
      </div>
    </div>
  );
}
