import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { useDocumentStore } from '../stores/documentStore';
import { type ElementSchema } from '@opencad/document';
import { getContextMenuItems, type ContextMenuGroup, type ElementContext } from '../components/contextMenu/contextMenuItems';

// Patch Three.js prototypes once at module level for BVH-accelerated raycasting
THREE.Mesh.prototype.raycast = acceleratedRaycast;
(THREE.BufferGeometry.prototype as THREE.BufferGeometry & {
  computeBoundsTree: typeof computeBoundsTree;
  disposeBoundsTree: typeof disposeBoundsTree;
}).computeBoundsTree = computeBoundsTree;
(THREE.BufferGeometry.prototype as THREE.BufferGeometry & {
  disposeBoundsTree: typeof disposeBoundsTree;
}).disposeBoundsTree = disposeBoundsTree;

// LOD constants
const LOD_ELEMENT_THRESHOLD = 500;
const LOD_DEFAULT_DISTANCE = 50000; // mm — elements beyond this are simplified when LOD active
const FPS_WINDOW = 10; // rolling window for FPS computation
const FPS_LOW_THRESHOLD = 40; // below this, auto-reduce detail

// ─── LOD Types & Frame Stats (status bar) ────────────────────────────────────

/** Level of detail tier for 3D geometry rendering */
export type LodLevel = 'high' | 'medium' | 'low';

/**
 * T-PERF-001/002/003/004: Return the appropriate LOD level for a given camera distance.
 * - distance < 5000   → 'high'   (full geometry)
 * - distance < 20000  → 'medium' (simplified geometry)
 * - distance >= 20000 → 'low'    (bounding box only)
 */
export function getLodLevel(distance: number): LodLevel {
  if (distance < 5000) return 'high';
  if (distance < 20000) return 'medium';
  return 'low';
}

export interface FrameStats {
  avgFrameMs: number;
  currentLod: LodLevel;
}

/** Module-level shared frame stats written by the active 3D viewport. */
let _sharedFrameStats: FrameStats = { avgFrameMs: 16.67, currentLod: 'high' };

/** Read latest frame stats written by the active useThreeViewport instance. */
export function getSharedFrameStats(): FrameStats {
  return _sharedFrameStats;
}

/** Internal: publish frame stats from inside the render loop. */
export function _publishFrameStats(stats: FrameStats): void {
  _sharedFrameStats = stats;
}

const LIGHT_THEME = {
  sceneBackground: 0xf1f5f9,
  gridColor: 0xcbd5e1,
  gridColor2: 0xe2e8f0,
  selectionEmissive: 0x4f46e5,
};

const DARK_THEME = {
  sceneBackground: 0x1a1b1f,
  gridColor: 0x2e2f38,
  gridColor2: 0x232429,
  selectionEmissive: 0x0066cc,
};

const getTheme = () => {
  if (typeof window === 'undefined') return DARK_THEME;
  const theme = localStorage.getItem('opencad-theme');
  return theme === 'light' ? LIGHT_THEME : DARK_THEME;
};

interface ViewportState {
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
}

/** Per-element LOD metadata stored in mesh.userData */
interface ElementUserData {
  elementId: string;
  elementType: string;
  baseColor: number;
  isLod: boolean; // true when rendered as simplified placeholder
}

export type ViewPreset = 'top' | 'front' | 'right' | '3d' | 'perspective';

interface CameraState {
  target: THREE.Vector3;
  distance: number;
  azimuth: number;
  elevation: number;
}

// Color per element type — module-level constant (not recreated each render)
const ELEMENT_TYPE_COLORS: Record<string, number> = {
  wall:         0xc4c8d0,
  slab:         0xa0a8b8,
  column:       0xe08040,
  beam:         0xd07030,
  door:         0x8090b8,
  window:       0x70a8d8,
  stair:        0xb0b870,
  railing:      0x90a060,
  roof:         0x909098,
  space:        0x80c8a8,
  curtain_wall: 0xc8d0d8,
};

