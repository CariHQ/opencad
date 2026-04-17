/**
 * Renderer2D Tests
 * T-2D-009: 2D canvas renderer operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer2D, createRenderer } from './renderer';
import type { DrawElement } from './drawing';

function makeCanvas(width = 400, height = 300): HTMLCanvasElement {
  const calls: string[] = [];
  const ctx: Partial<CanvasRenderingContext2D> = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'round' as CanvasLineJoin,
    lineCap: 'round' as CanvasLineCap,
    font: '',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    ellipse: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    get _calls() { return calls; },
  };
  const canvas = {
    width,
    height,
    getContext: vi.fn().mockReturnValue(ctx),
  } as unknown as HTMLCanvasElement;
  return canvas;
}

function makeLine(): DrawElement {
  return {
    id: 'el-1',
    type: 'line',
    points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
    properties: { color: '#ff0000', lineWidth: 2 },
  };
}

describe('T-2D-009: Renderer2D construction', () => {
  it('constructs without error', () => {
    const canvas = makeCanvas();
    expect(() => new Renderer2D(canvas)).not.toThrow();
  });

  it('throws if canvas has no 2d context', () => {
    const canvas = {
      width: 200,
      height: 200,
      getContext: vi.fn().mockReturnValue(null),
    } as unknown as HTMLCanvasElement;
    expect(() => new Renderer2D(canvas)).toThrow('Could not get 2d context');
  });

  it('createRenderer factory returns Renderer2D instance', () => {
    const canvas = makeCanvas();
    const renderer = createRenderer(canvas);
    expect(renderer).toBeInstanceOf(Renderer2D);
  });
});

describe('T-2D-009: Renderer2D.setConfig', () => {
  let renderer: Renderer2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = makeCanvas();
    renderer = new Renderer2D(canvas);
  });

  it('does not throw on setConfig call', () => {
    expect(() => renderer.setConfig({ backgroundColor: '#000000' })).not.toThrow();
  });
});

describe('T-2D-009: Renderer2D.clear', () => {
  let renderer: Renderer2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = makeCanvas();
    renderer = new Renderer2D(canvas);
  });

  it('calls fillRect on canvas context', () => {
    renderer.clear();
    const ctx = canvas.getContext('2d') as unknown as { fillRect: ReturnType<typeof vi.fn> };
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

describe('T-2D-009: Renderer2D.drawGrid', () => {
  let renderer: Renderer2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = makeCanvas();
    renderer = new Renderer2D(canvas);
  });

  it('calls stroke multiple times when grid is visible', () => {
    renderer.drawGrid();
    const ctx = canvas.getContext('2d') as unknown as { stroke: ReturnType<typeof vi.fn> };
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('does not call stroke when showGrid is false', () => {
    renderer.setConfig({ showGrid: false });
    renderer.drawGrid();
    const ctx = canvas.getContext('2d') as unknown as { stroke: ReturnType<typeof vi.fn> };
    expect(ctx.stroke).not.toHaveBeenCalled();
  });
});

describe('T-2D-009: Renderer2D.renderElement', () => {
  let renderer: Renderer2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = makeCanvas();
    renderer = new Renderer2D(canvas);
  });

  it('renders a line element without throwing', () => {
    expect(() => renderer.renderElement(makeLine())).not.toThrow();
  });

  it('renders a rectangle element', () => {
    const rect: DrawElement = {
      id: 'r1',
      type: 'rectangle',
      points: [{ x: 0, y: 0 }, { x: 50, y: 50 }],
      properties: {},
    };
    expect(() => renderer.renderElement(rect)).not.toThrow();
    const ctx = canvas.getContext('2d') as unknown as { rect: ReturnType<typeof vi.fn> };
    expect(ctx.rect).toHaveBeenCalled();
  });

  it('renders a circle element', () => {
    const circle: DrawElement = {
      id: 'c1',
      type: 'circle',
      points: [{ x: 50, y: 50 }, { x: 100, y: 50 }],
      properties: {},
    };
    expect(() => renderer.renderElement(circle)).not.toThrow();
    const ctx = canvas.getContext('2d') as unknown as { arc: ReturnType<typeof vi.fn> };
    expect(ctx.arc).toHaveBeenCalled();
  });

  it('renders a polyline element', () => {
    const poly: DrawElement = {
      id: 'p1',
      type: 'polyline',
      points: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }],
      properties: {},
    };
    expect(() => renderer.renderElement(poly)).not.toThrow();
  });

  it('renders an arc element', () => {
    const arc: DrawElement = {
      id: 'a1',
      type: 'arc',
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: -50 }],
      properties: {},
    };
    expect(() => renderer.renderElement(arc)).not.toThrow();
    const ctx = canvas.getContext('2d') as unknown as { quadraticCurveTo: ReturnType<typeof vi.fn> };
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it('renders a text element', () => {
    const text: DrawElement = {
      id: 't1',
      type: 'text',
      points: [{ x: 10, y: 10 }],
      properties: { text: 'Hello' },
    };
    expect(() => renderer.renderElement(text)).not.toThrow();
    const ctx = canvas.getContext('2d') as unknown as { fillText: ReturnType<typeof vi.fn> };
    expect(ctx.fillText).toHaveBeenCalledWith('Hello', 10, 10);
  });
});

describe('T-2D-009: Renderer2D.renderElements', () => {
  let renderer: Renderer2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = makeCanvas();
    renderer = new Renderer2D(canvas);
  });

  it('renders multiple elements without throwing', () => {
    const elements = [makeLine(), makeLine()];
    expect(() => renderer.renderElements(elements)).not.toThrow();
  });
});

describe('T-2D-009: Renderer2D.renderActiveElement', () => {
  let renderer: Renderer2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = makeCanvas();
    renderer = new Renderer2D(canvas);
  });

  it('renders active element with dashed stroke', () => {
    renderer.renderActiveElement(makeLine());
    const ctx = canvas.getContext('2d') as unknown as { setLineDash: ReturnType<typeof vi.fn> };
    expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });

  it('does nothing when element is null', () => {
    renderer.renderActiveElement(null);
    const ctx = canvas.getContext('2d') as unknown as { setLineDash: ReturnType<typeof vi.fn> };
    expect(ctx.setLineDash).not.toHaveBeenCalled();
  });
});

describe('T-2D-009: Renderer2D.getCanvas', () => {
  it('returns the canvas element', () => {
    const canvas = makeCanvas();
    const renderer = new Renderer2D(canvas);
    expect(renderer.getCanvas()).toBe(canvas);
  });
});
