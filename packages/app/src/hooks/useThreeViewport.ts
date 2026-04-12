import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useDocumentStore } from '../stores/documentStore';
import { CRDTElement } from '@opencad/shared';

interface ViewportState {
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
}

export function useThreeViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ViewportState>({
    camera: null,
    renderer: null,
    scene: null,
  });
  const animationFrameRef = useRef<number | null>(null);
  const { document: doc, selectedIds, setSelectedIds } = useDocumentStore();

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
    (element: CRDTElement): THREE.Mesh | null => {
      const bb = element.boundingBox;
      const width = bb.max.x - bb.min.x;
      const depth = bb.max.y - bb.min.y;
      const height = bb.max.z - bb.min.z;

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

    elementMeshesRef.current.forEach((mesh, id) => {
      const isSelected = selectedIds.includes(id);
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (isSelected) {
        material.color.setHex(0x4f46e5);
        material.opacity = 1;
      } else {
        material.color.setHex(0x8888aa);
        material.opacity = 0.8;
      }
    });
  }, [selectedIds]);

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button !== 0) return;
      const container = containerRef.current;
      const { camera, scene, renderer } = stateRef.current;
      if (!container || !camera || !scene || !renderer) return;

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
      } else {
        setSelectedIds([]);
      }
    },
    [selectedIds, setSelectedIds]
  );

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (event.buttons !== 1) return;
    const container = containerRef.current;
    const { camera } = stateRef.current;
    if (!container || !camera) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);

    spherical.theta -= movementX * 0.005;
    spherical.phi -= movementY * 0.005;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100000
    );
    camera.position.set(5000, 5000, 5000);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    stateRef.current = { camera, renderer, scene };

    const gridHelper = new THREE.GridHelper(20000, 40, 0x444466, 0x333355);
    scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10000, 10000, 10000);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const axesHelper = new THREE.AxesHelper(1000);
    scene.add(axesHelper);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);

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
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [handleMouseDown, handleMouseMove]);

  useEffect(() => {
    updateScene();
  }, [updateScene]);

  useEffect(() => {
    updateSelection();
  }, [updateSelection]);

  return {
    containerRef,
    state: stateRef.current,
  };
}
