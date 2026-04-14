import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useDocumentStore } from '../stores/documentStore';

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

const VIEW_PRESETS: Record<ViewPreset, { azimuth: number; elevation: number; distance: number }> = {
  top: { azimuth: 0, elevation: 0.01, distance: 10000 },
  front: { azimuth: 0, elevation: Math.PI / 2, distance: 10000 },
  right: { azimuth: Math.PI / 2, elevation: Math.PI / 2, distance: 10000 },
  '3d': { azimuth: Math.PI / 4, elevation: Math.PI / 4, distance: 10000 },
  perspective: { azimuth: Math.PI / 4, elevation: Math.PI / 6, distance: 8000 },
};

export function useThreeViewport() {
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

  const elementMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const createMaterial = useCallback((color: string, opacity: number = 0.8) => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    });
  }, []);

  const createMeshFromElement = useCallback(
    (element: any): THREE.Mesh | null => {
      const bb = element.boundingBox;
      let width = bb.max.x - bb.min.x || 1000;
      let depth = bb.max.y - bb.min.y || 1000;
      let height = bb.max.z - bb.min.z || 3000;

      if (width < 1) width = 1000;
      if (depth < 1) depth = 1000;
      if (height < 1) height = 3000;

      const geometry = new THREE.BoxGeometry(width, depth, height);
      const material = createMaterial('#8888aa', 0.8);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(bb.min.x + width / 2, bb.min.y + depth / 2, bb.min.z + height / 2);

      mesh.userData.elementId = element.id;
      mesh.userData.elementType = element.type;

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

    const elements = Object.values(doc.elements);
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
  }, [doc, updateCamera]);

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

    const elements = Object.values(doc.elements);
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
        material.opacity = 1;
        material.emissive.setHex(theme.selectionEmissive);
        material.emissiveIntensity = 0.3;
      } else {
        material.color.setHex(0x8888aa);
        material.opacity = 0.8;
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
    [selectedIds, setSelectedIds]
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10000, 10000, 10000);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

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

  return {
    containerRef,
    setViewPreset,
    zoomIn,
    zoomOut,
    zoomToFit,
    sectionBox,
    setSectionBox,
  };
}
