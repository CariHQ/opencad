import { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';

const LIGHT_THEME = {
  background: '#e8e8e8',
  grid: '#d0d0d0',
  gridMajor: '#c0c0c0',
  axis: '#a0a0a0',
  element: '#6b6b6b',
  elementFill: 'rgba(107, 107, 107, 0.1)',
  selected: '#0d99ff',
  selectedFill: 'rgba(13, 153, 255, 0.2)',
  accent: '#0d99ff',
  snap: '#0d99ff',
};

const DARK_THEME = {
  background: '#1a1b1f',
  grid: '#25262c',
  gridMajor: '#2e2f36',
  axis: '#3a3b44',
  element: '#9899aa',
  elementFill: 'rgba(152, 153, 170, 0.08)',
  selected: '#18a0fb',
  selectedFill: 'rgba(24, 160, 251, 0.15)',
  accent: '#18a0fb',
  snap: '#18a0fb',
};

const getTheme = () => {
  if (typeof window === 'undefined') return DARK_THEME;
  const theme = localStorage.getItem('opencad-theme');
  return theme === 'light' ? LIGHT_THEME : DARK_THEME;
};

const getStoreActions = () => useDocumentStore.getState();

interface Point {
  x: number;
  y: number;
}

interface DrawingState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  points: Point[]; // used for polygon / polyline multi-click
}

interface SnapResult {
  point: Point;
  type: 'endpoint' | 'midpoint' | 'intersection' | 'center' | 'grid';
}

const GRID_SIZE = 500;
const SNAP_TOLERANCE = 15;
const SCALE = 20;
const OFFSET = 5000;

// Tools that use drag-to-draw (mousedown → mousemove → mouseup)
const DRAG_TOOLS = new Set(['line', 'wall', 'rectangle', 'circle', 'arc', 'dimension', 'beam', 'stair']);
// Tools that use click-to-add-vertex (polygon, polyline, slab, roof, railing)
const MULTICLICK_TOOLS = new Set(['polygon', 'polyline', 'slab', 'roof', 'railing']);

function screenToWorld(sx: number, sy: number, cw: number, ch: number): Point {
  return { x: (sx - cw / 2) * SCALE - OFFSET, y: (sy - ch / 2) * SCALE - OFFSET };
}

function worldToScreen(wx: number, wy: number, cw: number, ch: number): Point {
  return { x: (wx + OFFSET) / SCALE + cw / 2, y: (wy + OFFSET) / SCALE + ch / 2 };
}

function snapToGrid(point: Point, gridSize: number = GRID_SIZE): Point {
  return { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize };
}

