import { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { catmullRomToBezier } from './splineUtils';
import type { Point2D } from './splineUtils';

// ── Text geometry data stored inside ElementSchema.geometry.data ──────────────
export interface TextGeometryData {
  x: number;
  y: number;
  content: string;
  fontSize: number;
  fontFamily: string;
}

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
const DEFAULT_SCALE = 20;   // world units per screen pixel (higher = more zoomed out)
const DEFAULT_PAN_X = -5000; // world x at screen centre
const DEFAULT_PAN_Y = -5000; // world y at screen centre
const MIN_SCALE = 0.5;       // max zoom-in
const MAX_SCALE = 5000;      // max zoom-out

// Tools that use drag-to-draw (mousedown → mousemove → mouseup)
const DRAG_TOOLS = new Set(['line', 'wall', 'curtain_wall', 'rectangle', 'circle', 'arc', 'dimension', 'beam', 'stair']);
// Tools that use click-to-add-vertex (polygon, polyline, slab, roof, railing, spline)
const MULTICLICK_TOOLS = new Set(['polygon', 'polyline', 'slab', 'roof', 'railing', 'spline']);

/**
 * Convert a canvas screen coordinate to world (mm) coordinates.
 * Origin (0,0) is at canvas centre. Y is flipped: screen-up = world-positive-Y.
 * panX/panY are screen-pixel offsets (positive panX shifts content right).
 */
function screenToWorld(sx: number, sy: number, cw: number, ch: number, zoom = 1, panX = 0, panY = 0): Point {
  return {
    x: (sx - cw / 2 - panX) * SCALE / zoom,
    y: (ch / 2 + panY - sy) * SCALE / zoom,
  };
}

/**
 * Convert a world (mm) coordinate to canvas screen coordinates.
 * Inverse of screenToWorld — Y is flipped.
 * panX/panY are screen-pixel offsets (positive panX shifts content right).
 */
function worldToScreen(wx: number, wy: number, cw: number, ch: number, zoom = 1, panX = 0, panY = 0): Point {
  return {
    x: wx * zoom / SCALE + cw / 2 + panX,
    y: ch / 2 + panY - wy * zoom / SCALE,
  };
}

function snapToGrid(point: Point, gridSize: number = GRID_SIZE): Point {
  return { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize };
}

function dist(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function findSnapPoints(elements: unknown[], currentPoint: Point, scale: number, tolerance: number = SNAP_TOLERANCE): SnapResult[] {
  const snaps: SnapResult[] = [];
  const snapDistWorld = tolerance * scale;
  for (const element of elements) {
    const el = element as { boundingBox: { min: Point; max: Point } };
    const bb = el.boundingBox;
    const corners: Point[] = [
      { x: bb.min.x, y: bb.min.y }, { x: bb.max.x, y: bb.min.y },
      { x: bb.min.x, y: bb.max.y }, { x: bb.max.x, y: bb.max.y },
    ];
    for (const corner of corners) {
      if (dist(corner, currentPoint) < snapDistWorld) snaps.push({ point: corner, type: 'endpoint' });
    }
    const midX = (bb.min.x + bb.max.x) / 2;
    const midY = (bb.min.y + bb.max.y) / 2;
    for (const mp of [{ x: midX, y: bb.min.y }, { x: midX, y: bb.max.y }, { x: bb.min.x, y: midY }, { x: bb.max.x, y: midY }]) {
      if (dist(mp, currentPoint) < snapDistWorld) snaps.push({ point: mp, type: 'midpoint' });
    }
  }
  return snaps;
}

// ─── Viewport culling helpers ─────────────────────────────────────────────────

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Return a 2D bounding box (in world coordinates) for an element.
 * Handles line/annotation, rectangle, circle, polygon, and the general
 * bounding-box fallback for all other types.
 */
export function getBoundingBox(element: unknown): BBox {
  const el = element as {
    type: string;
    boundingBox: { min: { x: number; y: number }; max: { x: number; y: number } };
    properties: Record<string, { value: unknown }>;
  };
  const props = el.properties;
  const type = el.type;

  if ((type === 'annotation' || type === 'wall' || type === 'dimension') && props['StartX'] && props['EndX']) {
    const sx = props['StartX'].value as number;
    const sy = (props['StartY']?.value as number) ?? 0;
    const ex = props['EndX'].value as number;
    const ey = (props['EndY']?.value as number) ?? 0;
    return { minX: Math.min(sx, ex), minY: Math.min(sy, ey), maxX: Math.max(sx, ex), maxY: Math.max(sy, ey) };
  }

  if (type === 'rectangle' && props['X']) {
    const x = props['X'].value as number;
    const y = (props['Y']?.value as number) ?? 0;
    const w = (props['Width']?.value as number) ?? 0;
    const h = (props['Height']?.value as number) ?? 0;
    return { minX: x, minY: y, maxX: x + w, maxY: y + h };
  }

  if ((type === 'circle' || type === 'arc') && props['CenterX']) {
    const cx = props['CenterX'].value as number;
    const cy = (props['CenterY']?.value as number) ?? 0;
    const r = (props['Radius']?.value as number) ?? 0;
    return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
  }

  if ((type === 'polygon' || type === 'polyline') && props['Points']) {
    const pts = JSON.parse(props['Points'].value as string) as Array<{ x: number; y: number }>;
    if (pts.length > 0) {
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    }
  }

  // Fallback: use element's own bounding box
  const bb = el.boundingBox;
  return { minX: bb.min.x, minY: bb.min.y, maxX: bb.max.x, maxY: bb.max.y };
}

/**
 * Returns true when the element bounding box (world coords) intersects the
 * canvas viewport rect (also in world coords).
 */
function isInViewport(
  element: unknown,
  viewMinX: number,
  viewMinY: number,
  viewMaxX: number,
  viewMaxY: number,
): boolean {
  const bb = getBoundingBox(element);
  return bb.maxX >= viewMinX && bb.minX <= viewMaxX && bb.maxY >= viewMinY && bb.minY <= viewMaxY;
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

  // ─── View transform (pan / zoom) ──────────────────────────────────────────
  const [viewTransform, setViewTransform] = useState<ViewTransform>(DEFAULT_VIEW);
  const viewTransformRef = useRef<ViewTransform>(DEFAULT_VIEW);

  // Dirty flag: only redraw when something actually changed
  const dirtyRef = useRef(true);

  // Pan state (middle-mouse drag) — tracked via ref to avoid re-renders mid-drag
  const panRef = useRef({ active: false, lastX: 0, lastY: 0 });

  /** Update view transform — syncs both state (for effects) and ref (for callbacks) */
  const setView = useCallback((v: ViewTransform) => {
    viewTransformRef.current = v;
    dirtyRef.current = true;
    setViewTransform(v);
  }, []);

  const applySnapping = useCallback((point: Point): Point => {
    const scale = viewTransformRef.current.scale;
    if (!doc || !snapEnabled) return point;
    const elements = Object.values(doc.content.elements);
    const snaps = findSnapPoints(elements, point, scale);
    if (snaps.length > 0) {
      const closest = snaps.reduce((a, b) => dist(point, a.point) < dist(point, b.point) ? a : b);
      setCurrentSnap(closest);
      return closest.point;
    }
    const snapped = snapToGrid(point);
    if (dist(point, snapped) < SNAP_TOLERANCE * scale) {
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

    if (tool === 'curtain_wall') {
      const minX = Math.min(start.x, end.x), minY = Math.min(start.y, end.y);
      const maxX = Math.max(start.x, end.x), maxY = Math.max(start.y, end.y);
      if (maxX - minX < 100 && maxY - minY < 100) return;
      const cwp = (toolParams?.['curtain_wall'] ?? {}) as Record<string, unknown>;
      addElement({
        type: 'curtain_wall', layerId,
        properties: {
          Name: { type: 'string', value: 'Curtain Wall' },
          StartX: { type: 'number', value: minX }, StartY: { type: 'number', value: minY },
          EndX: { type: 'number', value: maxX }, EndY: { type: 'number', value: maxY },
          Width: { type: 'number', value: maxX - minX },
          Height: { type: 'number', value: cwp['height'] ?? 3000 },
          FrameDepth: { type: 'number', value: cwp['frameDepth'] ?? 150 },
          GlazingType: { type: 'enum', value: cwp['glazingType'] ?? 'double' },
          FrameColor: { type: 'string', value: cwp['frameColor'] ?? '#888888' },
        },
      });
      getStoreActions().pushHistory('Add curtain wall');
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

    if (tool === 'spline' && extraPoints && extraPoints.length >= 2) {
      addElement({
        type: 'polyline',
        layerId,
        geometry: { type: 'curve', data: { points: extraPoints as Point2D[], smooth: true } },
        properties: {
          Name: { type: 'string', value: 'Spline' },
          Points: { type: 'string', value: JSON.stringify(extraPoints) },
        },
      });
      getStoreActions().pushHistory('Add spline');
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
          X: { type: 'number', value: start.x }, Y: { type: 'number', value: start.y },
          Width: { type: 'number', value: tp['width'] ?? (tool === 'door' ? 900 : 1200) },
          Height: { type: 'number', value: tp['height'] ?? (tool === 'door' ? 2100 : 1200) },
          HostWallId: { type: 'string', value: hostWallId },
          ...(tool === 'door'
            ? { Swing: { type: 'number', value: tp['swing'] ?? 90 }, FrameType: { type: 'string', value: tp['frameType'] ?? 'standard' } }
            : { SillHeight: { type: 'number', value: tp['sillHeight'] ?? 900 }, FrameType: { type: 'string', value: tp['frameType'] ?? 'standard' } }),
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
          X: { type: 'number', value: start.x }, Y: { type: 'number', value: start.y },
          Height: { type: 'number', value: cp['height'] ?? 3000 },
          SectionType: { type: 'string', value: cp['sectionType'] ?? 'Circular' },
          Diameter: { type: 'number', value: cp['diameter'] ?? 300 },
          Width: { type: 'number', value: cp['width'] ?? 300 },
          Depth: { type: 'number', value: cp['depth'] ?? 300 },
          Material: { type: 'string', value: cp['material'] ?? 'Concrete' },
        },
      });
      getStoreActions().pushHistory('Add column');
    }

    if (tool === 'beam' && extraPoints && extraPoints.length >= 2 ||
        (tool === 'beam' && start !== end)) {
      const bp = (toolParams?.['beam'] ?? {}) as Record<string, unknown>;
      addElement({
        type: 'beam', layerId,
        properties: {
          Name: { type: 'string', value: 'Beam' },
          StartX: { type: 'number', value: start.x }, StartY: { type: 'number', value: start.y },
          EndX: { type: 'number', value: end.x }, EndY: { type: 'number', value: end.y },
          Span: { type: 'number', value: dist(start, end) },
          SectionProfile: { type: 'string', value: bp['sectionProfile'] ?? 'IPE' },
          SectionSize: { type: 'string', value: bp['sectionSize'] ?? '200' },
          Material: { type: 'string', value: bp['material'] ?? 'Steel' },
        },
      });
      getStoreActions().pushHistory('Add beam');
    }

    if (tool === 'stair') {
      const minX = Math.min(start.x, end.x), minY = Math.min(start.y, end.y);
      const maxX = Math.max(start.x, end.x), maxY = Math.max(start.y, end.y);
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

  // ─── Text tool: confirm / cancel ──────────────────────────────────────────

  // ─── Canvas draw loop ─────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const v = viewTransformRef.current;
    const theme = getTheme();
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, cw, ch);

    // ── Grid drawn in world space (pan/zoom aware, batched single stroke) ──
    // Apply canvas transform so we can draw in world coordinates directly
    const sx = 1 / v.scale;
    const tx = cw / 2 - v.panX / v.scale;
    const ty = ch / 2 - v.panY / v.scale;

    // Visible world extent
    const worldMinX = (0 - tx) / sx;
    const worldMaxX = (cw - tx) / sx;
    const worldMinY = (0 - ty) / sx;
    const worldMaxY = (ch - ty) / sx;

    // Choose grid spacing: use major grid when zoomed out, minor when zoomed in
    const screenGridPx = GRID_SIZE / v.scale;
    const gridSpacing = screenGridPx < 8 ? GRID_SIZE * 10 : GRID_SIZE;
    const gx0 = Math.floor(worldMinX / gridSpacing) * gridSpacing;
    const gy0 = Math.floor(worldMinY / gridSpacing) * gridSpacing;

    ctx.save();
    ctx.setTransform(sx, 0, 0, sx, tx, ty);

    // Minor grid lines — single batched path
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = v.scale; // 1 screen pixel in world units
    ctx.beginPath();
    for (let x = gx0; x <= worldMaxX + gridSpacing; x += gridSpacing) {
      ctx.moveTo(x, worldMinY); ctx.lineTo(x, worldMaxY);
    }
    for (let y = gy0; y <= worldMaxY + gridSpacing; y += gridSpacing) {
      ctx.moveTo(worldMinX, y); ctx.lineTo(worldMaxX, y);
    }
    ctx.stroke();

    // Axis lines (X=0, Y=0)
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = v.scale * 1.5;
    ctx.setLineDash([v.scale * 4, v.scale * 4]);
    ctx.beginPath();
    ctx.moveTo(0, worldMinY); ctx.lineTo(0, worldMaxY);
    ctx.moveTo(worldMinX, 0); ctx.lineTo(worldMaxX, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!doc) { ctx.restore(); return; }

    // ── Render existing elements in world space ──
    for (const element of Object.values(doc.content.elements)) {
      // Viewport culling: skip elements whose bounding box is outside the canvas
      if (!isInViewport(element, vpMinX, vpMinY, vpMaxX, vpMaxY)) continue;
      const isSelected = selectedIds.includes(element.id);
      const color = isSelected ? theme.selected : theme.element;
      const fillColor = isSelected ? theme.selectedFill : theme.elementFill;
      ctx.strokeStyle = color;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = (isSelected ? 2 : 1.5) * v.scale;

      const props = element.properties as Record<string, { value: unknown }>;
      const type = element.type;

      if (type === 'annotation' || type === 'wall' || type === 'dimension') {
        if (props['StartX'] && props['EndX']) {
          const x1 = props['StartX'].value as number, y1 = props['StartY']!.value as number;
          const x2 = props['EndX'].value as number, y2 = props['EndY']!.value as number;
          if (type === 'annotation') {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          } else if (type === 'wall') {
            ctx.beginPath();
            ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
            ctx.fill(); ctx.stroke();
          } else if (type === 'dimension') {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
        }
      } else if (type === 'rectangle') {
        if (props['X']) {
          const x = props['X'].value as number, y = props['Y']!.value as number;
          const w = props['Width']!.value as number, h = props['Height']!.value as number;
          ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
        }
      } else if (type === 'circle') {
        if (props['CenterX']) {
          const cx2 = props['CenterX'].value as number, cy2 = props['CenterY']!.value as number;
          const r = props['Radius']!.value as number;
          ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      } else if (type === 'arc') {
        if (props['CenterX']) {
          const cx2 = props['CenterX'].value as number, cy2 = props['CenterY']!.value as number;
          const r = props['Radius']!.value as number;
          const sa = props['StartAngle']!.value as number;
          const ea = props['EndAngle']!.value as number;
          ctx.beginPath(); ctx.arc(cx2, cy2, r, sa, ea); ctx.stroke();
        }
      } else if (type === 'polygon' || type === 'polyline') {
        if (props['Points']) {
          const pts = JSON.parse(props['Points'].value as string) as Point[];
          if (pts.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(pts[0]!.x, pts[0]!.y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
          if (type === 'polygon') { ctx.closePath(); ctx.fill(); }
          ctx.stroke();
        }
      } else if (type === 'text') {
        // Text elements use geometry.data (TextGeometryData) for position/content.
        const td = element.geometry.data as TextGeometryData | null;
        if (td) {
          const tp = toS(td.x, td.y);
          ctx.fillStyle = color;
          ctx.font = `${td.fontSize}px ${td.fontFamily}`;
          ctx.fillText(td.content, tp.x, tp.y);
        }
      } else {
        // Fallback: bounding box in world space
        const bb = element.boundingBox;
        ctx.beginPath();
        ctx.rect(bb.min.x, bb.min.y, bb.max.x - bb.min.x, bb.max.y - bb.min.y);
        ctx.fill(); ctx.stroke();
      }
    }

    // ── Draw preview while user is drawing (in world space) ──
    const { startPoint, currentPoint, points } = drawingState;
    if (startPoint) {
      ctx.strokeStyle = theme.accent;
      ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
      ctx.lineWidth = 2 * v.scale;
      ctx.setLineDash([5 * v.scale, 5 * v.scale]);

      const cp = currentPoint ?? startPoint;

      if (activeTool === 'line' || activeTool === 'dimension') {
        if (currentPoint) {
          ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(cp.x, cp.y); ctx.stroke();
        }
      }

      if (activeTool === 'wall' || activeTool === 'rectangle') {
        if (currentPoint) {
          const x = Math.min(startPoint.x, cp.x), y = Math.min(startPoint.y, cp.y);
          const w = Math.abs(cp.x - startPoint.x), h = Math.abs(cp.y - startPoint.y);
          ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
        }
      }

      if (activeTool === 'circle') {
        if (currentPoint) {
          const r = dist(startPoint, cp);
          ctx.beginPath(); ctx.arc(startPoint.x, startPoint.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }

      if (activeTool === 'arc') {
        if (currentPoint) {
          const r = dist(startPoint, cp);
          const sa = Math.atan2(cp.y - startPoint.y, cp.x - startPoint.x);
          ctx.beginPath(); ctx.arc(startPoint.x, startPoint.y, r, sa, sa + Math.PI); ctx.stroke();
        }
      }

      // Polygon / polyline: show committed vertices + rubber-band
      if ((activeTool === 'polygon' || activeTool === 'polyline') && points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, points[0]!.y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
        if (currentPoint) ctx.lineTo(cp.x, cp.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = theme.accent;
        for (const pt of points) {
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 * v.scale, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.setLineDash([]);
    }

    // Snap indicator (world space)
    if (currentSnap) {
      ctx.strokeStyle = theme.snap;
      ctx.lineWidth = 1.5 * v.scale;
      ctx.beginPath(); ctx.arc(currentSnap.point.x, currentSnap.point.y, 6 * v.scale, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.restore();

    // ── Screen-space text labels (drawn after restoring transform) ──
    ctx.font = '10px sans-serif';
    if (doc) {
      for (const element of Object.values(doc.content.elements)) {
        const props = element.properties as Record<string, { value: unknown }>;
        const type = element.type;
        if (type === 'wall' && props['StartX']) {
          const x1 = props['StartX'].value as number, y1 = props['StartY']!.value as number;
          const x2 = props['EndX']!.value as number, y2 = props['EndY']!.value as number;
          const p1s = worldToScreen(x1, y1, cw, ch, v);
          const p2s = worldToScreen(x2, y2, cw, ch, v);
          ctx.fillStyle = element.properties['Name'] ? theme.element : theme.element;
          ctx.fillText('Wall', Math.min(p1s.x, p2s.x) + 4, Math.min(p1s.y, p2s.y) + 12);
        }
        if (type === 'dimension' && props['Value']) {
          const x1 = props['StartX']!.value as number, y1 = props['StartY']!.value as number;
          const x2 = props['EndX']!.value as number, y2 = props['EndY']!.value as number;
          const d = props['Value'].value as number;
          const p1s = worldToScreen(x1, y1, cw, ch, v);
          const p2s = worldToScreen(x2, y2, cw, ch, v);
          const selectedEl = selectedIds.includes(element.id);
          ctx.fillStyle = selectedEl ? theme.selected : theme.element;
          ctx.fillText(`${Math.round(d / v.scale)}`, (p1s.x + p2s.x) / 2 + 4, (p1s.y + p2s.y) / 2 - 6);
        }
      }
    }

    // Preview text labels (screen space)
    if (drawingState.startPoint && drawingState.currentPoint) {
      const sp = worldToScreen(drawingState.startPoint.x, drawingState.startPoint.y, cw, ch, v);
      const cp2 = worldToScreen(drawingState.currentPoint.x, drawingState.currentPoint.y, cw, ch, v);
      ctx.fillStyle = theme.accent;
      if (activeTool === 'dimension') {
        const d = dist(drawingState.startPoint, drawingState.currentPoint);
        ctx.fillText(`${Math.round(d / v.scale)}`, (sp.x + cp2.x) / 2 + 4, (sp.y + cp2.y) / 2 - 6);
      }
      if (activeTool === 'wall' || activeTool === 'rectangle') {
        const ww = Math.abs(drawingState.currentPoint.x - drawingState.startPoint.x);
        const hh = Math.abs(drawingState.currentPoint.y - drawingState.startPoint.y);
        ctx.fillText(
          `${Math.round(ww / v.scale)} × ${Math.round(hh / v.scale)}`,
          Math.min(sp.x, cp2.x) + 4, Math.min(sp.y, cp2.y) - 6
        );
      }
      if (activeTool === 'circle') {
        const r = dist(drawingState.startPoint, drawingState.currentPoint) / v.scale;
        ctx.fillText(`r=${Math.round(r)}`, sp.x + 4, sp.y - 6);
      }
    }
  }, [doc, selectedIds, drawingState, activeTool, currentSnap]);

  // ─── Wheel: zoom centred on cursor ────────────────────────────────────────

  const handleCanvasWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const v = viewTransformRef.current;

    // Zoom towards cursor
    const zoomFactor = event.deltaY < 0 ? 0.85 : 1 / 0.85;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * zoomFactor));
    if (newScale === v.scale) return;

    // Keep world point under cursor fixed:
    //   worldX = (sx - cw/2) * oldScale + panX = (sx - cw/2) * newScale + newPanX
    const worldX = (sx - canvas.width / 2) * v.scale + v.panX;
    const worldY = (sy - canvas.height / 2) * v.scale + v.panY;
    const newPanX = worldX - (sx - canvas.width / 2) * newScale;
    const newPanY = worldY - (sy - canvas.height / 2) * newScale;

    setView({ scale: newScale, panX: newPanX, panY: newPanY });
  }, [setView]);

  // ─── Mouse handlers ───────────────────────────────────────────────────────

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle mouse button → start pan
    if (event.button === 1) {
      event.preventDefault();
      panRef.current = { active: true, lastX: event.clientX, lastY: event.clientY };
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'grabbing';
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const v = viewTransformRef.current;
    let wp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height, v);
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

    if (activeTool === 'text') {
      setDrawingText(wp);
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
      console.log('[DEBUG-MULTICLICK] hit MULTICLICK handler, activeTool:', activeTool);
      setDrawingState((prev) => {
        const scale = viewTransformRef.current.scale;
        const isCloseable = activeTool === 'polygon' || activeTool === 'slab' || activeTool === 'roof';
        if (isCloseable && prev.points.length >= 3 && prev.points[0] && dist(wp, prev.points[0]) < SNAP_TOLERANCE * scale) {
          commitShape(activeTool, prev.points[0], prev.points[prev.points.length - 1]!, prev.points);
          return { isDrawing: false, startPoint: null, currentPoint: null, points: [] };
        }
        const newPoints = [...prev.points, wp];
        return { isDrawing: true, startPoint: newPoints[0]!, currentPoint: wp, points: newPoints };
      });
    }
  }, [isViewOnly, activeTool, doc, selectedIds, setSelectedIds, applySnapping, commitShape]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Pan via middle mouse drag
    if (panRef.current.active) {
      const dx = event.clientX - panRef.current.lastX;
      const dy = event.clientY - panRef.current.lastY;
      panRef.current.lastX = event.clientX;
      panRef.current.lastY = event.clientY;
      const v = viewTransformRef.current;
      setView({ ...v, panX: v.panX - dx * v.scale, panY: v.panY - dy * v.scale });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const v = viewTransformRef.current;
    let wp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height, v);
    wp = applySnapping(wp);

    if (!drawingState.isDrawing) return;
    setDrawingState((prev) => ({ ...prev, currentPoint: wp }));
  }, [drawingState.isDrawing, applySnapping, setView]);

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // End pan
    if (panRef.current.active) {
      panRef.current.active = false;
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = activeTool === 'select' ? 'default' : 'crosshair';
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !drawingState.isDrawing || !drawingState.startPoint) {
      setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const v = viewTransformRef.current;
    let wp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height, v);
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
    const v = viewTransformRef.current;
    let wp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height, v);
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
      setDrawingText(null);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) { event.preventDefault(); getStoreActions().undo(); return; }
    if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) { event.preventDefault(); getStoreActions().redo(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); getStoreActions().pushHistory('Manual save'); return; }

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const shortcuts: Record<string, string> = {
      v: 'select', w: 'wall', d: 'door', n: 'window', s: 'slab', o: 'roof',
      k: 'column', b: 'beam', t: 'stair', l: 'line', r: 'rectangle',
      c: 'circle', a: 'arc', p: 'polygon', m: 'dimension', x: 'text', j: 'curtain_wall',
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

  // Mark dirty whenever doc changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { dirtyRef.current = true; }, [doc]);

  // Mark dirty on viewTransform change (setView already does this, but ensures
  // the first paint after a state update happens even if draw is cached)
  useEffect(() => { dirtyRef.current = true; }, [viewTransform]);

  useEffect(() => {
    const handleThemeChange = () => { dirtyRef.current = true; };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
        dirtyRef.current = true;
      }
    });
    ro.observe(container);
    dirtyRef.current = true;
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [handleKeyDown, handleKeyUp]);

  // Dirty-checked rAF loop — only calls draw() when something changed
  useEffect(() => {
    let id: number;
    const loop = () => {
      if (dirtyRef.current) {
        draw();
        dirtyRef.current = false;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [draw]);

  // Mark dirty when drawing state or snap changes
  useEffect(() => { dirtyRef.current = true; }, [drawingState, currentSnap, activeTool, selectedIds]);

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

  // Wheel: zoom-to-cursor (Ctrl/pinch) or two-finger pan — always active
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { zoom, panX, panY } = viewRef.current;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

      if (event.ctrlKey) {
        // Pinch-to-zoom or Ctrl+scroll: zoom toward cursor
        const factor = event.deltaY > 0 ? 1 / 1.08 : 1.08;
        const newZoom = Math.max(0.05, Math.min(50, zoom * factor));
        // Keep the world point under the cursor fixed
        const newPanX = mx - cw / 2 - (mx - cw / 2 - panX) * newZoom / zoom;
        const newPanY = (ch / 2 + panY - my) * newZoom / zoom - ch / 2 + my;
        viewRef.current = { zoom: newZoom, panX: newPanX, panY: newPanY };
      } else {
        // Two-finger scroll / regular scroll → pan
        viewRef.current = {
          zoom,
          panX: panX - event.deltaX,
          panY: panY - event.deltaY,
        };
      }
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // Middle-mouse button panning — always active
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      isPanningRef.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      viewRef.current = {
        zoom: viewRef.current.zoom,
        panX: viewRef.current.panX + dx,
        panY: viewRef.current.panY + dy,
      };
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 1) return;
      isPanningRef.current = false;
      canvas.style.cursor = activeTool === 'select' ? 'default' : 'crosshair';
    };
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [activeTool]);

  return {
    canvasRef,
    containerRef,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasDoubleClick,
    handleCanvasWheel,
    activeTool,
    drawingState,
    viewTransform,
  };
}
