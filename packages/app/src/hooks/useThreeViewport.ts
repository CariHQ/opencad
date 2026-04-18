import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useDocumentStore } from '../stores/documentStore';
import { type ElementSchema } from '@opencad/document';

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
  wall:      0xc4c8d0,
  slab:      0xa0a8b8,
  column:    0xe08040,
  beam:      0xd07030,
  door:      0x8090b8,
  window:    0x70a8d8,
  stair:     0xb0b870,
  railing:   0x90a060,
  roof:      0x909098,
  space:     0x80c8a8,
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
  const { document: doc, selectedIds, setSelectedIds } = useDocumentStore();

  const [sectionBox, setSectionBox] = useState(false);
  const [sectionPosition, setSectionPosition] = useState(0);
  const [sectionDirection, setSectionDirection] = useState<'x' | 'y' | 'z'>('z');

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
    (element: ElementSchema): THREE.Mesh | null => {
      const bb = element.boundingBox;
      let width = bb.max.x - bb.min.x || 200;
      let depth = bb.max.y - bb.min.y || 200;
      let height = bb.max.z - bb.min.z || 3000;

      if (width < 1) width = 200;
      if (depth < 1) depth = 200;
      if (height < 1) height = 3000;

      const geometry = new THREE.BoxGeometry(width, depth, height);
      const colorHex = ELEMENT_TYPE_COLORS[element.type] ?? 0x8888aa;
      const material = createMaterial(colorHex);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(bb.min.x + width / 2, bb.min.y + depth / 2, bb.min.z + height / 2);
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

    cameraStateRef.current.target.set(centerX, centerY, 0);
    cameraStateRef.current.distance = size * 2;
    updateCamera();
  }, [doc, updateCamera, setViewPreset]);

  const updateScene = useCallback(() => {
    const { scene } = stateRef.current;
    if (!scene || !doc) return;

    Object.values(elementMeshesRef.current).forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    elementMeshesRef.current.clear();

    const elements = Object.values(doc.content.elements);
    for (const element of elements) {
      const mesh = createMeshFromElement(element);
      if (mesh) {
        scene.add(mesh);
        elementMeshesRef.current.set(element.id, mesh);
      }
    }
  }, [doc, createMeshFromElement]);

  const updateSelection = useCallback(() => {
    const { scene } = stateRef.current;
    if (!scene) return;

    const theme = getTheme();

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
      switch (event.key) {
        case '1':
          setViewPreset('top');
          break;
        case '2':
          setViewPreset('front');
          break;
        case '3':
          setViewPreset('right');
          break;
        case '4':
          setViewPreset('3d');
          break;
        case '0':
          zoomToFit();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
      }
    },
    [setViewPreset, zoomIn, zoomOut, zoomToFit]
  );

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (event.button === 0 && !isViewOnly) {
        const { camera, scene, renderer } = stateRef.current;
        if (!camera || !scene || !renderer) return;

        const rect = container.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

        const meshes = Array.from(elementMeshesRef.current.values());
        const intersects = raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
          const mesh = intersects[0].object as THREE.Mesh;
          const elementId = mesh.userData.elementId as string;
          if (event.shiftKey) {
            if (selectedIds.includes(elementId)) {
              setSelectedIds(selectedIds.filter((id) => id !== elementId));
            } else {
              setSelectedIds([...selectedIds, elementId]);
            }
          } else {
            setSelectedIds([elementId]);
          }
        } else if (!event.shiftKey) {
          setSelectedIds([]);
        } else {
          isDragging.current = true;
          lastMouse.current = { x: event.clientX, y: event.clientY };
        }
      }

      if (event.button === 0 && isViewOnly) {
        isDragging.current = true;
        lastMouse.current = { x: event.clientX, y: event.clientY };
      }

      if (event.button === 1) {
        isDragging.current = true;
        lastMouse.current = { x: event.clientX, y: event.clientY };
        event.preventDefault();
      }

      if (event.button === 2) {
        isDragging.current = true;
        lastMouse.current = { x: event.clientX, y: event.clientY };
        event.preventDefault();
      }
    },
    [isViewOnly, selectedIds, setSelectedIds]
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
        cs.azimuth -= deltaX * 0.005;
        cs.elevation -= deltaY * 0.005;
        cs.elevation = Math.max(0.01, Math.min(Math.PI - 0.01, cs.elevation));
        updateCamera();
      } else if (event.buttons === 4) {
        const cs = cameraStateRef.current;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 0, 1)).normalize();

        cs.target.addScaledVector(right, -deltaX * 5);
        cs.target.addScaledVector(forward, deltaY * 5);
        updateCamera();
      } else if (event.buttons === 2) {
        const cs = cameraStateRef.current;
        cs.distance = Math.max(500, cs.distance - deltaY * 20);
        updateCamera();
      }

      lastMouse.current = { x: event.clientX, y: event.clientY };
    },
    [updateCamera]
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const cs = cameraStateRef.current;
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
      cs.distance = Math.max(500, Math.min(50000, cs.distance * zoomFactor));
      updateCamera();
    },
    [updateCamera]
  );

  const handleContextMenu = useCallback((event: Event) => {
    event.preventDefault();
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

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('wheel', handleWheel);
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('mouseup', () => {
      isDragging.current = false;
    });
    container.addEventListener('mouseleave', () => {
      isDragging.current = false;
    });

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
  };
}
