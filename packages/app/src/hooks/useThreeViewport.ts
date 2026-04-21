import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { useDocumentStore } from '../stores/documentStore';
import { type ElementSchema } from '@opencad/document';
import { BUILT_IN_MATERIALS, type Material } from '../lib/materials';
import { getPBRMaps } from '../lib/proceduralTextures';
import { moveElementProps } from '../utils/elementMath';
import { getContextMenuItems, type ContextMenuGroup, type ElementContext } from '../components/contextMenu/contextMenuItems';
import { buildWallGraph, wallEndOffsets } from './wallGraph';
import { trimBeamAtColumns } from '../lib/seoResolver';
import type { Composite } from '@opencad/document';

// Patch Three.js prototypes once at module level for BVH-accelerated raycasting
THREE.Mesh.prototype.raycast = acceleratedRaycast;
(THREE.BufferGeometry.prototype as THREE.BufferGeometry & {
  computeBoundsTree: typeof computeBoundsTree;
  disposeBoundsTree: typeof disposeBoundsTree;
}).computeBoundsTree = computeBoundsTree;
(THREE.BufferGeometry.prototype as THREE.BufferGeometry & {
  disposeBoundsTree: typeof disposeBoundsTree;
}).disposeBoundsTree = disposeBoundsTree;

// ─── LOD Types & Frame Stats (status bar) ────────────────────────────────────

/** Level of detail tier for 3D geometry rendering */
export type LodLevel = 'high' | 'medium' | 'low';

export function getLodLevel(distance: number): LodLevel {
  if (distance < 5000) return 'high';
  if (distance < 20000) return 'medium';
  return 'low';
}

export interface FrameStats {
  avgFrameMs: number;
  currentLod: LodLevel;
}

let _sharedFrameStats: FrameStats = { avgFrameMs: 16.67, currentLod: 'high' };

export function getSharedFrameStats(): FrameStats {
  return _sharedFrameStats;
}

export function _publishFrameStats(stats: FrameStats): void {
  _sharedFrameStats = stats;
}

/** Published XYZ of the selected element (or null when nothing selected). */
export interface SelectedCoords {
  x: number;
  y: number;
  z: number;
  elementId: string;
}

let _sharedSelectedCoords: SelectedCoords | null = null;

export function getSharedSelectedCoords(): SelectedCoords | null {
  return _sharedSelectedCoords;
}

export function _publishSelectedCoords(coords: SelectedCoords | null): void {
  _sharedSelectedCoords = coords;
}

const LIGHT_THEME = {
  sceneBackground: 0xf1f5f9,
  gridColor: 0xcbd5e1,
  gridColor2: 0xe2e8f0,
  selectionEmissive: 0x4f46e5,
};

const DARK_THEME = {
  sceneBackground: 0x1a1a2e,
  gridColor: 0x444466,
  gridColor2: 0x333355,
  selectionEmissive: 0x1a1a2e,
};

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

interface ViewportState {
  camera: THREE.PerspectiveCamera | null;
  renderer: GenericRenderer | null;
  scene: THREE.Scene | null;
}

export type ViewPreset = 'top' | 'front' | 'right' | '3d' | 'perspective';

interface CameraState {
  target: THREE.Vector3;
  distance: number;
  azimuth: number;
  elevation: number;
}

const VIEW_PRESETS: Record<ViewPreset, { azimuth: number; elevation: number; distance: number }> = {
  top:         { azimuth: 0,           elevation: 0.01,        distance: 10000 },
  front:       { azimuth: 0,           elevation: Math.PI / 2, distance: 10000 },
  right:       { azimuth: Math.PI / 2, elevation: Math.PI / 2, distance: 10000 },
  '3d':        { azimuth: Math.PI / 4, elevation: Math.PI / 4, distance: 10000 },
  perspective: { azimuth: Math.PI / 4, elevation: Math.PI / 6, distance: 8000  },
};

// Architectural palette — each element type uses a distinct warm/cool hue so
// walls, floor, and roof read as clearly separate surfaces in 3D instead of
// blending into a uniform grey mass.
const ELEMENT_COLORS: Record<string, string> = {
  wall:       '#e4dccb', // warm off-white — plaster / painted drywall
  slab:       '#7d7d7d', // neutral concrete grey — clearly darker than walls
  roof:       '#8a4a3a', // terracotta — unmistakable from walls and slab
  column:     '#cfa95c', // warm amber — pops against plaster walls
  beam:       '#7a6a54', // dark timber / beam brown
  door:       '#b07842', // varnished hardwood
  window:     '#9ec7df', // pale glass blue
  stair:      '#a39079', // taupe
  railing:    '#606060', // darker metal
  space:      '#d0e8d0', // light mint (room shading)
  annotation: '#7890a8',
  line:       '#7890a8',
  rectangle:  '#8898b0',
  circle:     '#8898b0',
  arc:        '#8898b0',
  polygon:    '#8898b0',
  polyline:   '#8898b0',
  dimension:  '#a0a0b8',
  text:       '#b0b0c0',
};

// PBR material properties per element type
const ELEMENT_MATERIAL_PROPS: Record<string, { roughness: number; metalness: number }> = {
  wall:    { roughness: 0.85, metalness: 0.0 },
  slab:    { roughness: 0.9,  metalness: 0.0 },
  column:  { roughness: 0.7,  metalness: 0.1 },
  door:    { roughness: 0.6,  metalness: 0.0 },
  window:  { roughness: 0.1,  metalness: 0.0 },
  beam:    { roughness: 0.5,  metalness: 0.4 },
  stair:   { roughness: 0.8,  metalness: 0.0 },
  roof:    { roughness: 0.9,  metalness: 0.0 },
  railing: { roughness: 0.4,  metalness: 0.6 },
  space:   { roughness: 0.95, metalness: 0.0 },
};
const DEFAULT_MATERIAL_PROPS = { roughness: 0.8, metalness: 0.0 };

// Generic renderer interface — compatible with both WebGLRenderer and WebGPURenderer
interface GenericRenderer {
  setSize(width: number, height: number): void;
  setPixelRatio(value: number): void;
  shadowMap: { enabled: boolean; type: THREE.ShadowMapType };
  clippingPlanes: THREE.Plane[];
  domElement: HTMLCanvasElement;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
}

/** Opt-out check: `?renderer=webgl` or `localStorage.opencad-renderer = 'webgl'`. */
function isWebGLForced(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const q = new URLSearchParams(window.location.search).get('renderer');
    if (q === 'webgl') return true;
    if (q === 'webgpu') return false;
    return window.localStorage?.getItem('opencad-renderer') === 'webgl';
  } catch { return false; }
}

/**
 * Create the 3D renderer. Defaults to WebGPU on browsers that expose
 * `navigator.gpu`; falls back to WebGL on any failure. Opt out with
 * `?renderer=webgl` or `localStorage.opencad-renderer = 'webgl'`.
 */
async function createRenderer(): Promise<GenericRenderer> {
  if (isWebGLForced()) {
    return new THREE.WebGLRenderer({ antialias: true }) as unknown as GenericRenderer;
  }
  if (typeof navigator === 'undefined' || !(navigator as { gpu?: unknown }).gpu) {
    return new THREE.WebGLRenderer({ antialias: true }) as unknown as GenericRenderer;
  }
  try {
    const mod = await import('three/webgpu');
    const WebGPURenderer = (mod as unknown as {
      WebGPURenderer: new (params?: unknown) => unknown;
    }).WebGPURenderer;
    if (!WebGPURenderer) throw new Error('WebGPURenderer missing from three/webgpu module');
    const gpu = new WebGPURenderer({ antialias: true }) as unknown as GenericRenderer & {
      init?: () => Promise<unknown>;
    };
    await gpu.init?.();
    console.info('[viewport] WebGPU renderer active.');
    return gpu;
  } catch (err) {
    console.info('[viewport] WebGPU init failed, using WebGL:', err);
    return new THREE.WebGLRenderer({ antialias: true }) as unknown as GenericRenderer;
  }
}

