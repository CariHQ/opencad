import { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';

const getStoreActions = () => useDocumentStore.getState();

interface Point {
  x: number;
  y: number;
}

interface DrawingState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  points: Point[];
}

interface SnapResult {
  point: Point;
  type: 'endpoint' | 'midpoint' | 'intersection' | 'center' | 'grid';
}

const GRID_SIZE = 500;
const SNAP_TOLERANCE = 15;
const SCALE = 20;
const OFFSET = 5000;

function screenToWorld(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return {
    x: (screenX - canvasWidth / 2) * SCALE - OFFSET,
    y: (screenY - canvasHeight / 2) * SCALE - OFFSET,
  };
}

function worldToScreen(
  worldX: number,
  worldY: number,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return {
    x: (worldX + OFFSET) / SCALE + canvasWidth / 2,
    y: (worldY + OFFSET) / SCALE + canvasHeight / 2,
  };
}

function snapToGrid(point: Point, gridSize: number = GRID_SIZE): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function findSnapPoints(
  elements: any[],
  currentPoint: Point,
  tolerance: number = SNAP_TOLERANCE
): SnapResult[] {
  const snaps: SnapResult[] = [];

  for (const element of elements) {
    const bb = element.boundingBox;
    const corners: Point[] = [
      { x: bb.min.x, y: bb.min.y },
      { x: bb.max.x, y: bb.min.y },
      { x: bb.min.x, y: bb.max.y },
      { x: bb.max.x, y: bb.max.y },
    ];

    for (const corner of corners) {
      if (distance(corner, currentPoint) < tolerance * SCALE) {
        snaps.push({ point: corner, type: 'endpoint' });
      }
    }

    const midX = (bb.min.x + bb.max.x) / 2;
    const midY = (bb.min.y + bb.max.y) / 2;
    const midpoints = [
      { x: midX, y: bb.min.y },
      { x: midX, y: bb.max.y },
      { x: bb.min.x, y: midY },
      { x: bb.max.x, y: midY },
    ];

    for (const mp of midpoints) {
      if (distance(mp, currentPoint) < tolerance * SCALE) {
        snaps.push({ point: mp, type: 'midpoint' });
      }
    }
  }

  return snaps;
}

