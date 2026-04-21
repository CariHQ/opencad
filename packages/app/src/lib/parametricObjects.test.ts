/**
 * T-PAR-013 parametric object tests (GitHub issue #306).
 *
 *   T-PAR-013-001 — validator rejects zero primitives
 *   T-PAR-013-002 — manifest with width parameter parses
 *   T-PAR-013-003 — resolvePrimitives substitutes user values
 *   T-PAR-013-004 — missing user param falls back to default
 */
import { describe, it, expect } from 'vitest';
import {
  resolvePrimitives, validateManifest, BUILT_IN_PARAMETRIC_OBJECTS,
  type ParametricObjectManifest,
} from './parametricObjects';

const MANIFEST: ParametricObjectManifest = {
  id: 't-obj', name: 'Test', category: 'furniture',
  parameters: [{ name: 'width', type: 'number', default: 800 }],
  primitives: [{ kind: 'box', size: ['{{width}}', 100, 100] }],
};

describe('T-PAR-013: parametric object library', () => {
  it('T-PAR-013-001: validateManifest rejects manifest with zero primitives', () => {
    const reasons = validateManifest({ ...MANIFEST, primitives: [] });
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.join(' ')).toMatch(/primitive/);
  });

  it('T-PAR-013-002: a manifest with width parameter validates', () => {
    expect(validateManifest(MANIFEST)).toEqual([]);
  });

  it('T-PAR-013-003: resolvePrimitives uses user-supplied value', () => {
    const out = resolvePrimitives(MANIFEST, { width: 1000 });
    expect(out[0]!.kind).toBe('box');
    expect(out[0]!.size![0]).toBe(1000);
  });

  it('T-PAR-013-004: missing user param falls back to default', () => {
    const out = resolvePrimitives(MANIFEST, {});
    expect(out[0]!.size![0]).toBe(800);
  });

  it('unknown {{param}} reference fails validation', () => {
    const bad: ParametricObjectManifest = {
      ...MANIFEST,
      primitives: [{ kind: 'box', size: ['{{ghost}}', 100, 100] }],
    };
    const reasons = validateManifest(bad);
    expect(reasons.some((r) => r.includes('ghost'))).toBe(true);
  });

  it('revolve primitive resolves profile point parameters', () => {
    const m: ParametricObjectManifest = {
      id: 'd', name: 'Dome', category: 'fixture',
      parameters: [{ name: 'r', type: 'number', default: 200 }],
      primitives: [{ kind: 'revolve', profile: [['{{r}}', 0], [0, '{{r}}']], segments: 8 }],
    };
    const out = resolvePrimitives(m, { r: 500 });
    expect((out[0]!.profile as [number, number][])[0]).toEqual([500, 0]);
  });

  it('BUILT_IN_PARAMETRIC_OBJECTS ships ≥ 3 starter manifests + all validate', () => {
    expect(BUILT_IN_PARAMETRIC_OBJECTS.length).toBeGreaterThanOrEqual(3);
    for (const m of BUILT_IN_PARAMETRIC_OBJECTS) expect(validateManifest(m)).toEqual([]);
  });

  it('starter toilet resolves with default tankWidth=400', () => {
    const toilet = BUILT_IN_PARAMETRIC_OBJECTS.find((m) => m.id === 'toilet-basic')!;
    const out = resolvePrimitives(toilet);
    expect(out[0]!.size![0]).toBe(400);
  });
});
