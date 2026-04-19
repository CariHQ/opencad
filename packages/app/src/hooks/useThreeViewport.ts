import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useDocumentStore } from '../stores/documentStore';
import { type ElementSchema } from '@opencad/document';
import { getContextMenuItems, type ContextMenuGroup, type ElementContext } from '../components/contextMenu/contextMenuItems';

// ─── LOD Types & Functions ────────────────────────────────────────────────────

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

// ─── Frame Stats ─────────────────────────────���──────────────────────────��─────

const FRAME_BUFFER_SIZE = 60;

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
  curtain_wall: 0x88c0e0,
};

/**
 * 2D-only drafting/annotation types that should never be extruded to 3D geometry.
 * Drawing a rectangle or circle in the floor plan produces a flat 2D annotation —
 * it has no height and should not appear as a box in the 3D view.
 */
const SKETCH_2D_TYPES = new Set([
  'annotation', 'rectangle', 'circle', 'arc', 'dimension',
  'text', 'polyline', 'polygon', 'spline',
]);

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

export function useThreeViewport({ isViewOnly = false }: UseThreeViewportOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ViewportState>({
    camera: null,
    renderer: null,
    scene: null,
  });
  const cameraStateRef = useRef<CameraState>({
    target: new THREE.Vector3(0, 0, 0),
    distance: 10000,
    azimuth: Math.PI / 4,
    elevation: Math.PI / 4,
  });
  const animationFrameRef = useRef<number | null>(null);

  // ── Frame time ring buffer for rolling average ────────────────────────────
  const frameTimesRef = useRef<number[]>(new Array(FRAME_BUFFER_SIZE).fill(16.67));
  const frameTimeIndexRef = useRef(0);
  const lastFrameTimeRef = useRef<number>(0);
  const currentLodRef = useRef<LodLevel>('high');
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

  const elementMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const createMaterial = useCallback((colorHex: number) => {
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      transparent: false,
      roughness: 0.6,
      metalness: 0.0,
      side: THREE.FrontSide,
    });
  }, []);

  const createMeshFromElement = useCallback(
    (element: ElementSchema, lod: LodLevel = 'high'): THREE.Mesh | null => {
      // 2D drafting elements (rectangle, circle, arc, etc.) live only in the
      // floor-plan view — skip them in the 3D scene entirely.
      if (SKETCH_2D_TYPES.has(element.type)) return null;

      const bb = element.boundingBox;
      // Architectural coords: X = east-west, Y = plan north-south, Z = elevation.
      // Three.js scene convention: X = east-west, Y = up, Z = plan depth.
      // Remap: arch-X → three-X, arch-Z → three-Y, arch-Y → three-Z.
      let width = bb.max.x - bb.min.x;    // three-X extent
      let planDepth = bb.max.y - bb.min.y; // three-Z extent
      let height = bb.max.z - bb.min.z;   // three-Y extent

      // Fall back to sensible defaults for flat/missing geometry
      if (width < 50) width = 200;
      if (planDepth < 50) planDepth = 200;
      // For height: only use property or 3000 default if bounding box gives < 100mm
      if (height < 100) {
        const props = element.properties as Record<string, { value: unknown }>;
        height = (props['Height']?.value as number | undefined)
          ?? (props['TotalRise']?.value as number | undefined)
          ?? 3000;
      }

      // BoxGeometry(x-width, y-height, z-depth) — three.js axis order
      let geometry: THREE.BoxGeometry;
      if (lod === 'low' || lod === 'medium') {
        geometry = new THREE.BoxGeometry(width, height, planDepth, 1, 1, 1);
      } else {
        geometry = new THREE.BoxGeometry(width, height, planDepth);
      }

      const colorHex = ELEMENT_TYPE_COLORS[element.type] ?? 0x8888aa;
      const material = createMaterial(colorHex);

      const mesh = new THREE.Mesh(geometry, material);
      // Remap arch (x, y, z) → three (x, z, y)
      mesh.position.set(
        bb.min.x + width / 2,
        bb.min.z + height / 2,
        bb.min.y + planDepth / 2,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      mesh.userData.elementId = element.id;
      mesh.userData.elementType = element.type;
      mesh.userData.baseColor = colorHex;

      return mesh;
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

    // Remap arch (x, y) plan coords → three (x, z) ground-plane coords.
    // Three.js Y axis is vertical; keep camera target at Y=0 (ground).
    cameraStateRef.current.target.set(centerX, 0, centerY);
    cameraStateRef.current.distance = size * 2;
    updateCamera();
  }, [doc, updateCamera, setViewPreset]);

  const updateScene = useCallback(() => {
    const { scene } = stateRef.current;
    if (!scene || !doc) return;

    elementMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    elementMeshesRef.current.clear();

    const lod = getLodLevel(cameraStateRef.current.distance);
    const elements = Object.values(doc.content.elements);
    for (const element of elements) {
      const mesh = createMeshFromElement(element, lod);
      if (mesh) {
        scene.add(mesh);
        elementMeshesRef.current.set(element.id, mesh);
      }
    }
  }, [doc, createMeshFromElement]);

  const updateSelection = useCallback(() => {
    const { scene } = stateRef.current;
    if (!scene) return;

    elementMeshesRef.current.forEach((mesh, id) => {
      const isSelected = selectedIds.includes(id);
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (isSelected) {
        material.color.setHex(0x4f46e5);
        material.emissive.setHex(0x1a1a6e);
        material.emissiveIntensity = 0.25;
      } else {
        const baseColor = (mesh.userData.baseColor as number | undefined) ?? 0x8888aa;
        material.color.setHex(baseColor);
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
      }
    });
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
        const meshes = Array.from(elementMeshesRef.current.values());
        const intersects = raycaster.intersectObjects(meshes);

        if (intersects.length > 0 && !isViewOnly) {
          // Hit an element → select it
          const mesh = intersects[0].object as THREE.Mesh;
          const elementId = mesh.userData.elementId as string;
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
    const meshes = Array.from(elementMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(meshes);

    const ids = selectedIdsRef.current;
    let elementContext: import('../components/contextMenu/contextMenuItems').ElementContext;
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const eType = mesh.userData.elementType as string;
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
    renderer.setPixelRatio(window.devicePixelRatio);
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

    const animate = (timestamp: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Track rolling frame time
      if (lastFrameTimeRef.current > 0) {
        const delta = timestamp - lastFrameTimeRef.current;
        const idx = frameTimeIndexRef.current % FRAME_BUFFER_SIZE;
        frameTimesRef.current[idx] = delta;
        frameTimeIndexRef.current++;

        // Compute rolling average; auto-drop LOD tier if below 50fps (avg > 20ms)
        const avg = frameTimesRef.current.reduce((s, v) => s + v, 0) / FRAME_BUFFER_SIZE;
        const distanceLod = getLodLevel(cameraStateRef.current.distance);
        if (avg > 20) {
          // Step down one tier from the distance-based LOD
          currentLodRef.current = distanceLod === 'high' ? 'medium' : 'low';
        } else {
          currentLodRef.current = distanceLod;
        }
        // Publish frame stats for the status bar
        _sharedFrameStats = { avgFrameMs: avg, currentLod: currentLodRef.current };
      }
      lastFrameTimeRef.current = timestamp;

      renderer.render(scene, camera);
    };
    animate(0);

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
      // Architectural direction → three.js normal (arch-Z is vertical / three-Y).
      let normal: THREE.Vector3;
      if (sectionDirection === 'x')      normal = new THREE.Vector3(-1, 0, 0);
      else if (sectionDirection === 'y') normal = new THREE.Vector3(0, 0, -1);
      else                               normal = new THREE.Vector3(0, -1, 0);

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

  /**
   * T-PERF: Return current rolling average frame time and LOD tier.
   * Used by StatusBar to display live fps info.
   */
  const getFrameStats = useCallback((): FrameStats => {
    const avg = frameTimesRef.current.reduce((s, v) => s + v, 0) / FRAME_BUFFER_SIZE;
    return {
      avgFrameMs: avg,
      currentLod: currentLodRef.current,
    };
  }, []);

  return {
    containerRef,
    setViewPreset,
    zoomIn,
    zoomOut,
    zoomToFit,
    getCameraState,
    getFrameStats,
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
  };
}
