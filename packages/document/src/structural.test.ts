/**
 * Structural Element Tests
 * T-STR-001: Foundation creation, volume, bearing capacity
 * T-STR-002: Footing shapes and volumes
 * T-STR-003: Reinforcement (rebar) creation and weight
 * T-STR-004: Truss creation, ridge height
 * T-STR-005: Brace creation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createFoundation,
  foundationVolume,
  foundationBearingCapacity,
  createFooting,
  footingVolume,
  createRebar,
  rebarWeight,
  createTruss,
  trussRidgeHeight,
  createBrace,
} from './structural';

// ─── T-STR-001: Foundation ────────────────────────────────────────────────────

describe('T-STR-001: Foundation creation', () => {
  it('should create a strip foundation', () => {
    const f = createFoundation({ foundationType: 'strip', width: 600, thickness: 250, length: 5000 });
    expect(f.type).toBe('foundation');
    expect(f.foundationType).toBe('strip');
    expect(f.width).toBe(600);
    expect(f.thickness).toBe(250);
  });

  it('should create a raft foundation', () => {
    const f = createFoundation({ foundationType: 'raft', width: 10000, depth: 600 });
    expect(f.foundationType).toBe('raft');
    expect(f.reinforced).toBe(true);
  });

  it('should compute foundation volume = width × thickness × length', () => {
    const f = createFoundation({ width: 600, thickness: 250, length: 5000 });
    expect(foundationVolume(f)).toBeCloseTo(600 * 250 * 5000, 0);
  });

  it('should compute bearing capacity proportional to area', () => {
    const narrow = createFoundation({ width: 300, length: 1000, soilBearing: 100 });
    const wide = createFoundation({ width: 600, length: 1000, soilBearing: 100 });
    expect(foundationBearingCapacity(wide)).toBeGreaterThan(foundationBearingCapacity(narrow));
  });

  it('should have concrete grade', () => {
    const f = createFoundation({ concreteGrade: 'C30/37' });
    expect(f.concreteGrade).toBe('C30/37');
  });

  it('should default to reinforced', () => {
    const f = createFoundation({});
    expect(f.reinforced).toBe(true);
  });

  // Property-based: volume always positive
  it('foundation volume is always positive (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 2000 }),
        fc.integer({ min: 100, max: 600 }),
        fc.integer({ min: 500, max: 20000 }),
        (w, t, l) => {
          const f = createFoundation({ width: w, thickness: t, length: l });
          return foundationVolume(f) > 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── T-STR-002: Footing ───────────────────────────────────────────────────────

describe('T-STR-002: Footing creation and volume', () => {
  it('should create a square footing', () => {
    const f = createFooting({ shape: 'square', width: 800, thickness: 300 });
    expect(f.type).toBe('footing');
    expect(f.shape).toBe('square');
    expect(f.width).toBe(800);
    expect(f.thickness).toBe(300);
  });

  it('should create a circular footing', () => {
    const f = createFooting({ shape: 'circular', diameter: 600, thickness: 300 });
    expect(f.shape).toBe('circular');
    expect(f.diameter).toBe(600);
  });

  it('square footing volume = width × depth × thickness', () => {
    const f = createFooting({ shape: 'square', width: 800, thickness: 300 });
    expect(footingVolume(f)).toBeCloseTo(800 * 800 * 300, 0);
  });

  it('circular footing volume = π × r² × thickness', () => {
    const f = createFooting({ shape: 'circular', diameter: 800, thickness: 300 });
    expect(footingVolume(f)).toBeCloseTo(Math.PI * 400 * 400 * 300, 0);
  });

  it('should store rebar info', () => {
    const f = createFooting({ rebarCount: 8, rebarDiameter: 20 });
    expect(f.rebarCount).toBe(8);
    expect(f.rebarDiameter).toBe(20);
  });
});

// ─── T-STR-003: Reinforcement ─────────────────────────────────────────────────

describe('T-STR-003: Reinforcement (rebar)', () => {
  it('should create a straight rebar', () => {
    const r = createRebar({ diameter: 16, length: 3000, quantity: 10 });
    expect(r.type).toBe('reinforcement');
    expect(r.shape).toBe('straight');
    expect(r.diameter).toBe(16);
    expect(r.quantity).toBe(10);
  });

  it('should create a stirrup', () => {
    const r = createRebar({ shape: 'stirrup', diameter: 8, length: 1200, quantity: 50 });
    expect(r.shape).toBe('stirrup');
  });

  it('should compute rebar weight from diameter, length, quantity', () => {
    const r = createRebar({ diameter: 16, length: 1000, quantity: 1 });
    const crossSection = Math.PI * 8 * 8; // mm²
    const expected = (crossSection * 1000 / 1e9) * 7850;
    expect(rebarWeight(r)).toBeCloseTo(expected, 3);
  });

  it('larger diameter → heavier rebar (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 20 }),
        fc.integer({ min: 21, max: 40 }),
        fc.integer({ min: 1000, max: 5000 }),
        (d1, d2, l) => {
          const r1 = createRebar({ diameter: d1, length: l, quantity: 1 });
          const r2 = createRebar({ diameter: d2, length: l, quantity: 1 });
          return rebarWeight(r2) > rebarWeight(r1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('more bars → more weight', () => {
    const r1 = createRebar({ diameter: 16, length: 3000, quantity: 5 });
    const r2 = createRebar({ diameter: 16, length: 3000, quantity: 10 });
    expect(rebarWeight(r2)).toBeCloseTo(rebarWeight(r1) * 2, 2);
  });

  it('should store host element reference', () => {
    const r = createRebar({ diameter: 16, length: 3000, hostElementId: 'wall-001' });
    expect(r.hostElementId).toBe('wall-001');
  });
});

// ─── T-STR-004: Truss ─────────────────────────────────────────────────────────

describe('T-STR-004: Truss creation', () => {
  it('should create a Pratt truss', () => {
    const t = createTruss({ trussType: 'pratt', span: 12000 });
    expect(t.type).toBe('truss');
    expect(t.trussType).toBe('pratt');
    expect(t.span).toBe(12000);
  });

  it('should set depth to span/10 by default', () => {
    const t = createTruss({ span: 10000 });
    expect(t.depth).toBe(1000);
  });

  it('flat truss has zero ridge height', () => {
    const t = createTruss({ trussType: 'flat', span: 10000, pitch: 0 });
    expect(trussRidgeHeight(t)).toBe(0);
  });

  it('pitched truss ridge height = (span/2) × tan(pitch)', () => {
    const t = createTruss({ span: 8000, pitch: 45 });
    expect(trussRidgeHeight(t)).toBeCloseTo(4000, 1);
  });

  it('greater pitch → higher ridge (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5000, max: 15000 }),
        fc.integer({ min: 5, max: 30 }),
        fc.integer({ min: 31, max: 60 }),
        (span, p1, p2) => {
          const t1 = createTruss({ span, pitch: p1 });
          const t2 = createTruss({ span, pitch: p2 });
          return trussRidgeHeight(t2) > trussRidgeHeight(t1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should set default section sizes', () => {
    const t = createTruss({ span: 10000 });
    expect(t.topChordSection).toBeDefined();
    expect(t.bottomChordSection).toBeDefined();
    expect(t.webSection).toBeDefined();
  });
});

// ─── T-STR-005: Brace ─────────────────────────────────────────────────────────

describe('T-STR-005: Brace creation', () => {
  it('should create an X-brace', () => {
    const b = createBrace({ braceType: 'x_brace', length: 3000 });
    expect(b.type).toBe('brace');
    expect(b.braceType).toBe('x_brace');
    expect(b.length).toBe(3000);
  });

  it('should create a chevron brace', () => {
    const b = createBrace({ braceType: 'chevron', length: 4000, angle: 60 });
    expect(b.braceType).toBe('chevron');
    expect(b.angle).toBe(60);
  });

  it('should default to 45° angle', () => {
    const b = createBrace({ length: 2000 });
    expect(b.angle).toBe(45);
  });

  it('should store axial capacity', () => {
    const b = createBrace({ length: 3000, axialCapacity: 250 });
    expect(b.axialCapacity).toBe(250);
  });

  it('should assign unique IDs', () => {
    const b1 = createBrace({ length: 3000 });
    const b2 = createBrace({ length: 3000 });
    expect(b1.id).not.toBe(b2.id);
  });
});
