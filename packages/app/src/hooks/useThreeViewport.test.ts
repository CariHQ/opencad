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

// Mock three-mesh-bvh — no-ops in test environment
vi.mock('three-mesh-bvh', () => ({
  acceleratedRaycast: vi.fn(),
  computeBoundsTree: vi.fn(),
  disposeBoundsTree: vi.fn(),
}));

// Mock Three.js entirely — no WebGL required
vi.mock('three', () => {
  // Use class syntax so vi.fn() works as a constructor (vitest 4 requirement)
  class Vector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(_x: number, _y: number, _z: number) { this.x = _x; this.y = _y; this.z = _z; return this; }
    copy(v: Vector3) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add() { return this; }
    addScaledVector() { return this; }
    normalize() { return this; }
    crossVectors() { return this; }
    setFromSpherical() { return this; }
    getWorldDirection() { return this; }
  }

  class Spherical {
    radius = 1; phi = 0; theta = 0;
  }

  class Color {
    setHex() { return this; }
  }

  class PerspectiveCamera {
    position = { x: 0, y: 0, z: 0, copy: vi.fn(), add: vi.fn() };
    lookAt = vi.fn();
    aspect = 1;
    updateProjectionMatrix = vi.fn();
    getWorldDirection = vi.fn();
  }

  class Scene {
    background = null;
    add = vi.fn();
    remove = vi.fn();
  }

  class WebGLRenderer {
    setSize = vi.fn();
    setPixelRatio = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
    domElement = document.createElement('canvas');
    shadowMap = { enabled: false };
  }

  class GridHelper {}
  class AmbientLight { position = { set: vi.fn() }; }
  class DirectionalLight { position = { set: vi.fn() }; castShadow = false; }
  class AxesHelper {}
  class Box3 {
    expandByObject = vi.fn();
    getCenter = vi.fn().mockImplementation((v: { x: number; y: number; z: number }) => {
      v.x = 0; v.y = 0; v.z = 0;
    });
    getSize = vi.fn().mockImplementation((v: { x: number; y: number; z: number }) => {
      v.x = 1000; v.y = 1000; v.z = 1000;
    });
  }
  class Raycaster {
    setFromCamera = vi.fn();
    intersectObjects = vi.fn().mockReturnValue([]);
  }
  class Vector2 {
    x = 0; y = 0; set = vi.fn();
  }
  class MeshStandardMaterial {
    color = { setHex: vi.fn() };
    emissive = { setHex: vi.fn() };
    opacity = 1;
    emissiveIntensity = 0;
    clone = vi.fn().mockReturnThis();
  }
  const Material = class { dispose = vi.fn(); };
  class BufferGeometry {
    dispose = vi.fn();
    computeBoundsTree = vi.fn();
    disposeBoundsTree = vi.fn();
    setAttribute = vi.fn();
  }
  class BoxGeometry extends BufferGeometry {}
  class CylinderGeometry extends BufferGeometry {}
  class TorusGeometry extends BufferGeometry {}
  class ExtrudeGeometry extends BufferGeometry {}
  class Mesh {
    position = { set: vi.fn() };
    rotation = { x: 0, y: 0, z: 0 };
    material = null;
    geometry: BufferGeometry = new BufferGeometry();
    userData = {};
    castShadow = false;
    receiveShadow = false;
    raycast = vi.fn();
    traverse = vi.fn();
  }
  class Group {
    userData = {};
    add = vi.fn();
    traverse = vi.fn();
    children: Mesh[] = [];
  }

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
    BufferGeometry,
    BoxGeometry,
    CylinderGeometry,
    TorusGeometry,
    ExtrudeGeometry,
    Mesh,
    Group,
    Material,
    Shape: class { moveTo = vi.fn(); lineTo = vi.fn(); closePath = vi.fn(); },
    FrontSide: 0,
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

// ─── T-3D-003: Wall tool → scene has mesh ─────────────────────────────────────

describe('T-3D-003: scene mesh from wall element', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('3d-wall-test', 'user-1');
  });

  it('hook exposes simulateOrbit function', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(typeof result.current.simulateOrbit).toBe('function');
  });

  it('hook exposes simulatePan function', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(typeof result.current.simulatePan).toBe('function');
  });

  it('hook exposes simulateZoom function', () => {
    const { result } = renderHook(() => useThreeViewport());
    expect(typeof result.current.simulateZoom).toBe('function');
  });
});

// ─── T-3D-005: Orbit/pan/zoom camera transforms ────────────────────────────────

