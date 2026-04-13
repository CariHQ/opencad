/**
 * 2D Drawing Tools Tests
 * Tests for T-2D-001 through T-2D-008
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DrawingEngine,
  createDrawingEngine,
  calculateLineLength,
  calculateAngle,
  drawMidpoint,
  perpendicularPoint,
  snapToGrid,
  formatDimension,
  type DrawPoint,
} from './drawing';

describe('T-2D: 2D Drawing Tools Tests', () => {
  let engine: DrawingEngine;

  beforeEach(() => {
    engine = createDrawingEngine();
  });

  describe('T-2D-001: Line Tool', () => {
    it('should create drawing engine', () => {
      expect(engine).toBeDefined();
    });

    it('should set line tool', () => {
      engine.setTool('line');
      expect(engine.getState().tool).toBe('line');
    });

    it('should start and finish line', () => {
      engine.setTool('line');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 100, z: 0 });
      const element = engine.finishDraw();

      expect(element).toBeDefined();
      expect(element?.type).toBe('line');
      expect(element?.points.length).toBe(2);
    });

    it('should calculate line length', () => {
      const length = calculateLineLength({ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 });
      expect(length).toBe(100);
    });

    it('should calculate angle', () => {
      const angle = calculateAngle({ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 });
      expect(angle).toBe(0);
    });
  });

  describe('T-2D-002: Rectangle/Polygon Tool', () => {
    it('should draw rectangle', () => {
      engine.setTool('rectangle');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 100, z: 0 });
      const element = engine.finishDraw();

      expect(element?.type).toBe('rectangle');
    });

    it('should draw polygon', () => {
      engine.setTool('polygon');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 100, z: 0 });
      engine.continueDraw({ x: 0, y: 100, z: 0 });
      const element = engine.finishDraw();

      expect(element?.points.length).toBe(4);
    });
  });

  describe('T-2D-003: Arc/Circle Tool', () => {
    it('should draw circle', () => {
      engine.setTool('circle');
      engine.startDraw({ x: 50, y: 50, z: 0 });
      engine.continueDraw({ x: 100, y: 50, z: 0 });
      const element = engine.finishDraw();

      expect(element?.type).toBe('circle');
    });

    it('should draw arc', () => {
      engine.setTool('arc');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 50, y: 50, z: 0 });
      const element = engine.finishDraw();

      expect(element?.type).toBe('arc');
    });
  });

  describe('T-2D-004: Polyline Tool', () => {
    it('should draw polyline', () => {
      engine.setTool('polyline');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 25, y: 25, z: 0 });
      engine.continueDraw({ x: 50, y: 50, z: 0 });
      engine.continueDraw({ x: 75, y: 75, z: 0 });
      const element = engine.finishDraw();

      expect(element?.type).toBe('polyline');
      expect(element?.points.length).toBe(4);
    });
  });

  describe('T-2D-005: Dimension Tool', () => {
    it('should set dimension tool', () => {
      engine.setTool('dimension');
      expect(engine.getState().tool).toBe('dimension');
    });

    it('should format dimension', () => {
      expect(formatDimension(100, 'mm')).toBe('100.00 mm');
      expect(formatDimension(50.5, 'cm')).toBe('505.00 cm');
    });
  });

  describe('T-2D-006: Text & Annotations', () => {
    it('should set text tool', () => {
      engine.setTool('text');
      expect(engine.getState().tool).toBe('text');
    });
  });

  describe('T-2D-007: Layer Management', () => {
    it('should get elements', () => {
      engine.setTool('line');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 100, z: 0 });
      engine.finishDraw();

      const elements = engine.getElements();
      expect(elements.length).toBe(1);
    });

    it('should delete element', () => {
      engine.setTool('line');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 100, z: 0 });
      const element = engine.finishDraw();

      if (element) {
        const deleted = engine.deleteElement(element.id);
        expect(deleted).toBe(true);
        expect(engine.getElements().length).toBe(0);
      }
    });

    it('should clear elements', () => {
      engine.setTool('line');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 100, z: 0 });
      engine.finishDraw();
      engine.clearElements();

      expect(engine.getElements().length).toBe(0);
    });
  });

  describe('T-2D-008: Snapping System', () => {
    it('should set snap mode', () => {
      engine.setSnapMode('end');
      expect(engine.getState().snapMode).toBe('end');
    });

    it('should snap to end point', () => {
      engine.setTool('line');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 0, z: 0 });
      engine.finishDraw();

      const snapped = engine.snapPoint({ x: 101, y: 1, z: 0 });
      expect(snapped.x).toBe(100);
    });

    it('should not snap when disabled', () => {
      engine.setSnapMode('none');
      const snapped = engine.snapPoint({ x: 101, y: 1, z: 0 });
      expect(snapped.x).toBe(101);
    });

    it('should get line segments', () => {
      engine.setTool('line');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 0, z: 0 });
      engine.finishDraw();

      const segments = engine.getLineSegments();
      expect(segments.length).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    it('should calculate midpoint', () => {
      const mid = drawMidpoint({ x: 0, y: 0, z: 0 }, { x: 100, y: 100, z: 0 });
      expect(mid.x).toBe(50);
      expect(mid.y).toBe(50);
    });

    it('should snap to grid', () => {
      const snapped = snapToGrid({ x: 15, y: 18, z: 0 }, 10);
      expect(snapped.x).toBe(20);
      expect(snapped.y).toBe(20);
    });

    it('should calculate perpendicular point', () => {
      const perp = perpendicularPoint(
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 },
        { x: 50, y: 10, z: 0 }
      );
      expect(perp.x).toBe(50);
    });
  });
});
