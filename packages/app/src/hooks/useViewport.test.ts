/**
 * T-2D-007: useViewport hook tests
 *
 * Verifies hook API surface and initial state without touching canvas rendering.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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
