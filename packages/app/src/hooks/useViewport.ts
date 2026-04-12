import { useEffect, useRef, useCallback } from 'react';
import { useDocumentStore } from '../stores/documentStore';

export function useViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { document: doc, selectedIds, setSelectedIds, activeTool } = useDocumentStore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#666688';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!doc) return;

    const elements = Object.values(doc.elements);
    for (const element of elements) {
      const isSelected = selectedIds.includes(element.id);
      const color = isSelected ? '#4f46e5' : '#8888aa';

      ctx.strokeStyle = color;
      ctx.fillStyle = isSelected ? 'rgba(79, 70, 229, 0.2)' : 'rgba(136, 136, 170, 0.1)';
      ctx.lineWidth = isSelected ? 2 : 1;

      const bb = element.boundingBox;
      const x = (bb.min.x + 5000) / 20 + width / 2;
      const y = (bb.min.y + 5000) / 20 + height / 2;
      const w = (bb.max.x - bb.min.x) / 20;
      const h = (bb.max.y - bb.min.y) / 20;

      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.stroke();

      if (element.type === 'wall') {
        ctx.fillStyle = color;
        ctx.font = '10px sans-serif';
        const name = (element.properties.Name?.value as string) || 'Wall';
        ctx.fillText(name, x + 4, y + 12);
      }
    }
  }, [doc, selectedIds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        draw();
      }
    });

    resizeObserver.observe(container);
    draw();

    return () => resizeObserver.disconnect();
  }, [draw]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !doc) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const worldX = (x - canvas.width / 2) * 20 - 5000;
      const worldY = (y - canvas.height / 2) * 20 - 5000;

      const elements = Object.values(doc.elements);
      const clicked = elements.filter((element) => {
        const bb = element.boundingBox;
        return worldX >= bb.min.x && worldX <= bb.max.x && worldY >= bb.min.y && worldY <= bb.max.y;
      });

      if (clicked.length > 0) {
        if (event.shiftKey) {
          setSelectedIds([...selectedIds, clicked[0].id]);
        } else {
          setSelectedIds([clicked[0].id]);
        }
      } else {
        setSelectedIds([]);
      }
    },
    [doc, selectedIds, setSelectedIds]
  );

  return {
    canvasRef,
    containerRef,
    handleCanvasClick,
    activeTool,
  };
}
