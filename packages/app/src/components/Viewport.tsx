import { useState } from 'react';
import { useViewport } from '../hooks/useViewport';
import { useThreeViewport } from '../hooks/useThreeViewport';

interface ViewportProps {
  viewType?: 'floor-plan' | '3d' | 'section';
}

export function Viewport({ viewType = '3d' }: ViewportProps) {
  const [show3D, setShow3D] = useState(viewType === '3d');
  const { canvasRef, containerRef, handleCanvasClick } = useViewport();
  const { containerRef: threeContainerRef } = useThreeViewport();

  const toggleView = () => setShow3D(!show3D);

  return (
    <div className="viewport-container">
      {show3D ? (
        <div
          ref={threeContainerRef}
          className="viewport-canvas"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <canvas ref={canvasRef} className="viewport-canvas" onClick={handleCanvasClick} />
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
        </div>
        <div className="viewport-corner top-right">
          <button className="view-toggle" onClick={toggleView}>
            {show3D ? '2D' : '3D'}
          </button>
        </div>
      </div>
    </div>
  );
}
