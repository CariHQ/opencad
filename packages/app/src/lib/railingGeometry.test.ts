/**
 * T-MOD-016 railing tests (GitHub issue #309).
 *
 *   T-MOD-016-001 — 4000mm path, postSpacing 1200 → ≥4 posts
 *   T-MOD-016-003 — glass profile produces zero balusters
 *   T-MOD-016 (rails) — one rail segment per path segment
 */
import { describe, it, expect } from 'vitest';
import { computeRailing } from './railingGeometry';

describe('T-MOD-016: railings', () => {
  it('T-MOD-016-001: 4000mm straight path + postSpacing 1200 → ≥ 4 posts', () => {
    const r = computeRailing({
      path: [{ x: 0, y: 0 }, { x: 4000, y: 0 }],
      topRailHeight: 1000, postSpacing: 1200, balusterSpacing: 150,
      balusterProfile: 'square',
    });
    expect(r.posts.length).toBeGreaterThanOrEqual(4);
    // All posts at the requested top-rail height
    for (const p of r.posts) expect(p.z).toBe(1000);
  });

  it('straight path produces one rail segment', () => {
    const r = computeRailing({
      path: [{ x: 0, y: 0 }, { x: 4000, y: 0 }],
      topRailHeight: 1000, postSpacing: 1200, balusterSpacing: 150,
      balusterProfile: 'square',
    });
    expect(r.rails).toHaveLength(1);
  });

  it('T-MOD-016-003: glass profile → zero balusters', () => {
    const r = computeRailing({
      path: [{ x: 0, y: 0 }, { x: 4000, y: 0 }],
      topRailHeight: 1000, postSpacing: 1200, balusterSpacing: 150,
      balusterProfile: 'glass',
    });
    expect(r.balusters).toHaveLength(0);
  });

  it('square profile produces non-zero balusters', () => {
    const r = computeRailing({
      path: [{ x: 0, y: 0 }, { x: 4000, y: 0 }],
      topRailHeight: 1000, postSpacing: 1200, balusterSpacing: 150,
      balusterProfile: 'square',
    });
    expect(r.balusters.length).toBeGreaterThan(0);
  });

  it('multi-segment path produces one rail per segment', () => {
    const r = computeRailing({
      path: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 2000 }],
      topRailHeight: 1000, postSpacing: 1000, balusterSpacing: 100,
      balusterProfile: 'square',
    });
    expect(r.rails).toHaveLength(2);
  });

  it('empty path returns zero posts + zero rails', () => {
    const r = computeRailing({
      path: [], topRailHeight: 1000, postSpacing: 1000, balusterSpacing: 100,
      balusterProfile: 'square',
    });
    expect(r.posts).toHaveLength(0);
    expect(r.rails).toHaveLength(0);
  });

  it('closely-spaced points merge correctly (one post at the junction)', () => {
    const r = computeRailing({
      path: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 4000, y: 0 }],
      topRailHeight: 1000, postSpacing: 2000, balusterSpacing: 100,
      balusterProfile: 'square',
    });
    // Posts at 0, 2000, 4000 — second segment skips its start (already placed)
    const xs = r.posts.map((p) => p.x);
    expect(new Set(xs).size).toBe(xs.length);
  });
});
