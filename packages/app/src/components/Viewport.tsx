import React from 'react';
import { useViewport } from '../hooks/useViewport';

export function Viewport() {
  const { canvasRef, containerRef, handleCanvasClick } = useViewport();

  return (
    <div ref={containerRef} className="viewport-container">
      <canvas ref={canvasRef} className="viewport-canvas" onClick={handleCanvasClick} />
      <div className="viewport-overlay">
        <div className="viewport-corner top-left">
          <span>Front</span>
        </div>
        <div className="viewport-corner top-right">
          <span>3D</span>
        </div>
        <div className="viewport-corner bottom-left">
          <span>1:100</span>
        </div>
      </div>
    </div>
  );
}
