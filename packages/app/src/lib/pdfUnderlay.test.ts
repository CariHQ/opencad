/**
 * T-IO-051 PDF underlay tests (GitHub issue #344).
 *
 *   T-IO-051-001 — createUnderlay seeds defaults
 *   T-IO-051-002 — calibrateScale: 100 px spans 5000 mm → scale 50
 *   T-IO-051-003 — pageToWorld applies origin + rotation
 */
import { describe, it, expect } from 'vitest';
import { createUnderlay, calibrateScale, pageToWorld } from './pdfUnderlay';

describe('T-IO-051: pdfUnderlay', () => {
  it('T-IO-051-001: createUnderlay defaults to page 0, opacity 0.5, locked true', () => {
    const u = createUnderlay('foo.pdf');
    expect(u.pageIndex).toBe(0);
    expect(u.opacity).toBe(0.5);
    expect(u.locked).toBe(true);
    expect(u.scale).toBe(1);
  });

  it('T-IO-051-002: calibrateScale: 100 px apart → entered 5000 mm → scale = 50', () => {
    const s = calibrateScale({ x: 0, y: 0 }, { x: 100, y: 0 }, 5000);
    expect(s).toBe(50);
  });

  it('calibrateScale handles diagonal distance', () => {
    const s = calibrateScale({ x: 0, y: 0 }, { x: 3, y: 4 }, 5000);
    expect(s).toBe(1000);  // 5000 mm / 5 px
  });

  it('calibrateScale on coincident points returns 1 (no divide-by-zero)', () => {
    expect(calibrateScale({ x: 5, y: 5 }, { x: 5, y: 5 }, 1000)).toBe(1);
  });

  it('T-IO-051-003: pageToWorld applies origin, scale, rotation', () => {
    const u = { ...createUnderlay('foo'), origin: { x: 100, y: 200 }, scale: 2, rotation: 0 };
    expect(pageToWorld(u, { x: 10, y: 20 })).toEqual({ x: 120, y: 240 });
  });

  it('pageToWorld with 90° rotation', () => {
    const u = { ...createUnderlay('foo'), origin: { x: 0, y: 0 }, scale: 1, rotation: 90 };
    const r = pageToWorld(u, { x: 1, y: 0 });
    expect(r.x).toBeCloseTo(0, 6);
    expect(r.y).toBeCloseTo(1, 6);
  });
});
