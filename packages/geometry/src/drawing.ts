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
  layerId?: string;
}

export interface DrawLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

export interface DrawingState {
  tool: DrawTool;
  elements: DrawElement[];
  activeElement: DrawElement | null;
  snapMode: SnapMode;
  snapThreshold: number;
  layers: DrawLayer[];
  activeLayerId: string | null;
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

export interface TextFormatting {
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic?: boolean;
  color?: string;
}

// ─── Dimension types ────────────────────────────────────────────────────────

export type DimensionType = 'linear' | 'aligned' | 'angular' | 'radial';

export interface DimensionRecord {
  id: string;
  type: DimensionType;
  value: number;
  label: string;
  start: DrawPoint;
  end: DrawPoint;
  offset: number;
  unit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
}

export interface DimensionOptions {
  offset?: number;
  unit?: DimensionRecord['unit'];
}

export class DimensionEngine {
  private dimensions: DimensionRecord[] = [];

  /** Linear (horizontal/vertical) dimension */
  addLinear(
    start: DrawPoint,
    end: DrawPoint,
    opts: DimensionOptions = {}
  ): DimensionRecord {
    const value = Math.abs(end.x - start.x) || Math.abs(end.y - start.y);
    const unit = opts.unit ?? 'mm';
    const rec: DimensionRecord = {
      id: crypto.randomUUID(),
      type: 'linear',
      value,
      label: formatDimension(value, unit),
      start,
      end,
      offset: opts.offset ?? 20,
      unit,
    };
    this.dimensions.push(rec);
    return rec;
  }

  /** Aligned dimension (true distance along diagonal) */
  addAligned(
    start: DrawPoint,
    end: DrawPoint,
    opts: DimensionOptions = {}
  ): DimensionRecord {
    const value = calculateLineLength(start, end);
    const unit = opts.unit ?? 'mm';
    const rec: DimensionRecord = {
      id: crypto.randomUUID(),
      type: 'aligned',
      value,
      label: formatDimension(value, unit),
      start,
      end,
      offset: opts.offset ?? 20,
      unit,
    };
    this.dimensions.push(rec);
    return rec;
  }

  /** Angular dimension between two rays sharing a vertex */
  addAngular(
    ray1Start: DrawPoint,
    ray1End: DrawPoint,
    ray2Start: DrawPoint,
    ray2End: DrawPoint
  ): DimensionRecord {
    const a1 = Math.atan2(ray1End.y - ray1Start.y, ray1End.x - ray1Start.x);
    const a2 = Math.atan2(ray2End.y - ray2Start.y, ray2End.x - ray2Start.x);
    let deg = Math.abs((a2 - a1) * (180 / Math.PI));
    if (deg > 180) deg = 360 - deg;
    const rec: DimensionRecord = {
      id: crypto.randomUUID(),
      type: 'angular',
      value: deg,
      label: `${deg.toFixed(1)}°`,
      start: ray1Start,
      end: ray2End,
      offset: 20,
      unit: 'mm',
    };
    this.dimensions.push(rec);
    return rec;
  }

  /** Radial dimension for a circle */
  addRadial(
    center: DrawPoint,
    radius: number,
    opts: DimensionOptions = {}
  ): DimensionRecord {
    const unit = opts.unit ?? 'mm';
    const rec: DimensionRecord = {
      id: crypto.randomUUID(),
      type: 'radial',
      value: radius,
      label: `R${formatDimension(radius, unit)}`,
      start: center,
      end: { x: center.x + radius, y: center.y, z: center.z },
      offset: opts.offset ?? 10,
      unit,
    };
    this.dimensions.push(rec);
    return rec;
  }

  getDimensions(): DimensionRecord[] {
    return [...this.dimensions];
  }
}

export function createDimensionEngine(): DimensionEngine {
  return new DimensionEngine();
}

// ─── DrawingEngine ───────────────────────────────────────────────────────────

const DEFAULT_TOOL_CONFIG: ToolConfig = {
  color: '#000000',
  lineWidth: 1,
  lineStyle: 'solid',
  snapEnabled: true,
};

export class DrawingEngine {
  private state: DrawingState;
  private toolConfig: ToolConfig;
  private pendingTextContent: string | null = null;
  private pendingTextFormatting: TextFormatting | null = null;

