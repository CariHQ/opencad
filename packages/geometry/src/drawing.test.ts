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
  snapMidpoint,
  snapIntersection,
  snapPerpendicular,
  snapTangent,
  createDimensionEngine,
  type DrawPoint,
  type DimensionEngine,
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
    it('should draw polyline with multiple segments', () => {
      engine.setTool('polyline');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 25, y: 25, z: 0 });
      engine.continueDraw({ x: 50, y: 50, z: 0 });
      engine.continueDraw({ x: 75, y: 75, z: 0 });
      const element = engine.finishDraw();

      expect(element?.type).toBe('polyline');
      expect(element?.points.length).toBe(4);
    });

    it('should close polyline to form polygon', () => {
      engine.setTool('polyline');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 100, z: 0 });
      engine.continueDraw({ x: 0, y: 100, z: 0 });
      engine.closePolyline();
      const element = engine.finishDraw();

      expect(element?.properties['closed']).toBe(true);
      // closing adds first point as last to close the shape
      const pts = element?.points ?? [];
      expect(pts[pts.length - 1]).toEqual(pts[0]);
    });

    it('should edit individual vertex', () => {
      engine.setTool('polyline');
      engine.startDraw({ x: 0, y: 0, z: 0 });
      engine.continueDraw({ x: 100, y: 0, z: 0 });
      const element = engine.finishDraw();

      if (!element) throw new Error('no element');
      engine.editVertex(element.id, 1, { x: 200, y: 0, z: 0 });
      const updated = engine.getElementById(element.id);

      expect(updated?.points[1].x).toBe(200);
    });
  });

  describe('T-2D-005: Dimension Tool', () => {
    let dim: DimensionEngine;

    beforeEach(() => {
      dim = createDimensionEngine();
    });

    it('should set dimension tool', () => {
      engine.setTool('dimension');
      expect(engine.getState().tool).toBe('dimension');
    });

    it('should format dimension', () => {
      expect(formatDimension(100, 'mm')).toBe('100.00 mm');
      expect(formatDimension(50.5, 'cm')).toBe('505.00 cm');
    });

    it('should create linear dimension between two points', () => {
      const d = dim.addLinear(
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 },
        { offset: 20, unit: 'mm' }
      );
      expect(d.type).toBe('linear');
      expect(d.value).toBeCloseTo(100);
      expect(d.label).toContain('mm');
    });

    it('should create aligned dimension along diagonal', () => {
      const d = dim.addAligned(
        { x: 0, y: 0, z: 0 },
        { x: 60, y: 80, z: 0 },
        { offset: 10, unit: 'mm' }
      );
      expect(d.type).toBe('aligned');
      expect(d.value).toBeCloseTo(100); // 3-4-5 * 20
    });

    it('should create angular dimension between two lines', () => {
      const d = dim.addAngular(
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 100, z: 0 }
      );
      expect(d.type).toBe('angular');
      expect(d.value).toBeCloseTo(90); // 90 degrees
    });

    it('should create radial dimension for circle', () => {
      const d = dim.addRadial({ x: 50, y: 50, z: 0 }, 30, { unit: 'mm' });
      expect(d.type).toBe('radial');
      expect(d.value).toBeCloseTo(30);
    });
  });

  describe('T-2D-006: Text & Annotations', () => {
    it('should set text tool', () => {
      engine.setTool('text');
      expect(engine.getState().tool).toBe('text');
    });

    it('should add text element with content and formatting', () => {
      engine.setTool('text');
      engine.startDraw({ x: 10, y: 10, z: 0 });
      engine.setTextContent('Hello CAD', { fontSize: 14, fontFamily: 'sans-serif', bold: false });
      const element = engine.finishDraw();

      expect(element?.type).toBe('text');
      expect(element?.properties['content']).toBe('Hello CAD');
      expect(element?.properties['fontSize']).toBe(14);
    });

    it('should add label with leader line', () => {
      const label = engine.addLabel(
        { x: 50, y: 50, z: 0 },
        { x: 100, y: 30, z: 0 },
        'Window 1200x900'
      );
      expect(label.type).toBe('text');
      expect(label.properties['labelType']).toBe('leader');
      expect(label.properties['leaderEnd']).toEqual({ x: 50, y: 50, z: 0 });
    });

    it('should add callout with bubble', () => {
      const callout = engine.addCallout(
        { x: 50, y: 50, z: 0 },
        { x: 120, y: 30, z: 0 },
        'Detail A'
      );
      expect(callout.type).toBe('text');
      expect(callout.properties['labelType']).toBe('callout');
      expect(callout.properties['content']).toBe('Detail A');
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

    it('should create new drawing layer with name and color', () => {
      const layer = engine.addLayer('Walls', '#ff0000');
      expect(layer.name).toBe('Walls');
      expect(layer.color).toBe('#ff0000');
      expect(layer.visible).toBe(true);
      expect(layer.locked).toBe(false);
    });

    it('should rename a layer', () => {
      const layer = engine.addLayer('Draft', '#000000');
      engine.renameLayer(layer.id, 'Final');
      const updated = engine.getLayer(layer.id);
      expect(updated?.name).toBe('Final');
    });

    it('should toggle layer visibility', () => {
      const layer = engine.addLayer('Hidden', '#000000');
      engine.toggleLayerVisibility(layer.id);
      expect(engine.getLayer(layer.id)?.visible).toBe(false);
      engine.toggleLayerVisibility(layer.id);
      expect(engine.getLayer(layer.id)?.visible).toBe(true);
    });

    it('should toggle layer lock', () => {
      const layer = engine.addLayer('Locked', '#000000');
      engine.toggleLayerLock(layer.id);
      expect(engine.getLayer(layer.id)?.locked).toBe(true);
    });

    it('should reorder layers', () => {
      const l1 = engine.addLayer('Layer 1', '#000000');
      const l2 = engine.addLayer('Layer 2', '#000000');
      const l3 = engine.addLayer('Layer 3', '#000000');
      engine.reorderLayer(l3.id, 0);
      const layers = engine.getLayers();
      expect(layers[0].id).toBe(l3.id);
      expect(layers[1].id).toBe(l1.id);
      expect(layers[2].id).toBe(l2.id);
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

    it('should snap to midpoint', () => {
      const mid = snapMidpoint({ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }, {
        x: 51, y: 2, z: 0,
      }, 10);
      expect(mid.x).toBe(50);
      expect(mid.y).toBe(0);
    });

    it('should return null for midpoint when too far', () => {
      const mid = snapMidpoint({ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }, {
        x: 20, y: 0, z: 0,
      }, 5);
      expect(mid).toBeNull();
    });

    it('should snap to intersection of two segments', () => {
      // Horizontal line: (0,50)-(100,50), Vertical line: (50,0)-(50,100)
      const pt = snapIntersection(
        { x: 0, y: 50, z: 0 }, { x: 100, y: 50, z: 0 },
        { x: 50, y: 0, z: 0 }, { x: 50, y: 100, z: 0 },
        { x: 51, y: 51, z: 0 }, 10
      );
      expect(pt?.x).toBeCloseTo(50);
      expect(pt?.y).toBeCloseTo(50);
    });

    it('should snap to perpendicular foot', () => {
      const pt = snapPerpendicular(
        { x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 },
        { x: 50, y: 10, z: 0 }, 15
      );
      expect(pt?.x).toBeCloseTo(50);
      expect(pt?.y).toBeCloseTo(0);
    });

    it('should snap to tangent point on circle', () => {
      // Circle center (50,50) radius 30, point near (50,20)
      const pt = snapTangent(
        { x: 50, y: 50, z: 0 }, 30,
        { x: 50, y: 21, z: 0 }, 5
      );
      expect(pt?.x).toBeCloseTo(50);
      expect(pt?.y).toBeCloseTo(20);
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
