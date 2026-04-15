/**
 * T-BIM-004: Column & Beam tests
 */
import { describe, it, expect } from 'vitest';
import { createColumnElement, createBeamElement, COLUMN_SECTIONS, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_HEIGHT, DEFAULT_BEAM_DEPTH } from './columnBeamUtils';

describe('T-BIM-004: Column Tool', () => {
  it('stores position X and Y', () => {
    const el = createColumnElement({ x: 1000, y: 2000 });
    expect(el.properties['X']?.value).toBe(1000);
    expect(el.properties['Y']?.value).toBe(2000);
  });
  it('defaults width to 400mm', () => {
    expect(createColumnElement({ x: 0, y: 0 }).properties['Width']?.value).toBe(DEFAULT_COLUMN_WIDTH);
  });
  it('defaults height to 3000mm', () => {
    expect(createColumnElement({ x: 0, y: 0 }).properties['Height']?.value).toBe(DEFAULT_COLUMN_HEIGHT);
  });
  it('defaults material to Concrete', () => {
    expect(createColumnElement({ x: 0, y: 0 }).properties['Material']?.value).toBe('Concrete');
  });
  it('defaults sectionType to square', () => {
    expect(createColumnElement({ x: 0, y: 0 }).properties['SectionType']?.value).toBe('square');
  });
  it('sets type to column', () => {
    expect(createColumnElement({ x: 0, y: 0 }).type).toBe('column');
  });
  it('COLUMN_SECTIONS has exactly 5 types', () => {
    expect(COLUMN_SECTIONS).toHaveLength(5);
    expect(COLUMN_SECTIONS).toContain('square');
    expect(COLUMN_SECTIONS).toContain('round');
    expect(COLUMN_SECTIONS).toContain('H-section');
  });
});

describe('T-BIM-004: Beam Tool', () => {
  it('preserves exact start point', () => {
    const el = createBeamElement({ x: 1000, y: 500 }, { x: 5000, y: 500 });
    expect(el.properties['StartX']?.value).toBe(1000);
    expect(el.properties['StartY']?.value).toBe(500);
  });
  it('preserves exact end point', () => {
    const el = createBeamElement({ x: 1000, y: 500 }, { x: 5000, y: 500 });
    expect(el.properties['EndX']?.value).toBe(5000);
  });
  it('preserves diagonal direction', () => {
    const el = createBeamElement({ x: 900, y: 700 }, { x: 100, y: 100 });
    expect(el.properties['StartX']?.value).toBe(900);
    expect(el.properties['EndX']?.value).toBe(100);
  });
  it('defaults depth to 500mm', () => {
    expect(createBeamElement({ x: 0, y: 0 }, { x: 1000, y: 0 }).properties['Depth']?.value).toBe(DEFAULT_BEAM_DEPTH);
  });
  it('defaults material to Steel', () => {
    expect(createBeamElement({ x: 0, y: 0 }, { x: 1000, y: 0 }).properties['Material']?.value).toBe('Steel');
  });
  it('sets type to beam', () => {
    expect(createBeamElement({ x: 0, y: 0 }, { x: 1000, y: 0 }).type).toBe('beam');
  });
});
