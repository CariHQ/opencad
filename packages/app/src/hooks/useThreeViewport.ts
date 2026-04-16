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

const VIEW_PRESETS: Record<ViewPreset, { azimuth: number; elevation: number; distance: number }> = {
  top: { azimuth: 0, elevation: 0.01, distance: 10000 },
  front: { azimuth: 0, elevation: Math.PI / 2, distance: 10000 },
  right: { azimuth: Math.PI / 2, elevation: Math.PI / 2, distance: 10000 },
  '3d': { azimuth: Math.PI / 4, elevation: Math.PI / 4, distance: 10000 },
  perspective: { azimuth: Math.PI / 4, elevation: Math.PI / 6, distance: 8000 },
};

const ELEMENT_COLORS: Record<string, string> = {
  wall: '#c8c8d0',
  slab: '#a0a8b0',
  roof: '#b0b8c0',
  column: '#d4c8a0',
  beam: '#8090a8',
  door: '#c8a878',
  window: '#78aac8',
  stair: '#b8a8d0',
  railing: '#90a0a8',
  space: '#d0e8d0',
  annotation: '#7890a8',
  line: '#7890a8',
  rectangle: '#8898b0',
  circle: '#8898b0',
  arc: '#8898b0',
  polygon: '#8898b0',
  polyline: '#8898b0',
  dimension: '#a0a0b8',
  text: '#b0b0c0',
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

  const createMaterial = useCallback((color: string, opacity: number = 0.8) => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    });
  }, []);

  const createMeshFromElement = useCallback(
    (element: ElementSchema): THREE.Mesh | null => {
      const props = element.properties as Record<string, { value: unknown }>;
      const pv = (key: string, fallback: number) => (typeof props[key]?.value === 'number' ? (props[key]!.value as number) : fallback);
      const color = ELEMENT_COLORS[element.type] ?? '#8888aa';
      const type = element.type;

      let geometry: THREE.BufferGeometry;
      let px = 0, py = 0, pz = 0;
      let rx = 0, rz = 0;

      if (type === 'wall' || type === 'annotation' || type === 'beam') {
        const x1 = pv('StartX', 0), y1 = pv('StartY', 0);
        const x2 = pv('EndX', x1 + 1000), y2 = pv('EndY', y1);
        const wallH = pv('Height', 3000);
        const wallT = pv('Width', type === 'beam' ? 200 : 200);
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1000;
        geometry = new THREE.BoxGeometry(len, wallT, wallH);
        px = (x1 + x2) / 2;
        py = (y1 + y2) / 2;
        pz = wallH / 2;
        rz = -Math.atan2(y2 - y1, x2 - x1);
      } else if (type === 'slab' || type === 'roof') {
        const x = pv('X', 0), y = pv('Y', 0);
        const w = pv('Width', 5000), d = pv('Depth', 5000), t = pv('Thickness', 250);
        geometry = new THREE.BoxGeometry(w, d, t);
        px = x + w / 2; py = y + d / 2; pz = -t / 2;
      } else if (type === 'column') {
        const h = pv('Height', 3000), dia = pv('Diameter', 300);
        const sect = props['SectionType']?.value;
        if (sect === 'Rectangular') {
          geometry = new THREE.BoxGeometry(dia, dia, h);
        } else {
          geometry = new THREE.CylinderGeometry(dia / 2, dia / 2, h, 16);
          rx = Math.PI / 2; // align cylinder with Z axis
        }
        px = pv('X', 0); py = pv('Y', 0); pz = h / 2;
      } else if (type === 'door' || type === 'window') {
        const w = pv('Width', type === 'door' ? 900 : 1200);
        const h = pv('Height', type === 'door' ? 2100 : 1200);
        const sill = type === 'window' ? pv('SillHeight', 900) : 0;
        geometry = new THREE.BoxGeometry(w, 50, h);
        px = pv('X', 0); py = pv('Y', 0); pz = sill + h / 2;
      } else if (type === 'stair') {
        const sw = pv('Width2D', 1200), sl = pv('Length', 3000), sh = pv('TotalRise', 3000);
        geometry = new THREE.BoxGeometry(sw, sl, sh);
        px = pv('X', 0) + sw / 2; py = pv('Y', 0) + sl / 2; pz = sh / 2;
      } else if (type === 'rectangle') {
        const w = pv('Width', 1000), h = pv('Height', 1000);
        geometry = new THREE.BoxGeometry(w, h, 50);
        px = pv('X', 0) + w / 2; py = pv('Y', 0) + h / 2; pz = 25;
      } else if (type === 'circle') {
        const r = pv('Radius', 500);
        geometry = new THREE.CylinderGeometry(r, r, 50, 32);
        rx = Math.PI / 2;
        px = pv('CenterX', 0); py = pv('CenterY', 0); pz = 25;
      } else {
        // Fallback: flat bounding-box marker
        const bb = element.boundingBox;
        const bw = Math.max(bb.max.x - bb.min.x, 100);
        const bd = Math.max(bb.max.y - bb.min.y, 100);
        geometry = new THREE.BoxGeometry(bw, bd, 50);
        px = bb.min.x + bw / 2; py = bb.min.y + bd / 2; pz = 25;
      }

      const material = createMaterial(color, type === 'space' ? 0.3 : 0.85);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(px, py, pz);
      if (rx !== 0) mesh.rotation.x = rx;
      if (rz !== 0) mesh.rotation.z = rz;

      mesh.userData.elementId = element.id;
      mesh.userData.elementType = type;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

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

    const meshes = Array.from(elementMeshesRef.current.values());
    if (meshes.length === 0) {
      setViewPreset('3d');
      return;
    }

    const box = new THREE.Box3();
    for (const mesh of meshes) {
      box.expandByObject(mesh);
    }
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 1000);

    cameraStateRef.current.target.copy(center);
    cameraStateRef.current.distance = maxDim * 2.5;
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
    sectionPosition,
    setSectionPosition,
    sectionDirection,
    setSectionDirection,
    saveSectionView,
  };
}
