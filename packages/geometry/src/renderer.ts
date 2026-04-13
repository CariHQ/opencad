/**
 * 2D Rendering Canvas
 * Renders drawing elements to canvas
 */

import type { DrawElement, DrawPoint } from './drawing';

export interface RenderConfig {
  backgroundColor: string;
  gridColor: string;
  gridSize: number;
  showGrid: boolean;
  showDimensions: boolean;
  antialias: boolean;
}

const DEFAULT_RENDER_CONFIG: RenderConfig = {
  backgroundColor: '#ffffff',
  gridColor: '#e0e0e0',
  gridSize: 10,
  showGrid: true,
  showDimensions: true,
  antialias: true,
};

export class Renderer2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;
    this.config = { ...DEFAULT_RENDER_CONFIG };
  }

  setConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid(): void {
    if (!this.config.showGrid) return;

    const { gridSize, gridColor } = this.config;
    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 0.5;

    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  renderElement(element: DrawElement): void {
    const ctx = this.ctx;
    const { color } = element.properties;

    ctx.strokeStyle = (color as string) || '#000000';
    ctx.lineWidth = (element.properties.lineWidth as number) || 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    switch (element.type) {
      case 'line':
        this.renderLine(element.points);
        break;
      case 'rectangle':
        this.renderRectangle(element.points);
        break;
      case 'circle':
        this.renderCircle(element.points);
        break;
      case 'ellipse':
        this.renderEllipse(element.points);
        break;
      case 'polyline':
        this.renderPolyline(element.points);
        break;
      case 'arc':
        this.renderArc(element.points);
        break;
      case 'text':
        this.renderText(element);
        break;
    }
  }

  private renderLine(points: DrawPoint[]): void {
    if (points.length < 2) return;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    this.ctx.lineTo(points[1].x, points[1].y);
    this.ctx.stroke();
  }

  private renderRectangle(points: DrawPoint[]): void {
    if (points.length < 2) return;
    const [p1, p2] = points;
    this.ctx.beginPath();
    this.ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    this.ctx.stroke();
  }

  private renderCircle(points: DrawPoint[]): void {
    if (points.length < 2) return;
    const center = points[0];
    const radius = Math.sqrt(
      Math.pow(points[1].x - center.x, 2) + Math.pow(points[1].y - center.y, 2)
    );
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private renderEllipse(points: DrawPoint[]): void {
    if (points.length < 2) return;
    const [center, edge] = points;
    const radiusX = Math.abs(edge.x - center.x);
    const radiusY = Math.abs(edge.y - center.y);
    this.ctx.beginPath();
    this.ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private renderPolyline(points: DrawPoint[]): void {
    if (points.length < 2) return;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();
  }

  private renderArc(points: DrawPoint[]): void {
    if (points.length < 3) return;
    const [start, end, control] = points;
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
    this.ctx.stroke();
  }

  private renderText(element: DrawElement): void {
    const text = (element.properties.text as string) || '';
    const point = element.points[0];
    this.ctx.font = '16px sans-serif';
    this.ctx.fillStyle = (element.properties.color as string) || '#000000';
    this.ctx.fillText(text, point.x, point.y);
  }

  renderElements(elements: DrawElement[]): void {
    this.clear();
    this.drawGrid();

    for (const element of elements) {
      this.renderElement(element);
    }
  }

  renderActiveElement(element: DrawElement | null): void {
    if (!element) return;
    this.ctx.setLineDash([5, 5]);
    this.renderElement(element);
    this.ctx.setLineDash([]);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer2D {
  return new Renderer2D(canvas);
}
