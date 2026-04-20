/**
 * T-PAR-009 parametric doors / windows tests (GitHub issue #302).
 *
 *   T-PAR-009-001 — door schema validates a minimal frame+leaf
 *   T-PAR-009-002 — migrateLegacyDoor from {Width, Height}
 *   T-PAR-009-003 — schema rejects leaf.count > 2
 */
import { describe, it, expect } from 'vitest';
import {
  validateDoor, validateWindow,
  migrateLegacyDoor, migrateLegacyWindow,
  DOOR_LIBRARY, WINDOW_LIBRARY,
} from './parametricOpenings';

describe('T-PAR-009: parametric openings', () => {
  it('T-PAR-009-001: minimal door validates', () => {
    expect(validateDoor({
      frame: { material: 'Wood', thickness: 45 },
      leaf:  { count: 1, material: 'Wood', panelLayout: 'flush', handing: 'R' },
      width: 900, height: 2100,
    })).toEqual([]);
  });

  it('T-PAR-009-002: migrateLegacyDoor on {Width, Height} produces new shape', () => {
    const d = migrateLegacyDoor({
      Width:  { type: 'number', value: 900 },
      Height: { type: 'number', value: 2100 },
    });
    expect(d.width).toBe(900);
    expect(d.height).toBe(2100);
    expect(d.frame).toBeDefined();
    expect(d.leaf.count).toBe(1);
  });

  it('T-PAR-009-003: leaf.count = 3 is rejected', () => {
    const reasons = validateDoor({
      frame: { material: 'Wood', thickness: 45 },
      leaf:  { count: 3 as 1, material: 'Wood', panelLayout: 'flush', handing: 'R' },
      width: 900, height: 2100,
    });
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.join(' ')).toMatch(/leaf\.count/);
  });

  it('door validator rejects zero width', () => {
    expect(validateDoor({
      frame: { material: 'Wood', thickness: 45 },
      leaf:  { count: 1, material: 'Wood', panelLayout: 'flush', handing: 'R' },
      width: 0, height: 2100,
    }).length).toBeGreaterThan(0);
  });

  it('window validator rejects rows=0', () => {
    expect(validateWindow({
      frame: { material: 'Aluminium', thickness: 50 },
      panes: { rows: 0, cols: 1 },
      operation: 'fixed', width: 1200, height: 1200, sillHeight: 900,
    }).length).toBeGreaterThan(0);
  });

  it('migrateLegacyWindow picks up SillHeight', () => {
    const w = migrateLegacyWindow({
      Width:      { type: 'number', value: 1200 },
      Height:     { type: 'number', value: 1200 },
      SillHeight: { type: 'number', value: 750 },
    });
    expect(w.sillHeight).toBe(750);
  });

  it('library templates all validate', () => {
    for (const [id, d] of Object.entries(DOOR_LIBRARY)) {
      expect(validateDoor(d), `library door ${id} must validate`).toEqual([]);
    }
    for (const [id, w] of Object.entries(WINDOW_LIBRARY)) {
      expect(validateWindow(w), `library window ${id} must validate`).toEqual([]);
    }
  });

  it('4-panel library door has correct panel layout', () => {
    expect(DOOR_LIBRARY['ext-single-4panel-900']!.leaf.panelLayout).toBe('4-panel');
  });

  it('library double-hung window has 2 rows × 1 col', () => {
    const w = WINDOW_LIBRARY['double-hung-1200x1800']!;
    expect(w.panes.rows).toBe(2);
    expect(w.panes.cols).toBe(1);
  });
});
