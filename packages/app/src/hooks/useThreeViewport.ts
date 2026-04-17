import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { useDocumentStore } from '../stores/documentStore';
import { type ElementSchema } from '@opencad/document';
import { BUILT_IN_MATERIALS } from '../lib/materials';
import { moveElementProps } from '../utils/elementMath';

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

const ELEMENT_COLORS: Record<string, string> = {
  wall:       '#c8c8d0',
  slab:       '#a0a8b0',
  roof:       '#b0b8c0',
  column:     '#d4c8a0',
  beam:       '#8090a8',
  door:       '#c8a878',
  window:     '#78aac8',
  stair:      '#b8a8d0',
  railing:    '#90a0a8',
  space:      '#d0e8d0',
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

async function createRenderer(): Promise<GenericRenderer> {
  // Try WebGPU first if the browser supports it
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const { WebGPURenderer } = await import('three/webgpu');
      const r = new WebGPURenderer({ antialias: true });
      await r.init();
      return r as unknown as GenericRenderer;
    } catch {
      // Fall through to WebGL
    }
  }
  return new THREE.WebGLRenderer({ antialias: true }) as unknown as GenericRenderer;
}

// ─── Procedural texture generator (Phase II) ─────────────────────────────────
// Generates DataTexture tiles procedurally for each material category.
// No external assets required — textures are computed once and cached.
// Each tile is 128×128 RGBA.

const _texCache = new Map<string, THREE.Texture>();
const _TEX_SIZE = 128;

function _hexToRgb3(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Simple deterministic pseudo-noise — no external library needed. */
function _noise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function _getProceduralTexture(materialId: string, category: string, color: string): THREE.Texture {
  const cached = _texCache.get(materialId);
  if (cached) return cached;

  const S = _TEX_SIZE;
  const data = new Uint8Array(S * S * 4);
  const [br, bg, bb] = _hexToRgb3(color);

  const set = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
    const i = (y * S + x) * 4;
    data[i]     = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  };

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // Base color
      let nr = br, ng = bg, nb = bb;
      let variation = 0;

      switch (category) {
        case 'Concrete': {
          // Rough grey surface — coarse noise
          const n1 = _noise(x / 8,  y / 8);
          const n2 = _noise(x / 16, y / 16);
          variation = (n1 * 0.6 + n2 * 0.4 - 0.5) * 40;
          break;
        }
        case 'Masonry': {
          // Brick pattern: mortar joints every 32×16 px
          const bx = x % 64, by = y % 32;
          const rowOffset = Math.floor(y / 32) % 2 === 0 ? 0 : 32;
          const brickX = (bx + rowOffset) % 64;
          const isMortar = brickX < 2 || brickX > 61 || by < 2 || by > 29;
          const surfNoise = (_noise(x / 4, y / 4) - 0.5) * 20;
          variation = isMortar ? -30 : surfNoise;
          break;
        }
        case 'Timber': {
          // Wood grain — anisotropic noise along grain direction
          const grain = Math.sin((x + _noise(x / 20, y / 4) * 8) * 0.3) * 25;
          const fiber = _noise(x / 3, y / 2) * 10;
          variation = grain + fiber - 18;
          break;
        }
        case 'Metal': {
          // Brushed metal — directional scratch lines
          const scratch = _noise(x / 2, y * 12) * 0.3 + _noise(x / 3, y * 8) * 0.7;
          variation = (scratch - 0.5) * 30;
          break;
        }
        case 'Glass': {
          // Subtle surface shimmer
          const shimmer = _noise(x / 20, y / 20) * 15 - 5;
          variation = shimmer;
          // Slight transparency modulation already handled by opacity in material
          break;
        }
        case 'Flooring': {
          const grain = Math.sin((x + _noise(x / 16, y / 3) * 6) * 0.25) * 20;
          variation = grain + _noise(x / 4, y / 4) * 8 - 14;
          break;
        }
        case 'Tile': {
          // Grout grid every 32 px
          const tileX = x % 32, tileY = y % 32;
          const isGrout = tileX < 2 || tileY < 2;
          variation = isGrout ? -25 : (_noise(x / 6, y / 6) - 0.5) * 12;
          break;
        }
        case 'Insulation': {
          // Fibrous texture — cross-hatch noise
          const fib = _noise(x * 0.5, y * 0.2) * 0.5 + _noise(x * 0.2, y * 0.5) * 0.5;
          variation = (fib - 0.5) * 35;
          break;
        }
        case 'Plaster':
        case 'Paint': {
          // Fine stipple
          variation = (_noise(x / 2, y / 2) - 0.5) * 15;
          break;
        }
        case 'Roofing': {
          // Scale texture — overlapping half-ellipses
          const ry2 = y % 24, rx2 = (x + Math.floor(y / 24) % 2 * 12) % 24;
          const edgeDist = Math.sqrt((rx2 - 12) ** 2 + Math.max(0, ry2 - 18) ** 2);
          variation = edgeDist < 6 ? -20 : (_noise(x / 5, y / 5) - 0.5) * 10;
          break;
        }
        default: {
          variation = (_noise(x / 8, y / 8) - 0.5) * 20;
          break;
        }
      }

      nr = Math.min(255, Math.max(0, br + variation));
      ng = Math.min(255, Math.max(0, bg + variation));
      nb = Math.min(255, Math.max(0, bb + variation));
      set(x, y, nr, ng, nb);
    }
  }

  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Scale: repeat every 1000 world units (1 metre in mm space)
  tex.repeat.set(1 / 1000, 1 / 1000);
  tex.needsUpdate = true;

  _texCache.set(materialId, tex);
  return tex;
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

