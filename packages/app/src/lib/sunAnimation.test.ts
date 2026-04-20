/**
 * T-VIZ-041 sun animation tests (GitHub issue #334).
 *
 *   T-VIZ-041-001 — sun direction is a unit vector
 *   T-VIZ-041-002 — elevation is negative at night
 *   T-VIZ-041-003 — timeline steps through the requested range
 */
import { describe, it, expect } from 'vitest';
import { sunDirectionAt, buildSunTimeline, type SiteLocation } from './sunAnimation';

const NYC: SiteLocation = { latitudeDeg: 40.7128, longitudeDeg: -74.0060 };

describe('T-VIZ-041: sunAnimation', () => {
  it('T-VIZ-041-001: sun direction is a unit vector', () => {
    const v = sunDirectionAt(new Date('2026-06-21T16:00:00Z'), NYC);
    const len = Math.hypot(v.x, v.y, v.z);
    expect(len).toBeCloseTo(1, 2);
  });

  it('T-VIZ-041-002: sun is below horizon at local midnight (elevation < 0)', () => {
    // NYC is UTC-4 ish in summer — local midnight is 04:00 UTC
    const v = sunDirectionAt(new Date('2026-06-22T04:00:00Z'), NYC);
    expect(v.elevationDeg).toBeLessThan(0);
  });

  it('sun is above horizon at local noon (elevation > 0)', () => {
    // Local noon in June is 16:00 UTC
    const v = sunDirectionAt(new Date('2026-06-21T16:00:00Z'), NYC);
    expect(v.elevationDeg).toBeGreaterThan(0);
  });

  it('elevation range is [-90, 90]', () => {
    for (let h = 0; h < 24; h++) {
      const v = sunDirectionAt(new Date(`2026-06-21T${h.toString().padStart(2, '0')}:00:00Z`), NYC);
      expect(v.elevationDeg).toBeGreaterThanOrEqual(-90);
      expect(v.elevationDeg).toBeLessThanOrEqual(90);
    }
  });

  it('azimuth range is [0, 360)', () => {
    for (let h = 0; h < 24; h++) {
      const v = sunDirectionAt(new Date(`2026-06-21T${h.toString().padStart(2, '0')}:00:00Z`), NYC);
      expect(v.azimuthDeg).toBeGreaterThanOrEqual(0);
      expect(v.azimuthDeg).toBeLessThan(360);
    }
  });

  it('T-VIZ-041-003: 24h timeline at 1h step produces 25 frames', () => {
    const start = new Date('2026-06-21T00:00:00Z');
    const end = new Date('2026-06-22T00:00:00Z');
    const t = buildSunTimeline(NYC, start, end, 60);
    expect(t).toHaveLength(25);
  });

  it('timeline at 15-min step produces 97 frames in 24h', () => {
    const start = new Date('2026-06-21T00:00:00Z');
    const end = new Date('2026-06-22T00:00:00Z');
    const t = buildSunTimeline(NYC, start, end, 15);
    expect(t).toHaveLength(97);
  });
});
