/**
 * T-2D-012: Spline tool tests — Catmull-Rom multi-click spline
 *
 * Tests cover:
 *  - catmullRomToBezier pure helper
 *  - Single click adds point to drawingPoints
 *  - Double-click commits element with smooth:true
 *  - Escape cancels and clears drawingPoints
 *  - Minimum 2 points required to commit
 */

import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { catmullRomToBezier } from './splineUtils';
import { useViewport } from './useViewport';
import { useDocumentStore } from '../stores/documentStore';
import type { MockInstance } from 'vitest';

// ─── Canvas mock ──────────────────────────────────────────────────────────────

const mockBezierCurveTo = vi.fn();
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  bezierCurveTo: mockBezierCurveTo,
  rect: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  setLineDash: vi.fn(),
  getLineDash: vi.fn().mockReturnValue([]),
  canvas: { width: 800, height: 600 },
  strokeStyle: '' as string,
  fillStyle: '' as string,
  lineWidth: 1,
  globalAlpha: 1,
  font: '',
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
vi.stubGlobal('cancelAnimationFrame', vi.fn());
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a real jsdom canvas and inject it into the hook's canvasRef. */
function attachCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
  Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, width: 800, height: 600,
    right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);
  (canvasRef as React.MutableRefObject<HTMLCanvasElement>).current = canvas;
  return canvas;
}

function makeClick(x: number, y: number): React.MouseEvent<HTMLCanvasElement> {
  return {
    clientX: x, clientY: y, shiftKey: false, preventDefault: vi.fn(),
  } as unknown as React.MouseEvent<HTMLCanvasElement>;
}

// ─── catmullRomToBezier unit tests ────────────────────────────────────────────

describe('T-2D-012: catmullRomToBezier pure helper', () => {
  it('returns empty array for fewer than 2 points', () => {
    expect(catmullRomToBezier([])).toHaveLength(0);
    expect(catmullRomToBezier([{ x: 0, y: 0 }])).toHaveLength(0);
  });

  it('returns one segment for exactly 2 points', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const segs = catmullRomToBezier(pts);
    expect(segs).toHaveLength(1);
  });

  it('returns n-1 segments for n points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 50 },
      { x: 150, y: 80 },
    ];
    const segs = catmullRomToBezier(pts);
    expect(segs).toHaveLength(3);
  });

  it('each segment has cp1, cp2, and end fields', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const segs = catmullRomToBezier(pts);
    const seg = segs[0]!;
    expect(seg).toHaveProperty('cp1');
    expect(seg).toHaveProperty('cp2');
    expect(seg).toHaveProperty('end');
  });

  it('cp1 and cp2 are Point2D objects with x and y numbers', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const segs = catmullRomToBezier(pts);
    const seg = segs[0]!;
    expect(typeof seg.cp1.x).toBe('number');
    expect(typeof seg.cp1.y).toBe('number');
    expect(typeof seg.cp2.x).toBe('number');
    expect(typeof seg.cp2.y).toBe('number');
  });

  it('end point matches the destination control point', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 50 }];
    const segs = catmullRomToBezier(pts);
    expect(segs[0]!.end).toEqual({ x: 100, y: 50 });
  });

  it('for collinear points the control points lie along the line', () => {
    // Three collinear horizontal points: (0,0), (50,0), (100,0)
    // All y-values should stay at 0
    const pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }];
    const segs = catmullRomToBezier(pts);
    expect(segs[0]!.cp1.y).toBeCloseTo(0);
    expect(segs[0]!.cp2.y).toBeCloseTo(0);
    expect(segs[1]!.cp1.y).toBeCloseTo(0);
    expect(segs[1]!.cp2.y).toBeCloseTo(0);
  });
});

// ─── Spline tool interaction tests ────────────────────────────────────────────