// ─── Module-level geometry helpers ───────────────────────────────────────────

/** Recursively dispose buffer geometries in a scene object (materials are cached — never disposed here). */
function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) child.geometry.dispose();
  });
}

/** Find door/window openings hosted by a wall, returning wall-local t positions. */
function findWallOpenings(
  wall: ElementSchema,
  allElements: Record<string, ElementSchema>
): Array<{ t: number; width: number; height: number; sillH: number }> {
  const props = wall.properties as Record<string, { value: unknown }>;
  const pv = (k: string, fb: number) =>
    typeof props[k]?.value === 'number' ? (props[k]!.value as number) : fb;

  const x1 = pv('StartX', 0), y1 = pv('StartY', 0);
  const x2 = pv('EndX', x1 + 1000), y2 = pv('EndY', y1);
  const wallLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1;
  const wallT   = pv('Width', 200);
  const uX = (x2 - x1) / wallLen;
  const uY = (y2 - y1) / wallLen;

  const result: Array<{ t: number; width: number; height: number; sillH: number }> = [];

  for (const el of Object.values(allElements)) {
    if (el.type !== 'door' && el.type !== 'window') continue;

    const ep  = el.properties as Record<string, { value: unknown }>;
    const epv = (k: string, fb: number) =>
      typeof ep[k]?.value === 'number' ? (ep[k]!.value as number) : fb;

    // HostWallId is set at placement time and is authoritative. In a
    // multi-story building the same (x,y) sits on stacked walls at different
    // elevations — without this check, the ground-floor wall would inherit
    // openings intended for the floors above it.
    const hostId = (ep['HostWallId']?.value as string | undefined) ?? '';
    if (hostId && hostId !== wall.id) continue;

    const ex = epv('X', 0), ey = epv('Y', 0);
    const dx = ex - x1, dy = ey - y1;
    const t    = dx * uX + dy * uY;          // distance along wall
    const perp = Math.abs(dx * uY - dy * uX); // perpendicular distance

    const w     = epv('Width',  el.type === 'door' ? 900  : 1200);
    const h     = epv('Height', el.type === 'door' ? 2100 : 1200);
    const sillH = el.type === 'window' ? epv('SillHeight', 900) : 0;

    if (t >= -w / 2 && t <= wallLen + w / 2 && perp <= wallT * 1.5) {
      result.push({ t, width: w, height: h, sillH });
    }
  }

  return result;
}

/**
 * Fingerprint for a wall's current openings AND junctions — used to detect
 * when to rebuild the wall mesh. A neighbouring wall moving changes the
 * junction offsets on this wall even though this wall's own properties
 * didn't change, so we fold junction kind + t + other-wall thickness into
 * the fingerprint.
 */
function wallOpeningsFingerprint(
  wall: ElementSchema,
  allElements: Record<string, ElementSchema>
): string {
  const graph = buildWallGraph(allElements);
  const joins = (graph.get(wall.id) ?? [])
    .map((j) => {
      const other = allElements[j.otherWallId];
      const otherW = other && typeof (other.properties as Record<string, { value: unknown }>)['Width']?.value === 'number'
        ? ((other.properties as Record<string, { value: unknown }>)['Width']!.value as number)
        : 0;
      return `J:${j.kind}:${j.t.toFixed(3)}:${Math.round(otherW)}`;
    })
    .sort()
    .join('|');
  const openings = findWallOpenings(wall, allElements)
    .map((o) => `${Math.round(o.t)},${o.width},${o.height},${o.sillH}`)
    .sort()
    .join('|');
  return `${joins}||${openings}`;
}

/**
 * Build a wall Object3D with openings cut out.
 * Returns a single Mesh when there are no openings, or a Group of split segments.
 * All segments share the supplied material (from the hook's material cache).
 */