/** Fingerprint for a wall's current openings — used to detect when to rebuild the wall mesh. */
function wallOpeningsFingerprint(
  wall: ElementSchema,
  allElements: Record<string, ElementSchema>
): string {
  return findWallOpenings(wall, allElements)
    .map((o) => `${Math.round(o.t)},${o.width},${o.height},${o.sillH}`)
    .sort()
    .join('|');
}

/**
 * Build a wall Object3D with openings cut out.
 * Returns a single Mesh when there are no openings, or a Group of split segments.
 * All segments share the supplied material (from the hook's material cache).
 */
function buildWallMesh(
  element: ElementSchema,
  allElements: Record<string, ElementSchema>,
  mat: THREE.MeshStandardMaterial
): THREE.Object3D {
  const props = element.properties as Record<string, { value: unknown }>;
  const pv = (k: string, fb: number) =>
    typeof props[k]?.value === 'number' ? (props[k]!.value as number) : fb;

  const x1 = pv('StartX', 0), y1 = pv('StartY', 0);
  const x2 = pv('EndX',   x1 + 1000), y2 = pv('EndY', y1);
  const wallH = pv('Height', 3000);
  const wallT = pv('Width',  200);
  const len   = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1000;
  const ry    = -Math.atan2(y2 - y1, x2 - x1);
  const cx    = (x1 + x2) / 2;
  const cz    = (y1 + y2) / 2;

  const tag = (obj: THREE.Object3D) => {
    obj.userData.elementId   = element.id;
    obj.userData.elementType = 'wall';
    obj.castShadow    = true;
    obj.receiveShadow = true;
  };

  const openings = findWallOpenings(element, allElements);

  // ── Solid wall (no openings) ──────────────────────────────────────────────
  if (openings.length === 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, wallT), mat);
    mesh.position.set(cx, wallH / 2, cz);
    mesh.rotation.y = ry;
    tag(mesh);
    return mesh;
  }

  // ── Split wall with openings ──────────────────────────────────────────────
  // Group is positioned at the wall midpoint; all children are in wall-local space
  // (wall runs along local X from -len/2 to +len/2, Y is up, Z is thickness).
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);
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
  let cursor = 0; // right edge of last filled segment, in wall-local [0..len]

  for (const op of sorted) {
    const opLeft  = Math.max(0,   op.t - op.width / 2);
    const opRight = Math.min(len, op.t + op.width / 2);
    if (opRight <= opLeft) continue;

    // Full-height segment before this opening
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

  // Full-height segment after last opening
  if (cursor < len) {
    const w = len - cursor;
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

  const createMaterial = useCallback(
    (
      color: string,
      opacity = 0.8,
      roughness = 0.8,
      metalness = 0.0,
      materialId?: string,  // built-in material id for procedural texture
      category?: string,
    ): THREE.MeshStandardMaterial => {
      const key = `${color}:${opacity}:${roughness}:${metalness}:${materialId ?? ''}`;
      const cached = materialCacheRef.current.get(key);
      if (cached) return cached;

      // Phase II: apply procedural texture when a built-in material is in use
      const tex = (materialId && category)
        ? _getProceduralTexture(materialId, category, color)
        : undefined;

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        roughness,
        metalness,
        side: THREE.DoubleSide,
        ...(tex ? { map: tex } : {}),
      });
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

      const color    = appliedMat?.color    ?? ELEMENT_COLORS[type] ?? '#8888aa';
      const pbr      = appliedMat
        ? { roughness: appliedMat.roughness, metalness: appliedMat.metalness }
        : ELEMENT_MATERIAL_PROPS[type] ?? DEFAULT_MATERIAL_PROPS;
      const matId    = appliedMat?.id;
      const matCat   = appliedMat?.category;

      let geometry: THREE.BufferGeometry;
      let posX = 0, posY = 0, posZ = 0, ry = 0;

      if (type === 'wall') {
        // Walls handled by buildWallMesh (supports openings)
        return buildWallMesh(element, allElements, createMaterial(color, 0.85, pbr.roughness, pbr.metalness, matId, matCat));
      }

      if (type === 'annotation' || type === 'beam') {
        const x1 = pv('StartX', 0), y1 = pv('StartY', 0);
        const x2 = pv('EndX', x1 + 1000), y2 = pv('EndY', y1);
        const h  = pv('Height', type === 'beam' ? 400 : 200);
        const t  = pv('Width',  type === 'beam' ? 200 : 10);
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1000;
        geometry = new THREE.BoxGeometry(len, h, t);
        posX = (x1 + x2) / 2; posY = h / 2; posZ = (y1 + y2) / 2;
        ry = -Math.atan2(y2 - y1, x2 - x1);
      } else if (type === 'slab' || type === 'roof') {
        const x = pv('X', 0), y = pv('Y', 0);
        const w = pv('Width', 5000), d = pv('Depth', 5000), t = pv('Thickness', 250);
        geometry = new THREE.BoxGeometry(w, t, d);
        posX = x + w / 2; posY = -t / 2; posZ = y + d / 2;
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
      } else if (type === 'space') {
        // Render as a floor slab using the room's StartX/StartY/EndX/EndY coordinates.
        // Walls are separate wall elements; this gives the room a coloured floor pad.
        const x1 = pv('StartX', 0), y1 = pv('StartY', 0);
        const x2 = pv('EndX', x1 + 5000), y2 = pv('EndY', y1 + 5000);
        const rw = Math.abs(x2 - x1), rd = Math.abs(y2 - y1);
        const floorT = 150; // 150 mm floor slab
        geometry = new THREE.BoxGeometry(rw, floorT, rd);
        posX = (x1 + x2) / 2; posY = -floorT / 2; posZ = (y1 + y2) / 2;
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

      const opacity = type === 'window' ? 0.35 : 0.85;
      const material = createMaterial(color, opacity, pbr.roughness, pbr.metalness, matId, matCat);
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
    const cs  = cameraStateRef.current;
    const sph = new THREE.Spherical(cs.distance, cs.elevation, cs.azimuth);
    camera.position.copy(cs.target).add(new THREE.Vector3().setFromSpherical(sph));
    camera.lookAt(cs.target);
    needsRenderRef.current = true;
  }, []);

  const setViewPreset = useCallback(
    (preset: ViewPreset) => {
      const view = VIEW_PRESETS[preset];
      if (!view) return;
      const cs = cameraStateRef.current;
      cs.azimuth   = view.azimuth;
      cs.elevation = view.elevation;
      cs.distance  = view.distance;
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

    cameraStateRef.current.target.copy(center);
    cameraStateRef.current.distance = maxDim * 2.5;
    updateCamera();
  }, [doc, updateCamera, setViewPreset]);

  /** Return camera target — used to initialise the section cut position. */
  const getCameraTarget = useCallback(() => ({ ...cameraStateRef.current.target }), []);

  const updateScene = useCallback(() => {
    const { scene } = stateRef.current;
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

      if (!oldIds.has(id)) {
        const obj = createMeshFromElement(element, docElements);
        if (obj) {
          scene.add(obj);
          elementMeshesRef.current.set(id, obj);
        }
        elementDataRef.current.set(id, element);
        if (element.type === 'wall') {
          wallFingerprintsRef.current.set(id, wallOpeningsFingerprint(element, docElements));
        }
      } else if (needsRebuild) {
        const old = elementMeshesRef.current.get(id)!;
        scene.remove(old);
        disposeObject(old);
        const obj = createMeshFromElement(element, docElements);
        if (obj) {
          scene.add(obj);
          elementMeshesRef.current.set(id, obj);
        } else {
          elementMeshesRef.current.delete(id);
        }
        elementDataRef.current.set(id, element);
        if (element.type === 'wall') {
          wallFingerprintsRef.current.set(id, wallOpeningsFingerprint(element, docElements));
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
        cameraStateRef.current.target.copy(center);
        cameraStateRef.current.distance = maxDim * 2.5;
        updateCamera();
      }
    }

    needsRenderRef.current = true;
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
          mesh.material = createMaterial(restoreColor, restoreOpacity, restoreRoughness, restoreMetalness, appliedMat?.id, appliedMat?.category);
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
    const { renderer } = stateRef.current;
    if (!renderer) return;

    if (sectionBox) {
      const normal =
        sectionDirection === 'x' ? new THREE.Vector3(-1,  0,  0) :
        sectionDirection === 'y' ? new THREE.Vector3( 0, -1,  0) :
                                   new THREE.Vector3( 0,  0, -1);
      renderer.clippingPlanes = [new THREE.Plane(normal, sectionPosition)];
    } else {
      renderer.clippingPlanes = [];
    }
    needsRenderRef.current = true;
  }, [sectionBox, sectionPosition, sectionDirection]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case '1': setViewPreset('top');   break;
        case '2': setViewPreset('front'); break;
        case '3': setViewPreset('right'); break;
        case '4': setViewPreset('3d');    break;
        case '0': zoomToFit(); break;
        case '+': case '=': zoomIn();  break;
        case '-':            zoomOut(); break;
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
    [setViewPreset, zoomIn, zoomOut, zoomToFit]
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
          const hit       = intersects[0].object as THREE.Mesh;
          const elementId = hit.userData.elementId as string;
          const current   = useDocumentStore.getState().selectedIds;
          if (event.shiftKey) {
            setSelectedIds(current.includes(elementId)
              ? current.filter((i) => i !== elementId)
              : [...current, elementId]);
          } else {
            setSelectedIds([elementId]);
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
      const factor = event.deltaY > 0 ? 1.1 : 0.9;
      cameraStateRef.current.distance =
        Math.max(500, Math.min(50000, cameraStateRef.current.distance * factor));
      updateCamera();
    },
    [updateCamera]
  );

  const handleContextMenu = useCallback((event: Event) => { event.preventDefault(); }, []);

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

    // Set scene + camera synchronously so updateScene can add meshes
    // immediately — renderer slot is filled once the async promise resolves.
    stateRef.current = { camera, renderer: null, scene };
    hasAutoZoomedRef.current = false;

    updateCamera();

    let cancelled = false;

    // Async renderer creation: try WebGPU, fall back to WebGL
    void createRenderer().then((renderer) => {
      if (cancelled) { renderer.dispose(); return; }

      renderer.setSize(initW, initH);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      stateRef.current.renderer = renderer;
      rendererReadyRef.current  = true;
      needsRenderRef.current    = true; // render all meshes already in the scene

      // ── TransformControls gizmo ──────────────────────────────────────────
      const tc = new TransformControls(camera, renderer.domElement);
      tc.setSize(0.8);

      tc.addEventListener('dragging-changed', (event) => {
        const isNowDragging = (event as unknown as { value: boolean }).value;
        tcDraggingRef.current = isNowDragging;

        if (isNowDragging) {
          // Capture position before the drag so we can compute delta on finish
          const obj = tc.object;
          if (obj) tcInitPosRef.current = obj.position.clone();
        } else {
          // Drag finished — commit the displacement to the document
          const id   = tcElementIdRef.current;
          const obj  = tc.object;
          const init = tcInitPosRef.current;
          if (id && obj && init) {
            const dx = obj.position.x - init.x;
            const dz = obj.position.z - init.z; // 3D z == document y
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
          // Detach so updateSelection re-attaches to the freshly rebuilt mesh
          tc.detach();
          tcElementIdRef.current = null;
        }
      });

      tc.addEventListener('change', () => { needsRenderRef.current = true; });

      scene.add(tc as unknown as THREE.Object3D);
      transformControlsRef.current = tc;

      const animate = () => {
        if (!rendererReadyRef.current) return;
        animationFrameRef.current = requestAnimationFrame(animate);
        if (needsRenderRef.current) {
          renderer.render(scene, camera);
          needsRenderRef.current = false;
        }
      };
      animate();
    });

    container.addEventListener('mousedown',    handleMouseDown);
    container.addEventListener('mousemove',    handleMouseMove);
    container.addEventListener('wheel',        handleWheel);
    container.addEventListener('contextmenu',  handleContextMenu);
    container.addEventListener('mouseup',   () => { isDragging.current = false; });
    container.addEventListener('mouseleave', () => { isDragging.current = false; });
    window.addEventListener('keydown', handleKeyDown);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        const { renderer: r } = stateRef.current;
        if (r) {
          r.setSize(width, height);
          // Render immediately — setSize clears the WebGL canvas, so waiting
          // for the next rAF produces a one-frame blank flash on every resize tick.
          r.render(scene, camera);
          needsRenderRef.current = false;
        } else {
          needsRenderRef.current = true;
        }
      }
    });
    ro.observe(container);

    return () => {
      cancelled = true;
      rendererReadyRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      ro.disconnect();
      container.removeEventListener('mousedown',   handleMouseDown);
      container.removeEventListener('mousemove',   handleMouseMove);
      container.removeEventListener('wheel',       handleWheel);
      container.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
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
  }, [handleMouseDown, handleMouseMove, handleWheel, handleContextMenu, handleKeyDown, updateCamera]);

  useEffect(() => { updateScene();     }, [updateScene]);
  useEffect(() => { updateSelection(); }, [updateSelection]);

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
  };
}
