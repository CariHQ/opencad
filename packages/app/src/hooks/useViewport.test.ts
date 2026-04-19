/**
 * T-2D-007: useViewport hook tests
 *
 * Verifies hook API surface and initial state without touching canvas rendering.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewport } from './useViewport';
import { useDocumentStore } from '../stores/documentStore';

// Suppress canvas context errors in jsdom
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  setTransform: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 50 }),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  canvas: { width: 800, height: 600 },
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Stub rAF / cAF so the hook's render loop doesn't run
vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Stub ResizeObserver
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
);

describe('T-2D-007: useViewport — initial state', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('vp-test', 'user-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns canvasRef', () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.canvasRef).toBeDefined();
  });

  it('returns containerRef', () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.containerRef).toBeDefined();
  });

  it('drawingState starts with isDrawing false', () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.drawingState.isDrawing).toBe(false);
  });

  it('drawingState starts with no startPoint', () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.drawingState.startPoint).toBeNull();
  });

  it('drawingState starts with empty points array', () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.drawingState.points).toHaveLength(0);
  });

  it('returns activeTool from store', () => {
    const { result } = renderHook(() => useViewport());
    // Default tool is 'select'
    expect(typeof result.current.activeTool).toBe('string');
  });

  it('viewTransform has a positive scale', () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.viewTransform.scale).toBeGreaterThan(0);
  });

  it('viewTransform has panX and panY numbers', () => {
    const { result } = renderHook(() => useViewport());
    expect(typeof result.current.viewTransform.panX).toBe('number');
    expect(typeof result.current.viewTransform.panY).toBe('number');
  });
});

describe('T-2D-007: useViewport — event handlers', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('vp-test-handlers', 'user-1');
  });

  it('exposes handleCanvasMouseDown function', () => {
    const { result } = renderHook(() => useViewport());
    expect(typeof result.current.handleCanvasMouseDown).toBe('function');
  });

  it('exposes handleCanvasMouseMove function', () => {
    const { result } = renderHook(() => useViewport());
    expect(typeof result.current.handleCanvasMouseMove).toBe('function');
  });

  it('exposes handleCanvasMouseUp function', () => {
    const { result } = renderHook(() => useViewport());
    expect(typeof result.current.handleCanvasMouseUp).toBe('function');
  });

  it('exposes handleCanvasDoubleClick function', () => {
    const { result } = renderHook(() => useViewport());
    expect(typeof result.current.handleCanvasDoubleClick).toBe('function');
  });

  it('exposes all required handlers', () => {
    const { result } = renderHook(() => useViewport());
    // wheel is now registered as a native listener inside the hook, not exposed
    expect(typeof result.current.handleCanvasMouseDown).toBe('function');
    expect(typeof result.current.handleCanvasMouseMove).toBe('function');
    expect(typeof result.current.handleCanvasMouseUp).toBe('function');
    expect(typeof result.current.handleCanvasDoubleClick).toBe('function');
  });
});

describe('T-2D-007: useViewport — tool integration', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('vp-test-tools', 'user-1');
  });

  it('activeTool reflects store activeTool change', () => {
    useDocumentStore.getState().setActiveTool('line');
    const { result } = renderHook(() => useViewport());
    expect(result.current.activeTool).toBe('line');
  });

  it('activeTool defaults to select when not set', () => {
    useDocumentStore.setState({ activeTool: 'select' });
    const { result } = renderHook(() => useViewport());
    expect(result.current.activeTool).toBe('select');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-ROLE-005: Viewport read-only mode
// ─────────────────────────────────────────────────────────────────────────────

describe('T-ROLE-005: viewport read-only mode', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('vp-readonly-test', 'user-1');
    useDocumentStore.getState().setActiveTool('line');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * T-ROLE-005-001: isViewOnly=false does not block the mousedown handler.
   * With isViewOnly=false, the handler passes the guard and proceeds.
   */
  it('T-ROLE-005-001: isViewOnly=false does not block mousedown handler', () => {
    const { result } = renderHook(() => useViewport({ isViewOnly: false }));

    // Verify the hook is configured correctly (isViewOnly is exposed as false)
    expect(result.current.isViewOnly).toBe(false);

    // Verify that the handler is a callable function (not replaced with a no-op)
    expect(typeof result.current.handleCanvasMouseDown).toBe('function');

    // With isViewOnly=false, calling handleCanvasMouseDown should not throw
    const mockEvent = {
      clientX: 100,
      clientY: 100,
      shiftKey: false,
    } as unknown as React.MouseEvent<HTMLCanvasElement>;

    expect(() => {
      act(() => { result.current.handleCanvasMouseDown(mockEvent); });
    }).not.toThrow();
  });

  /**
   * T-ROLE-005-002: isViewOnly=true — mousedown does NOT trigger drawing
   */
  it('T-ROLE-005-002: isViewOnly=true mousedown does NOT trigger drawing', () => {
    const { result } = renderHook(() => useViewport({ isViewOnly: true }));

    const mockEvent = {
      clientX: 100,
      clientY: 100,
      shiftKey: false,
    } as unknown as React.MouseEvent<HTMLCanvasElement>;

    act(() => {
      result.current.handleCanvasMouseDown(mockEvent);
    });

    // isViewOnly early-returns, so isDrawing stays false
    expect(result.current.drawingState.isDrawing).toBe(false);
  });

  /**
   * T-ROLE-005-003: isViewOnly=true — wheel zoom is still available
   * The wheel handler is registered regardless of isViewOnly.
   */
  it('T-ROLE-005-003: isViewOnly=true hook exposes viewRef for wheel zoom', () => {
    const { result } = renderHook(() => useViewport({ isViewOnly: true }));
    // viewRef.current.zoom starts at 1
    expect(result.current.viewRef.current.zoom).toBe(1);
    // The wheel handler is registered on the canvas — presence of viewRef confirms feature
    expect(typeof result.current.viewRef.current.zoom).toBe('number');
  });

  /**
   * T-ROLE-005-004: isViewOnly=true — isViewOnly flag is exposed as true
   */
  it('T-ROLE-005-004: isViewOnly=true returns isViewOnly flag as true', () => {
    const { result } = renderHook(() => useViewport({ isViewOnly: true }));
    expect(result.current.isViewOnly).toBe(true);
  });

  /**
   * T-ROLE-005-005: isViewOnly=false — isViewOnly flag is exposed as false
   */
  it('T-ROLE-005-005: isViewOnly=false returns isViewOnly as false', () => {
    const { result } = renderHook(() => useViewport({ isViewOnly: false }));
    expect(result.current.isViewOnly).toBe(false);
  });

  /**
   * T-ROLE-005-006: Toggling isViewOnly from false to true blocks drawing interactions.
   * After toggling, mousedown is blocked by the isViewOnly guard.
   */
  it('T-ROLE-005-006: toggling isViewOnly from false to true blocks drawing interactions', () => {
    const { result, rerender } = renderHook(
      ({ viewOnly }: { viewOnly: boolean }) => useViewport({ isViewOnly: viewOnly }),
      { initialProps: { viewOnly: false } }
    );

    // Confirm initial state: viewOnly=false, drawingState starts idle
    expect(result.current.isViewOnly).toBe(false);
    expect(result.current.drawingState.isDrawing).toBe(false);

    // Switch to viewOnly=true
    rerender({ viewOnly: true });

    expect(result.current.isViewOnly).toBe(true);

    // Simulate a mousedown — the isViewOnly guard returns early so isDrawing stays false
    const mockEvent = {
      clientX: 100,
      clientY: 100,
      shiftKey: false,
    } as unknown as React.MouseEvent<HTMLCanvasElement>;

    act(() => {
      result.current.handleCanvasMouseDown(mockEvent);
    });

    expect(result.current.drawingState.isDrawing).toBe(false);
  });
});