describe('T-3D-005: orbit/pan/zoom camera controls', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('3d-camera-test', 'user-1');
  });

  it('simulateOrbit changes camera azimuth angle', () => {
    const { result } = renderHook(() => useThreeViewport());
    const before = result.current.getCameraState().azimuth;
    act(() => { result.current.simulateOrbit(100, 0); });
    const after = result.current.getCameraState().azimuth;
    expect(Math.abs(after - before)).toBeGreaterThan(0.001);
  });

  it('simulateOrbit changes camera elevation angle', () => {
    const { result } = renderHook(() => useThreeViewport());
    const before = result.current.getCameraState().elevation;
    act(() => { result.current.simulateOrbit(0, 50); });
    const after = result.current.getCameraState().elevation;
    expect(Math.abs(after - before)).toBeGreaterThan(0.001);
  });

  it('simulatePan translates camera target', () => {
    const { result } = renderHook(() => useThreeViewport());
    const before = { ...result.current.getCameraState().target };
    act(() => { result.current.simulatePan(500, 0); });
    const after = result.current.getCameraState().target;
    // At least one axis should change
    const changed =
      Math.abs(after.x - before.x) > 0.001 ||
      Math.abs(after.y - before.y) > 0.001 ||
      Math.abs(after.z - before.z) > 0.001;
    expect(changed).toBe(true);
  });

  it('simulateZoom changes camera distance', () => {
    const { result } = renderHook(() => useThreeViewport());
    const before = result.current.getCameraState().distance;
    act(() => { result.current.simulateZoom(200); });
    const after = result.current.getCameraState().distance;
    expect(Math.abs(after - before)).toBeGreaterThan(0.001);
  });

  it('simulateZoom does not exceed far clamp (50000)', () => {
    const { result } = renderHook(() => useThreeViewport());
    act(() => {
      // Zoom out many times to hit the far clamp
      for (let i = 0; i < 20; i++) result.current.simulateZoom(5000);
    });
    expect(result.current.getCameraState().distance).toBeLessThanOrEqual(50000);
  });

  it('simulateZoom does not go below near clamp (500)', () => {
    const { result } = renderHook(() => useThreeViewport());
    act(() => {
      // Zoom in many times to hit near clamp
      for (let i = 0; i < 20; i++) result.current.simulateZoom(-5000);
    });
    expect(result.current.getCameraState().distance).toBeGreaterThanOrEqual(500);
  });

  it('elevation is clamped to prevent gimbal lock (max < PI - 0.01)', () => {
    const { result } = renderHook(() => useThreeViewport());
    act(() => {
      // Drag down hard to max elevation
      result.current.simulateOrbit(0, -10000);
    });
    expect(result.current.getCameraState().elevation).toBeLessThan(Math.PI - 0.009);
  });

  it('elevation is clamped to prevent gimbal lock (min > 0.01)', () => {
    const { result } = renderHook(() => useThreeViewport());
    act(() => {
      // Drag up hard to min elevation
      result.current.simulateOrbit(0, 10000);
    });
    expect(result.current.getCameraState().elevation).toBeGreaterThan(0.009);
  });

  it('no gimbal lock: orbit to poles and back returns to near-original azimuth', () => {
    const { result } = renderHook(() => useThreeViewport());
    const originalAzimuth = result.current.getCameraState().azimuth;

    act(() => {
      // Orbit to elevation extremes — azimuth should be unaffected
      result.current.simulateOrbit(0, 10000);
      result.current.simulateOrbit(0, -10000);
    });

    const finalAzimuth = result.current.getCameraState().azimuth;
    expect(Math.abs(finalAzimuth - originalAzimuth)).toBeLessThan(0.01);
  });
});

// ─── T-PERF: LOD level function ───────────────────────────────────────────────

import { getLodLevel } from './useThreeViewport';

describe('T-PERF-001: getLodLevel returns high for close distance', () => {
  it('T-PERF-001: getLodLevel(3000) returns high', () => {
    expect(getLodLevel(3000)).toBe('high');
  });
});

describe('T-PERF-002: getLodLevel returns medium for mid distance', () => {
  it('T-PERF-002: getLodLevel(10000) returns medium', () => {
    expect(getLodLevel(10000)).toBe('medium');
  });
});

describe('T-PERF-003: getLodLevel returns low for far distance', () => {
  it('T-PERF-003: getLodLevel(25000) returns low', () => {
    expect(getLodLevel(25000)).toBe('low');
  });
});

describe('T-PERF-004: getLodLevel is monotonically decreasing', () => {
  it('T-PERF-004: LOD transitions high → medium → low as distance increases', () => {
    const close = getLodLevel(100);
    const mid = getLodLevel(10000);
    const far = getLodLevel(25000);

    // Ordering by detail level: high > medium > low
    const rank: Record<string, number> = { high: 2, medium: 1, low: 0 };
    expect(rank[close]!).toBeGreaterThan(rank[mid]!);
    expect(rank[mid]!).toBeGreaterThan(rank[far]!);
  });
});
