import { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { ElementSchema } from '@opencad/document';
import { SpatialGrid } from '../utils/spatialIndex';
import {
  getHandles, hitHandle, hitTestElement,
  moveElementProps, resizeElementProps,
  type HandleKind,
} from '../utils/elementMath';

const LIGHT_THEME = {
  background: '#fafaf8',          // drafting-paper off-white
  grid: 'rgba(0,0,0,0.06)',       // barely-there minor grid
  gridMajor: 'rgba(0,0,0,0.11)',  // subtle major grid
  axis: 'rgba(0,0,0,0.18)',       // axis slightly more present
  element: '#3a3a3a',             // dark ink on white paper
  elementFill: 'rgba(0,0,0,0.04)',
  selected: '#0d99ff',
  selectedFill: 'rgba(13,153,255,0.12)',
  accent: '#0d99ff',
  snap: '#0d99ff',
};

const DARK_THEME = {
  background: '#141414',          // true CAD dark — like AutoCAD Model Space
  grid: 'rgba(255,255,255,0.05)', // barely-there minor grid
  gridMajor: 'rgba(255,255,255,0.09)', // subtle major grid
  axis: 'rgba(255,255,255,0.15)', // axis readable but not glowing
  element: '#c8c8c8',             // bright enough on near-black
  elementFill: 'rgba(255,255,255,0.05)',
  selected: '#18a0fb',
  selectedFill: 'rgba(24,160,251,0.15)',
  accent: '#18a0fb',
  snap: '#18a0fb',
};

// Module-level theme cache — avoids localStorage read on every rAF frame
let _cachedTheme = typeof window !== 'undefined' && localStorage.getItem('opencad-theme') === 'light'
  ? LIGHT_THEME : DARK_THEME;
const getTheme = () => _cachedTheme;
if (typeof window !== 'undefined') {
  const _updateThemeCache = () => {
    _cachedTheme = localStorage.getItem('opencad-theme') === 'light' ? LIGHT_THEME : DARK_THEME;
  };
  window.addEventListener('storage', _updateThemeCache);
  window.addEventListener('theme-change', _updateThemeCache);
}

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
const DRAG_TOOLS = new Set(['line', 'wall', 'rectangle', 'circle', 'arc', 'dimension', 'beam', 'stair']);
// Tools that use click-to-add-vertex (polygon, polyline, slab, roof, railing)
const MULTICLICK_TOOLS = new Set(['polygon', 'polyline', 'slab', 'roof', 'railing']);

interface ViewTransform { scale: number; panX: number; panY: number; }
const DEFAULT_VIEW: ViewTransform = { scale: DEFAULT_SCALE, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y };

function screenToWorld(sx: number, sy: number, cw: number, ch: number, v: ViewTransform = DEFAULT_VIEW): Point {
  return { x: (sx - cw / 2) * v.scale + v.panX, y: (sy - ch / 2) * v.scale + v.panY };
}

function worldToScreen(wx: number, wy: number, cw: number, ch: number, v: ViewTransform = DEFAULT_VIEW): Point {
  return { x: (wx - v.panX) / v.scale + cw / 2, y: (wy - v.panY) / v.scale + ch / 2 };
}

function snapToGrid(point: Point, gridSize: number = GRID_SIZE): Point {
  return { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize };
}

function dist(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}


// ─── Select-tool interaction state machine ─────────────────────────────────────

type SelectInteraction =
  | { mode: 'idle' }
  | { mode: 'drag-pending'; startScreen: Point; elementIds: string[] }
  | { mode: 'dragging';     lastWorld: Point;   elementIds: string[] }
  | { mode: 'resizing';     handle: HandleKind; elementId: string }
  | { mode: 'rubber-band';  startWorld: Point;  currentWorld: Point };

const DRAG_THRESHOLD_PX = 4;  // pixels before a click becomes a drag
const HANDLE_SIZE_PX    = 5;  // half-size of handle square in screen pixels
const PASTE_OFFSET      = 500; // world-unit offset applied per paste cycle

export function useViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { document: doc, selectedIds, setSelectedIds, activeTool, addElement, setActiveTool, toolParams, updateElement, pushHistory, deleteElement } = useDocumentStore();

  // Spatial index for O(1) average-case snap candidate lookup.
  // Cell size matches GRID_SIZE (500 world units) so each cell covers roughly
  // one grid square — a good balance between cell count and bucket size.
  const snapIndexRef = useRef(new SpatialGrid(GRID_SIZE));

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

  // Cached elements array — recomputed only when doc changes, not on every rAF frame / mousemove
  const elementsRef = useRef<ElementSchema[]>([]);

  // Pan state (middle-mouse drag) — tracked via ref to avoid re-renders mid-drag
  const panRef = useRef({ active: false, lastX: 0, lastY: 0 });

  // ── Select-tool interaction ─────────────────────────────────────────────────
  const interactionRef = useRef<SelectInteraction>({ mode: 'idle' });
  // Clipboard (copy/paste) — stores serialised element properties
  const clipboardRef = useRef<ElementSchema[]>([]);
  const pasteCountRef = useRef(0);

  /** Update view transform — syncs both state (for effects) and ref (for callbacks) */
  const setView = useCallback((v: ViewTransform) => {
    viewTransformRef.current = v;
    dirtyRef.current = true;
    setViewTransform(v);
  }, []);

  // Keep elementsRef in sync with doc — O(n) allocation only when doc changes
  useEffect(() => {
    elementsRef.current = doc ? Object.values(doc.content.elements) : [];
  }, [doc]);

  // Rebuild snap spatial index on document change — O(n) once, then O(1) queries
  useEffect(() => {
    const idx = snapIndexRef.current;
    idx.clear();
    if (!doc) return;
    for (const element of Object.values(doc.content.elements)) {
      const el = element as { boundingBox: { min: Point; max: Point } };
      const bb = el.boundingBox;
      const corners: Point[] = [
        { x: bb.min.x, y: bb.min.y }, { x: bb.max.x, y: bb.min.y },
        { x: bb.min.x, y: bb.max.y }, { x: bb.max.x, y: bb.max.y },
      ];
      for (const corner of corners) {
        idx.insert(corner.x, corner.y, { point: corner, type: 'endpoint' } satisfies SnapResult);
      }
      const midX = (bb.min.x + bb.max.x) / 2;
      const midY = (bb.min.y + bb.max.y) / 2;
      for (const mp of [
        { x: midX, y: bb.min.y }, { x: midX, y: bb.max.y },
        { x: bb.min.x, y: midY }, { x: bb.max.x, y: midY },
      ]) {
        idx.insert(mp.x, mp.y, { point: mp, type: 'midpoint' } satisfies SnapResult);
      }
    }
  }, [doc]);

  const applySnapping = useCallback((point: Point): Point => {
    const scale = viewTransformRef.current.scale;
    if (!doc || !snapEnabled) return point;
    const snapRadius = SNAP_TOLERANCE * scale;
    const candidates = snapIndexRef.current.query(point.x, point.y, snapRadius);
    if (candidates.length > 0) {
      let best = candidates[0]!;
      let bestDist2 = (best.x - point.x) ** 2 + (best.y - point.y) ** 2;
      for (let i = 1; i < candidates.length; i++) {
        const c = candidates[i]!;
        const d2 = (c.x - point.x) ** 2 + (c.y - point.y) ** 2;
        if (d2 < bestDist2) { bestDist2 = d2; best = c; }
      }
      const snapResult = best.payload as SnapResult;
      setCurrentSnap(snapResult);
      return snapResult.point;
    }
    const snapped = snapToGrid(point);
    if (dist(point, snapped) < snapRadius) {
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
      const dx = end.x - start.x, dy = end.y - start.y;
      if (Math.sqrt(dx * dx + dy * dy) < 100) return;
      const wp = (toolParams?.['wall'] ?? {}) as Record<string, unknown>;
      const wallType = (wp['wallType'] as string | undefined) ?? 'interior';
      // ArchiCAD-style thickness defaults by wall type:
      //   exterior  — 300 mm  (brick/block + insulation + inner drywall)
      //   interior  — 150 mm  (drywall-stud-drywall partition)
      //   partition — 100 mm  (lightweight office partition)
      //   curtain   —  60 mm  (glazed curtain wall)
      // User can still override via toolParams.thickness.
      const defaultThickness =
        wallType === 'exterior'  ? 300 :
        wallType === 'partition' ? 100 :
        wallType === 'curtain'   ?  60 :
        150;
      addElement({
        type: 'wall', layerId,
        properties: {
          Name: { type: 'string', value: 'Wall' },
          StartX: { type: 'number', value: start.x }, StartY: { type: 'number', value: start.y },
          EndX: { type: 'number', value: end.x }, EndY: { type: 'number', value: end.y },
          Height: { type: 'number', value: wp['height'] ?? 3000 },
          Width: { type: 'number', value: wp['thickness'] ?? defaultThickness },
          Material: { type: 'string', value: wp['material'] ?? (
            wallType === 'exterior' ? 'Concrete' :
            wallType === 'curtain'  ? 'Clear Glass' :
            'Plasterboard'
          ) },
          WallType: { type: 'string', value: wallType },
          ElevationOffset: { type: 'number', value: wp['elevationOffset'] ?? 0 },
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
      const sp = (toolParams?.[tool] ?? {}) as Record<string, unknown>;
      // Different default materials: slab stays concrete, roof uses clay
      // tiles so the two read as clearly distinct surfaces in the 3D view.
      const defaultMaterial = tool === 'roof' ? 'Clay Roof Tiles' : 'Concrete';
      addElement({
        type: tool === 'roof' ? 'roof' : 'slab', layerId,
        properties: {
          Name: { type: 'string', value: tool === 'roof' ? 'Roof' : 'Slab' },
          Points: { type: 'string', value: JSON.stringify(extraPoints) },
          // ArchiCAD-typical slab/roof thicknesses:
          //   slab (structural floor)  — 200 mm
          //   roof (tile/shingle + deck + insulation) — 250 mm
          Thickness: { type: 'number', value: sp['thickness'] ?? (tool === 'roof' ? 250 : 200) },
          Material: { type: 'string', value: sp['material'] ?? defaultMaterial },
          SlopeAngle: { type: 'number', value: sp['slopeAngle'] ?? 0 },
          ElevationOffset: { type: 'number', value: sp['elevationOffset'] ?? 0 },
          SlabType: { type: 'string', value: sp['slabType'] ?? tool },
        },
      });
      getStoreActions().pushHistory(`Add ${tool}`);
    }

    if (tool === 'door' || tool === 'window') {
      const tp = (toolParams?.[tool] ?? {}) as Record<string, unknown>;
      // Multi-story filter: if elevationOffset is set, only host walls whose
      // ElevationOffset matches (within 1 mm) are candidates. This keeps a
      // window placed on the 2nd-floor plan from snapping to the ground-
      // floor wall directly below it.
      const wantElev = typeof tp['elevationOffset'] === 'number' ? (tp['elevationOffset'] as number) : undefined;
      let walls = Object.values(doc.content.elements).filter((el) => el.type === 'wall');
      if (wantElev !== undefined) {
        const filtered = walls.filter((w) => {
          const wv = (w.properties as Record<string, { value: unknown }>)['ElevationOffset']?.value;
          const we = typeof wv === 'number' ? wv : 0;
          return Math.abs(we - wantElev) < 1;
        });
        if (filtered.length > 0) walls = filtered;
      }
      let hostWallId = '';
      let minD = Infinity;
      for (const wall of walls) {
        const bb = wall.boundingBox;
        const cx = (bb.min.x + bb.max.x) / 2;
        const cy = (bb.min.y + bb.max.y) / 2;
        const d = dist(start, { x: cx, y: cy });
        if (d < minD) { minD = d; hostWallId = wall.id; }
      }
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
    const visibleLabelTargets: { element: ElementSchema }[] = [];
    for (const element of elementsRef.current) {
      // Viewport culling — skip elements entirely outside visible area
      const ebb = element.boundingBox;
      if (ebb.max.x < worldMinX || ebb.min.x > worldMaxX || ebb.max.y < worldMinY || ebb.min.y > worldMaxY) continue;
      // Collect visible elements for the text label pass (avoids a second full iteration)
      visibleLabelTargets.push({ element });

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
            // Draw the wall as an oriented rectangle whose short side equals
            // the stored Width (thickness). This keeps plan view consistent
            // with the 3D view — a 300 mm exterior wall reads as twice as
            // thick as a 150 mm partition, not a fixed 1.5 px stroke.
            const wallW = (props['Width']?.value as number | undefined) ?? 200;
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len, ny = dx / len; // unit perpendicular
            const hw = wallW / 2;
            // Extend each endpoint outward by half-thickness along the wall
            // direction so adjacent walls overlap into a clean mitered corner
            // (same trick buildWallMesh uses).
            const ux = dx / len, uy = dy / len;
            const ex1 = x1 - ux * hw, ey1 = y1 - uy * hw;
            const ex2 = x2 + ux * hw, ey2 = y2 + uy * hw;
            ctx.beginPath();
            ctx.moveTo(ex1 + nx * hw, ey1 + ny * hw);
            ctx.lineTo(ex2 + nx * hw, ey2 + ny * hw);
            ctx.lineTo(ex2 - nx * hw, ey2 - ny * hw);
            ctx.lineTo(ex1 - nx * hw, ey1 - ny * hw);
            ctx.closePath();
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
          let pts: Point[];
          try {
            const parsed = JSON.parse(props['Points'].value as string);
            if (!Array.isArray(parsed) || parsed.length < 2) continue;
            pts = parsed as Point[];
          } catch { continue; }
          ctx.beginPath();
          ctx.moveTo(pts[0]!.x, pts[0]!.y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
          if (type === 'polygon') { ctx.closePath(); ctx.fill(); }
          ctx.stroke();
        }
      } else if (type === 'door' || type === 'window') {
        // Doors and windows are drawn oriented along their host wall so a
        // horizontal wall gets a horizontal opening marker, not a square
        // axis-aligned rect that reads as "perpendicular to the wall".
        const cx = (props['X']?.value as number | undefined) ?? 0;
        const cy = (props['Y']?.value as number | undefined) ?? 0;
        const w = (props['Width']?.value as number | undefined) ?? (type === 'door' ? 900 : 1200);
        const hostId = (props['HostWallId']?.value as string | undefined) ?? '';
        let ang = 0; // rotation angle (radians) — default horizontal
        let depth = 200; // plan-view depth (perpendicular to wall) — wall thickness
        if (hostId && doc) {
          const host = doc.content.elements[hostId];
          if (host && host.type === 'wall') {
            const hp = host.properties as Record<string, { value: unknown }>;
            const x1 = (hp['StartX']?.value as number | undefined) ?? 0;
            const y1 = (hp['StartY']?.value as number | undefined) ?? 0;
            const x2 = (hp['EndX']?.value as number | undefined) ?? x1 + 1000;
            const y2 = (hp['EndY']?.value as number | undefined) ?? y1;
            ang = Math.atan2(y2 - y1, x2 - x1);
            depth = (hp['Width']?.value as number | undefined) ?? 200;
          }
        }
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.rect(-w / 2, -depth / 2, w, depth);
        // Distinguish door vs window visually — door filled, window outlined
        // with a centerline indicating glass.
        if (type === 'door') {
          ctx.fill(); ctx.stroke();
        } else {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-w / 2, 0);
          ctx.lineTo(w / 2, 0);
          ctx.stroke();
        }
        ctx.restore();
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

      // Multi-click tools (polygon, polyline, slab, roof, railing):
      // draw committed vertices + rubber-band to current cursor so the user
      // actually SEES what they're drawing. Without this, slab/roof/railing
      // felt completely unresponsive — the clicks were being recorded but
      // produced no visible feedback until commit.
      if (
        (activeTool === 'polygon' ||
         activeTool === 'polyline' ||
         activeTool === 'slab' ||
         activeTool === 'roof' ||
         activeTool === 'railing') &&
        points.length > 0
      ) {
        const isAreaTool = activeTool === 'polygon' || activeTool === 'slab' || activeTool === 'roof';
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, points[0]!.y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
        if (currentPoint) ctx.lineTo(cp.x, cp.y);
        // Close-back hint: if the area tool already has 3+ points, draw a
        // dashed guide from the cursor back to the first point.
        if (isAreaTool && points.length >= 3 && currentPoint) {
          ctx.moveTo(cp.x, cp.y);
          ctx.lineTo(points[0]!.x, points[0]!.y);
        }
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

    // ── Resize handles for selected elements ────────────────────────────────
    if (activeTool === 'select' && doc) {
      const handleHalfW = HANDLE_SIZE_PX * v.scale;
      for (const id of selectedIds) {
        const el = doc.content.elements[id];
        if (!el) continue;
        const handles = getHandles(el as ElementSchema);
        for (const h of handles) {
          ctx.fillStyle   = theme.selected;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth   = 0.8 * v.scale;
          ctx.beginPath();
          ctx.rect(h.x - handleHalfW, h.y - handleHalfW, handleHalfW * 2, handleHalfW * 2);
          ctx.fill(); ctx.stroke();
        }
      }
    }

    // ── Rubber-band selection rect ───────────────────────────────────────────
    const inter = interactionRef.current;
    if (inter.mode === 'rubber-band') {
      const { startWorld: sw, currentWorld: cw2 } = inter;
      const rx = Math.min(sw.x, cw2.x), ry = Math.min(sw.y, cw2.y);
      const rw = Math.abs(cw2.x - sw.x), rh = Math.abs(cw2.y - sw.y);
      ctx.strokeStyle = theme.accent;
      ctx.fillStyle   = theme.selectedFill;
      ctx.lineWidth   = 1 * v.scale;
      ctx.setLineDash([4 * v.scale, 4 * v.scale]);
      ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // ── Screen-space text labels — uses pre-collected visible elements from first pass ──
    ctx.font = '10px sans-serif';
    for (const { element: el } of visibleLabelTargets) {
      const typedEl = el as { id: string; type: string; properties: Record<string, { value: unknown }> };
      const props = typedEl.properties;
      const type = typedEl.type;
      if (type === 'wall' && props['StartX']) {
        const x1 = props['StartX']!.value as number, y1 = props['StartY']!.value as number;
        const x2 = props['EndX']!.value as number, y2 = props['EndY']!.value as number;
        const p1s = worldToScreen(x1, y1, cw, ch, v);
        const p2s = worldToScreen(x2, y2, cw, ch, v);
        ctx.fillStyle = theme.element;
        ctx.fillText('Wall', Math.min(p1s.x, p2s.x) + 4, Math.min(p1s.y, p2s.y) + 12);
      }
      if (type === 'dimension' && props['Value']) {
        const x1 = props['StartX']!.value as number, y1 = props['StartY']!.value as number;
        const x2 = props['EndX']!.value as number, y2 = props['EndY']!.value as number;
        const d = props['Value']!.value as number;
        const p1s = worldToScreen(x1, y1, cw, ch, v);
        const p2s = worldToScreen(x2, y2, cw, ch, v);
        ctx.fillStyle = selectedIds.includes(typedEl.id) ? theme.selected : theme.element;
        ctx.fillText(`${Math.round(d / v.scale)}`, (p1s.x + p2s.x) / 2 + 4, (p1s.y + p2s.y) / 2 - 6);
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
    // Raw world point — no snapping applied here; snapping only makes sense for drawing, not selection
    const rawWp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height, v);

    if (activeTool === 'select') {
      if (!doc) return;
      const HIT  = 8  * v.scale;  // hit tolerance in world units
      const HNDL = HANDLE_SIZE_PX * v.scale; // handle half-size in world units
      const elements = Object.values(doc.content.elements) as ElementSchema[];
      const currentSelected = getStoreActions().selectedIds;

      // 1. Check if clicking a resize handle on a currently-selected element
      for (const id of currentSelected) {
        const el = doc.content.elements[id];
        if (!el) continue;
        const handles = getHandles(el as ElementSchema);
        const hit = hitHandle(rawWp, handles, HNDL * 1.5);
        if (hit) {
          interactionRef.current = { mode: 'resizing', handle: hit.kind, elementId: id };
          dirtyRef.current = true;
          return;
        }
      }

      // 2. Check if clicking any element
      const hitEl = elements.find((el) => hitTestElement(rawWp, el, HIT));
      if (hitEl) {
        // If shift is held, toggle this element in/out of the selection
        const newSel = event.shiftKey
          ? (currentSelected.includes(hitEl.id)
              ? currentSelected.filter((x) => x !== hitEl.id)
              : [...currentSelected, hitEl.id])
          : (currentSelected.includes(hitEl.id)
              ? currentSelected  // already selected → don't reset
              : [hitEl.id]);
        if (!event.shiftKey && !currentSelected.includes(hitEl.id)) setSelectedIds([hitEl.id]);
        else if (event.shiftKey) setSelectedIds(newSel);

        // Start a drag-pending so a subsequent move becomes a drag
        const selIds = getStoreActions().selectedIds.length > 0
          ? getStoreActions().selectedIds
          : [hitEl.id];
        interactionRef.current = {
          mode: 'drag-pending',
          startScreen: { x: event.clientX, y: event.clientY },
          elementIds: selIds,
        };
        dirtyRef.current = true;
        return;
      }

      // 3. Click on empty space → start rubber-band selection
      if (!event.shiftKey) setSelectedIds([]);
      interactionRef.current = { mode: 'rubber-band', startWorld: rawWp, currentWorld: rawWp };
      dirtyRef.current = true;
      return;
    }

    let wp = rawWp;
    wp = applySnapping(wp);

    // Single-click placement tools — column, door, window all place at
    // the clicked point (walls are resolved as the nearest host for
    // doors/windows inside commitShape).
    if (activeTool === 'column' || activeTool === 'door' || activeTool === 'window') {
      commitShape(activeTool, wp, wp);
      return;
    }

    if (DRAG_TOOLS.has(activeTool)) {
      setDrawingState({ isDrawing: true, startPoint: wp, currentPoint: wp, points: [] });
      return;
    }

    if (MULTICLICK_TOOLS.has(activeTool)) {
      // Commit logic OUTSIDE the reducer — otherwise React.StrictMode
      // double-invokes the reducer in dev and we double-commit the element.
      const scale = viewTransformRef.current.scale;
      const isCloseable = activeTool === 'polygon' || activeTool === 'slab' || activeTool === 'roof';
      const prev = drawingState;
      if (isCloseable && prev.points.length >= 3 && prev.points[0] && dist(wp, prev.points[0]) < SNAP_TOLERANCE * scale) {
        commitShape(activeTool, prev.points[0], prev.points[prev.points.length - 1]!, prev.points);
        setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
      } else {
        setDrawingState((p) => {
          const newPoints = [...p.points, wp];
          return { isDrawing: true, startPoint: newPoints[0]!, currentPoint: wp, points: newPoints };
        });
      }
    }
  }, [activeTool, doc, drawingState, setSelectedIds, setActiveTool, applySnapping, commitShape]);

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
    const rawWp = screenToWorld(event.clientX - rect.left, event.clientY - rect.top, canvas.width, canvas.height, v);

    // ── Select-tool interactions ──────────────────────────────────────────────
    const inter = interactionRef.current;

    if (inter.mode === 'drag-pending') {
      const dx = event.clientX - inter.startScreen.x;
      const dy = event.clientY - inter.startScreen.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
        interactionRef.current = { mode: 'dragging', lastWorld: rawWp, elementIds: inter.elementIds };
        canvas.style.cursor = 'grabbing';
      }
      return;
    }

    if (inter.mode === 'dragging') {
      const snapped = applySnapping(rawWp);
      const dxW = snapped.x - inter.lastWorld.x;
      const dyW = snapped.y - inter.lastWorld.y;
      interactionRef.current = { ...inter, lastWorld: snapped };
      const docNow = getStoreActions().document;
      if (docNow && (dxW !== 0 || dyW !== 0)) {
        for (const id of inter.elementIds) {
          const el = docNow.content.elements[id];
          if (!el) continue;
          const moved = moveElementProps(el as ElementSchema, dxW, dyW);
          updateElement(id, { properties: { ...el.properties, ...moved } });
        }
      }
      dirtyRef.current = true;
      return;
    }

    if (inter.mode === 'resizing') {
      const snapped = applySnapping(rawWp);
      const docNow = getStoreActions().document;
      if (docNow) {
        const el = docNow.content.elements[inter.elementId];
        if (el) {
          const resized = resizeElementProps(el as ElementSchema, inter.handle, snapped);
          updateElement(inter.elementId, { properties: { ...el.properties, ...resized } });
        }
      }
      dirtyRef.current = true;
      return;
    }

    if (inter.mode === 'rubber-band') {
      interactionRef.current = { ...inter, currentWorld: rawWp };
      dirtyRef.current = true;
      return;
    }

    // ── Update cursor when hovering over handles ───────────────────────────
    if (activeTool === 'select') {
      const docNow = getStoreActions().document;
      if (docNow) {
        const HNDL = HANDLE_SIZE_PX * v.scale;
        for (const id of getStoreActions().selectedIds) {
          const el = docNow.content.elements[id];
          if (!el) continue;
          const hh = hitHandle(rawWp, getHandles(el as ElementSchema), HNDL * 1.5);
          if (hh) { canvas.style.cursor = hh.cursor; return; }
        }
        canvas.style.cursor = 'default';
      }
    }

    // ── Drawing tool preview ───────────────────────────────────────────────
    const wp = applySnapping(rawWp);
    if (!drawingState.isDrawing) return;
    setDrawingState((prev) => ({ ...prev, currentPoint: wp }));
  }, [drawingState.isDrawing, applySnapping, setView, updateElement, activeTool]);

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // End pan
    if (panRef.current.active) {
      panRef.current.active = false;
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = activeTool === 'select' ? 'default' : 'crosshair';
      return;
    }

    // ── Commit select-tool interactions ──────────────────────────────────────
    const inter = interactionRef.current;

    if (inter.mode === 'drag-pending') {
      // Mouseup without drag → just a click, already handled in mousedown
      interactionRef.current = { mode: 'idle' };
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'default';
      return;
    }

    if (inter.mode === 'dragging') {
      pushHistory('Move elements');
      interactionRef.current = { mode: 'idle' };
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'default';
      dirtyRef.current = true;
      return;
    }

    if (inter.mode === 'resizing') {
      pushHistory('Resize element');
      interactionRef.current = { mode: 'idle' };
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'default';
      dirtyRef.current = true;
      return;
    }

    if (inter.mode === 'rubber-band') {
      const { startWorld: sw, currentWorld: cw2 } = inter;
      const minX = Math.min(sw.x, cw2.x), maxX = Math.max(sw.x, cw2.x);
      const minY = Math.min(sw.y, cw2.y), maxY = Math.max(sw.y, cw2.y);
      if (maxX - minX > 5 && maxY - minY > 5) {
        const docNow = getStoreActions().document;
        if (docNow) {
          const hits = (Object.values(docNow.content.elements) as ElementSchema[])
            .filter((el) => {
              const bb = el.boundingBox;
              return bb.min.x >= minX && bb.max.x <= maxX && bb.min.y >= minY && bb.max.y <= maxY;
            })
            .map((el) => el.id);
          if (event.shiftKey) {
            setSelectedIds([...new Set([...getStoreActions().selectedIds, ...hits])]);
          } else {
            setSelectedIds(hits);
          }
        }
      }
      interactionRef.current = { mode: 'idle' };
      dirtyRef.current = true;
      return;
    }

    // ── Drawing tool commit ───────────────────────────────────────────────────
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
      // Intentionally keep activeTool so the user can keep drawing the same
      // type of element. Press Escape or V to return to the select tool.
    }
    // Multi-click tools don't commit on mouseUp, only on next click or double-click
  }, [activeTool, drawingState, applySnapping, commitShape, pushHistory, setSelectedIds]);

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
    // Commit OUTSIDE the reducer — impure reducers run twice under StrictMode
    // in dev and would double-commit the element.
    const prev = drawingState;
    if (prev.points.length >= 2) {
      const finalPoints = [...prev.points, wp];
      commitShape(activeTool, prev.points[0]!, finalPoints[finalPoints.length - 1]!, finalPoints);
    }
    setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
    // Intentionally keep activeTool — user can draw another multi-vertex shape
    // of the same type without re-selecting the tool.
  }, [activeTool, drawingState, applySnapping, commitShape]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore shortcuts when typing in an input / textarea
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const ctrl = event.ctrlKey || event.metaKey;

    if (event.key === 'Escape') {
      setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
      interactionRef.current = { mode: 'idle' };
      setActiveTool('select');
      dirtyRef.current = true;
    }

    // ── Undo / redo / save ──────────────────────────────────────────────────
    if (ctrl && event.key === 'z' && !event.shiftKey) { event.preventDefault(); getStoreActions().undo(); return; }
    if (ctrl && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) { event.preventDefault(); getStoreActions().redo(); return; }
    if (ctrl && event.key === 's') { event.preventDefault(); getStoreActions().pushHistory('Manual save'); return; }

    // ── Select all ──────────────────────────────────────────────────────────
    if (ctrl && event.key === 'a') {
      event.preventDefault();
      const docNow = getStoreActions().document;
      if (docNow) setSelectedIds(Object.keys(docNow.content.elements));
      return;
    }

    // ── Deselect all ────────────────────────────────────────────────────────
    if (ctrl && event.key === 'd') {
      event.preventDefault();
      setSelectedIds([]);
      return;
    }

    // ── Copy ────────────────────────────────────────────────────────────────
    if (ctrl && event.key === 'c') {
      event.preventDefault();
      const docNow = getStoreActions().document;
      const selIds = getStoreActions().selectedIds;
      if (docNow && selIds.length > 0) {
        clipboardRef.current = selIds
          .map((id) => docNow.content.elements[id])
          .filter((el): el is ElementSchema => !!el)
          .map((el) => JSON.parse(JSON.stringify(el)) as ElementSchema);
        pasteCountRef.current = 0;
      }
      return;
    }

    // ── Cut ─────────────────────────────────────────────────────────────────
    if (ctrl && event.key === 'x') {
      event.preventDefault();
      const docNow = getStoreActions().document;
      const selIds = getStoreActions().selectedIds;
      if (docNow && selIds.length > 0) {
        clipboardRef.current = selIds
          .map((id) => docNow.content.elements[id])
          .filter((el): el is ElementSchema => !!el)
          .map((el) => JSON.parse(JSON.stringify(el)) as ElementSchema);
        pasteCountRef.current = 0;
        selIds.forEach((id) => deleteElement(id));
        pushHistory('Cut elements');
        setSelectedIds([]);
      }
      return;
    }

    // ── Paste ────────────────────────────────────────────────────────────────
    if (ctrl && event.key === 'v') {
      event.preventDefault();
      if (clipboardRef.current.length === 0) return;
      pasteCountRef.current += 1;
      const offset = pasteCountRef.current * PASTE_OFFSET;
      const docNow = getStoreActions().document;
      if (!docNow) return;
      const layerId = Object.keys(docNow.organization.layers)[0] || 'default';
      const newIds: string[] = [];
      for (const src of clipboardRef.current) {
        const moved = moveElementProps(src, offset, offset);
        const newId = getStoreActions().addElement({
          type: src.type,
          layerId,
          properties: { ...src.properties, ...moved },
        });
        newIds.push(newId);
      }
      pushHistory('Paste elements');
      setSelectedIds(newIds);
      return;
    }

    // ── Duplicate (Ctrl+Shift+D or Ctrl+J) ────────────────────────────────
    if (ctrl && (event.key === 'j' || (event.shiftKey && event.key === 'd'))) {
      event.preventDefault();
      const docNow = getStoreActions().document;
      const selIds = getStoreActions().selectedIds;
      if (!docNow || selIds.length === 0) return;
      const layerId = Object.keys(docNow.organization.layers)[0] || 'default';
      const newIds: string[] = [];
      for (const id of selIds) {
        const src = docNow.content.elements[id];
        if (!src) continue;
        const moved = moveElementProps(src as ElementSchema, PASTE_OFFSET, PASTE_OFFSET);
        const newId = getStoreActions().addElement({
          type: src.type,
          layerId,
          properties: { ...src.properties, ...moved },
        });
        newIds.push(newId);
      }
      pushHistory('Duplicate elements');
      setSelectedIds(newIds);
      return;
    }

    if (ctrl || event.altKey) return;

    // ── Tool shortcuts ──────────────────────────────────────────────────────
    const shortcuts: Record<string, string> = {
      v: 'select', w: 'wall', d: 'door', n: 'window', s: 'slab', o: 'roof',
      k: 'column', b: 'beam', t: 'stair', l: 'line', r: 'rectangle',
      c: 'circle', a: 'arc', p: 'polygon', m: 'dimension', x: 'text',
    };
    const key = event.key.toLowerCase();
    if (shortcuts[key]) { setActiveTool(shortcuts[key]); return; }

    // ── Delete / Backspace ──────────────────────────────────────────────────
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const state = getStoreActions();
      if (state.selectedIds.length === 0) return;
      event.preventDefault();
      state.selectedIds.forEach((id) => state.deleteElement(id));
      state.pushHistory('Delete elements');
      state.setSelectedIds([]);
      return;
    }

    // ── Arrow-key nudge ─────────────────────────────────────────────────────
    const ARROW_MAP: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    if (ARROW_MAP[event.key]) {
      event.preventDefault();
      const [ddx, ddy] = ARROW_MAP[event.key]!;
      const nudge = event.shiftKey ? GRID_SIZE : 100; // shift = 500mm, normal = 100mm
      const dxW = ddx * nudge, dyW = ddy * nudge;
      const docNow = getStoreActions().document;
      const selIds = getStoreActions().selectedIds;
      if (!docNow || selIds.length === 0) return;
      for (const id of selIds) {
        const el = docNow.content.elements[id];
        if (!el) continue;
        const moved = moveElementProps(el as ElementSchema, dxW, dyW);
        updateElement(id, { properties: { ...el.properties, ...moved } });
      }
      pushHistory('Nudge elements');
      return;
    }

    // ── Snap toggle (hold Ctrl) ──────────────────────────────────────────────
    if (event.key === 'Control') setSnapEnabled(false);
  }, [setActiveTool, setSelectedIds, deleteElement, pushHistory, updateElement]);

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

  // Update canvas cursor based on active tool
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = activeTool === 'select' ? 'default' : 'crosshair';
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