const VIEW_PRESETS: Record<ViewPreset, { azimuth: number; elevation: number; distance: number }> = {
  top: { azimuth: 0, elevation: 0.01, distance: 10000 },
  front: { azimuth: 0, elevation: Math.PI / 2, distance: 10000 },
  right: { azimuth: Math.PI / 2, elevation: Math.PI / 2, distance: 10000 },
  '3d': { azimuth: Math.PI / 4, elevation: Math.PI / 4, distance: 10000 },
  perspective: { azimuth: Math.PI / 4, elevation: Math.PI / 6, distance: 8000 },
};

interface UseThreeViewportOptions {
  isViewOnly?: boolean;
}

/** Compute BVH on a geometry and return it (pure module-level helper). */
function bvhGeom(g: THREE.BufferGeometry): THREE.BufferGeometry {
  (g as THREE.BufferGeometry & { computeBoundsTree: () => void }).computeBoundsTree();
  return g;
}

export function useThreeViewport({ isViewOnly = false }: UseThreeViewportOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ViewportState>({
    camera: null,
    renderer: null,
    scene: null,
  });
  const cameraStateRef = useRef<CameraState>((() => {
    try {
      const saved = localStorage.getItem('opencad-camera-state');
      if (saved) {
        const p = JSON.parse(saved) as { target?: { x: number; y: number; z: number }; distance?: number; azimuth?: number; elevation?: number };
        return {
          target: new THREE.Vector3(p.target?.x ?? 0, p.target?.y ?? 0, p.target?.z ?? 0),
          distance: p.distance ?? 10000,
          azimuth: p.azimuth ?? Math.PI / 4,
          elevation: p.elevation ?? Math.PI / 4,
        };
      }
    } catch { /* ignore */ }
    return {
      target: new THREE.Vector3(0, 0, 0),
      distance: 10000,
      azimuth: Math.PI / 4,
      elevation: Math.PI / 4,
    };
  })());
  const animationFrameRef = useRef<number | null>(null);
  // Performance: dirty flag — render only when scene changes
  const needsRenderRef = useRef(true);
  // FPS monitor: rolling window of frame timestamps
  const frameTimesRef = useRef<number[]>([]);
  const [currentFps, setCurrentFps] = useState<number>(60);
  const [lodActive, setLodActive] = useState<boolean>(false);
  // LOD distance (mm): elements beyond this are simplified when element count > threshold
  const lodDistanceRef = useRef<number>(LOD_DEFAULT_DISTANCE);

  const { document: doc, selectedIds, setSelectedIds } = useDocumentStore();

  const [sectionBox, setSectionBox] = useState(false);
  const [sectionPosition, setSectionPosition] = useState(0);
  const [sectionDirection, setSectionDirection] = useState<'x' | 'y' | 'z'>('z');

  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; items: ContextMenuGroup } | null>(null);
  const closeContextMenu = useCallback(() => setContextMenuState(null), []);

  const saveSectionView = useCallback(() => {
    // Persist the current section view settings
    try {
      localStorage.setItem(
        'opencad-section-view',
        JSON.stringify({ position: sectionPosition, direction: sectionDirection })
      );
    } catch {
      // ignore storage errors
    }
  }, [sectionPosition, sectionDirection]);

  const elementMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());

  const createMaterial = useCallback((colorHex: number, opts?: { transparent?: boolean; opacity?: number }) => {
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      transparent: opts?.transparent ?? false,
      opacity: opts?.opacity ?? 1,
      roughness: 0.6,
      metalness: 0.0,
      side: THREE.FrontSide,
    });
  }, []);

  const createMeshFromElement = useCallback(
    (element: ElementSchema, isLod = false): THREE.Object3D | null => {
      const bb = element.boundingBox;
      const colorHex = ELEMENT_TYPE_COLORS[element.type] ?? 0x8888aa;
      const mat = isLod
        ? new THREE.MeshStandardMaterial({ color: colorHex, transparent: true, opacity: 0.5, roughness: 1, metalness: 0, side: THREE.FrontSide })
        : createMaterial(colorHex);

      const props = element.properties;
      const getProp = (key: string, fallback: number): number => {
        const v = props[key];
        return v && typeof v.value === 'number' ? v.value : fallback;
      };

      const ud: ElementUserData = { elementId: element.id, elementType: element.type, baseColor: colorHex, isLod };

      const finishMesh = (mesh: THREE.Mesh): THREE.Mesh => {
        mesh.castShadow = !isLod;
        mesh.receiveShadow = !isLod;
        Object.assign(mesh.userData, ud);
        return mesh;
      };

      const finishObj = (obj: THREE.Object3D): THREE.Object3D => {
        Object.assign(obj.userData, ud);
        return obj;
      };

      switch (element.type) {
        case 'wall': {
          const startX = getProp('StartX', bb.min.x);
          const startY = getProp('StartY', bb.min.y);
          const endX   = getProp('EndX', bb.max.x);
          const endY   = getProp('EndY', bb.max.y);
          const wThick = getProp('Thickness', 200);
          const wH     = getProp('Height', 3000);
          const wLen   = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2) || 1000;
          const mesh   = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(wLen, wThick, wH)), mat);
          mesh.position.set((startX + endX) / 2, (startY + endY) / 2, wH / 2);
          mesh.rotation.z = Math.atan2(endY - startY, endX - startX);
          return finishMesh(mesh);
        }

        case 'curtain_wall': {
          const startX = getProp('StartX', bb.min.x);
          const startY = getProp('StartY', bb.min.y);
          const endX   = getProp('EndX', bb.max.x);
          const endY   = getProp('EndY', bb.max.y);
          const cwH    = getProp('Height', 3000);
          const cwLen  = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2) || 1000;
          const angle  = Math.atan2(endY - startY, endX - startX);
          const panelW = getProp('PanelWidth', 1200);
          const numPanels = Math.max(1, Math.round(cwLen / panelW));
          const group = new THREE.Group();
          // Frame
          const frameMat = new THREE.MeshStandardMaterial({ color: 0xa0a8b0, roughness: 0.4, metalness: 0.6, side: THREE.FrontSide });
          const frameMesh = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(cwLen, 50, cwH)), frameMat);
          frameMesh.castShadow = !isLod;
          group.add(frameMesh);
          // Glass panels
          const glassMat = new THREE.MeshStandardMaterial({ color: 0x80c8e8, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide });
          const pW = cwLen / numPanels - 20;
          const pH = cwH - 40;
          for (let i = 0; i < numPanels; i++) {
            const px = -cwLen / 2 + (i + 0.5) * (cwLen / numPanels);
            const glMesh = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(pW, 20, pH)), glassMat);
            glMesh.position.set(px, 0, 0);
            group.add(glMesh);
          }
          group.position.set((startX + endX) / 2, (startY + endY) / 2, cwH / 2);
          group.rotation.z = angle;
          return finishObj(group);
        }

        case 'column': {
          const r  = getProp('Radius', 150);
          const h  = getProp('Height', 3000);
          const cx = (bb.min.x + bb.max.x) / 2;
          const cy = (bb.min.y + bb.max.y) / 2;
          const mesh = new THREE.Mesh(bvhGeom(new THREE.CylinderGeometry(r, r, h, 24)), mat);
          mesh.rotation.x = Math.PI / 2; // CylinderGeometry is Y-up; align to Z-up
          mesh.position.set(cx, cy, h / 2);
          return finishMesh(mesh);
        }

        case 'circle': {
          const r  = getProp('Radius', 500);
          const h  = getProp('Height', 100); // thin flat disk
          const cx = (bb.min.x + bb.max.x) / 2;
          const cy = (bb.min.y + bb.max.y) / 2;
          const mesh = new THREE.Mesh(bvhGeom(new THREE.CylinderGeometry(r, r, h, 32)), mat);
          mesh.rotation.x = Math.PI / 2;
          mesh.position.set(cx, cy, h / 2);
          return finishMesh(mesh);
        }

        case 'beam': {
          const startX = getProp('StartX', bb.min.x);
          const startY = getProp('StartY', bb.min.y);
          const endX   = getProp('EndX', bb.max.x);
          const endY   = getProp('EndY', bb.max.y);
          const bW    = getProp('Width', 200);
          const bH    = getProp('Depth', 300);
          const bLen  = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2) || 1000;
          const elev  = getProp('Elevation', 3000);
          const mesh  = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(bLen, bW, bH)), mat);
          mesh.position.set((startX + endX) / 2, (startY + endY) / 2, elev);
          mesh.rotation.z = Math.atan2(endY - startY, endX - startX);
          return finishMesh(mesh);
        }

        case 'slab':
        case 'roof': {
          const w = Math.max(bb.max.x - bb.min.x, 1);
          const d = Math.max(bb.max.y - bb.min.y, 1);
          const t = getProp('Thickness', 200);
          const elev = bb.min.z || 0;
          const mesh = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(w, d, t)), mat);
          mesh.position.set(bb.min.x + w / 2, bb.min.y + d / 2, elev + t / 2);
          return finishMesh(mesh);
        }

        case 'rectangle': {
          const w = Math.max(bb.max.x - bb.min.x, 1);
          const d = Math.max(bb.max.y - bb.min.y, 1);
          const t = getProp('Depth', 100);
          const mesh = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(w, d, t)), mat);
          mesh.position.set(bb.min.x + w / 2, bb.min.y + d / 2, t / 2);
          return finishMesh(mesh);
        }

        case 'door':
        case 'window': {
          const w = Math.max(bb.max.x - bb.min.x, 1);
          const h = getProp('Height', 2100);
          const t = getProp('Thickness', 100);
          const mesh = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(w, t, h)), mat);
          mesh.position.set(bb.min.x + w / 2, (bb.min.y + bb.max.y) / 2, bb.min.z + h / 2);
          return finishMesh(mesh);
        }

        case 'stair': {
          const w     = Math.max(bb.max.x - bb.min.x, 1000);
          const dY    = Math.max(bb.max.y - bb.min.y, 1000);
          const tH    = Math.max(bb.max.z - bb.min.z, 3000);
          const steps = Math.max(1, Math.round(tH / 175));
          const group = new THREE.Group();
          for (let i = 0; i < steps; i++) {
            const rH  = tH / steps;
            const rD  = dY / steps;
            const m   = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(w, rD, rH)), mat);
            m.position.set(bb.min.x + w / 2, bb.min.y + rD * (i + 0.5), bb.min.z + rH * (i + 0.5));
            m.castShadow = !isLod;
            m.receiveShadow = !isLod;
            group.add(m);
          }
          return finishObj(group);
        }

        case 'railing': {
          const startX = getProp('StartX', bb.min.x);
          const startY = getProp('StartY', bb.min.y);
          const endX   = getProp('EndX', bb.max.x);
          const endY   = getProp('EndY', bb.max.y);
          const rH   = getProp('Height', 900);
          const rLen = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2) || 1000;
          const mesh = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(rLen, 50, rH)), mat);
          mesh.position.set((startX + endX) / 2, (startY + endY) / 2, rH / 2);
          mesh.rotation.z = Math.atan2(endY - startY, endX - startX);
          return finishMesh(mesh);
        }

        case 'space': {
          const w = Math.max(bb.max.x - bb.min.x, 1);
          const d = Math.max(bb.max.y - bb.min.y, 1);
          const h = Math.max(bb.max.z - bb.min.z, 100);
          const spaceMat = new THREE.MeshStandardMaterial({ color: colorHex, transparent: true, opacity: 0.2, roughness: 1, metalness: 0, side: THREE.DoubleSide });
          const mesh = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(w, d, h)), spaceMat);
          mesh.position.set(bb.min.x + w / 2, bb.min.y + d / 2, bb.min.z + h / 2);
          return finishMesh(mesh);
        }

        case 'polygon':
        case 'surface': {
          const w = Math.max(bb.max.x - bb.min.x, 1);
          const d = Math.max(bb.max.y - bb.min.y, 1);
          const t = getProp('Thickness', 100);
          const mesh = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(w, d, t)), mat);
          mesh.position.set(bb.min.x + w / 2, bb.min.y + d / 2, t / 2);
          return finishMesh(mesh);
        }

        default: {
          let w = Math.max(bb.max.x - bb.min.x, 100);
          let d = Math.max(bb.max.y - bb.min.y, 100);
          let h = Math.max(bb.max.z - bb.min.z, 100);
          if (w < 1) w = 200; if (d < 1) d = 200; if (h < 1) h = 100;
          const mesh = new THREE.Mesh(bvhGeom(new THREE.BoxGeometry(w, d, h)), mat);
          mesh.position.set(bb.min.x + w / 2, bb.min.y + d / 2, bb.min.z + h / 2);
          mesh.castShadow = !isLod;
          mesh.receiveShadow = !isLod;
          return finishMesh(mesh);
        }
      }
    },
    [createMaterial]
  );

  const updateCamera = useCallback(() => {
    const { camera } = stateRef.current;
    if (!camera) return;

    const cs = cameraStateRef.current;
    const spherical = new THREE.Spherical(cs.distance, cs.elevation, cs.azimuth);
    const offset = new THREE.Vector3().setFromSpherical(spherical);

    camera.position.copy(cs.target).add(offset);
    camera.lookAt(cs.target);
    needsRenderRef.current = true;

    // Persist camera state across sessions
    try {
      localStorage.setItem('opencad-camera-state', JSON.stringify({
        target: { x: cs.target.x, y: cs.target.y, z: cs.target.z },
        distance: cs.distance,
        azimuth: cs.azimuth,
        elevation: cs.elevation,
      }));
    } catch { /* ignore storage errors */ }
  }, []);

  const setViewPreset = useCallback(
    (preset: ViewPreset) => {
      const view = VIEW_PRESETS[preset];
      if (!view) return;

      const cs = cameraStateRef.current;
      cs.azimuth = view.azimuth;
      cs.elevation = view.elevation;
      cs.distance = view.distance;

      updateCamera();
    },
    [updateCamera]
  );

  const zoomIn = useCallback(() => {
    const cs = cameraStateRef.current;
    cs.distance = Math.max(500, cs.distance * 0.8);
    updateCamera();
  }, [updateCamera]);

  const zoomOut = useCallback(() => {
    const cs = cameraStateRef.current;
    cs.distance = Math.min(50000, cs.distance * 1.2);
    updateCamera();
  }, [updateCamera]);

  const zoomToFit = useCallback(() => {
    if (!doc) return;

    const elements = Object.values(doc.content.elements);
    if (elements.length === 0) {
      setViewPreset('3d');
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const element of elements) {
      const bb = element.boundingBox;
      minX = Math.min(minX, bb.min.x);
      minY = Math.min(minY, bb.min.y);
      maxX = Math.max(maxX, bb.max.x);
      maxY = Math.max(maxY, bb.max.y);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const size = Math.max(maxX - minX, maxY - minY);

    cameraStateRef.current.target.set(centerX, centerY, 0);
    cameraStateRef.current.distance = size * 2;
    updateCamera();
  }, [doc, updateCamera, setViewPreset]);

  const updateScene = useCallback(() => {
    const { scene, camera } = stateRef.current;
    if (!scene || !doc) return;

    // Dispose existing meshes/groups
    elementMeshesRef.current.forEach((obj) => {
      scene.remove(obj);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    });
    elementMeshesRef.current.clear();

    const elements = Object.values(doc.content.elements);
    const elementCount = elements.length;
    const lodEnabled = elementCount > LOD_ELEMENT_THRESHOLD;
    const lodDist = lodDistanceRef.current;

    for (const element of elements) {
      // Determine whether this element is beyond LOD distance from camera
      let isLod = false;
      if (lodEnabled && camera) {
        const bb = element.boundingBox;
        const cx = (bb.min.x + bb.max.x) / 2;
        const cy = (bb.min.y + bb.max.y) / 2;
        const cz = (bb.min.z + bb.max.z) / 2;
        const dx = cx - camera.position.x;
        const dy = cy - camera.position.y;
        const dz = cz - camera.position.z;
        const distToCamera = Math.sqrt(dx * dx + dy * dy + dz * dz);
        isLod = distToCamera > lodDist;
      }

      const mesh = createMeshFromElement(element, isLod);
      if (mesh) {
        scene.add(mesh);
        elementMeshesRef.current.set(element.id, mesh);
      }
    }

    needsRenderRef.current = true;
  }, [doc, createMeshFromElement]);

  const updateSelection = useCallback(() => {
    const { scene } = stateRef.current;
    if (!scene) return;

    elementMeshesRef.current.forEach((obj, id) => {
      const isSelected = selectedIds.includes(id);
      const baseColor = (obj.userData.baseColor as number | undefined) ?? 0x8888aa;
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (isSelected) {
            material.color.setHex(0x4f46e5);
            material.emissive.setHex(0x1a1a6e);
            material.emissiveIntensity = 0.25;
          } else {
            material.color.setHex(baseColor);
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0;
          }
        }
      });
    });
    needsRenderRef.current = true;
  }, [selectedIds]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't consume keys when user is typing in an input
      const tag = (event.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const cs = cameraStateRef.current;
      const panStep = cs.distance * 0.05;

      switch (event.key) {
        case '1': setViewPreset('top'); break;
        case '2': setViewPreset('front'); break;
        case '3': setViewPreset('right'); break;
        case '4': setViewPreset('3d'); break;
        case '0': zoomToFit(); break;
        case '+': case '=': zoomIn(); break;
        case '-': zoomOut(); break;
        // Arrow key pan
        case 'ArrowLeft':
          cs.target.x -= panStep;
          updateCamera();
          event.preventDefault();
          break;
        case 'ArrowRight':
          cs.target.x += panStep;
          updateCamera();
          event.preventDefault();
          break;
        case 'ArrowUp':
          cs.target.y += panStep;
          updateCamera();
          event.preventDefault();
          break;
        case 'ArrowDown':
          cs.target.y -= panStep;
          updateCamera();
          event.preventDefault();
          break;
      }
    },
    [setViewPreset, zoomIn, zoomOut, zoomToFit, updateCamera]
  );

  // Use a ref for selectedIds so handleMouseDown never changes identity on selection change
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const isDragging = useRef(false);
  // 'orbit' = left drag rotates camera; 'pan' = middle/right drag translates target
  const dragMode = useRef<'orbit' | 'pan'>('orbit');
  const lastMouse = useRef({ x: 0, y: 0 });

  // Stable ref — never changes, so it won't invalidate the main setup effect
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (event.button === 1 || event.button === 2) {
        // Middle or right button → pan
        isDragging.current = true;
        dragMode.current = 'pan';
        lastMouse.current = { x: event.clientX, y: event.clientY };
        event.preventDefault();
        return;
      }

      if (event.button === 0) {
        const { camera, scene, renderer } = stateRef.current;
        if (!camera || !scene || !renderer) return;

        const rect = container.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const objects = Array.from(elementMeshesRef.current.values());
        const intersects = raycaster.intersectObjects(objects, true);

        if (intersects.length > 0 && !isViewOnly) {
          // Walk parent chain to find elementId (handles groups)
          let hit: THREE.Object3D | null = intersects[0].object;
          while (hit && !hit.userData.elementId) hit = hit.parent;
          const elementId = hit?.userData.elementId as string | undefined;
          if (elementId) {
            const current = selectedIdsRef.current;
            if (event.shiftKey) {
              setSelectedIds(
                current.includes(elementId)
                  ? current.filter((id) => id !== elementId)
                  : [...current, elementId]
              );
            } else {
              setSelectedIds([elementId]);
            }
          }
        } else {
          // Empty space → start orbit drag; deselect if not shift
          isDragging.current = true;
          dragMode.current = 'orbit';
          lastMouse.current = { x: event.clientX, y: event.clientY };
          if (!event.shiftKey && !isViewOnly) {
            setSelectedIds([]);
          }
        }
      }
    },
    // Intentionally stable: selectedIds accessed via ref, not closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isViewOnly, setSelectedIds]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging.current) return;

      const { camera } = stateRef.current;
      if (!camera) return;

      const deltaX = event.clientX - lastMouse.current.x;
      const deltaY = event.clientY - lastMouse.current.y;

      if (dragMode.current === 'orbit') {
        const cs = cameraStateRef.current;
        cs.azimuth -= deltaX * 0.005;
        cs.elevation -= deltaY * 0.005;
        cs.elevation = Math.max(0.01, Math.min(Math.PI - 0.01, cs.elevation));
        updateCamera();
      } else {
        // Pan: translate target in camera-relative horizontal plane
        const cs = cameraStateRef.current;
        const panSpeed = cs.distance * 0.001;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 0, 1);
        camera.getWorldDirection(right);
        right.z = 0;
        right.normalize();
        const panRight = right.clone().cross(up).normalize();

        cs.target.addScaledVector(panRight, deltaX * panSpeed);
        cs.target.addScaledVector(right, -deltaY * panSpeed);
        updateCamera();
      }

      lastMouse.current = { x: event.clientX, y: event.clientY };
    },
    [updateCamera]
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const cs = cameraStateRef.current;

      if (event.ctrlKey) {
        // Trackpad pinch-to-zoom: ctrlKey is set by browser for pinch gesture
        const zoomFactor = 1 + event.deltaY * 0.01;
        cs.distance = Math.max(500, Math.min(50000, cs.distance * zoomFactor));
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY) * 0.5 && Math.abs(event.deltaX) > 3) {
        // Trackpad horizontal scroll → pan left/right
        const { camera } = stateRef.current;
        if (!camera) return;
        const panSpeed = cs.distance * 0.0008;
        const right = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.z = 0;
        right.normalize();
        const panRight = right.clone().cross(new THREE.Vector3(0, 0, 1)).normalize();
        cs.target.addScaledVector(panRight, event.deltaX * panSpeed);
        if (Math.abs(event.deltaY) > 3) {
          cs.target.addScaledVector(right, -event.deltaY * panSpeed);
        }
      } else {
        // Vertical scroll → zoom (mouse wheel and trackpad two-finger vertical)
        const zoomFactor = event.deltaY > 0 ? 1.08 : 0.92;
        cs.distance = Math.max(500, Math.min(50000, cs.distance * zoomFactor));
      }

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

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const objects = Array.from(elementMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(objects, true);

    const ids = selectedIdsRef.current;
    let elementContext: import('../components/contextMenu/contextMenuItems').ElementContext;
    if (intersects.length > 0) {
      // Walk parent chain to find elementType (handles groups)
      let hit: THREE.Object3D | null = intersects[0].object;
      while (hit && !hit.userData.elementType) hit = hit.parent;
      const eType = (hit?.userData.elementType ?? '') as string;
      if (ids.length > 1) {
        elementContext = 'multi';
      } else if (eType === 'wall' || eType === 'door' || eType === 'window') {
        elementContext = eType as 'wall' | 'door' | 'window';
      } else if (eType === 'slab' || eType === 'column' || eType === 'beam' || eType === 'stair' || eType === 'roof' || eType === 'space') {
        elementContext = eType as ElementContext;
      } else {
        elementContext = 'empty';
      }
    } else {
      elementContext = 'empty';
    }

    const items = getContextMenuItems('3d', elementContext);
    // Store global clientX/clientY — ContextMenu uses position:fixed (viewport space).
    setContextMenuState({ x: me.clientX, y: me.clientY, items });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme = getTheme();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.sceneBackground);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      1,
      100000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    // Cap pixel ratio at 2× to avoid GPU overload on high-DPI displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    stateRef.current = { camera, renderer, scene };

    const gridHelper = new THREE.GridHelper(20000, 40, theme.gridColor, theme.gridColor2);
    scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(8000, 12000, 8000);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Fill light from below/opposite side for softer shadows
    const fillLight = new THREE.DirectionalLight(0xcce8ff, 0.35);
    fillLight.position.set(-6000, 2000, -6000);
    scene.add(fillLight);

    const axesHelper = new THREE.AxesHelper(1000);
    scene.add(axesHelper);

    updateCamera();

    // Throttled render loop — only renders when scene is dirty
    const animate = (timestamp: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // FPS monitor: track rolling window of frame times
      frameTimesRef.current.push(timestamp);
      if (frameTimesRef.current.length > FPS_WINDOW) {
        frameTimesRef.current.shift();
      }
      if (frameTimesRef.current.length >= 2) {
        const oldest = frameTimesRef.current[0];
        const newest = frameTimesRef.current[frameTimesRef.current.length - 1];
        const elapsed = newest - oldest;
        if (elapsed > 0) {
          const fps = ((frameTimesRef.current.length - 1) / elapsed) * 1000;
          setCurrentFps(Math.round(fps));
          // Auto-reduce detail when FPS drops below threshold
          setLodActive(fps < FPS_LOW_THRESHOLD);
        }
      }

      if (!needsRenderRef.current) return;
      needsRenderRef.current = false;
      renderer.render(scene, camera);
    };
    // Mark initial render
    needsRenderRef.current = true;
    animate(performance.now());

    const onMouseUp = () => { isDragging.current = false; };
    const onMouseLeave = () => { isDragging.current = false; };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseLeave);

    window.addEventListener('keydown', handleKeyDown);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleWheel,
    handleContextMenu,
    handleKeyDown,
    updateCamera,
  ]);

  useEffect(() => {
    updateScene();
  }, [updateScene]);

  useEffect(() => {
    updateSelection();
  }, [updateSelection]);

  // Apply or remove clipping plane whenever section state changes
  useEffect(() => {
    const { renderer } = stateRef.current;
    if (!renderer) return;

    if (sectionBox) {
      // Normal points in the negative axis direction so the plane clips
      // elements "above" the cut position (in the selected axis direction).
      let normal: THREE.Vector3;
      if (sectionDirection === 'x')      normal = new THREE.Vector3(-1, 0, 0);
      else if (sectionDirection === 'y') normal = new THREE.Vector3(0, -1, 0);
      else                               normal = new THREE.Vector3(0, 0, -1);

      renderer.clippingPlanes = [new THREE.Plane(normal, sectionPosition)];
      renderer.localClippingEnabled = true;
    } else {
      renderer.clippingPlanes = [];
      renderer.localClippingEnabled = false;
    }
  }, [sectionBox, sectionPosition, sectionDirection]);

  useEffect(() => {
    const handleThemeChange = () => {
      const theme = getTheme();
      const { scene } = stateRef.current;
      if (scene) {
        scene.background = new THREE.Color(theme.sceneBackground);
      }
    };

    window.addEventListener('storage', handleThemeChange);
    window.addEventListener('theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  /**
   * T-3D-003: Simulate an orbit drag: deltaX rotates azimuth, deltaY changes elevation.
   * Elevation is clamped to [0.01, π-0.01] to prevent gimbal lock.
   * Units: pixels (same as mouse delta — 1 px ≈ 0.005 rad).
   */
  const simulateOrbit = useCallback(
    (deltaX: number, deltaY: number) => {
      const cs = cameraStateRef.current;
      cs.azimuth   -= deltaX * 0.005;
      cs.elevation -= deltaY * 0.005;
      cs.elevation  = Math.max(0.01, Math.min(Math.PI - 0.01, cs.elevation));
      updateCamera();
    },
    [updateCamera]
  );

  /**
   * T-3D-003: Simulate a pan: translate the camera target by (dx, dy) world units
   * relative to the camera's horizontal plane.
   */
  const simulatePan = useCallback(
    (dx: number, dy: number) => {
      const cs = cameraStateRef.current;
      cs.target.x -= dx;
      cs.target.z -= dy;
      updateCamera();
    },
    [updateCamera]
  );

  /**
   * T-3D-003: Simulate a zoom: positive delta zooms out, negative zooms in.
   * Distance is clamped to [500, 50000].
   */
  const simulateZoom = useCallback(
    (delta: number) => {
      const cs = cameraStateRef.current;
      cs.distance = Math.max(500, Math.min(50000, cs.distance + delta));
      updateCamera();
    },
    [updateCamera]
  );

  /**
   * T-3D-005: Return a snapshot of the current camera spherical state.
   * Useful for assertions in tests.
   */
  const getCameraState = useCallback(
    () => ({
      azimuth:   cameraStateRef.current.azimuth,
      elevation: cameraStateRef.current.elevation,
      distance:  cameraStateRef.current.distance,
      target: {
        x: cameraStateRef.current.target.x,
        y: cameraStateRef.current.target.y,
        z: cameraStateRef.current.target.z,
      },
    }),
    []
  );

  const setLodDistance = useCallback((distance: number) => {
    lodDistanceRef.current = distance;
  }, []);

  return {
    containerRef,
    setViewPreset,
    zoomIn,
    zoomOut,
    zoomToFit,
    getCameraState,
    simulateOrbit,
    simulatePan,
    simulateZoom,
    sectionBox,
    setSectionBox,
    sectionPosition,
    setSectionPosition,
    sectionDirection,
    setSectionDirection,
    saveSectionView,
    contextMenuState,
    closeContextMenu,
    // Performance / LOD
    currentFps,
    lodActive,
    setLodDistance,
  };
}
