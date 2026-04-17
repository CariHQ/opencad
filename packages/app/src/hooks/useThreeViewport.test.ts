/**
 * T-3D-011: useThreeViewport hook tests
 *
 * Verifies hook API surface, view preset constants, and state management
 * without requiring a WebGL context.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Three.js entirely — no WebGL required
vi.mock('three', () => {
  const Vector3 = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    addScaledVector: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    crossVectors: vi.fn().mockReturnThis(),
    setFromSpherical: vi.fn().mockReturnThis(),
    getWorldDirection: vi.fn().mockReturnThis(),
  }));

  const Spherical = vi.fn().mockImplementation(() => ({ radius: 1, phi: 0, theta: 0 }));

  const Color = vi.fn().mockImplementation(() => ({
    setHex: vi.fn().mockReturnThis(),
  }));

  const PerspectiveCamera = vi.fn().mockImplementation(() => ({
    position: { x: 0, y: 0, z: 0, copy: vi.fn(), add: vi.fn() },
    lookAt: vi.fn(),
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
    getWorldDirection: vi.fn(),
  }));

  const Scene = vi.fn().mockImplementation(() => ({
    background: null,
    add: vi.fn(),
    remove: vi.fn(),
  }));

  const WebGLRenderer = vi.fn().mockImplementation(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
    shadowMap: { enabled: false },
  }));

  const GridHelper = vi.fn().mockImplementation(() => ({}));
  const AmbientLight = vi.fn().mockImplementation(() => ({ position: { set: vi.fn() } }));
  const DirectionalLight = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    castShadow: false,
  }));
  const AxesHelper = vi.fn().mockImplementation(() => ({}));
  const Box3 = vi.fn().mockImplementation(() => ({
    expandByObject: vi.fn(),
    getCenter: vi.fn().mockImplementation((v: { x: number; y: number; z: number }) => {
      v.x = 0; v.y = 0; v.z = 0;
    }),
    getSize: vi.fn().mockImplementation((v: { x: number; y: number; z: number }) => {
      v.x = 1000; v.y = 1000; v.z = 1000;
    }),
  }));
  const Raycaster = vi.fn().mockImplementation(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn().mockReturnValue([]),
  }));
  const Vector2 = vi.fn().mockImplementation(() => ({ x: 0, y: 0, set: vi.fn() }));
  const MeshStandardMaterial = vi.fn().mockImplementation(() => ({
    color: { setHex: vi.fn() },
    emissive: { setHex: vi.fn() },
    opacity: 1,
    emissiveIntensity: 0,
    clone: vi.fn().mockReturnThis(),
  }));
  const BoxGeometry = vi.fn().mockImplementation(() => ({ dispose: vi.fn() }));
  const CylinderGeometry = vi.fn().mockImplementation(() => ({ dispose: vi.fn() }));
  const Mesh = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    material: null,
    geometry: { dispose: vi.fn() },
    userData: {},
    castShadow: false,
    receiveShadow: false,
  }));

  return {
    Vector3,
    Spherical,
    Color,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
    GridHelper,
    AmbientLight,
    DirectionalLight,
    AxesHelper,
    Box3,
    Raycaster,
    Vector2,
    MeshStandardMaterial,
    BoxGeometry,
    CylinderGeometry,
    Mesh,
    DoubleSide: 2,
  };
});

// Stub rAF / cAF
vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Stub ResizeObserver
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe = vi.fn();
    disconnect = vi.fn();
  }
);

import { useThreeViewport } from './useThreeViewport';
import { useDocumentStore } from '../stores/documentStore';

describe('T-3D-011: useThreeViewport — initial state', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('3d-vp-test', 'user-1');
  });

  it('returns containerRef', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(result.current.containerRef).toBeDefined();
  });

  it('returns setViewPreset function', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(typeof result.current.setViewPreset).toBe('function');
  });

  it('returns zoomIn function', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(typeof result.current.zoomIn).toBe('function');
  });

  it('returns zoomOut function', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(typeof result.current.zoomOut).toBe('function');
  });

  it('returns zoomToFit function', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(typeof result.current.zoomToFit).toBe('function');
  });

  it('sectionBox starts as false', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(result.current.sectionBox).toBe(false);
  });

  it('sectionPosition starts as 0', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(result.current.sectionPosition).toBe(0);
  });

  it('sectionDirection starts as z', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(result.current.sectionDirection).toBe('z');
  });

  it('returns saveSectionView function', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(typeof result.current.saveSectionView).toBe('function');
  });
});

describe('T-3D-011: useThreeViewport — section state setters', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('3d-vp-section', 'user-1');
  });

  it('setSectionBox toggles section box state', () => {
    const { result } = renderHook(() => useThreeViewport());
    act(() => {
      result.current.setSectionBox(true);
    });
    expect(result.current.sectionBox).toBe(true);
  });

  it('setSectionPosition updates position', () => {
    const { result } = renderHook(() => useThreeViewport());
    act(() => {
      result.current.setSectionPosition(5000);
    });
    expect(result.current.sectionPosition).toBe(5000);
  });

  it('setSectionDirection updates direction to x', () => {
    const { result } = renderHook(() => useThreeViewport());
    act(() => {
      result.current.setSectionDirection('x');
    });
    expect(result.current.sectionDirection).toBe('x');
  });

  it('setSectionDirection updates direction to y', () => {
    const { result } = renderHook(() => useThreeViewport());
    act(() => {
      result.current.setSectionDirection('y');
    });
    expect(result.current.sectionDirection).toBe('y');
  });
});

describe('T-3D-011: useThreeViewport — view presets', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('3d-vp-presets', 'user-1');
  });

  it('setViewPreset does not throw for top preset', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(() => act(() => { result.current.setViewPreset('top'); })).not.toThrow();
  });

  it('setViewPreset does not throw for front preset', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(() => act(() => { result.current.setViewPreset('front'); })).not.toThrow();
  });

  it('setViewPreset does not throw for right preset', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(() => act(() => { result.current.setViewPreset('right'); })).not.toThrow();
  });

  it('setViewPreset does not throw for 3d preset', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(() => act(() => { result.current.setViewPreset('3d'); })).not.toThrow();
  });

  it('setViewPreset does not throw for perspective preset', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(() => act(() => { result.current.setViewPreset('perspective'); })).not.toThrow();
  });
});

describe('T-3D-011: useThreeViewport — zoom', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('3d-vp-zoom', 'user-1');
  });

  it('zoomIn does not throw', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(() => act(() => { result.current.zoomIn(); })).not.toThrow();
  });

  it('zoomOut does not throw', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(() => act(() => { result.current.zoomOut(); })).not.toThrow();
  });

  it('zoomToFit does not throw when no elements in scene', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(() => act(() => { result.current.zoomToFit(); })).not.toThrow();
  });
});

describe('T-3D-011: useThreeViewport — saveSectionView', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('3d-vp-save', 'user-1');
    localStorage.clear();
  });

  it('saveSectionView persists section settings to localStorage', () => {
    const { result } = renderHook(() => useThreeViewport());
    act(() => {
      result.current.setSectionPosition(3000);
      result.current.setSectionDirection('x');
    });
    act(() => {
      result.current.saveSectionView();
    });
    const saved = localStorage.getItem('opencad-section-view');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed).toHaveProperty('direction');
  });
});
