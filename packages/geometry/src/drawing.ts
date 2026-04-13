/**
 * 2D Drawing Tools
 * T-2D-001 through T-2D-008
 */

export interface DrawPoint {
  x: number;
  y: number;
  z: number;
}

export interface LineSegment {
  start: DrawPoint;
  end: DrawPoint;
}

export interface DrawElement {
  id: string;
  type:
    | 'line'
    | 'rectangle'
    | 'polygon'
    | 'arc'
    | 'circle'
    | 'polyline'
    | 'dimension'
    | 'text'
    | 'ellipse';
  points: DrawPoint[];
  properties: Record<string, unknown>;
}

export interface DrawingState {
  tool: DrawTool;
  elements: DrawElement[];
  activeElement: DrawElement | null;
  snapMode: SnapMode;
  snapThreshold: number;
}

export type DrawTool =
  | 'select'
  | 'line'
  | 'rectangle'
  | 'polygon'
  | 'arc'
  | 'circle'
  | 'polyline'
  | 'dimension'
  | 'text'
  | 'ellipse';

export type SnapMode =
  | 'end'
  | 'mid'
  | 'center'
  | 'node'
  | 'intersection'
  | 'perpendicular'
  | 'tangent'
  | 'none';

export interface ToolConfig {
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  snapEnabled: boolean;
}

const DEFAULT_TOOL_CONFIG: ToolConfig = {
  color: '#000000',
  lineWidth: 1,
  lineStyle: 'solid',
  snapEnabled: true,
};

export class DrawingEngine {
  private state: DrawingState;
  private toolConfig: ToolConfig;

  constructor() {
    this.state = {
      tool: 'line',
      elements: [],
      activeElement: null,
      snapMode: 'end',
      snapThreshold: 10,
    };
    this.toolConfig = { ...DEFAULT_TOOL_CONFIG };
  }

  setTool(tool: DrawTool): void {
    this.state.tool = tool;
    this.state.activeElement = null;
  }

  setColor(color: string): void {
    this.toolConfig.color = color;
  }

  setLineWidth(width: number): void {
    this.toolConfig.lineWidth = width;
  }

  setSnapMode(mode: SnapMode): void {
    this.state.snapMode = mode;
  }

  getState(): DrawingState {
    return { ...this.state };
  }

  startDraw(point: DrawPoint): void {
    this.state.activeElement = {
      id: crypto.randomUUID(),
      type: this.state.tool as DrawElement['type'],
      points: [point],
      properties: { ...this.toolConfig },
    };
  }

  continueDraw(point: DrawPoint): void {
    if (!this.state.activeElement) {
      this.startDraw(point);
      return;
    }

    const tool = this.state.tool;

    if (tool === 'line' || tool === 'arc' || tool === 'polyline') {
      this.state.activeElement.points.push(point);
    } else if (tool === 'rectangle' || tool === 'circle' || tool === 'ellipse') {
      this.state.activeElement.points[1] = point;
    } else if (tool === 'polygon') {
      this.state.activeElement.points.push(point);
    }
  }

  finishDraw(): DrawElement | null {
    if (!this.state.activeElement) return null;

    const element = { ...this.state.activeElement };
    this.state.elements.push(element);
    this.state.activeElement = null;
    return element;
  }

  cancelDraw(): void {
    this.state.activeElement = null;
  }

  snapPoint(point: DrawPoint): DrawPoint {
    if (this.state.snapMode === 'none' || !this.toolConfig.snapEnabled) {
      return point;
    }

    const threshold = this.state.snapThreshold;
    let closest = point;
    let minDist = threshold;

    for (const element of this.state.elements) {
      for (const p of element.points) {
        const d = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
        if (d < minDist) {
          minDist = d;
          closest = p;
        }
      }
    }

    return closest;
  }

  getLineSegments(): LineSegment[] {
    const segments: LineSegment[] = [];

    for (const element of this.state.elements) {
      const points = element.points;

      if (element.type === 'line' || element.type === 'polyline') {
        for (let i = 0; i < points.length - 1; i++) {
          segments.push({ start: points[i], end: points[i + 1] });
        }
      } else if (element.type === 'rectangle') {
        if (points.length >= 2) {
          const [p1, p2] = points;
          segments.push(
            { start: { x: p1.x, y: p1.y, z: 0 }, end: { x: p2.x, y: p1.y, z: 0 } },
            { start: { x: p2.x, y: p1.y, z: 0 }, end: { x: p2.x, y: p2.y, z: 0 } },
            { start: { x: p2.x, y: p2.y, z: 0 }, end: { x: p1.x, y: p2.y, z: 0 } },
            { start: { x: p1.x, y: p2.y, z: 0 }, end: { x: p1.x, y: p1.y, z: 0 } }
          );
        }
      } else if (element.type === 'circle' || element.type === 'ellipse') {
        // Arc segments generated when rendered
      }
    }

    if (this.state.activeElement) {
      const points = this.state.activeElement.points;
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({ start: points[i], end: points[i + 1] });
      }
    }

    return segments;
  }

  getElementById(id: string): DrawElement | undefined {
    return this.state.elements.find((e) => e.id === id);
  }

  deleteElement(id: string): boolean {
    const index = this.state.elements.findIndex((e) => e.id === id);
    if (index >= 0) {
      this.state.elements.splice(index, 1);
      return true;
    }
    return false;
  }

  clearElements(): void {
    this.state.elements = [];
  }

  getElements(): DrawElement[] {
    return [...this.state.elements];
  }
}

export function createDrawingEngine(): DrawingEngine {
  return new DrawingEngine();
}

export function calculateLineLength(p1: DrawPoint, p2: DrawPoint): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function calculateAngle(p1: DrawPoint, p2: DrawPoint): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

export function drawMidpoint(p1: DrawPoint, p2: DrawPoint): DrawPoint {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    z: (p1.z + p2.z) / 2,
  };
}

export function perpendicularPoint(p1: DrawPoint, p2: DrawPoint, p3: DrawPoint): DrawPoint {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const d = dx * dx + dy * dy;
  const t = ((p3.x - p1.x) * dx + (p3.y - p1.y) * dy) / d;
  return {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
    z: p3.z,
  };
}

export function snapToGrid(point: DrawPoint, gridSize: number): DrawPoint {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
    z: point.z,
  };
}

export interface Dimension {
  start: DrawPoint;
  end: DrawPoint;
  offset: number;
  unit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
}

export function formatDimension(value: number, unit: Dimension['unit']): string {
  const conversions: Record<string, number> = {
    mm: 1,
    cm: 10,
    m: 1000,
    in: 25.4,
    ft: 304.8,
  };

  const converted = value * conversions[unit];
  return `${converted.toFixed(2)} ${unit}`;
}