export function useViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    document: doc,
    selectedIds,
    setSelectedIds,
    activeTool,
    addElement,
    setActiveTool,
  } = useDocumentStore();

  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    points: [],
  });

  const [snapEnabled, setSnapEnabled] = useState(true);
  const [currentSnap, setCurrentSnap] = useState<SnapResult | null>(null);

  const applySnapping = useCallback(
    (point: Point): Point => {
      if (!doc || !snapEnabled) return point;

      const elements = Object.values(doc.elements);
      const snaps = findSnapPoints(elements, point);

      if (snaps.length > 0) {
        const closest = snaps.reduce((a, b) =>
          distance(point, a.point) < distance(point, b.point) ? a : b
        );
        setCurrentSnap(closest);
        return closest.point;
      }

      const snapped = snapToGrid(point);
      if (distance(point, snapped) < SNAP_TOLERANCE * SCALE) {
        setCurrentSnap({ point: snapped, type: 'grid' });
        return snapped;
      }

      setCurrentSnap(null);
      return point;
    },
    [doc, snapEnabled]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#3a3a4e';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!doc) return;

    const elements = Object.values(doc.elements);
    for (const element of elements) {
      const isSelected = selectedIds.includes(element.id);
      const color = isSelected ? '#4f46e5' : '#8888aa';

      ctx.strokeStyle = color;
      ctx.fillStyle = isSelected ? 'rgba(79, 70, 229, 0.2)' : 'rgba(136, 136, 170, 0.1)';
      ctx.lineWidth = isSelected ? 2 : 1;

      const bb = element.boundingBox;
      const x = (bb.min.x + OFFSET) / SCALE + width / 2;
      const y = (bb.min.y + OFFSET) / SCALE + height / 2;
      const w = (bb.max.x - bb.min.x) / SCALE;
      const h = (bb.max.y - bb.min.y) / SCALE;

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

    if (drawingState.isDrawing && drawingState.startPoint) {
      const startScreen = worldToScreen(
        drawingState.startPoint.x,
        drawingState.startPoint.y,
        width,
        height
      );

      if (activeTool === 'select') return;

      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      if (activeTool === 'wall' && drawingState.currentPoint) {
        const currentScreen = worldToScreen(
          drawingState.currentPoint.x,
          drawingState.currentPoint.y,
          width,
          height
        );

        const x = Math.min(startScreen.x, currentScreen.x);
        const y = Math.min(startScreen.y, currentScreen.y);
        const w = Math.abs(currentScreen.x - startScreen.x);
        const h = Math.abs(currentScreen.y - startScreen.y);

        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.stroke();

        const dimX = (drawingState.currentPoint.x - drawingState.startPoint.x) / SCALE;
        const dimY = (drawingState.currentPoint.y - drawingState.startPoint.y) / SCALE;
        ctx.font = '11px sans-serif';
        ctx.fillText(`${Math.round(dimX)} x ${Math.round(dimY)}`, x + 4, y - 8);
      }

      if (activeTool === 'dimension' && drawingState.currentPoint) {
        const currentScreen = worldToScreen(
          drawingState.currentPoint.x,
          drawingState.currentPoint.y,
          width,
          height
        );

        ctx.beginPath();
        ctx.moveTo(startScreen.x, startScreen.y);
        ctx.lineTo(currentScreen.x, currentScreen.y);
        ctx.stroke();

        const dist = distance(drawingState.startPoint, drawingState.currentPoint) / SCALE;
        ctx.fillText(
          `${Math.round(dist)}`,
          (startScreen.x + currentScreen.x) / 2 + 4,
          (startScreen.y + currentScreen.y) / 2 - 8
        );
      }

      ctx.setLineDash([]);
    }

    if (drawingState.points.length > 0) {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      let prevScreen = worldToScreen(
        drawingState.points[0].x,
        drawingState.points[0].y,
        width,
        height
      );

      for (let i = 1; i < drawingState.points.length; i++) {
        const screen = worldToScreen(
          drawingState.points[i].x,
          drawingState.points[i].y,
          width,
          height
        );
        ctx.beginPath();
        ctx.moveTo(prevScreen.x, prevScreen.y);
        ctx.lineTo(screen.x, screen.y);
        ctx.stroke();
        prevScreen = screen;
      }

      if (drawingState.currentPoint) {
        const currentScreen = worldToScreen(
          drawingState.currentPoint.x,
          drawingState.currentPoint.y,
          width,
          height
        );
        ctx.beginPath();
        ctx.moveTo(prevScreen.x, prevScreen.y);
        ctx.lineTo(currentScreen.x, currentScreen.y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    if (currentSnap) {
      const snapScreen = worldToScreen(currentSnap.point.x, currentSnap.point.y, width, height);
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.arc(snapScreen.x, snapScreen.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [doc, selectedIds, drawingState, activeTool, currentSnap, snapEnabled]);

  useEffect(() => {
    draw();
  }, [doc]);

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

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;

      let worldPoint = screenToWorld(screenX, screenY, canvas.width, canvas.height);
      worldPoint = applySnapping(worldPoint);

      if (activeTool === 'select') {
        if (!doc) return;
        const elements = Object.values(doc.elements);
        const clicked = elements.filter((element) => {
          const bb = element.boundingBox;
          return (
            worldPoint.x >= bb.min.x &&
            worldPoint.x <= bb.max.x &&
            worldPoint.y >= bb.min.y &&
            worldPoint.y <= bb.max.y
          );
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
        return;
      }

      if (activeTool === 'wall' || activeTool === 'dimension') {
        setDrawingState({
          isDrawing: true,
          startPoint: worldPoint,
          currentPoint: worldPoint,
          points: [],
        });
      }

      if (activeTool === 'line') {
        setDrawingState((prev) => ({
          ...prev,
          isDrawing: true,
          points: [...prev.points, worldPoint],
          currentPoint: worldPoint,
        }));
      }
    },
    [doc, selectedIds, setSelectedIds, activeTool, applySnapping]
  );

  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !drawingState.isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;

      let worldPoint = screenToWorld(screenX, screenY, canvas.width, canvas.height);
      worldPoint = applySnapping(worldPoint);

      if (activeTool === 'wall' || activeTool === 'dimension') {
        setDrawingState((prev) => ({
          ...prev,
          currentPoint: worldPoint,
        }));
      }

      if (activeTool === 'line') {
        setDrawingState((prev) => ({
          ...prev,
          currentPoint: worldPoint,
        }));
      }
    },
    [drawingState.isDrawing, activeTool, applySnapping]
  );

  const handleCanvasMouseUp = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !drawingState.isDrawing || !drawingState.startPoint) {
        setDrawingState({
          isDrawing: false,
          startPoint: null,
          currentPoint: null,
          points: [],
        });
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      let worldPoint = screenToWorld(screenX, screenY, canvas.width, canvas.height);
      worldPoint = applySnapping(worldPoint);

      if (activeTool === 'wall' && drawingState.startPoint) {
        const minX = Math.min(drawingState.startPoint.x, worldPoint.x);
        const minY = Math.min(drawingState.startPoint.y, worldPoint.y);
        const maxX = Math.max(drawingState.startPoint.x, worldPoint.x);
        const maxY = Math.max(drawingState.startPoint.y, worldPoint.y);

        if (maxX - minX > 100 || maxY - minY > 100) {
          const layerId = Object.keys(doc?.layers || {})[0] || 'default';

          const elementId = addElement({
            type: 'wall',
            layerId,
            properties: {
              Name: { type: 'string', value: 'Wall' },
              Height: { type: 'number', value: 3000 },
              Width: { type: 'number', value: 200 },
              StartX: { type: 'number', value: minX },
              StartY: { type: 'number', value: minY },
              EndX: { type: 'number', value: maxX },
              EndY: { type: 'number', value: maxY },
            },
          });

          if (elementId && doc) {
            const newElement = doc.elements[elementId];
            if (newElement) {
              newElement.boundingBox = {
                min: { x: minX, y: minY, z: 0, _type: 'Point3D' as const },
                max: { x: maxX, y: maxY, z: 3000, _type: 'Point3D' as const },
              };
            }
          }
          getStoreActions().pushHistory('Add wall');
        }
      }

      if (activeTool === 'line' && drawingState.points.length >= 1) {
        const layerId = Object.keys(doc?.layers || {})[0] || 'default';
        addElement({
          type: 'annotation',
          layerId,
          properties: {
            Name: { type: 'string', value: 'Line' },
            Points: { type: 'string', value: JSON.stringify(drawingState.points) },
          },
        });
        getStoreActions().pushHistory('Add line');
      }

      if (activeTool === 'dimension' && drawingState.startPoint) {
        const layerId = Object.keys(doc?.layers || {})[0] || 'default';
        const dist = distance(drawingState.startPoint, worldPoint);

        addElement({
          type: 'dimension',
          layerId,
          properties: {
            Name: { type: 'string', value: 'Dimension' },
            Value: { type: 'number', value: dist },
            StartX: { type: 'number', value: drawingState.startPoint.x },
            StartY: { type: 'number', value: drawingState.startPoint.y },
            EndX: { type: 'number', value: worldPoint.x },
            EndY: { type: 'number', value: worldPoint.y },
          },
        });
        getStoreActions().pushHistory('Add dimension');
      }

      setDrawingState({
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        points: [],
      });
    },
    [doc, drawingState, activeTool, addElement, applySnapping]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawingState({
          isDrawing: false,
          startPoint: null,
          currentPoint: null,
          points: [],
        });
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        getStoreActions().undo();
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'y' || (event.key === 'z' && event.shiftKey))
      ) {
        event.preventDefault();
        getStoreActions().redo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        getStoreActions().pushHistory('Manual save');
        return;
      }

      if (event.key === 's' || event.key === 'S') {
        if (event.ctrlKey || event.metaKey) return;
        setActiveTool('select');
      }
      if (event.key === 'w' || event.key === 'W') {
        setActiveTool('wall');
      }
      if (event.key === 'm' || event.key === 'M') {
        setActiveTool('dimension');
      }
      if (event.key === 'x' || event.key === 'X') {
        setActiveTool('text');
      }
      if (event.key === 'l' || event.key === 'L') {
        setActiveTool('line');
      }
      if (event.key === 'r' || event.key === 'R') {
        setActiveTool('rectangle');
      }
      if (event.key === 'c' || event.key === 'C') {
        setActiveTool('circle');
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const state = getStoreActions();
        state.selectedIds.forEach((id) => state.deleteElement(id));
        state.pushHistory('Delete elements');
      }

      if (event.key === 'Control') {
        setSnapEnabled(false);
      }
    },
    [setActiveTool]
  );

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Control') {
      setSnapEnabled(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    canvasRef,
    containerRef,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    activeTool,
    drawingState,
  };
}
