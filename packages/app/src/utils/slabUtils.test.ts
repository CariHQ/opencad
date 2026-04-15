/**
 * T-BIM-002: Slab Tool tests
 */
import { describe, it, expect } from 'vitest';
import { createSlabElement, SLAB_TYPES, DEFAULT_SLAB_THICKNESS, DEFAULT_SLAB_ELEVATION } from './slabUtils';

const TRI = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 500, y: 1000 }];

describe('T-BIM-002: Slab Tool', () => {
  it('stores points as JSON string', () => {
    const el = createSlabElement(TRI);
    const stored = JSON.parse(el.properties['Points']?.value as string);
    expect(stored).toEqual(TRI);
  });
  it('defaults thickness to 200mm', () => {
    expect(createSlabElement(TRI).properties['Thickness']?.value).toBe(DEFAULT_SLAB_THICKNESS);
    expect(DEFAULT_SLAB_THICKNESS).toBe(200);
  });
  it('defaults elevation to 0', () => {
    expect(createSlabElement(TRI).properties['Elevation']?.value).toBe(DEFAULT_SLAB_ELEVATION);
  });
  it('defaults slabType to floor', () => {
    expect(createSlabElement(TRI).properties['SlabType']?.value).toBe('floor');
  });
  it('defaults material to Concrete', () => {
    expect(createSlabElement(TRI).properties['Material']?.value).toBe('Concrete');
  });
  it('accepts custom thickness', () => {
    expect(createSlabElement(TRI, { thickness: 300 }).properties['Thickness']?.value).toBe(300);
  });
  it('accepts custom slabType', () => {
    expect(createSlabElement(TRI, { slabType: 'roof' }).properties['SlabType']?.value).toBe('roof');
  });
  it('sets element type to slab', () => {
    expect(createSlabElement(TRI).type).toBe('slab');
  });
  it('SLAB_TYPES has exactly 4 types', () => {
    expect(SLAB_TYPES).toHaveLength(4);
    expect(SLAB_TYPES).toContain('floor');
    expect(SLAB_TYPES).toContain('roof');
  });
});
