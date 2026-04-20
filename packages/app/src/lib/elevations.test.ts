/**
 * T-DOC-006 elevations tests (GitHub issue #299).
 *
 *   T-DOC-006-001 — cameraParamsFor('N', bbox) places camera north of centre
 *   T-DOC-006-002 — orthographic, not perspective (checked implicitly by ortho sizes)
 *   T-DOC-006-003 — frustum sized to bbox + margin
 *   T-DOC-006-004 — seeds 4 cardinal elevations
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_ELEVATIONS, cameraParamsFor } from './elevations';

const bbox = { minX: -5000, minY: 0, minZ: -3000, maxX: 5000, maxY: 3000, maxZ: 3000 };

describe('T-DOC-006: elevations', () => {
  it('T-DOC-006-004: seeds exactly four cardinal elevations', () => {
    expect(DEFAULT_ELEVATIONS.map((e) => e.compass)).toEqual(['N', 'S', 'E', 'W']);
  });

  it('T-DOC-006-001: North elevation camera sits north of centre', () => {
    const c = cameraParamsFor(DEFAULT_ELEVATIONS[0]!, bbox);
    expect(c.target.x).toBeCloseTo(0, 0);
    expect(c.target.z).toBeCloseTo(0, 0);
    // North = camera has more-negative Z than the target (since +Z is south)
    expect(c.position.z).toBeLessThan(c.target.z);
  });

  it('South elevation camera sits south of centre', () => {
    const c = cameraParamsFor(DEFAULT_ELEVATIONS[1]!, bbox);
    expect(c.position.z).toBeGreaterThan(c.target.z);
  });

  it('East elevation camera sits east of centre', () => {
    const c = cameraParamsFor(DEFAULT_ELEVATIONS[2]!, bbox);
    expect(c.position.x).toBeGreaterThan(c.target.x);
  });

  it('West elevation camera sits west of centre', () => {
    const c = cameraParamsFor(DEFAULT_ELEVATIONS[3]!, bbox);
    expect(c.position.x).toBeLessThan(c.target.x);
  });

  it('T-DOC-006-003: frustum sized to bbox with margin', () => {
    const c = cameraParamsFor(DEFAULT_ELEVATIONS[0]!, bbox);
    const h = bbox.maxY - bbox.minY;
    expect(c.orthoHalfHeight).toBeGreaterThan(h * 0.5);
  });

  it('custom angle 45 places camera NE of centre', () => {
    const c = cameraParamsFor(
      { id: 'custom', name: 'NE', compass: 'custom', angleDeg: 45 },
      bbox,
    );
    expect(c.position.x).toBeGreaterThan(c.target.x);
    expect(c.position.z).toBeLessThan(c.target.z);
  });

  it('up vector is world-+Y', () => {
    const c = cameraParamsFor(DEFAULT_ELEVATIONS[0]!, bbox);
    expect(c.up).toEqual({ x: 0, y: 1, z: 0 });
  });
});
