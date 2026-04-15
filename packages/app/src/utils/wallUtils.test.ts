/**
 * T-BIM-001: Wall Tool tests
 */
import { describe, it, expect } from 'vitest';
import { createWallElement, WALL_TYPES, DEFAULT_WALL_HEIGHT, DEFAULT_WALL_THICKNESS } from './wallUtils';

describe('T-BIM-001: Wall Tool', () => {
  it('preserves exact start point', () => {
    const el = createWallElement({ x: 100, y: 200 }, { x: 800, y: 600 });
    expect(el.properties['StartX']?.value).toBe(100);
    expect(el.properties['StartY']?.value).toBe(200);
  });
  it('preserves exact end point', () => {
    const el = createWallElement({ x: 100, y: 200 }, { x: 800, y: 600 });
    expect(el.properties['EndX']?.value).toBe(800);
    expect(el.properties['EndY']?.value).toBe(600);
  });
  it('preserves diagonal direction', () => {
    const el = createWallElement({ x: 900, y: 700 }, { x: 100, y: 100 });
    expect(el.properties['StartX']?.value).toBe(900);
    expect(el.properties['EndX']?.value).toBe(100);
  });
  it('defaults height to 3000mm', () => {
    const el = createWallElement({ x: 0, y: 0 }, { x: 1000, y: 0 });
    expect(el.properties['Height']?.value).toBe(DEFAULT_WALL_HEIGHT);
    expect(DEFAULT_WALL_HEIGHT).toBe(3000);
  });
  it('defaults thickness to 200mm', () => {
    const el = createWallElement({ x: 0, y: 0 }, { x: 1000, y: 0 });
    expect(el.properties['Thickness']?.value).toBe(DEFAULT_WALL_THICKNESS);
    expect(DEFAULT_WALL_THICKNESS).toBe(200);
  });
  it('defaults type to interior', () => {
    const el = createWallElement({ x: 0, y: 0 }, { x: 1000, y: 0 });
    expect(el.properties['WallType']?.value).toBe('interior');
  });
  it('accepts custom wallType', () => {
    const el = createWallElement({ x: 0, y: 0 }, { x: 1000, y: 0 }, { wallType: 'exterior' });
    expect(el.properties['WallType']?.value).toBe('exterior');
  });
  it('accepts custom height', () => {
    const el = createWallElement({ x: 0, y: 0 }, { x: 1000, y: 0 }, { height: 4500 });
    expect(el.properties['Height']?.value).toBe(4500);
  });
  it('accepts custom thickness', () => {
    const el = createWallElement({ x: 0, y: 0 }, { x: 1000, y: 0 }, { thickness: 300 });
    expect(el.properties['Thickness']?.value).toBe(300);
  });
  it('defaults material to Concrete', () => {
    const el = createWallElement({ x: 0, y: 0 }, { x: 1000, y: 0 });
    expect(el.properties['Material']?.value).toBe('Concrete');
  });
  it('sets element type to wall', () => {
    expect(createWallElement({ x: 0, y: 0 }, { x: 1000, y: 0 }).type).toBe('wall');
  });
  it('WALL_TYPES has exactly 4 types', () => {
    expect(WALL_TYPES).toHaveLength(4);
    expect(WALL_TYPES).toContain('interior');
    expect(WALL_TYPES).toContain('exterior');
    expect(WALL_TYPES).toContain('partition');
    expect(WALL_TYPES).toContain('curtain');
  });
});
