import React, { useCallback, useRef, useState } from 'react';

interface PanelResizerProps {
  /** The panel element to resize — passed as a ref */
  panelRef: React.RefObject<HTMLElement | null>;
  /** Which edge of the panel this resizer is on */
  side: 'left' | 'right';
  minWidth?: number;
  maxWidth?: number;
}

/**
 * A 4px drag handle that resizes an adjacent panel by tracking mouse delta.
 * Drop it immediately after (side='right') or before (side='left') the panel element.
 */
export function PanelResizer({ panelRef, side, minWidth = 160, maxWidth = 600 }: PanelResizerProps) {
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;

    startX.current = e.clientX;
    startWidth.current = panel.getBoundingClientRect().width;
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX.current;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidth.current + (side === 'right' ? delta : -delta))
      );
      panel.style.width = `${newWidth}px`;
      panel.style.minWidth = `${newWidth}px`;
    };

    const onUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelRef, side, minWidth, maxWidth]);

  return (
    <div
      className={`panel-resizer${dragging ? ' dragging' : ''}${side === 'right' ? ' panel-resizer--right' : ''}`}
      onMouseDown={onMouseDown}
      title="Drag to resize panel"
    />
  );
}
