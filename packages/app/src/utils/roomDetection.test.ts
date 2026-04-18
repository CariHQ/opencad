/**
 * T-SPACE-001: Room Detection Tests
 *
 * Tests for room/space area calculation from wall boundary detection.
 */
import { describe, it, expect } from 'vitest';
import {
  polygonArea,
  polygonCentroid,
  polygonPerimeter,
  detectRoomsFromWalls,
  elementToWallSegment,
  type Point2D,
  type WallSegment,
} from './roomDetection';
import type { ElementSchema } from '@opencad/document';

const BASE_META = {
  createdAt: 0,
  updatedAt: 0,
  createdBy: 'test',
  version: { clock: {} },
};

const BASE_TRANSFORM = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const BASE_BBOX = {
  min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
  max: { x: 1000, y: 1000, z: 3000, _type: 'Point3D' as const },
};

function makeWallElement(
  id: string,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): ElementSchema {
  return {
    id,
    type: 'wall',
    layerId: 'layer-1',
    levelId: 'level-1',
    visible: true,
    locked: false,
    properties: {
      StartX: { type: 'number', value: sx, unit: 'mm' },
      StartY: { type: 'number', value: sy, unit: 'mm' },
      EndX: { type: 'number', value: ex, unit: 'mm' },
      EndY: { type: 'number', value: ey, unit: 'mm' },
    },
    propertySets: [],
    geometry: { type: 'brep', data: null },
    transform: BASE_TRANSFORM,
    boundingBox: BASE_BBOX,
    metadata: { ...BASE_META, id },
  };
}