function buildWallMesh(
  element: ElementSchema,
  allElements: Record<string, ElementSchema>,
  mat: THREE.MeshStandardMaterial,
  composites?: Record<string, Composite>,
): THREE.Object3D {
  const props = element.properties as Record<string, { value: unknown }>;
  const pv = (k: string, fb: number) =>
    typeof props[k]?.value === 'number' ? (props[k]!.value as number) : fb;

  const x1 = pv('StartX', 0), y1 = pv('StartY', 0);
  const x2 = pv('EndX',   x1 + 1000), y2 = pv('EndY', y1);
  const wallH = pv('Height', 3000);
  const wallT = pv('Width',  200);
  // Per-level vertical offset lets multi-story buildings stack walls at
  // story heights (e.g. ground floor at 0, second floor at 3000). Defaults
  // to 0 for single-story plans.
  const elevOffset = pv('ElevationOffset', 0);
  const len   = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1000;
  const ry    = -Math.atan2(y2 - y1, x2 - x1);

  // Per-wall junction offsets — extend each end by the neighbouring wall's
  // half-thickness at L-corners (closes the outside notch), but leave T/X
  // junctions and truly-open ends alone so the stub doesn't float past the
  // through-wall. Falls back to wallT/2 on both ends when the graph
  // reports nothing (standalone wall) so the open-corner geometry keeps
  // working on fragmented plans.
  const graph    = buildWallGraph(allElements);
  const offsets  = wallEndOffsets(element.id, graph, allElements);
  const joinCount = (graph.get(element.id) ?? []).length;
  const defaultOvershoot = joinCount === 0 ? wallT / 2 : 0;
  const startOv  = offsets.startOffset > 0 ? offsets.startOffset : defaultOvershoot;
  const endOv    = offsets.endOffset   > 0 ? offsets.endOffset   : defaultOvershoot;
  const lenExt   = len + startOv + endOv;

  // Shift the centre of the extended mesh so the overshoot lands outside
  // the original endpoints rather than offsetting one side.
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const cx = (x1 + x2) / 2 + ux * (endOv - startOv) / 2;
  const cz = (y1 + y2) / 2 + uy * (endOv - startOv) / 2;

  const tag = (obj: THREE.Object3D) => {
    obj.userData.elementId   = element.id;
    obj.userData.elementType = 'wall';
    obj.castShadow    = true;
    obj.receiveShadow = true;
  };

  const openings = findWallOpenings(element, allElements);

  // ── Composite lookup (T-MOD-004) ──────────────────────────────────────────
  // A wall carries CompositeId pointing at doc.library.composites. When we
  // have a composite + no openings, render as N stacked boxes along the
  // wall perpendicular so the brick / cavity / insulation / plaster read as
  // distinct surfaces. Falls back to the single-material box otherwise.
  const compositeId = typeof (props as Record<string, { value: unknown }>)['CompositeId']?.value === 'string'
    ? ((props as Record<string, { value: unknown }>)['CompositeId']!.value as string) : '';
  const composite = composites && compositeId ? composites[compositeId] : undefined;

  // ── Solid composite wall (no openings + composite present) ────────────────
  // Inline material resolver — builds a MeshStandardMaterial per layer name,
  // falling back to the wall's default material when the name is unknown.
  // Not cached (v1); fine for fewer than a few hundred walls.
  const materialFor = (name: string): THREE.MeshStandardMaterial => {
    const m = BUILT_IN_MATERIALS.find((bm) => bm.name === name);
    if (!m) return mat;
    const color = new THREE.Color(m.color ?? '#a0a0a0');
    const isGlass = /Glass/i.test(name);
    const isAir   = /Air Cavity/i.test(name);
    const layerMat = new THREE.MeshStandardMaterial({
      color,
      roughness: m.roughness ?? 0.8,
      metalness: m.metalness ?? 0,
      transparent: isGlass || isAir,
      opacity: isGlass ? 0.35 : isAir ? 0.05 : 1,
    });
    try {
      const { map, roughnessMap } = getPBRMaps(m);
      layerMat.map = map;
      layerMat.roughnessMap = roughnessMap;
    } catch {
      /* no-op — textured fallback to flat color */
    }
    return layerMat;
  };
  if (openings.length === 0 && composite && composite.layers.length > 0) {
    const group = new THREE.Group();
    group.position.set(cx, elevOffset + wallH / 2, cz);
    group.rotation.y = ry;
    tag(group);
    // Layers are listed inside-to-outside. Render them centered on the
    // wall's reference line (the core layer if present, otherwise the
    // geometric centre).
    let cursorIn = -wallT / 2; // start at the "interior" face along Z
    for (const layer of composite.layers) {
      const layerMat = materialFor(layer.material);
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(lenExt, wallH, layer.thickness),
        layerMat,
      );
      m.position.set(0, 0, cursorIn + layer.thickness / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.elementId = element.id;
      m.userData.elementType = 'wall';
      m.userData.compositeLayer = layer.material;
      group.add(m);
      cursorIn += layer.thickness;
    }
    return group;
  }

  // ── Solid wall (no openings, no composite — legacy single-material) ──────
  if (openings.length === 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(lenExt, wallH, wallT), mat);
    mesh.position.set(cx, elevOffset + wallH / 2, cz);
    mesh.rotation.y = ry;
    tag(mesh);
    return mesh;
  }

  // ── Split wall with openings ──────────────────────────────────────────────
  // Group is positioned at the wall midpoint; all children are in wall-local space
  // (wall runs along local X from -len/2 to +len/2, Y is up, Z is thickness).
  const group = new THREE.Group();
  group.position.set(cx, elevOffset, cz);
  group.rotation.y = ry;
  tag(group);

  const addBox = (localX: number, boxW: number, yBot: number, yTop: number) => {
    if (boxW < 1 || yTop - yBot < 1) return;
    const h   = yTop - yBot;
    const m   = new THREE.Mesh(new THREE.BoxGeometry(boxW, h, wallT), mat);
    m.position.set(localX, yBot + h / 2, 0);
    m.castShadow    = true;
    m.receiveShadow = true;
    m.userData.elementId   = element.id;
    m.userData.elementType = 'wall';
    group.add(m);
  };

  const sorted = [...openings].sort((a, b) => a.t - b.t);
  // Wall runs local-X from -lenExt/2 to +lenExt/2 with asymmetric
  // junction-aware overshoots on each end (startOv on the StartX side,
  // endOv on the EndX side). Openings live in wall-local [0..len];
  // the start of the wall shifts left by startOv in local space.
  const leftOvershoot = startOv;
  let cursor = -leftOvershoot; // right edge of last filled segment

  for (const op of sorted) {
    const opLeft  = Math.max(0,   op.t - op.width / 2);
    const opRight = Math.min(len, op.t + op.width / 2);
    if (opRight <= opLeft) continue;

    // Full-height segment before this opening — extends all the way from the
    // previous cursor (which may be the wall's left overshoot on first pass)
    if (opLeft > cursor) {
      const w = opLeft - cursor;
      addBox(cursor + w / 2 - len / 2, w, 0, wallH);
    }

    const opW  = opRight - opLeft;
    const opCX = opLeft + opW / 2 - len / 2; // local-X centre of this column

    // Sill below window opening
    if (op.sillH > 0) addBox(opCX, opW, 0, op.sillH);

    // Lintel above opening
    const openingTop = op.sillH + op.height;
    if (openingTop < wallH) addBox(opCX, opW, openingTop, wallH);

    cursor = opRight;
  }

  // Full-height segment after last opening — extended past the EndX by the
  // junction-resolved endOv so adjacent walls overlap cleanly.
  const rightExt = len + endOv;
  if (cursor < rightExt) {
    const w = rightExt - cursor;
    addBox(cursor + w / 2 - len / 2, w, 0, wallH);
  }

  return group;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useThreeViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ViewportState>({ camera: null, renderer: null, scene: null });
  const cameraStateRef = useRef<CameraState>({
    target:    new THREE.Vector3(0, 0, 0),
    distance:  10000,
    azimuth:   Math.PI / 4,
    elevation: Math.PI / 4,
  });
  const animationFrameRef = useRef<number | null>(null);
  const rendererReadyRef  = useRef(false);
  const { document: doc, selectedIds, setSelectedIds } = useDocumentStore();

  const [sectionBox,       setSectionBox]       = useState(false);
  const [sectionPosition,  setSectionPosition]  = useState(0);
  const [sectionDirection, setSectionDirection] = useState<'x' | 'y' | 'z'>('z');
  // Flips true once the async renderer init completes. Gates the effects
  // that need stateRef.current.scene / .renderer, so they don't silently
  // early-return on the first render.
  const [rendererReady,    setRendererReady]    = useState(false);

  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; items: ContextMenuGroup } | null>(null);
  const closeContextMenu = useCallback(() => setContextMenuState(null), []);

  // Stable ref to selectedIds so the context-menu handler reads the latest value
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const saveSectionView = useCallback(() => {
    try {
      localStorage.setItem('opencad-section-view',
        JSON.stringify({ position: sectionPosition, direction: sectionDirection }));
    } catch { /* ignore */ }
  }, [sectionPosition, sectionDirection]);

  // Object3D (Mesh or Group) per element id
  const elementMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  // Last element data snapshot — for reference-equality change detection
  const elementDataRef   = useRef<Map<string, ElementSchema>>(new Map());
  // Wall opening fingerprints — detect when a nearby door/window changes
  const wallFingerprintsRef = useRef<Map<string, string>>(new Map());

  const hasAutoZoomedRef = useRef(false);
  const needsRenderRef   = useRef(true);
  const raycasterRef     = useRef(new THREE.Raycaster());
  const pickVec2Ref      = useRef(new THREE.Vector2());
  const materialCacheRef = useRef<Map<string, THREE.MeshStandardMaterial>>(new Map());

  // TransformControls — 3D gizmo for move/rotate/scale of selected elements
  const transformControlsRef = useRef<TransformControls | null>(null);
  const tcDraggingRef        = useRef(false);
  const tcElementIdRef       = useRef<string | null>(null);
  const tcInitPosRef         = useRef<THREE.Vector3 | null>(null);

  // Stable handler box — refreshed each render so the init effect can run
  // with empty deps while still dispatching to the latest callbacks.
  const handlersRef = useRef({
    mousedown:   (_e: MouseEvent) => {},
    mousemove:   (_e: MouseEvent) => {},
    wheel:       (_e: WheelEvent) => {},
    contextmenu: (_e: Event) => {},
    keydown:     (_e: KeyboardEvent) => {},
  });

  const createMaterial = useCallback(
    (
      color: string,
      opacity = 0.8,
      roughness = 0.8,
      metalness = 0.0,
      material?: Material,
    ): THREE.MeshStandardMaterial => {
      const key = `${color}:${opacity}:${roughness}:${metalness}:${material?.id ?? '-'}`;
      const cached = materialCacheRef.current.get(key);
      if (cached) return cached;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        roughness,
        metalness,
        side: THREE.DoubleSide,
      });
      // Apply procedural PBR textures when a named material is supplied.
      // Wrapped in try/catch so tests that stub THREE without CanvasTexture
      // still pass — production WebGL builds get textured surfaces.
      if (material) {
        try {
          const { map, roughnessMap } = getPBRMaps(material);
          mat.map = map;
          mat.roughnessMap = roughnessMap;
        } catch {
          /* no-op — textured fallback to flat color */
        }
      }
      materialCacheRef.current.set(key, mat);
      return mat;
    },
    []
  );

  const createMeshFromElement = useCallback(
    (element: ElementSchema, allElements: Record<string, ElementSchema> = {}): THREE.Object3D | null => {
      const props = element.properties as Record<string, { value: unknown }>;
      const pv = (key: string, fallback: number) =>
        typeof props[key]?.value === 'number' ? (props[key]!.value as number) : fallback;
      const type = element.type;

      // Resolve applied material (overrides the type defaults when set)
      const appliedMatName = props['Material']?.value as string | undefined;
      const appliedMat = appliedMatName
        ? BUILT_IN_MATERIALS.find((m) => m.name === appliedMatName)
        : undefined;

      const color = appliedMat?.color ?? ELEMENT_COLORS[type] ?? '#8888aa';
      const pbr   = appliedMat
        ? { roughness: appliedMat.roughness, metalness: appliedMat.metalness }
        : ELEMENT_MATERIAL_PROPS[type] ?? DEFAULT_MATERIAL_PROPS;

      let geometry: THREE.BufferGeometry = new THREE.BoxGeometry(100, 100, 100);
      let posX = 0, posY = 0, posZ = 0, ry = 0;

      if (type === 'wall') {
        // Walls handled by buildWallMesh (supports openings + composite layers)
        const composites = useDocumentStore.getState().document?.library?.composites;
        return buildWallMesh(
          element, allElements,
          createMaterial(color, 0.85, pbr.roughness, pbr.metalness, appliedMat),
          composites,
        );
      }

      if (type === 'annotation' || type === 'beam') {
        let x1 = pv('StartX', 0), y1 = pv('StartY', 0);
        let x2 = pv('EndX', x1 + 1000), y2 = pv('EndY', y1);
        // SEO beam-column-trim (T-GEO-001): shorten beam at each end that
        // lands inside a column so the column reads as continuous and the
        // beam butts into its face. Analytical — no CSG required.
        if (type === 'beam') {
          const cols = Object.values(allElements).filter((e) => e.type === 'column');
          if (cols.length > 0) {
            const trimmed = trimBeamAtColumns(element, cols);
            x1 = trimmed.start.x; y1 = trimmed.start.y;
            x2 = trimmed.end.x;   y2 = trimmed.end.y;
          }
        }
        const h  = pv('Height', type === 'beam' ? 400 : 200);
        const t  = pv('Width',  type === 'beam' ? 200 : 10);
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1000;
        geometry = new THREE.BoxGeometry(len, h, t);
        posX = (x1 + x2) / 2; posY = h / 2; posZ = (y1 + y2) / 2;
        ry = -Math.atan2(y2 - y1, x2 - x1);
      } else if (type === 'slab' || type === 'roof') {
        const t = pv('Thickness', type === 'roof' ? 200 : 250);
        const elevOffset = pv('ElevationOffset', 0);
        // The 2D tool stores the footprint as a Points polygon (JSON array
        // of {x,y}). If present, extrude that polygon directly so L-, S-,
        // and donut-shaped plates render as their true outline instead of
        // the axis-aligned bounding box. Fall back to X/Y/Width/Depth for
        // legacy / AI-generated elements that lack Points.
        const ptsVal = props['Points']?.value;
        let builtFromPoints = false;
        if (typeof ptsVal === 'string' && ptsVal.length > 0) {
          try {
            const rawPts = JSON.parse(ptsVal) as Array<{ x: number; y: number }>;
            // Drop consecutive duplicates — dblclick sometimes appends the
            // last vertex twice, which Shape doesn't like.
            const pts: Array<{ x: number; y: number }> = [];
            for (const p of rawPts) {
              const prev = pts[pts.length - 1];
              if (!prev || prev.x !== p.x || prev.y !== p.y) pts.push(p);
            }
            if (pts.length >= 3) {
              const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, -p.y)));
              geometry = new THREE.ExtrudeGeometry(shape, {
                depth: t, bevelEnabled: false, steps: 1,
              });
              // ExtrudeGeometry builds in XY with depth along +Z. Rotate
              // so the polygon lies in world XZ and the depth becomes +Y.
              // The shape uses -p.y so the rotation restores original Y→Z.
              geometry.rotateX(-Math.PI / 2);
              posX = 0;
              // Slabs sit at/above the ground; roofs sit on top of the
              // typical wall height unless an ElevationOffset is supplied.
              posY = elevOffset + (type === 'roof' ? 3000 : 0);
              posZ = 0;
              builtFromPoints = true;
            }
          } catch { /* fall through */ }
        }
        if (!builtFromPoints) {
          const x = pv('X', 0), y = pv('Y', 0);
          const w = pv('Width', 5000), d = pv('Depth', 5000);
          geometry = new THREE.BoxGeometry(w, t, d);
          posX = x + w / 2;
          posY = elevOffset + (type === 'roof' ? 3000 : 0) + t / 2;
          posZ = y + d / 2;
        }
      } else if (type === 'column') {
        const h   = pv('Height', 3000), dia = pv('Diameter', 300);
        const sec = props['SectionType']?.value;
        geometry = sec === 'Rectangular'
          ? new THREE.BoxGeometry(dia, h, dia)
          : new THREE.CylinderGeometry(dia / 2, dia / 2, h, 16);
        posX = pv('X', 0); posY = h / 2; posZ = pv('Y', 0);
      } else if (type === 'door' || type === 'window') {
        const w    = pv('Width',  type === 'door' ? 900 : 1200);
        const h    = pv('Height', type === 'door' ? 2100 : 1200);
        const sill = type === 'window' ? pv('SillHeight', 900) : 0;
        geometry = new THREE.BoxGeometry(w, h, 50);
        posX = pv('X', 0); posY = sill + h / 2; posZ = pv('Y', 0);
      } else if (type === 'stair') {
        const sw = pv('Width2D', 1200), sl = pv('Length', 3000), sh = pv('TotalRise', 3000);
        geometry = new THREE.BoxGeometry(sw, sh, sl);
        posX = pv('X', 0) + sw / 2; posY = sh / 2; posZ = pv('Y', 0) + sl / 2;
      } else if (type === 'rectangle') {
        const w = pv('Width', 1000), h = pv('Height', 1000);
        geometry = new THREE.BoxGeometry(w, 50, h);
        posX = pv('X', 0) + w / 2; posY = 25; posZ = pv('Y', 0) + h / 2;
      } else if (type === 'circle') {
        const r = pv('Radius', 500);
        geometry = new THREE.CylinderGeometry(r, r, 50, 32);
        posX = pv('CenterX', 0); posY = 25; posZ = pv('CenterY', 0);
      } else {
        const bb = element.boundingBox;
        const bw = Math.max(bb.max.x - bb.min.x, 100);
        const bd = Math.max(bb.max.y - bb.min.y, 100);
        geometry = new THREE.BoxGeometry(bw, 50, bd);
        posX = bb.min.x + bw / 2; posY = 25; posZ = bb.min.y + bd / 2;
      }

      const opacity =
        type === 'window' ? 0.35 :
        type === 'space'  ? 0.30 :
        // Roof partially see-through so the room underneath stays legible;
        // user can still solo-view by toggling the roof layer visibility.
        type === 'roof'   ? 0.55 :
        0.85;
      const material = createMaterial(color, opacity, pbr.roughness, pbr.metalness, appliedMat);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(posX, posY, posZ);
      if (ry !== 0) mesh.rotation.y = ry;
      mesh.userData.elementId   = element.id;
      mesh.userData.elementType = type;
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      return mesh;
    },
    [createMaterial]
  );

  const updateCamera = useCallback(() => {
    const { camera } = stateRef.current;
    if (!camera) return;
    const cs = cameraStateRef.current;
    // Sanitise — any NaN/Infinity here would silently blank the viewport.
    if (!Number.isFinite(cs.distance) || !Number.isFinite(cs.azimuth) || !Number.isFinite(cs.elevation)) {
      cs.distance = 10000; cs.azimuth = Math.PI / 4; cs.elevation = Math.PI / 4;
    }
    if (!Number.isFinite(cs.target.x) || !Number.isFinite(cs.target.y) || !Number.isFinite(cs.target.z)) {
      cs.target.set(0, 0, 0);
    }
    cs.distance = Math.max(500, Math.min(50000, cs.distance));
    const sph = new THREE.Spherical(cs.distance, cs.elevation, cs.azimuth);
    camera.position.copy(cs.target).add(new THREE.Vector3().setFromSpherical(sph));
    camera.lookAt(cs.target);
    camera.updateProjectionMatrix();
    needsRenderRef.current = true;
  }, []);

  const setViewPreset = useCallback(
    (preset: ViewPreset) => {
      const view = VIEW_PRESETS[preset];
      if (!view) return;
      const cs = cameraStateRef.current;
      cs.azimuth   = view.azimuth;
      cs.elevation = view.elevation;

      // Model-aware distance: frame whatever is in the scene. The
      // hardcoded 10000mm preset distance worked for a 5m room but
      // clips or overscales when the model is smaller or much bigger.
      const meshes = Array.from(elementMeshesRef.current.values());
      if (meshes.length > 0) {
        const box = new THREE.Box3();
        for (const m of meshes) box.expandByObject(m);
        if (!box.isEmpty()) {
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          const maxDim = Math.max(size.x, size.y, size.z, 1000);
          const diagonal = Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z);
          cs.target.copy(center);
          cs.distance = Math.max(2500, Math.min(50000, diagonal * 1.8 + maxDim * 0.5));
        } else {
          cs.distance = view.distance;
        }
      } else {
        cs.distance = view.distance;
      }
      updateCamera();
    },
    [updateCamera]
  );

  const zoomIn  = useCallback(() => {
    cameraStateRef.current.distance = Math.max(500, cameraStateRef.current.distance * 0.8);
    updateCamera();
  }, [updateCamera]);

  const zoomOut = useCallback(() => {
    cameraStateRef.current.distance = Math.min(50000, cameraStateRef.current.distance * 1.2);
    updateCamera();
  }, [updateCamera]);

  const zoomToFit = useCallback(() => {
    if (!doc) return;
    const meshes = Array.from(elementMeshesRef.current.values());
    if (meshes.length === 0) { setViewPreset('3d'); return; }

    const box = new THREE.Box3();
    for (const m of meshes) box.expandByObject(m);
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 1000);

    // Default isometric-ish angle for a readable view.
    const cs = cameraStateRef.current;
    cs.azimuth   = Math.PI / 4;
    cs.elevation = Math.PI / 4;
    cs.target.copy(center);
    // Distance = half the diagonal / tan(half-fov), with extra padding so the
    // whole model sits comfortably inside the frame. 2.5× was too tight and
    // put the camera inside a 5m room.
    const diagonal = Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z);
    cs.distance = Math.max(2500, Math.min(50000, diagonal * 1.8 + maxDim * 0.5));
    updateCamera();
  }, [doc, updateCamera, setViewPreset]);

  /** Return camera target — used to initialise the section cut position. */
  const getCameraTarget = useCallback(() => ({ ...cameraStateRef.current.target }), []);

  const updateScene = useCallback(() => {
    const { scene } = stateRef.current;
    if (!scene || !doc) return;
    try { _runUpdate(); } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[3D] updateScene failed:', err);
    }
    function _runUpdate() {
    if (!scene || !doc) return;

    const docElements = doc.content.elements;
    const newIds  = new Set(Object.keys(docElements));
    const oldIds  = new Set(elementMeshesRef.current.keys());
    const hadNone = oldIds.size === 0;

    // ── Remove deleted elements ────────────────────────────────────────────
    for (const id of oldIds) {
      if (!newIds.has(id)) {
        const obj = elementMeshesRef.current.get(id)!;
        scene.remove(obj);
        disposeObject(obj);
        elementMeshesRef.current.delete(id);
        elementDataRef.current.delete(id);
        wallFingerprintsRef.current.delete(id);
      }
    }

    // ── Add / update elements ──────────────────────────────────────────────
    for (const id of newIds) {
      // Don't rebuild the mesh while TC is actively dragging it — let TC finish
      if (tcDraggingRef.current && id === tcElementIdRef.current) continue;

      const element = docElements[id]!;
      const prev    = elementDataRef.current.get(id);

      // For walls: also check if nearby openings changed
      let needsRebuild = !oldIds.has(id) || prev !== element;
      if (!needsRebuild && element.type === 'wall') {
        const fp = wallOpeningsFingerprint(element, docElements);
        if (fp !== (wallFingerprintsRef.current.get(id) ?? '')) needsRebuild = true;
      }

      // Wrap mesh creation in try/catch so one malformed element (old schema,
      // missing properties, etc.) can't blank out the entire 3D scene.
      const safeCreate = (el: ElementSchema): THREE.Object3D | null => {
        try {
          return createMeshFromElement(el, docElements);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[3D] createMeshFromElement failed for element', el.id, el.type, err);
          return null;
        }
      };

      if (!oldIds.has(id)) {
        const obj = safeCreate(element);
        if (obj) {
          scene.add(obj);
          elementMeshesRef.current.set(id, obj);
        }
        elementDataRef.current.set(id, element);
        if (element.type === 'wall') {
          try {
            wallFingerprintsRef.current.set(id, wallOpeningsFingerprint(element, docElements));
          } catch { /* ignore fingerprint errors */ }
        }
      } else if (needsRebuild) {
        const old = elementMeshesRef.current.get(id)!;
        scene.remove(old);
        disposeObject(old);
        const obj = safeCreate(element);
        if (obj) {
          scene.add(obj);
          elementMeshesRef.current.set(id, obj);
        } else {
          elementMeshesRef.current.delete(id);
        }
        elementDataRef.current.set(id, element);
        if (element.type === 'wall') {
          try {
            wallFingerprintsRef.current.set(id, wallOpeningsFingerprint(element, docElements));
          } catch { /* ignore fingerprint errors */ }
        }
      }
    }

    // ── Auto-zoom on first elements ────────────────────────────────────────
    if (!hasAutoZoomedRef.current && hadNone && elementMeshesRef.current.size > 0) {
      hasAutoZoomedRef.current = true;
      const box = new THREE.Box3();
      for (const m of elementMeshesRef.current.values()) box.expandByObject(m);
      if (!box.isEmpty()) {
        const center = new THREE.Vector3();
        const size   = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 1000);
        // Defensive: if any component is non-finite (NaN/Infinity from
        // malformed element data), skip the auto-zoom entirely and keep
        // the camera at its default — otherwise the viewport renders blank
        // because the camera is pointing at an impossible location.
        const finite =
          Number.isFinite(center.x) && Number.isFinite(center.y) && Number.isFinite(center.z) &&
          Number.isFinite(maxDim);
        if (finite) {
          const cs = cameraStateRef.current;
          cs.azimuth   = Math.PI / 4;
          cs.elevation = Math.PI / 4;
          cs.target.copy(center);
          const diagonal = Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z);
          cs.distance = Math.max(2500, Math.min(50000, diagonal * 1.8 + maxDim * 0.5));
          updateCamera();
        } else {
          // eslint-disable-next-line no-console
          console.warn('[3D] auto-zoom skipped — bounding box was non-finite', { center, size });
        }
      }
    }

    // Re-attach TransformControls to the freshly-rebuilt mesh for the
    // currently selected element. Without this, after a move commits:
    //   1. dragging-changed handler does tc.detach()
    //   2. updateScene rebuilds the mesh at its new position
    //   3. updateSelection doesn't re-run because selectedIds didn't change
    // → the gizmo stays detached and the user can't grab the element again.
    const tcNow = transformControlsRef.current;
    const selNow = selectedIdsRef.current;
    if (tcNow && selNow.length === 1) {
      const currentMesh = elementMeshesRef.current.get(selNow[0]!);
      if (currentMesh && tcNow.object !== currentMesh) {
        tcNow.attach(currentMesh);
        tcElementIdRef.current = selNow[0]!;
      }
    }

    needsRenderRef.current = true;
    }
  }, [doc, createMeshFromElement, updateCamera]);

  const updateSelection = useCallback(() => {
    const { scene } = stateRef.current;
    if (!scene) return;
    const theme = getTheme();

    elementMeshesRef.current.forEach((obj, id) => {
      const isSelected = selectedIds.includes(id);

      const applyToMesh = (mesh: THREE.Mesh) => {
        if (isSelected) {
          if (!mesh.userData.selectionMat) {
            mesh.userData.selectionMat =
              (mesh.material as THREE.MeshStandardMaterial).clone();
          }
          const sel = mesh.userData.selectionMat as THREE.MeshStandardMaterial;
          sel.color.setHex(0x4f46e5);
          sel.opacity = 1;
          sel.emissive.setHex(theme.selectionEmissive);
          sel.emissiveIntensity = 0.3;
          mesh.material = sel;
        } else {
          // Restore the mesh's own material, respecting any applied material property
          const elType  = (mesh.userData.elementType as string) || '';
          const elId    = (mesh.userData.elementId   as string) || '';
          const freshEl = useDocumentStore.getState().document?.content.elements[elId];
          const appliedMatName = freshEl
            ? (freshEl.properties as Record<string, { value: unknown }>)['Material']?.value as string | undefined
            : undefined;
          const appliedMat = appliedMatName
            ? BUILT_IN_MATERIALS.find((m) => m.name === appliedMatName)
            : undefined;
          const restoreColor    = appliedMat?.color    ?? ELEMENT_COLORS[elType] ?? '#8888aa';
          const restoreRoughness = appliedMat?.roughness ?? ELEMENT_MATERIAL_PROPS[elType]?.roughness ?? 0.8;
          const restoreMetalness = appliedMat?.metalness ?? ELEMENT_MATERIAL_PROPS[elType]?.metalness ?? 0.0;
          const restoreOpacity  = elType === 'window' ? 0.35 : elType === 'space' ? 0.3 : 0.85;
          mesh.material = createMaterial(restoreColor, restoreOpacity, restoreRoughness, restoreMetalness, appliedMat);
          // Reset the cached selection material so it re-clones with the updated color next time
          mesh.userData.selectionMat = null;
        }
      };

      if (obj instanceof THREE.Mesh) {
        applyToMesh(obj);
      } else {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) applyToMesh(child);
        });
      }
    });

    // Attach / detach TransformControls gizmo
    const tc = transformControlsRef.current;
    if (tc) {
      if (selectedIds.length === 1) {
        const obj = elementMeshesRef.current.get(selectedIds[0]!);
        if (obj) {
          tc.attach(obj);
          tcElementIdRef.current = selectedIds[0]!;
        } else {
          tc.detach();
          tcElementIdRef.current = null;
        }
      } else {
        tc.detach();
        tcElementIdRef.current = null;
      }
    }

    needsRenderRef.current = true;
  }, [selectedIds, createMaterial]);

  // ── Section clipping plane ─────────────────────────────────────────────────
  useEffect(() => {
    if (!rendererReady) return;
    const { renderer } = stateRef.current;
    if (!renderer) return;

    // Enable local clipping so materials with clippingPlanes set also cut.
    // `clippingPlanes` alone (global) works on WebGLRenderer but WebGPURenderer
    // wants localClippingEnabled to route clipping through its render pass.
    const r = renderer as GenericRenderer & { localClippingEnabled?: boolean };
    r.localClippingEnabled = true;

    if (sectionBox) {
      // THREE.Plane(normal, constant) → normal · p + constant = 0.
      // With normal = (0, 0, -1) and constant = d, the plane is z = d and
      // points with z < d are clipped. Map sectionDirection to the same
      // "cut along positive axis" semantics so raising the slider reveals
      // more of the model, not less.
      const normal =
        sectionDirection === 'x' ? new THREE.Vector3(-1,  0,  0) :
        sectionDirection === 'y' ? new THREE.Vector3( 0, -1,  0) :
                                   new THREE.Vector3( 0,  0, -1);
      renderer.clippingPlanes = [new THREE.Plane(normal, sectionPosition)];
    } else {
      renderer.clippingPlanes = [];
    }
    needsRenderRef.current = true;
  }, [rendererReady, sectionBox, sectionPosition, sectionDirection]);

  // ── Scene bounds for adaptive slider range ─────────────────────────────────
  // Computed from the element meshes on every document change so the section
  // slider covers only the actual model extent (±padding), not the fixed
  // ±20,000 mm range that left most useful cut positions outside the slider
  // travel.
  const [sceneBounds, setSceneBounds] = useState<{
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  } | null>(null);
  useEffect(() => {
    if (!doc) { setSceneBounds(null); return; }
    const els = Object.values(doc.content.elements);
    if (els.length === 0) { setSceneBounds(null); return; }
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const el of els) {
      const bb = el.boundingBox;
      if (!bb) continue;
      if (bb.min.x < minX) minX = bb.min.x;
      if (bb.min.y < minY) minY = bb.min.y;
      if (bb.min.z < minZ) minZ = bb.min.z;
      if (bb.max.x > maxX) maxX = bb.max.x;
      if (bb.max.y > maxY) maxY = bb.max.y;
      if (bb.max.z > maxZ) maxZ = bb.max.z;
    }
    if (!Number.isFinite(minX)) { setSceneBounds(null); return; }
    setSceneBounds({
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    });
  }, [doc]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore keystrokes while the user is typing in any input/textarea/select.
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const cs = cameraStateRef.current;
      const camera = stateRef.current.camera;

      // Arrow keys — with Shift pan, without Shift orbit. Hold Alt for a
      // finer-grained step (1/5 speed).
      const fine = event.altKey ? 0.2 : 1;
      const isArrow = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
        || event.key === 'ArrowUp' || event.key === 'ArrowDown';
      if (isArrow && camera) {
        event.preventDefault();
        if (event.shiftKey) {
          // Pan in the ground plane
          const panStep = cs.distance * 0.015 * fine;
          const forward = new THREE.Vector3();
          camera.getWorldDirection(forward);
          forward.y = 0;
          if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
          forward.normalize();
          const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
          if (event.key === 'ArrowLeft')  cs.target.addScaledVector(right,   -panStep);
          if (event.key === 'ArrowRight') cs.target.addScaledVector(right,    panStep);
          if (event.key === 'ArrowUp')    cs.target.addScaledVector(forward,  panStep);
          if (event.key === 'ArrowDown')  cs.target.addScaledVector(forward, -panStep);
        } else {
          // Orbit — azimuth (left/right), elevation (up/down)
          const step = 0.08 * fine;
          if (event.key === 'ArrowLeft')  cs.azimuth   += step;
          if (event.key === 'ArrowRight') cs.azimuth   -= step;
          if (event.key === 'ArrowUp')    cs.elevation -= step;
          if (event.key === 'ArrowDown')  cs.elevation += step;
          cs.elevation = Math.max(0.01, Math.min(Math.PI - 0.01, cs.elevation));
        }
        updateCamera();
        return;
      }

      switch (event.key) {
        case '1': setViewPreset('top');   break;
        case '2': setViewPreset('front'); break;
        case '3': setViewPreset('right'); break;
        case '4': setViewPreset('3d');    break;
        case '0': zoomToFit(); break;
        case '+': case '=': zoomIn();  break;
        case '-': case '_': zoomOut(); break;
        case 'g': case 'G': {
          // Cycle TransformControls mode: translate → rotate → scale
          const tc = transformControlsRef.current;
          if (tc) {
            const modes = ['translate', 'rotate', 'scale'] as const;
            const idx = modes.indexOf(tc.mode as (typeof modes)[number]);
            tc.setMode(modes[(idx + 1) % modes.length]!);
            needsRenderRef.current = true;
          }
          break;
        }
        case 'Escape': {
          // Reset TC to translate mode on escape
          const tc = transformControlsRef.current;
          if (tc) { tc.setMode('translate'); needsRenderRef.current = true; }
          break;
        }
      }
    },
    [setViewPreset, zoomIn, zoomOut, zoomToFit, updateCamera]
  );

  const isDragging   = useRef(false);
  const lastMouse    = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (event.button === 0) {
        // Let TransformControls handle drags on its own gizmo handles
        const tc = transformControlsRef.current;
        if (tc && tc.axis !== null) return;

        const { camera, scene, renderer } = stateRef.current;
        if (!camera || !scene || !renderer) return;

        const rect = container.getBoundingClientRect();
        pickVec2Ref.current.set(
          ((event.clientX - rect.left) / rect.width)  * 2 - 1,
          -((event.clientY - rect.top)  / rect.height) * 2 + 1
        );
        raycasterRef.current.setFromCamera(pickVec2Ref.current, camera);

        // Collect all leaf meshes (handles both Mesh and Group objects)
        const leafMeshes: THREE.Mesh[] = [];
        for (const obj of elementMeshesRef.current.values()) {
          obj.traverse((child) => {
            if (child instanceof THREE.Mesh) leafMeshes.push(child);
          });
        }

        const intersects = raycasterRef.current.intersectObjects(leafMeshes, false);

        if (intersects.length > 0) {
          // Walk up the parent chain — for grouped meshes (e.g. walls with
          // openings or curtain-wall mullions), the leaf hit has no
          // elementId; only the root group does.
          let hit: THREE.Object3D | null = intersects[0].object;
          while (hit && !hit.userData.elementId) hit = hit.parent;
          const elementId = hit?.userData.elementId as string | undefined;
          if (elementId) {
            const current = useDocumentStore.getState().selectedIds;
            if (event.shiftKey) {
              setSelectedIds(current.includes(elementId)
                ? current.filter((i) => i !== elementId)
                : [...current, elementId]);
            } else {
              setSelectedIds([elementId]);
            }
          } else if (!event.shiftKey) {
            setSelectedIds([]);
          }
        } else if (!event.shiftKey) {
          setSelectedIds([]);
        } else {
          isDragging.current = true;
          lastMouse.current  = { x: event.clientX, y: event.clientY };
        }
      }

      if (event.button === 1) {
        isDragging.current = true;
        lastMouse.current  = { x: event.clientX, y: event.clientY };
        event.preventDefault();
      }

      if (event.button === 2) {
        isDragging.current = true;
        lastMouse.current  = { x: event.clientX, y: event.clientY };
        event.preventDefault();
      }
    },
    [setSelectedIds]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging.current) return;
      const { camera } = stateRef.current;
      if (!camera) return;

      const deltaX = event.clientX - lastMouse.current.x;
      const deltaY = event.clientY - lastMouse.current.y;

      if (event.buttons === 1) {
        const cs = cameraStateRef.current;
        cs.azimuth   -= deltaX * 0.005;
        cs.elevation -= deltaY * 0.005;
        cs.elevation  = Math.max(0.01, Math.min(Math.PI - 0.01, cs.elevation));
        updateCamera();
      } else if (event.buttons === 4) {
        const cs      = cameraStateRef.current;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3()
          .crossVectors(forward, new THREE.Vector3(0, 0, 1))
          .normalize();
        cs.target.addScaledVector(right,   -deltaX * 5);
        cs.target.addScaledVector(forward,  deltaY * 5);
        updateCamera();
      } else if (event.buttons === 2) {
        cameraStateRef.current.distance =
          Math.max(500, cameraStateRef.current.distance - deltaY * 20);
        updateCamera();
      }

      lastMouse.current = { x: event.clientX, y: event.clientY };
    },
    [updateCamera]
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const { camera } = stateRef.current;
      if (!camera) return;
      const cs = cameraStateRef.current;

      // Pinch-zoom gesture (macOS trackpad fires wheel events with ctrlKey)
      // or Ctrl+scroll → zoom. Plain two-finger scroll → pan in screen-space.
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(event.deltaY * 0.01);
        cs.distance = Math.max(500, Math.min(50000, cs.distance * factor));
        updateCamera();
        return;
      }

      // Shift modifier on wheel → zoom (mouse users without ctrl)
      if (event.shiftKey) {
        const factor = event.deltaY > 0 ? 1.08 : 1 / 1.08;
        cs.distance = Math.max(500, Math.min(50000, cs.distance * factor));
        updateCamera();
        return;
      }

      // Two-finger scroll → pan. deltaX pans right/left, deltaY pans fwd/back,
      // scaled to camera distance so the motion feels consistent at any zoom.
      const panScale = cs.distance * 0.0008;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      cs.target.addScaledVector(right,   event.deltaX * panScale);
      cs.target.addScaledVector(forward, -event.deltaY * panScale);
      updateCamera();
    },
    [updateCamera]
  );

  const handleContextMenu = useCallback((event: Event) => {
    event.preventDefault();
    const me = event as MouseEvent;
    const container = containerRef.current;
    const { camera } = stateRef.current;
    if (!container || !camera) return;

    const rect = container.getBoundingClientRect();
    const nx = ((me.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((me.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const objects = Array.from(elementMeshesRef.current.values());
    const intersects = raycasterRef.current.intersectObjects(objects, true);

    const ids = selectedIdsRef.current;
    let elementContext: ElementContext;
    if (intersects.length > 0) {
      let hit: THREE.Object3D | null = intersects[0]!.object;
      while (hit && !hit.userData.elementType) hit = hit.parent;
      const eType = (hit?.userData.elementType ?? '') as string;
      if (ids.length > 1) {
        elementContext = 'multi';
      } else if (
        eType === 'wall' || eType === 'door' || eType === 'window' ||
        eType === 'slab' || eType === 'column' || eType === 'beam' ||
        eType === 'stair' || eType === 'roof' || eType === 'space'
      ) {
        elementContext = eType as ElementContext;
      } else {
        elementContext = 'empty';
      }
    } else {
      elementContext = 'empty';
    }

    const items = getContextMenuItems('3d', elementContext);
    setContextMenuState({ x: me.clientX, y: me.clientY, items });
  }, []);

  // ── Three.js init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme = getTheme();
    const rect  = container.getBoundingClientRect();
    const initW = rect.width  > 0 ? rect.width  : container.clientWidth  || 800;
    const initH = rect.height > 0 ? rect.height : container.clientHeight || 600;

    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(theme.sceneBackground);

    const camera = new THREE.PerspectiveCamera(50, initW / initH, 1, 200000);

    const grid = new THREE.GridHelper(20000, 40, theme.gridColor, theme.gridColor2);
    scene.add(grid);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10000, 10000, 10000);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width  = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 100;
    dirLight.shadow.camera.far  = 50000;
    scene.add(dirLight);

    scene.add(new THREE.AxesHelper(1000));

    // Renderer init is async (WebGPU resolves `navigator.gpu` asynchronously).
    // Everything renderer-dependent lives inside the IIFE below; `cancelled`
    // guards against unmount completing before init finishes.
    let cancelled = false;
    const safeW = Math.max(100, initW);
    const safeH = Math.max(100, initH);

    // Event / renderer handles we need to tear down on unmount. Populated
    // inside the async IIFE once the renderer is ready.
    let rendererRef: GenericRenderer | null = null;
    let animate: (() => void) | null = null;
    let onMouseDown:   ((e: MouseEvent) => void) | null = null;
    let onMouseMove:   ((e: MouseEvent) => void) | null = null;
    let onWheel:       ((e: WheelEvent) => void) | null = null;
    let onContextMenu: ((e: Event) => void)      | null = null;
    let onKeyDown:     ((e: KeyboardEvent) => void) | null = null;
    let onMouseUp:     (() => void) | null = null;
    let onMouseLeave:  (() => void) | null = null;
    let ro: ResizeObserver | null = null;

    void (async () => {
      const renderer = await createRenderer();
      if (cancelled) { renderer.dispose(); return; }
      rendererRef = renderer;

      // Guard against 0×0 initialisation — real canvas size is re-applied by
      // the ResizeObserver below once layout settles.
      renderer.setSize(safeW, safeH);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      // PCFSoftShadowMap was deprecated in three@0.170+ — use PCFShadowMap.
      renderer.shadowMap.type    = THREE.PCFShadowMap;
      container.appendChild(renderer.domElement);
      const canvasEl = renderer.domElement as HTMLCanvasElement;
      canvasEl.style.display = 'block';
      canvasEl.style.width  = '100%';
      canvasEl.style.height = '100%';

      requestAnimationFrame(() => {
        const r = container.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          const camObj = stateRef.current.camera;
          if (camObj) { camObj.aspect = r.width / r.height; camObj.updateProjectionMatrix(); }
          stateRef.current.renderer?.setSize(r.width, r.height);
          needsRenderRef.current = true;
        }
      });

      stateRef.current = { camera, renderer, scene };
      rendererReadyRef.current = true;
      needsRenderRef.current = true;
      hasAutoZoomedRef.current = false;
      // Flip rendererReady state so the updateScene / section-clipping /
      // selection effects — which previously early-returned because the
      // scene/renderer refs were null — re-run against the current (not
      // captured-at-mount) document and section state.
      setRendererReady(true);

      updateCamera();
      const rAny = renderer as GenericRenderer & { localClippingEnabled?: boolean };
      rAny.localClippingEnabled = true;

    // ── TransformControls gizmo ──────────────────────────────────────────
    // Wrapped in try/catch because TransformControls broke its API in
    // three.js 0.170+ (extends Controls, not Object3D). If the gizmo fails
    // to attach, the rest of the 3D scene should still render.
    try {
      const tc = new TransformControls(camera, renderer.domElement);
      tc.setSize(0.8);

      tc.addEventListener('dragging-changed', (event) => {
        const isNowDragging = (event as unknown as { value: boolean }).value;
        tcDraggingRef.current = isNowDragging;

        if (isNowDragging) {
          const obj = tc.object;
          if (obj) tcInitPosRef.current = obj.position.clone();
        } else {
          const id   = tcElementIdRef.current;
          const obj  = tc.object;
          const init = tcInitPosRef.current;
          if (id && obj && init) {
            const dx = obj.position.x - init.x;
            const dz = obj.position.z - init.z;
            if (Math.abs(dx) > 0.1 || Math.abs(dz) > 0.1) {
              const st = useDocumentStore.getState();
              const el = st.document?.content.elements[id];
              if (el) {
                const propsUpdate = moveElementProps(el, dx, dz);
                if (Object.keys(propsUpdate).length > 0) {
                  st.updateElement(id, {
                    properties: { ...el.properties, ...propsUpdate },
                  });
                  st.pushHistory('Move element');
                }
              }
            }
          }
          tcInitPosRef.current = null;
          tc.detach();
          tcElementIdRef.current = null;
        }
      });

      tc.addEventListener('change', () => { needsRenderRef.current = true; });

      // three.js 0.170+: TransformControls extends Controls (not Object3D).
      // getHelper() returns the visual Object3D that belongs in the scene.
      const helper = typeof (tc as unknown as { getHelper?: () => THREE.Object3D }).getHelper === 'function'
        ? (tc as unknown as { getHelper: () => THREE.Object3D }).getHelper()
        : (tc as unknown as THREE.Object3D);
      scene.add(helper);
      transformControlsRef.current = tc;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[3D] TransformControls init failed — gizmo disabled:', err);
    }

      // ── Animate loop: always render each frame. Errors in render are
      // caught and logged so one bad frame doesn't kill the whole loop.
      let renderErrorCount = 0;
      let coordFrame = 0;
      animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate!);
        try {
          renderer.render(scene, camera);
        } catch (err) {
          if (renderErrorCount++ < 5) {
            // eslint-disable-next-line no-console
            console.error('[3D] renderer.render() threw:', err);
          }
        }

        // Publish selected-element coords every few frames.
        coordFrame = (coordFrame + 1) % 3;
        if (coordFrame === 0) {
          const ids = selectedIdsRef.current;
          if (ids.length === 0) {
            _publishSelectedCoords(null);
          } else {
            const firstId = ids[0]!;
            const mesh = elementMeshesRef.current.get(firstId);
            if (mesh) {
              _publishSelectedCoords({
                x: Math.round(mesh.position.x),
                y: Math.round(mesh.position.z),
                z: Math.round(mesh.position.y),
                elementId: firstId,
              });
            } else {
              _publishSelectedCoords(null);
            }
          }
        }
      };
      animate();

      // Ref-based handler indirection so changing callback identities don't
      // tear down the whole Three.js scene on every doc update.
      onMouseDown    = (e: MouseEvent)    => handlersRef.current.mousedown(e);
      onMouseMove    = (e: MouseEvent)    => handlersRef.current.mousemove(e);
      onWheel        = (e: WheelEvent)    => handlersRef.current.wheel(e);
      onContextMenu  = (e: Event)         => handlersRef.current.contextmenu(e);
      onKeyDown      = (e: KeyboardEvent) => handlersRef.current.keydown(e);
      onMouseUp      = () => { isDragging.current = false; };
      onMouseLeave   = () => { isDragging.current = false; };

      container.addEventListener('mousedown',    onMouseDown);
      container.addEventListener('mousemove',    onMouseMove);
      container.addEventListener('wheel',        onWheel);
      container.addEventListener('contextmenu',  onContextMenu);
      container.addEventListener('mouseup',      onMouseUp);
      container.addEventListener('mouseleave',   onMouseLeave);
      window.addEventListener('keydown',         onKeyDown);

      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width === 0 || height === 0) continue;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          const { renderer: r } = stateRef.current;
          if (r) r.setSize(width, height);
          needsRenderRef.current = true;
        }
      });
      ro.observe(container);
    })();

    return () => {
      cancelled = true;
      rendererReadyRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      ro?.disconnect();
      if (onMouseDown)   container.removeEventListener('mousedown',   onMouseDown);
      if (onMouseMove)   container.removeEventListener('mousemove',   onMouseMove);
      if (onWheel)       container.removeEventListener('wheel',       onWheel);
      if (onContextMenu) container.removeEventListener('contextmenu', onContextMenu);
      if (onMouseUp)     container.removeEventListener('mouseup',     onMouseUp);
      if (onMouseLeave)  container.removeEventListener('mouseleave',  onMouseLeave);
      if (onKeyDown)     window.removeEventListener('keydown',        onKeyDown);
      if (transformControlsRef.current) {
        transformControlsRef.current.dispose();
        transformControlsRef.current = null;
      }
      const { renderer } = stateRef.current;
      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      }
      stateRef.current = { camera: null, renderer: null, scene: null };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep handlersRef pointing at the latest callbacks on every render —
  // this lets the init effect stay stable (empty deps) while still invoking
  // the current handler closures.
  useEffect(() => {
    handlersRef.current = {
      mousedown:   handleMouseDown,
      mousemove:   handleMouseMove,
      wheel:       handleWheel,
      contextmenu: handleContextMenu,
      keydown:     handleKeyDown,
    };
  }, [handleMouseDown, handleMouseMove, handleWheel, handleContextMenu, handleKeyDown]);

  // Scene / selection effects are gated on rendererReady so they don't
  // early-return before the async renderer has populated stateRef. Once
  // renderer is ready the callbacks re-run against the latest doc.
  useEffect(() => { if (rendererReady) updateScene();     }, [updateScene, rendererReady]);
  useEffect(() => { if (rendererReady) updateSelection(); }, [updateSelection, rendererReady]);

  useEffect(() => {
    const onChange = () => {
      const theme = getTheme();
      const { scene } = stateRef.current;
      if (scene) scene.background = new THREE.Color(theme.sceneBackground);
      needsRenderRef.current = true;
    };
    window.addEventListener('storage',      onChange);
    window.addEventListener('theme-change', onChange);
    return () => {
      window.removeEventListener('storage',      onChange);
      window.removeEventListener('theme-change', onChange);
    };
  }, []);

  return {
    containerRef,
    setViewPreset,
    zoomIn,
    zoomOut,
    zoomToFit,
    getCameraTarget,
    sectionBox,
    setSectionBox,
    sectionPosition,
    setSectionPosition,
    sectionDirection,
    setSectionDirection,
    saveSectionView,
    sceneBounds,
    contextMenuState,
    closeContextMenu,
  };
}