  constructor() {
    this.state = {
      tool: 'line',
      elements: [],
      activeElement: null,
      snapMode: 'end',
      snapThreshold: 10,
      layers: [],
      activeLayerId: null,
    };
    this.toolConfig = { ...DEFAULT_TOOL_CONFIG };
  }

  setTool(tool: DrawTool): void {
    this.state.tool = tool;
    this.state.activeElement = null;
    this.pendingTextContent = null;
    this.pendingTextFormatting = null;
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
      layerId: this.state.activeLayerId ?? undefined,
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

  /** Set text content and formatting before calling finishDraw for text tool */
  setTextContent(content: string, formatting: TextFormatting): void {
    this.pendingTextContent = content;
    this.pendingTextFormatting = formatting;
    if (this.state.activeElement) {
      this.state.activeElement.properties['content'] = content;
      this.state.activeElement.properties['fontSize'] = formatting.fontSize;
      this.state.activeElement.properties['fontFamily'] = formatting.fontFamily;
      this.state.activeElement.properties['bold'] = formatting.bold;
      if (formatting.italic !== undefined)
        this.state.activeElement.properties['italic'] = formatting.italic;
      if (formatting.color !== undefined)
        this.state.activeElement.properties['color'] = formatting.color;
    }
  }

  /** Close the active polyline by repeating the first point */
  closePolyline(): void {
    if (!this.state.activeElement || this.state.activeElement.type !== 'polyline') return;
    const pts = this.state.activeElement.points;
    if (pts.length >= 2) {
      this.state.activeElement.points.push({ ...pts[0] });
      this.state.activeElement.properties['closed'] = true;
    }
  }

  /** Edit a specific vertex of a finished element */
  editVertex(elementId: string, vertexIndex: number, newPoint: DrawPoint): boolean {
    const el = this.state.elements.find((e) => e.id === elementId);
    if (!el || vertexIndex < 0 || vertexIndex >= el.points.length) return false;
    el.points[vertexIndex] = { ...newPoint };
    return true;
  }

  /** Add a label annotation with a leader line */
  addLabel(leaderEnd: DrawPoint, textPosition: DrawPoint, content: string): DrawElement {
    const el: DrawElement = {
      id: crypto.randomUUID(),
      type: 'text',
      points: [textPosition],
      properties: {
        content,
        labelType: 'leader',
        leaderEnd,
        fontSize: 12,
        fontFamily: 'sans-serif',
        bold: false,
      },
      layerId: this.state.activeLayerId ?? undefined,
    };
    this.state.elements.push(el);
    return el;
  }

  /** Add a callout annotation with bubble */
  addCallout(pointerEnd: DrawPoint, bubblePosition: DrawPoint, content: string): DrawElement {
    const el: DrawElement = {
      id: crypto.randomUUID(),
      type: 'text',
      points: [bubblePosition],
      properties: {
        content,
        labelType: 'callout',
        pointerEnd,
        fontSize: 12,
        fontFamily: 'sans-serif',
        bold: false,
      },
      layerId: this.state.activeLayerId ?? undefined,
    };
    this.state.elements.push(el);
    return el;
  }

  finishDraw(): DrawElement | null {
    if (!this.state.activeElement) return null;

    const element = { ...this.state.activeElement, points: [...this.state.activeElement.points] };

    // Apply pending text properties
    if (this.pendingTextContent !== null) {
      element.properties['content'] = this.pendingTextContent;
    }
    if (this.pendingTextFormatting !== null) {
      const fmt = this.pendingTextFormatting;
      element.properties['fontSize'] = fmt.fontSize;
      element.properties['fontFamily'] = fmt.fontFamily;
      element.properties['bold'] = fmt.bold;
    }

    this.state.elements.push(element);
    this.state.activeElement = null;
    this.pendingTextContent = null;
    this.pendingTextFormatting = null;
    return element;
  }

  cancelDraw(): void {
    this.state.activeElement = null;
    this.pendingTextContent = null;
    this.pendingTextFormatting = null;
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

  // ─── Layer management ──────────────────────────────────────────────────────

  addLayer(name: string, color: string): DrawLayer {
    const layer: DrawLayer = {
      id: crypto.randomUUID(),
      name,
      color,
      visible: true,
      locked: false,
      order: this.state.layers.length,
    };
    this.state.layers.push(layer);
    return layer;
  }

  getLayer(id: string): DrawLayer | undefined {
    return this.state.layers.find((l) => l.id === id);
  }

  getLayers(): DrawLayer[] {
    return [...this.state.layers].sort((a, b) => a.order - b.order);
  }

  renameLayer(id: string, name: string): boolean {
    const layer = this.state.layers.find((l) => l.id === id);
    if (!layer) return false;
    layer.name = name;
    return true;
  }

  toggleLayerVisibility(id: string): boolean {
    const layer = this.state.layers.find((l) => l.id === id);
    if (!layer) return false;
    layer.visible = !layer.visible;
    return true;
  }

  toggleLayerLock(id: string): boolean {
    const layer = this.state.layers.find((l) => l.id === id);
    if (!layer) return false;
    layer.locked = !layer.locked;
    return true;
  }

  reorderLayer(id: string, newIndex: number): boolean {
    const layers = [...this.state.layers].sort((a, b) => a.order - b.order);
    const idx = layers.findIndex((l) => l.id === id);
    if (idx < 0) return false;
    const [moved] = layers.splice(idx, 1);
    layers.splice(newIndex, 0, moved);
    layers.forEach((l, i) => {
      l.order = i;
    });
    this.state.layers = layers;
    return true;
  }

  setActiveLayer(id: string): void {
    this.state.activeLayerId = id;
  }
}

export function createDrawingEngine(): DrawingEngine {
  return new DrawingEngine();
}

// ─── Utility functions ────────────────────────────────────────────────────────

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

// ─── Snap helper functions ────────────────────────────────────────────────────

/**
 * Returns midpoint of segment [a,b] if `point` is within `threshold`, else null.
 */
export function snapMidpoint(
  a: DrawPoint,
  b: DrawPoint,
  point: DrawPoint,
  threshold: number
): DrawPoint | null {
  const mid = drawMidpoint(a, b);
  const d = calculateLineLength(mid, point);
  return d <= threshold ? mid : null;
}

/**
 * Returns the intersection of two infinite lines through [a1,a2] and [b1,b2]
 * if within threshold of `point`, else null.
 */
export function snapIntersection(
  a1: DrawPoint,
  a2: DrawPoint,
  b1: DrawPoint,
  b2: DrawPoint,
  point: DrawPoint,
  threshold: number
): DrawPoint | null {
  const dx1 = a2.x - a1.x;
  const dy1 = a2.y - a1.y;
  const dx2 = b2.x - b1.x;
  const dy2 = b2.y - b1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null; // parallel

  const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
  const ix = a1.x + t * dx1;
  const iy = a1.y + t * dy1;
  const candidate: DrawPoint = { x: ix, y: iy, z: 0 };
  return calculateLineLength(candidate, point) <= threshold ? candidate : null;
}

/**
 * Returns the perpendicular foot from `point` onto line [a,b]
 * if within threshold, else null.
 */
export function snapPerpendicular(
  a: DrawPoint,
  b: DrawPoint,
  point: DrawPoint,
  threshold: number
): DrawPoint | null {
  const foot = perpendicularPoint(a, b, point);
  return calculateLineLength(foot, point) <= threshold ? foot : null;
}

/**
 * Returns the nearest tangent point on a circle (center + radius)
 * from `point` if within threshold, else null.
 */
export function snapTangent(
  center: DrawPoint,
  radius: number,
  point: DrawPoint,
  threshold: number
): DrawPoint | null {
  const d = calculateLineLength(center, point);
  if (d < 1e-10) return null;
  // Nearest point on circle boundary
  const tangent: DrawPoint = {
    x: center.x + (radius * (point.x - center.x)) / d,
    y: center.y + (radius * (point.y - center.y)) / d,
    z: center.z,
  };
  return calculateLineLength(tangent, point) <= threshold ? tangent : null;
}

// ─── Dimension formatting ──────────────────────────────────────────────────────

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
