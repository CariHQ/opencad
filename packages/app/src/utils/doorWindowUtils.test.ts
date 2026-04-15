/**
 * T-BIM-003: Door & Window tests
 */
import { describe, it, expect } from 'vitest';
import { createDoorElement, createWindowElement, DEFAULT_DOOR_WIDTH, DEFAULT_DOOR_HEIGHT, DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT, DEFAULT_WINDOW_SILL_HEIGHT } from './doorWindowUtils';

describe('T-BIM-003: Door Tool', () => {
  it('stores position X and Y', () => {
    const el = createDoorElement({ x: 500, y: 300 });
    expect(el.properties['X']?.value).toBe(500);
    expect(el.properties['Y']?.value).toBe(300);
  });
  it('defaults width to 900mm', () => {
    expect(createDoorElement({ x: 0, y: 0 }).properties['Width']?.value).toBe(DEFAULT_DOOR_WIDTH);
  });
  it('defaults height to 2100mm', () => {
    expect(createDoorElement({ x: 0, y: 0 }).properties['Height']?.value).toBe(DEFAULT_DOOR_HEIGHT);
  });
  it('defaults material to Timber', () => {
    expect(createDoorElement({ x: 0, y: 0 }).properties['Material']?.value).toBe('Timber');
  });
  it('defaults swing to left', () => {
    expect(createDoorElement({ x: 0, y: 0 }).properties['Swing']?.value).toBe('left');
  });
  it('accepts custom width', () => {
    expect(createDoorElement({ x: 0, y: 0 }, { width: 1200 }).properties['Width']?.value).toBe(1200);
  });
  it('sets type to door', () => {
    expect(createDoorElement({ x: 0, y: 0 }).type).toBe('door');
  });
});

describe('T-BIM-003: Window Tool', () => {
  it('stores position X and Y', () => {
    const el = createWindowElement({ x: 200, y: 100 });
    expect(el.properties['X']?.value).toBe(200);
    expect(el.properties['Y']?.value).toBe(100);
  });
  it('defaults width to 1200mm', () => {
    expect(createWindowElement({ x: 0, y: 0 }).properties['Width']?.value).toBe(DEFAULT_WINDOW_WIDTH);
  });
  it('defaults height to 1200mm', () => {
    expect(createWindowElement({ x: 0, y: 0 }).properties['Height']?.value).toBe(DEFAULT_WINDOW_HEIGHT);
  });
  it('defaults sillHeight to 900mm', () => {
    expect(createWindowElement({ x: 0, y: 0 }).properties['SillHeight']?.value).toBe(DEFAULT_WINDOW_SILL_HEIGHT);
  });
  it('defaults glazingType to Clear', () => {
    expect(createWindowElement({ x: 0, y: 0 }).properties['GlazingType']?.value).toBe('Clear');
  });
  it('accepts custom sillHeight', () => {
    expect(createWindowElement({ x: 0, y: 0 }, { sillHeight: 1100 }).properties['SillHeight']?.value).toBe(1100);
  });
  it('sets type to window', () => {
    expect(createWindowElement({ x: 0, y: 0 }).type).toBe('window');
  });
});