// A simple 1×1 square (in arbitrary units)
const unitSquare: Point2D[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

// 5000 mm × 4000 mm room
const roomSquare: Point2D[] = [
  { x: 0, y: 0 },
  { x: 5000, y: 0 },
  { x: 5000, y: 4000 },
  { x: 0, y: 4000 },
];

describe('T-SPACE-001: Room detection', () => {
  // ── polygonArea ────────────────────────────────────────────────────────────
  it('polygonArea returns correct area for unit square', () => {
    expect(polygonArea(unitSquare)).toBe(1);
  });

  it('polygonArea in mm² for 5000×4000 room = 20e6', () => {
    expect(polygonArea(roomSquare)).toBe(20_000_000);
  });

  it('polygonArea returns 0 for degenerate (collinear) polygon', () => {
    const line: Point2D[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    expect(polygonArea(line)).toBe(0);
  });

  it('polygonArea is order-independent (CW and CCW give same result)', () => {
    const ccw = [...unitSquare].reverse();
    expect(polygonArea(unitSquare)).toBe(polygonArea(ccw));
  });

  // ── polygonCentroid ────────────────────────────────────────────────────────
  it('polygonCentroid is center of unit square', () => {
    const c = polygonCentroid(unitSquare);
    expect(c.x).toBeCloseTo(0.5, 5);
    expect(c.y).toBeCloseTo(0.5, 5);
  });

  it('polygonCentroid is center of 5000×4000 room', () => {
    const c = polygonCentroid(roomSquare);
    expect(c.x).toBeCloseTo(2500, 1);
    expect(c.y).toBeCloseTo(2000, 1);
  });

  it('polygonCentroid handles triangle', () => {
    const tri: Point2D[] = [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 3, y: 6 }];
    const c = polygonCentroid(tri);
    expect(c.x).toBeCloseTo(3, 5);
    expect(c.y).toBeCloseTo(2, 5);
  });

  // ── polygonPerimeter ───────────────────────────────────────────────────────
  it('polygonPerimeter of unit square is 4', () => {
    expect(polygonPerimeter(unitSquare)).toBeCloseTo(4, 10);
  });

  it('polygonPerimeter of 5000×4000 room is 18000 mm', () => {
    expect(polygonPerimeter(roomSquare)).toBeCloseTo(18_000, 1);
  });

  // ── elementToWallSegment ───────────────────────────────────────────────────
  it('elementToWallSegment extracts start/end points from wall properties', () => {
    const el = makeWallElement('w1', 0, 0, 5000, 0);
    const seg = elementToWallSegment(el);
    expect(seg).not.toBeNull();
    expect(seg!.startX).toBe(0);
    expect(seg!.startY).toBe(0);
    expect(seg!.endX).toBe(5000);
    expect(seg!.endY).toBe(0);
    expect(seg!.id).toBe('w1');
  });

  it('elementToWallSegment returns null for non-wall elements', () => {
    const el = makeWallElement('d1', 0, 0, 900, 0);
    const doorEl = { ...el, type: 'door' as const };
    expect(elementToWallSegment(doorEl)).toBeNull();
  });

  it('elementToWallSegment returns null when coordinates are missing', () => {
    const el: ElementSchema = {
      id: 'w-nocoords',
      type: 'wall',
      layerId: 'layer-1',
      levelId: null,
      visible: true,
      locked: false,
      properties: {},
      propertySets: [],
      geometry: { type: 'brep', data: null },
      transform: BASE_TRANSFORM,
      boundingBox: BASE_BBOX,
      metadata: { ...BASE_META, id: 'w-nocoords' },
    };
    expect(elementToWallSegment(el)).toBeNull();
  });

  // ── detectRoomsFromWalls ───────────────────────────────────────────────────
  it('detectRoomsFromWalls returns empty array when no walls provided', () => {
    expect(detectRoomsFromWalls([])).toEqual([]);
  });

  it('handles walls with no connections gracefully', () => {
    // Isolated wall — should not throw and should return no rooms
    const isolated = makeWallElement('w-iso', 0, 0, 1000, 0);
    expect(() => detectRoomsFromWalls([isolated])).not.toThrow();
    expect(detectRoomsFromWalls([isolated])).toEqual([]);
  });

  it('detectRoomsFromWalls finds a rectangular room from 4 walls', () => {
    // 5000×4000 mm rectangle
    const walls: ElementSchema[] = [
      makeWallElement('w-bottom', 0, 0, 5000, 0),
      makeWallElement('w-right', 5000, 0, 5000, 4000),
      makeWallElement('w-top', 5000, 4000, 0, 4000),
      makeWallElement('w-left', 0, 4000, 0, 0),
    ];
    const rooms = detectRoomsFromWalls(walls);
    expect(rooms.length).toBeGreaterThanOrEqual(1);
    const room = rooms[0]!;
    // Area should be 20 m² (20_000_000 mm² → 20 m²)
    expect(room.area).toBeCloseTo(20, 1);
    // Perimeter should be 18 m
    expect(room.perimeter).toBeCloseTo(18, 1);
    // Centroid should be near center of rectangle
    expect(room.centroid.x).toBeCloseTo(2500, 0);
    expect(room.centroid.y).toBeCloseTo(2000, 0);
  });

  it('detectRoomsFromWalls includes wallIds for the enclosing walls', () => {
    const walls: ElementSchema[] = [
      makeWallElement('w-bottom', 0, 0, 5000, 0),
      makeWallElement('w-right', 5000, 0, 5000, 4000),
      makeWallElement('w-top', 5000, 4000, 0, 4000),
      makeWallElement('w-left', 0, 4000, 0, 0),
    ];
    const rooms = detectRoomsFromWalls(walls);
    expect(rooms.length).toBeGreaterThanOrEqual(1);
    const room = rooms[0]!;
    expect(room.wallIds).toContain('w-bottom');
    expect(room.wallIds).toContain('w-right');
    expect(room.wallIds).toContain('w-top');
    expect(room.wallIds).toContain('w-left');
  });

  it('detectRoomsFromWalls assigns a unique id to each detected room', () => {
    const walls: ElementSchema[] = [
      makeWallElement('w-bottom', 0, 0, 5000, 0),
      makeWallElement('w-right', 5000, 0, 5000, 4000),
      makeWallElement('w-top', 5000, 4000, 0, 4000),
      makeWallElement('w-left', 0, 4000, 0, 0),
    ];
    const rooms = detectRoomsFromWalls(walls);
    const ids = rooms.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('detectRoomsFromWalls correctly converts mm² area to m²', () => {
    // 1000×1000 mm = 1 m²
    const walls: ElementSchema[] = [
      makeWallElement('s-bottom', 0, 0, 1000, 0),
      makeWallElement('s-right', 1000, 0, 1000, 1000),
      makeWallElement('s-top', 1000, 1000, 0, 1000),
      makeWallElement('s-left', 0, 1000, 0, 0),
    ];
    const rooms = detectRoomsFromWalls(walls);
    expect(rooms.length).toBeGreaterThanOrEqual(1);
    expect(rooms[0]!.area).toBeCloseTo(1, 5);
  });

  it('WallSegment interface has required fields', () => {
    const seg: WallSegment = { id: 'w1', startX: 0, startY: 0, endX: 1000, endY: 0 };
    expect(seg.id).toBe('w1');
  });

  it('DetectedRoom has boundary polygon', () => {
    const walls: ElementSchema[] = [
      makeWallElement('w-bottom', 0, 0, 3000, 0),
      makeWallElement('w-right', 3000, 0, 3000, 3000),
      makeWallElement('w-top', 3000, 3000, 0, 3000),
      makeWallElement('w-left', 0, 3000, 0, 0),
    ];
    const rooms = detectRoomsFromWalls(walls);
    expect(rooms.length).toBeGreaterThanOrEqual(1);
    const room = rooms[0]!;
    expect(room.boundary.length).toBeGreaterThanOrEqual(3);
    expect(room.boundary[0]).toHaveProperty('x');
    expect(room.boundary[0]).toHaveProperty('y');
  });

  it('polygonArea returns correct area for right triangle', () => {
    const tri: Point2D[] = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }];
    expect(polygonArea(tri)).toBeCloseTo(6, 10);
  });
});
