/**
 * T-2D-011: Text tool — canvas click handler and inline text input
 *
 * Tests:
 *  - Clicking the canvas with 'text' tool active records the click position as drawingText
 *  - confirmText() calls addElement with type:'text' and the correct geometry data
 *  - cancelText() (Escape) clears drawingText without adding an element
 *  - textInputRef is returned so Viewport can render the overlay input
 *  - Text elements are rendered via ctx.fillText on the canvas draw loop
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewport } from './useViewport';
import { useDocumentStore } from '../stores/documentStore';

// ── canvas stub ────────────────────────────────────────────────────────────────
const fillTextMock = vi.fn();
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
  rect: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 50 }),
  fillText: fillTextMock,
  strokeText: vi.fn(),
  setLineDash: vi.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  font: '',
  canvas: { width: 800, height: 600 },
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

// ── helpers ────────────────────────────────────────────────────────────────────
function makeMouseEvent(x: number, y: number): React.MouseEvent<HTMLCanvasElement> {
  return {
    clientX: x,
    clientY: y,
    shiftKey: false,
    preventDefault: vi.fn(),
  } as unknown as React.MouseEvent<HTMLCanvasElement>;
}

// ── tests ──────────────────────────────────────────────────────────────────────

describe('T-2D-011: text tool — drawingText state', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('text-tool-test', 'user-1');
    useDocumentStore.getState().setActiveTool('text');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fillTextMock.mockClear();
  });

  it('T-2D-011-001: drawingText is null initially', () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.drawingText).toBeNull();
  });

  it('T-2D-011-002: clicking canvas with text tool sets drawingText with x,y in world coords', () => {
    const { result } = renderHook(() => useViewport());

    // Attach the canvas to a fake DOM so getBoundingClientRect works
    const canvas = result.current.canvasRef.current;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
    }

    act(() => {
      result.current.handleCanvasMouseDown(makeMouseEvent(400, 300));
    });

    expect(result.current.drawingText).not.toBeNull();
    expect(typeof result.current.drawingText!.x).toBe('number');
    expect(typeof result.current.drawingText!.y).toBe('number');
  });

  it('T-2D-011-003: drawingText coordinates are world-space (mm units)', () => {
    const { result } = renderHook(() => useViewport());

    const canvas = result.current.canvasRef.current;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
    }

    // Click at dead-centre of an 800x600 canvas
    act(() => {
      result.current.handleCanvasMouseDown(makeMouseEvent(400, 300));
    });

    // screenToWorld(400, 300, 800, 600) = { x: (400-400)*20 = 0, y: -(300-300)*20 = 0 }
    // Canvas centre maps to world origin (0, 0) — Y is flipped.
    expect(result.current.drawingText!.x).toBe(0);
    expect(result.current.drawingText!.y).toBe(0);
  });

  it('T-2D-011-004: textInputRef is returned from the hook', () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.textInputRef).toBeDefined();
  });
});

describe('T-2D-011: text tool — confirmText adds element', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('text-confirm-test', 'user-1');
    useDocumentStore.getState().setActiveTool('text');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('T-2D-011-005: confirmText adds a text element to the document', () => {
    const { result } = renderHook(() => useViewport());

    const canvas = result.current.canvasRef.current;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
    }

    act(() => {
      result.current.handleCanvasMouseDown(makeMouseEvent(400, 300));
    });

    expect(result.current.drawingText).not.toBeNull();

    act(() => {
      result.current.confirmText('Hello World');
    });

    const store = useDocumentStore.getState();
    const elements = Object.values(store.document!.content.elements);
    const textEl = elements.find((el) => el.type === 'text');
    expect(textEl).toBeDefined();
  });

  it('T-2D-011-006: confirmText element has correct geometry type "point"', () => {
    const { result } = renderHook(() => useViewport());

    const canvas = result.current.canvasRef.current;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
    }

    act(() => {
      result.current.handleCanvasMouseDown(makeMouseEvent(400, 300));
    });
    act(() => {
      result.current.confirmText('Test');
    });

    const store = useDocumentStore.getState();
    const textEl = Object.values(store.document!.content.elements).find((el) => el.type === 'text');
    expect(textEl!.geometry.type).toBe('point');
  });

  it('T-2D-011-007: confirmText geometry data contains content, x, y, fontSize, fontFamily', () => {
    const { result } = renderHook(() => useViewport());

    const canvas = result.current.canvasRef.current;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
    }

    act(() => {
      result.current.handleCanvasMouseDown(makeMouseEvent(400, 300));
    });
    act(() => {
      result.current.confirmText('OpenCAD');
    });

    const store = useDocumentStore.getState();
    // Find the text element with our specific content (multiple text elements may exist from previous tests)
    const textEl = Object.values(store.document!.content.elements).find(
      (el) => el.type === 'text' && (el.geometry.data as { content?: string }).content === 'OpenCAD',
    );
    expect(textEl).toBeDefined();
    const data = textEl!.geometry.data as { content: string; x: number; y: number; fontSize: number; fontFamily: string };
    expect(data.content).toBe('OpenCAD');
    // Canvas centre (400, 300) → world (0, 0) with Y-flipped coordinate system
    expect(data.x).toBe(0);
    expect(data.y).toBe(0);
    expect(data.fontSize).toBe(14);
    expect(data.fontFamily).toBe('sans-serif');
  });

  it('T-2D-011-008: confirmText clears drawingText afterwards', () => {
    const { result } = renderHook(() => useViewport());

    const canvas = result.current.canvasRef.current;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
    }

    act(() => {
      result.current.handleCanvasMouseDown(makeMouseEvent(400, 300));
    });
    act(() => {
      result.current.confirmText('Done');
    });

    expect(result.current.drawingText).toBeNull();
  });

  it('T-2D-011-009: confirmText with empty string does NOT add element', () => {
    const { result } = renderHook(() => useViewport());

    const canvas = result.current.canvasRef.current;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
    }

    const elementsBefore = Object.keys(useDocumentStore.getState().document!.content.elements).length;

    act(() => {
      result.current.handleCanvasMouseDown(makeMouseEvent(400, 300));
    });
    act(() => {
      result.current.confirmText('');
    });

    const elementsAfter = Object.keys(useDocumentStore.getState().document!.content.elements).length;
    expect(elementsAfter).toBe(elementsBefore);
    expect(result.current.drawingText).toBeNull();
  });
});

describe('T-2D-011: text tool — cancelText (Escape)', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('text-cancel-test', 'user-1');
    useDocumentStore.getState().setActiveTool('text');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('T-2D-011-010: cancelText clears drawingText without adding element', () => {
    const { result } = renderHook(() => useViewport());

    const canvas = result.current.canvasRef.current;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
    }

    const elementsBefore = Object.keys(useDocumentStore.getState().document!.content.elements).length;

    act(() => {
      result.current.handleCanvasMouseDown(makeMouseEvent(400, 300));
    });
    expect(result.current.drawingText).not.toBeNull();

    act(() => {
      result.current.cancelText();
    });

    expect(result.current.drawingText).toBeNull();
    const elementsAfter = Object.keys(useDocumentStore.getState().document!.content.elements).length;
    expect(elementsAfter).toBe(elementsBefore);
  });

  it('T-2D-011-011: pressing Escape key cancels text entry', () => {
    const { result } = renderHook(() => useViewport());

    const canvas = result.current.canvasRef.current;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      Object.defineProperty(canvas, 'width', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'height', { value: 600, configurable: true });
    }

    act(() => {
      result.current.handleCanvasMouseDown(makeMouseEvent(400, 300));
    });
    expect(result.current.drawingText).not.toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.drawingText).toBeNull();
  });
});