describe('T-2D-012: spline tool — click interactions', () => {
  // Shared spy for addElement, created once and cleared between tests to avoid
  // cross-test pollution that occurs when vi.spyOn is called per-test on the
  // same Zustand store singleton.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let addElementSpy: MockInstance<any[], any>;

  beforeEach(() => {
    useDocumentStore.getState().initProject('spline-test', 'user-1');
    useDocumentStore.getState().setActiveTool('spline');
    mockBezierCurveTo.mockClear();
    // Create or refresh the spy and clear its call history
    addElementSpy = vi.spyOn(useDocumentStore.getState(), 'addElement');
    addElementSpy.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * T-2D-012-001: Single click adds a point to drawingPoints
   */
  it('T-2D-012-001: single click adds a point to drawingPoints', () => {
    const { result } = renderHook(() => useViewport());
    attachCanvas(result.current.canvasRef);

    act(() => {
      result.current.handleCanvasMouseDown(makeClick(200, 200));
    });

    expect(result.current.drawingState.points).toHaveLength(1);
    expect(result.current.drawingState.isDrawing).toBe(true);
  });

  /**
   * T-2D-012-002: Successive clicks accumulate points
   */
  it('T-2D-012-002: successive clicks accumulate points', () => {
    const { result } = renderHook(() => useViewport());
    attachCanvas(result.current.canvasRef);

    act(() => { result.current.handleCanvasMouseDown(makeClick(200, 200)); });
    act(() => { result.current.handleCanvasMouseDown(makeClick(300, 250)); });
    act(() => { result.current.handleCanvasMouseDown(makeClick(400, 200)); });

    expect(result.current.drawingState.points).toHaveLength(3);
  });

  /**
   * T-2D-012-003: Escape cancels drawing and clears points
   */
  it('T-2D-012-003: Escape cancels drawing and clears all points', () => {
    const { result } = renderHook(() => useViewport());
    attachCanvas(result.current.canvasRef);

    act(() => { result.current.handleCanvasMouseDown(makeClick(200, 200)); });
    expect(result.current.drawingState.points).toHaveLength(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.drawingState.isDrawing).toBe(false);
    expect(result.current.drawingState.points).toHaveLength(0);
    expect(result.current.drawingState.startPoint).toBeNull();
  });

  /**
   * T-2D-012-004: Double-click with >= 2 points commits a polyline element with smooth:true
   */
  it('T-2D-012-004: double-click with >= 2 points commits element with smooth:true', () => {
    const { result } = renderHook(() => useViewport());
    attachCanvas(result.current.canvasRef);

    act(() => { result.current.handleCanvasMouseDown(makeClick(200, 200)); });
    act(() => { result.current.handleCanvasMouseDown(makeClick(300, 300)); });

    act(() => {
      result.current.handleCanvasDoubleClick(makeClick(400, 250));
    });

    expect(addElementSpy).toHaveBeenCalledOnce();
    const callArgs = addElementSpy.mock.calls[0]![0];
    expect(callArgs.type).toBe('polyline');

    // geometry.data.smooth should be true
    const geomData = callArgs.geometry as { type: string; data: { smooth: boolean; points: unknown[] } };
    expect(geomData.data.smooth).toBe(true);
    expect(Array.isArray(geomData.data.points)).toBe(true);
    expect(geomData.data.points.length).toBeGreaterThanOrEqual(2);

    // Drawing state should be reset
    expect(result.current.drawingState.isDrawing).toBe(false);
    expect(result.current.drawingState.points).toHaveLength(0);
  });

  /**
   * T-2D-012-005: Double-click with fewer than 2 points does NOT commit
   */
  it('T-2D-012-005: double-click with < 2 points does NOT commit', () => {
    const { result } = renderHook(() => useViewport());
    attachCanvas(result.current.canvasRef);

    // Clear any prior calls that might have happened during hook setup
    addElementSpy.mockClear();

    // Add only one point
    act(() => { result.current.handleCanvasMouseDown(makeClick(200, 200)); });

    // Double-click — only 1 prior point, so prev.points.length < 2, should NOT commit
    act(() => { result.current.handleCanvasDoubleClick(makeClick(300, 300)); });

    expect(addElementSpy).not.toHaveBeenCalled();
    expect(result.current.drawingState.isDrawing).toBe(false);
    expect(result.current.drawingState.points).toHaveLength(0);
  });

  /**
   * T-2D-012-006: Committed element geometry includes all points
   */
  it('T-2D-012-006: committed element geometry includes all clicked points', () => {
    const { result } = renderHook(() => useViewport());
    attachCanvas(result.current.canvasRef);

    // Clear any calls from hook initialization
    addElementSpy.mockClear();

    act(() => { result.current.handleCanvasMouseDown(makeClick(100, 100)); });
    act(() => { result.current.handleCanvasMouseDown(makeClick(200, 150)); });
    act(() => { result.current.handleCanvasMouseDown(makeClick(300, 100)); });

    act(() => { result.current.handleCanvasDoubleClick(makeClick(400, 120)); });

    expect(addElementSpy).toHaveBeenCalledOnce();
    const geomData = (addElementSpy.mock.calls[0]![0].geometry as { data: { points: unknown[] } }).data;
    // 3 single clicks + 1 point from double-click = 4 points
    expect(geomData.points.length).toBe(4);
  });
});