function dist(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function findSnapPoints(elements: unknown[], currentPoint: Point, tolerance: number = SNAP_TOLERANCE): SnapResult[] {
  const snaps: SnapResult[] = [];
  for (const element of elements) {
    const el = element as { boundingBox: { min: Point; max: Point } };
    const bb = el.boundingBox;
    const corners: Point[] = [
      { x: bb.min.x, y: bb.min.y }, { x: bb.max.x, y: bb.min.y },
      { x: bb.min.x, y: bb.max.y }, { x: bb.max.x, y: bb.max.y },
    ];
    for (const corner of corners) {
      if (dist(corner, currentPoint) < tolerance * SCALE) snaps.push({ point: corner, type: 'endpoint' });
    }
    const midX = (bb.min.x + bb.max.x) / 2;
    const midY = (bb.min.y + bb.max.y) / 2;
    for (const mp of [{ x: midX, y: bb.min.y }, { x: midX, y: bb.max.y }, { x: bb.min.x, y: midY }, { x: bb.max.x, y: midY }]) {
      if (dist(mp, currentPoint) < tolerance * SCALE) snaps.push({ point: mp, type: 'midpoint' });
    }
  }
  return snaps;
}

interface UseViewportOptions {
  isViewOnly?: boolean;
}

export function useViewport({ isViewOnly = false }: UseViewportOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { document: doc, selectedIds, setSelectedIds, activeTool, addElement, setActiveTool, toolParams } = useDocumentStore();

  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false, startPoint: null, currentPoint: null, points: [],
  });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [currentSnap, setCurrentSnap] = useState<SnapResult | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const applySnapping = useCallback((point: Point): Point => {
    if (!doc || !snapEnabled) return point;
    const elements = Object.values(doc.content.elements);
    const snaps = findSnapPoints(elements, point);
    if (snaps.length > 0) {
      const closest = snaps.reduce((a, b) => dist(point, a.point) < dist(point, b.point) ? a : b);
      setCurrentSnap(closest);
      return closest.point;
    }
    const snapped = snapToGrid(point);
    if (dist(point, snapped) < SNAP_TOLERANCE * SCALE) {
      setCurrentSnap({ point: snapped, type: 'grid' });
      return snapped;
    }
    setCurrentSnap(null);
    return point;
  }, [doc, snapEnabled]);

  // ─── Commit finished shapes to the document store ─────────────────────────

  const commitShape = useCallback((tool: string, start: Point, end: Point, extraPoints?: Point[]) => {
    if (!doc) return;
    const layerId = Object.keys(doc.organization.layers)[0] || 'default';

    if (tool === 'line') {
      if (Math.abs(end.x - start.x) < 50 && Math.abs(end.y - start.y) < 50) return;
      addElement({
        type: 'annotation',
        layerId,
        properties: {
          Name: { type: 'string', value: 'Line' },
          StartX: { type: 'number', value: start.x },
          StartY: { type: 'number', value: start.y },
          EndX: { type: 'number', value: end.x },
          EndY: { type: 'number', value: end.y },
        },
      });
      getStoreActions().pushHistory('Add line');
    }

    if (tool === 'wall') {
      const minX = Math.min(start.x, end.x), minY = Math.min(start.y, end.y);
      const maxX = Math.max(start.x, end.x), maxY = Math.max(start.y, end.y);
      if (maxX - minX < 100 && maxY - minY < 100) return;
      const wp = (toolParams?.['wall'] ?? {}) as Record<string, unknown>;
      addElement({
        type: 'wall', layerId,
        properties: {
          Name: { type: 'string', value: 'Wall' },
          StartX: { type: 'number', value: minX }, StartY: { type: 'number', value: minY },
          EndX: { type: 'number', value: maxX }, EndY: { type: 'number', value: maxY },
          Height: { type: 'number', value: wp['height'] ?? 3000 },
          Width: { type: 'number', value: wp['thickness'] ?? 200 },
          Material: { type: 'string', value: wp['material'] ?? 'Concrete' },
          WallType: { type: 'string', value: wp['wallType'] ?? 'interior' },
        },
      });
      getStoreActions().pushHistory('Add wall');
    }

    if (tool === 'rectangle') {
      const minX = Math.min(start.x, end.x), minY = Math.min(start.y, end.y);
      const maxX = Math.max(start.x, end.x), maxY = Math.max(start.y, end.y);
      if (maxX - minX < 50 && maxY - minY < 50) return;
      addElement({
        type: 'rectangle', layerId,
        properties: {
          Name: { type: 'string', value: 'Rectangle' },
          X: { type: 'number', value: minX }, Y: { type: 'number', value: minY },
          Width: { type: 'number', value: maxX - minX }, Height: { type: 'number', value: maxY - minY },
        },
      });
      getStoreActions().pushHistory('Add rectangle');
    }

    if (tool === 'circle') {
      const radius = dist(start, end);
      if (radius < 50) return;
      addElement({
        type: 'circle', layerId,
        properties: {
          Name: { type: 'string', value: 'Circle' },
          CenterX: { type: 'number', value: start.x }, CenterY: { type: 'number', value: start.y },
          Radius: { type: 'number', value: radius },
        },
      });
      getStoreActions().pushHistory('Add circle');
    }

    if (tool === 'arc') {
      const radius = dist(start, end);
      if (radius < 50) return;
      const startAngle = Math.atan2(end.y - start.y, end.x - start.x);
      addElement({
        type: 'arc', layerId,
        properties: {
          Name: { type: 'string', value: 'Arc' },
          CenterX: { type: 'number', value: start.x }, CenterY: { type: 'number', value: start.y },
          Radius: { type: 'number', value: radius },
          StartAngle: { type: 'number', value: startAngle },
          EndAngle: { type: 'number', value: startAngle + Math.PI },
        },
      });
      getStoreActions().pushHistory('Add arc');
    }

    if (tool === 'dimension') {
      const d = dist(start, end);
      addElement({
        type: 'dimension', layerId,
        properties: {
          Name: { type: 'string', value: 'Dimension' }, Value: { type: 'number', value: d },
          StartX: { type: 'number', value: start.x }, StartY: { type: 'number', value: start.y },
          EndX: { type: 'number', value: end.x }, EndY: { type: 'number', value: end.y },
        },
      });
      getStoreActions().pushHistory('Add dimension');
    }

    if ((tool === 'polygon' || tool === 'polyline') && extraPoints && extraPoints.length >= 2) {
      addElement({
        type: tool, layerId,
        properties: {
          Name: { type: 'string', value: tool === 'polygon' ? 'Polygon' : 'Polyline' },
          Points: { type: 'string', value: JSON.stringify(extraPoints) },
          Closed: { type: 'string', value: tool === 'polygon' ? 'true' : 'false' },
        },
      });
      getStoreActions().pushHistory(`Add ${tool}`);
    }

    if ((tool === 'slab' || tool === 'roof') && extraPoints && extraPoints.length >= 3) {
      const sp = (toolParams?.['slab'] ?? {}) as Record<string, unknown>;
      addElement({
        type: tool === 'roof' ? 'roof' : 'slab', layerId,
        properties: {
          Name: { type: 'string', value: tool === 'roof' ? 'Roof' : 'Slab' },
          Points: { type: 'string', value: JSON.stringify(extraPoints) },
          Thickness: { type: 'number', value: sp['thickness'] ?? 250 },
          Material: { type: 'string', value: sp['material'] ?? 'Concrete' },
          SlopeAngle: { type: 'number', value: sp['slopeAngle'] ?? 0 },
          ElevationOffset: { type: 'number', value: sp['elevationOffset'] ?? 0 },
          SlabType: { type: 'string', value: sp['slabType'] ?? tool },
        },
      });
      getStoreActions().pushHistory(`Add ${tool}`);
    }

    if (tool === 'door' || tool === 'window') {
      // Find nearest wall element to host this opening
      const walls = Object.values(doc.content.elements).filter((el) => el.type === 'wall');
      let hostWallId = '';
      let minD = Infinity;
      for (const wall of walls) {
        const bb = wall.boundingBox;
        const cx = (bb.min.x + bb.max.x) / 2;
        const cy = (bb.min.y + bb.max.y) / 2;
        const d = dist(start, { x: cx, y: cy });
        if (d < minD) { minD = d; hostWallId = wall.id; }
      }
      const tp = (toolParams?.[tool] ?? {}) as Record<string, unknown>;
      addElement({
        type: tool, layerId,
        properties: {
          Name: { type: 'string', value: tool === 'door' ? 'Door' : 'Window' },
          X: { type: 'number', value: start.x },
          Y: { type: 'number', value: start.y },
          Width: { type: 'number', value: tp['width'] ?? (tool === 'door' ? 900 : 1200) },
          Height: { type: 'number', value: tp['height'] ?? (tool === 'door' ? 2100 : 1200) },
          ...(tool === 'door'
            ? { Swing: { type: 'number', value: tp['swing'] ?? 90 } }
            : { SillHeight: { type: 'number', value: tp['sillHeight'] ?? 900 } }),
          FrameType: { type: 'string', value: tp['frameType'] ?? 'standard' },
          HostWallId: { type: 'reference', value: hostWallId },
        },
      });
      getStoreActions().pushHistory(`Add ${tool}`);
    }

    if (tool === 'column') {
      const cp = (toolParams?.['column'] ?? {}) as Record<string, unknown>;
      addElement({
        type: 'column', layerId,
        properties: {
          Name: { type: 'string', value: 'Column' },
          X: { type: 'number', value: start.x },
          Y: { type: 'number', value: start.y },
          Height: { type: 'number', value: (cp['height'] as number | undefined) ?? 3000 },
          SectionType: { type: 'string', value: (cp['sectionType'] as string | undefined) ?? 'Circular' },
          Diameter: { type: 'number', value: (cp['diameter'] as number | undefined) ?? 300 },
          Material: { type: 'string', value: (cp['material'] as string | undefined) ?? 'Concrete' },
        },
      });
      getStoreActions().pushHistory('Add column');
    }

    if (tool === 'beam') {
      const minX = Math.min(start.x, end.x), minY = Math.min(start.y, end.y);
      const maxX = Math.max(start.x, end.x), maxY = Math.max(start.y, end.y);
      if (maxX - minX < 100 && maxY - minY < 100) return;
      const bp = (toolParams?.['beam'] ?? {}) as Record<string, unknown>;
      addElement({
        type: 'beam', layerId,
        properties: {
          Name: { type: 'string', value: 'Beam' },
          StartX: { type: 'number', value: start.x },
          StartY: { type: 'number', value: start.y },
          EndX: { type: 'number', value: end.x },
          EndY: { type: 'number', value: end.y },
          SectionProfile: { type: 'string', value: (bp['sectionProfile'] as string | undefined) ?? 'IPE' },
          SectionSize: { type: 'string', value: (bp['sectionSize'] as string | undefined) ?? '200' },
          Material: { type: 'string', value: (bp['material'] as string | undefined) ?? 'Steel' },
        },
      });
      getStoreActions().pushHistory('Add beam');
    }

    if (tool === 'stair') {
      const minX = Math.min(start.x, end.x), minY = Math.min(start.y, end.y);
      const maxX = Math.max(start.x, end.x), maxY = Math.max(start.y, end.y);
      if (maxX - minX < 200 && maxY - minY < 200) return;
      const sp = (toolParams?.['stair'] ?? {}) as Record<string, unknown>;
      addElement({
        type: 'stair', layerId,
        properties: {
          Name: { type: 'string', value: 'Stair' },
          X: { type: 'number', value: minX }, Y: { type: 'number', value: minY },
          Width2D: { type: 'number', value: maxX - minX },
          Length: { type: 'number', value: maxY - minY },
          TotalRise: { type: 'number', value: (sp['totalRise'] as number | undefined) ?? 3000 },
          TreadDepth: { type: 'number', value: (sp['treadDepth'] as number | undefined) ?? 250 },
          Width: { type: 'number', value: (sp['width'] as number | undefined) ?? 1200 },
          Material: { type: 'string', value: (sp['material'] as string | undefined) ?? 'Concrete' },
        },
      });
      getStoreActions().pushHistory('Add stair');
    }

    if (tool === 'railing' && extraPoints && extraPoints.length >= 2) {
      const rp = (toolParams?.['railing'] ?? {}) as Record<string, unknown>;
      addElement({
        type: 'railing', layerId,
        properties: {
          Name: { type: 'string', value: 'Railing' },
          Points: { type: 'string', value: JSON.stringify(extraPoints) },
          Height: { type: 'number', value: (rp['height'] as number | undefined) ?? 1000 },
          Material: { type: 'string', value: (rp['material'] as string | undefined) ?? 'Steel' },
          BalusterSpacing: { type: 'number', value: (rp['balusterSpacing'] as number | undefined) ?? 150 },
        },
      });
      getStoreActions().pushHistory('Add railing');
    }
  }, [doc, addElement, toolParams]);

  // ─── Canvas draw loop ─────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = getTheme();
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y <= height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    ctx.strokeStyle = theme.gridMajor;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
    ctx.setLineDash([]);

    if (!doc) return;

    // ── Render existing elements ──
    for (const element of Object.values(doc.content.elements)) {
      const isSelected = selectedIds.includes(element.id);
      const color = isSelected ? theme.selected : theme.element;
      const fillColor = isSelected ? theme.selectedFill : theme.elementFill;
      ctx.strokeStyle = color;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = isSelected ? 2 : 1.5;

      const props = element.properties as Record<string, { value: unknown }>;
      const type = element.type;

      if (type === 'annotation' || type === 'wall' || type === 'dimension') {
        // Lines and walls drawn as bounding rect or line
        if (props['StartX'] && props['EndX']) {
          const p1 = worldToScreen(props['StartX'].value as number, props['StartY']!.value as number, width, height);
          const p2 = worldToScreen(props['EndX'].value as number, props['EndY']!.value as number, width, height);
          if (type === 'annotation') {
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          } else if (type === 'wall') {
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.rect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = color; ctx.font = '10px sans-serif';
            ctx.fillText('Wall', Math.min(p1.x, p2.x) + 4, Math.min(p1.y, p2.y) + 12);
          } else if (type === 'dimension') {
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            const d = props['Value']?.value as number ?? 0;
            ctx.fillStyle = color; ctx.font = '10px sans-serif';
            ctx.fillText(`${Math.round(d / SCALE)}`, (p1.x + p2.x) / 2 + 4, (p1.y + p2.y) / 2 - 6);
          }
        }
      } else if (type === 'rectangle') {
        if (props['X']) {
          const p = worldToScreen(props['X'].value as number, props['Y']!.value as number, width, height);
          const w = (props['Width']!.value as number) / SCALE;
          const h = (props['Height']!.value as number) / SCALE;
          ctx.beginPath(); ctx.rect(p.x, p.y, w, h); ctx.fill(); ctx.stroke();
        }
      } else if (type === 'circle') {
        if (props['CenterX']) {
          const c = worldToScreen(props['CenterX'].value as number, props['CenterY']!.value as number, width, height);
          const r = (props['Radius']!.value as number) / SCALE;
          ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      } else if (type === 'arc') {
        if (props['CenterX']) {
          const c = worldToScreen(props['CenterX'].value as number, props['CenterY']!.value as number, width, height);
          const r = (props['Radius']!.value as number) / SCALE;
          const sa = props['StartAngle']!.value as number;
          const ea = props['EndAngle']!.value as number;
          ctx.beginPath(); ctx.arc(c.x, c.y, r, sa, ea); ctx.stroke();
        }
      } else if (type === 'polygon' || type === 'polyline') {
        if (props['Points']) {
          const pts = JSON.parse(props['Points'].value as string) as Point[];
          if (pts.length < 2) continue;
          ctx.beginPath();
          const p0 = worldToScreen(pts[0]!.x, pts[0]!.y, width, height);
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < pts.length; i++) {
            const p = worldToScreen(pts[i]!.x, pts[i]!.y, width, height);
            ctx.lineTo(p.x, p.y);
          }
          if (type === 'polygon') { ctx.closePath(); ctx.fill(); }
          ctx.stroke();
        }
      } else {
        // Fallback: bounding box
        const bb = element.boundingBox;
        const p = worldToScreen(bb.min.x, bb.min.y, width, height);
        const w = (bb.max.x - bb.min.x) / SCALE;
        const h = (bb.max.y - bb.min.y) / SCALE;
        ctx.beginPath(); ctx.rect(p.x, p.y, w, h); ctx.fill(); ctx.stroke();
      }
    }

    // ── Draw preview while user is drawing ──
    const { isDrawing: _isDrawing, startPoint, currentPoint, points } = drawingState;
    if (!startPoint) return;

    ctx.strokeStyle = theme.accent;
    ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const sp = worldToScreen(startPoint.x, startPoint.y, width, height);
    const cp = currentPoint ? worldToScreen(currentPoint.x, currentPoint.y, width, height) : sp;

    if (activeTool === 'line' || activeTool === 'dimension') {
      if (currentPoint) {
        ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(cp.x, cp.y); ctx.stroke();
        if (activeTool === 'dimension') {
          const d = dist(startPoint, currentPoint);
          ctx.fillStyle = theme.accent; ctx.font = '11px sans-serif';
          ctx.fillText(`${Math.round(d / SCALE)}`, (sp.x + cp.x) / 2 + 4, (sp.y + cp.y) / 2 - 6);
        }
      }
    }

    if (activeTool === 'wall' || activeTool === 'rectangle') {
      if (currentPoint) {
        const x = Math.min(sp.x, cp.x), y = Math.min(sp.y, cp.y);
        const w = Math.abs(cp.x - sp.x), h = Math.abs(cp.y - sp.y);
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
        ctx.fillStyle = theme.accent; ctx.font = '11px sans-serif';
        ctx.fillText(
          `${Math.round(Math.abs(currentPoint.x - startPoint.x) / SCALE)} × ${Math.round(Math.abs(currentPoint.y - startPoint.y) / SCALE)}`,
          x + 4, y - 6
        );
      }
    }

    if (activeTool === 'circle') {
      if (currentPoint) {
        const r = dist(startPoint, currentPoint) / SCALE;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, dist(sp, cp), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = theme.accent; ctx.font = '11px sans-serif';
        ctx.fillText(`r=${Math.round(r)}`, sp.x + 4, sp.y - 6);
      }
    }

    if (activeTool === 'arc') {
      if (currentPoint) {
        const r = dist(sp, cp);
        const sa = Math.atan2(cp.y - sp.y, cp.x - sp.x);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, r, sa, sa + Math.PI); ctx.stroke();
      }
    }

    // Polygon / polyline: show committed points so far + rubber-band to mouse
    if ((activeTool === 'polygon' || activeTool === 'polyline') && points.length > 0) {
      ctx.beginPath();
      const p0 = worldToScreen(points[0]!.x, points[0]!.y, width, height);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < points.length; i++) {
        const p = worldToScreen(points[i]!.x, points[i]!.y, width, height);
        ctx.lineTo(p.x, p.y);
      }
      if (currentPoint) ctx.lineTo(cp.x, cp.y);
      ctx.stroke();
      // Draw dot at each committed vertex
      ctx.setLineDash([]);
      ctx.fillStyle = theme.accent;
      for (const pt of points) {
        const s = worldToScreen(pt.x, pt.y, width, height);
        ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.setLineDash([]);

    // Snap indicator
    if (currentSnap) {
      const ss = worldToScreen(currentSnap.point.x, currentSnap.point.y, width, height);
      ctx.strokeStyle = theme.snap;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ss.x, ss.y, 6, 0, Math.PI * 2); ctx.stroke();
    }
  }, [doc, selectedIds, drawingState, activeTool, currentSnap]);

  // ─── Mouse handlers ───────────────────────────────────────────────────────

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isViewOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let wp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height);
    wp = applySnapping(wp);

    if (activeTool === 'select') {
      if (!doc) return;
      const elements = Object.values(doc.content.elements);
      const clicked = elements.filter((el) => {
        const bb = el.boundingBox;
        return wp.x >= bb.min.x && wp.x <= bb.max.x && wp.y >= bb.min.y && wp.y <= bb.max.y;
      });
      if (clicked.length > 0) {
        setSelectedIds(event.shiftKey ? [...selectedIds, clicked[0]!.id] : [clicked[0]!.id]);
      } else {
        setSelectedIds([]);
      }
      return;
    }

    if (activeTool === 'column') {
      commitShape('column', wp, wp);
      return;
    }

    if (DRAG_TOOLS.has(activeTool)) {
      setDrawingState({ isDrawing: true, startPoint: wp, currentPoint: wp, points: [] });
      return;
    }

    if (MULTICLICK_TOOLS.has(activeTool)) {
      setDrawingState((prev) => {
        // Close polygon/slab/roof if clicking near start
        const isCloseable = activeTool === 'polygon' || activeTool === 'slab' || activeTool === 'roof';
        if (isCloseable && prev.points.length >= 3 && prev.points[0] && dist(wp, prev.points[0]) < SNAP_TOLERANCE * SCALE) {
          commitShape(activeTool, prev.points[0], prev.points[prev.points.length - 1]!, prev.points);
          return { isDrawing: false, startPoint: null, currentPoint: null, points: [] };
        }
        const newPoints = [...prev.points, wp];
        return { isDrawing: true, startPoint: newPoints[0]!, currentPoint: wp, points: newPoints };
      });
    }
  }, [isViewOnly, activeTool, doc, selectedIds, setSelectedIds, applySnapping, commitShape]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let wp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height);
    wp = applySnapping(wp);

    if (!drawingState.isDrawing) return;
    setDrawingState((prev) => ({ ...prev, currentPoint: wp }));
  }, [drawingState.isDrawing, applySnapping]);

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingState.isDrawing || !drawingState.startPoint) {
      setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    let wp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height);
    wp = applySnapping(wp);

    if (DRAG_TOOLS.has(activeTool)) {
      commitShape(activeTool, drawingState.startPoint, wp);
      setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
    }
    // Multi-click tools don't commit on mouseUp, only on next click or double-click
  }, [activeTool, drawingState, applySnapping, commitShape]);

  // Double-click finishes polyline
  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!MULTICLICK_TOOLS.has(activeTool)) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let wp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height);
    wp = applySnapping(wp);
    setDrawingState((prev) => {
      if (prev.points.length >= 2) {
        const finalPoints = [...prev.points, wp];
        commitShape(activeTool, prev.points[0]!, finalPoints[finalPoints.length - 1]!, finalPoints);
      }
      return { isDrawing: false, startPoint: null, currentPoint: null, points: [] };
    });
  }, [activeTool, applySnapping, commitShape]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) { event.preventDefault(); getStoreActions().undo(); return; }
    if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) { event.preventDefault(); getStoreActions().redo(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); getStoreActions().pushHistory('Manual save'); return; }

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const shortcuts: Record<string, string> = {
      v: 'select', w: 'wall', d: 'door', n: 'window', s: 'slab', o: 'roof',
      k: 'column', b: 'beam', t: 'stair', l: 'line', r: 'rectangle',
      c: 'circle', a: 'arc', p: 'polygon', m: 'dimension', x: 'text',
    };
    const key = event.key.toLowerCase();
    if (shortcuts[key]) setActiveTool(shortcuts[key]);

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const state = getStoreActions();
      state.selectedIds.forEach((id) => state.deleteElement(id));
      state.pushHistory('Delete elements');
    }
    if (event.key === 'Control') setSnapEnabled(false);
  }, [setActiveTool]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Control') setSnapEnabled(true);
  }, []);

  // ─── Effects ──────────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { draw(); }, [doc]);

  useEffect(() => {
    const handleThemeChange = () => draw();
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
        draw();
      }
    });
    ro.observe(container);
    draw();
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    let id: number;
    const loop = () => { draw(); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [draw, activeTool]);

  // Update canvas cursor based on active tool (isViewOnly always uses 'default')
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isViewOnly) {
      canvas.style.cursor = 'default';
    } else {
      canvas.style.cursor = activeTool === 'select' ? 'default' : 'crosshair';
    }
  }, [activeTool, isViewOnly]);

  // Wheel zoom — always active regardless of isViewOnly
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      setZoomScale((prev) => Math.max(0.05, Math.min(20, prev * delta)));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  return {
    canvasRef,
    containerRef,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasDoubleClick,
    activeTool,
    drawingState,
    isViewOnly,
    zoomScale,
    viewTransform: { scale: zoomScale / SCALE, panX: OFFSET, panY: OFFSET },
  };
}
