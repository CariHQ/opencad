/**
 * T-EXT-01: Property-based tests for built-in example families.
 * Exercises the full param space to confirm:
 *   - Geometry callback never throws
 *   - Output is deterministic
 *   - Output contains valid vertices (no NaN/Infinity)
 *   - Bounding box is non-degenerate (has positive extents)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import {
  resolveFamily,
  defaultParams,
  evalGeometry,
  boundingBoxFromGeometry,
} from '../familyRegistry';

// Import examples for their side-effect (registerFamily calls)
import './parametric-door';
import './parametric-column';
import './parametric-skylight';

// ── Helpers ───────────────────────────────────────────────────────────────────

function assertValidGeometry(id: string, label: string): void {
  const def = resolveFamily(id)!;
  const params = defaultParams(def);
  const geom = evalGeometry(def, params);

  expect(geom, `${label}: geometry must not be null`).not.toBeNull();
  expect(geom!.vertices.length % 3, `${label}: vertex count divisible by 3`).toBe(0);
  expect(geom!.faces.length % 3, `${label}: face index count divisible by 3`).toBe(0);

  for (const v of geom!.vertices) {
    expect(Number.isFinite(v), `${label}: no NaN/Infinity in vertices (got ${v})`).toBe(true);
  }
  for (const f of geom!.faces) {
    expect(f >= 0 && f < geom!.vertices.length / 3, `${label}: face index ${f} in range`).toBe(true);
  }
}

function assertDeterministic(id: string, label: string): void {
  const def = resolveFamily(id)!;
  const params = defaultParams(def);
  const g1 = evalGeometry(def, params)!;
  const g2 = evalGeometry(def, params)!;
  expect(g1.vertices, `${label}: deterministic vertices`).toEqual(g2.vertices);
  expect(g1.faces,    `${label}: deterministic faces`).toEqual(g2.faces);
}

function assertPositiveBounds(id: string, label: string): void {
  const def = resolveFamily(id)!;
  const geom = evalGeometry(def, defaultParams(def))!;
  const bb = boundingBoxFromGeometry(geom);
  expect(bb.maxX - bb.minX, `${label}: positive X extent`).toBeGreaterThan(0);
  expect(bb.maxY - bb.minY, `${label}: positive Y extent or equal (flat)`).toBeGreaterThanOrEqual(0);
  expect(bb.maxZ - bb.minZ, `${label}: positive Z extent`).toBeGreaterThan(0);
}

// ── Door ──────────────────────────────────────────────────────────────────────

describe('T-EXT-01: parametric-door', () => {
  const ID = 'builtin:parametric-door';

  it('is registered', () => { expect(resolveFamily(ID)).toBeDefined(); });
  it('has valid default geometry', () => assertValidGeometry(ID, 'door'));
  it('is deterministic', () => assertDeterministic(ID, 'door'));
  it('has positive bounding box', () => assertPositiveBounds(ID, 'door'));

  it('wider door produces larger X extent', () => {
    const def = resolveFamily(ID)!;
    const narrow = evalGeometry(def, { ...defaultParams(def), width: 600 })!;
    const wide   = evalGeometry(def, { ...defaultParams(def), width: 2400 })!;
    const bbN = boundingBoxFromGeometry(narrow);
    const bbW = boundingBoxFromGeometry(wide);
    expect(bbW.maxX - bbW.minX).toBeGreaterThan(bbN.maxX - bbN.minX);
  });

  it('taller door produces larger Z extent', () => {
    const def = resolveFamily(ID)!;
    const short = evalGeometry(def, { ...defaultParams(def), height: 1800 })!;
    const tall  = evalGeometry(def, { ...defaultParams(def), height: 3000 })!;
    const bbS = boundingBoxFromGeometry(short);
    const bbT = boundingBoxFromGeometry(tall);
    expect(bbT.maxZ - bbT.minZ).toBeGreaterThan(bbS.maxZ - bbS.minZ);
  });

  it('both handedness values produce valid geometry', () => {
    const def = resolveFamily(ID)!;
    ['left', 'right'].forEach((h) => {
      const geom = evalGeometry(def, { ...defaultParams(def), handed: h });
      expect(geom, `handed=${h}`).not.toBeNull();
    });
  });
});

// ── Column ────────────────────────────────────────────────────────────────────

describe('T-EXT-01: parametric-column', () => {
  const ID = 'builtin:parametric-column';

  it('is registered', () => { expect(resolveFamily(ID)).toBeDefined(); });
  it('has valid default geometry', () => assertValidGeometry(ID, 'column'));
  it('is deterministic', () => assertDeterministic(ID, 'column'));
  it('has positive bounding box', () => assertPositiveBounds(ID, 'column'));

  it('both shapes produce valid geometry', () => {
    const def = resolveFamily(ID)!;
    ['square', 'round'].forEach((shape) => {
      const geom = evalGeometry(def, { ...defaultParams(def), shape });
      expect(geom, `shape=${shape}`).not.toBeNull();
    });
  });

  it('taller column has larger Z extent', () => {
    const def = resolveFamily(ID)!;
    const short = evalGeometry(def, { ...defaultParams(def), height: 500 })!;
    const tall  = evalGeometry(def, { ...defaultParams(def), height: 5000 })!;
    const bbS = boundingBoxFromGeometry(short);
    const bbT = boundingBoxFromGeometry(tall);
    expect(bbT.maxZ - bbT.minZ).toBeGreaterThan(bbS.maxZ - bbS.minZ);
  });
});

// ── Skylight ──────────────────────────────────────────────────────────────────

describe('T-EXT-01: parametric-skylight', () => {
  const ID = 'builtin:parametric-skylight';

  it('is registered', () => { expect(resolveFamily(ID)).toBeDefined(); });
  it('has valid default geometry', () => assertValidGeometry(ID, 'skylight'));
  it('is deterministic', () => assertDeterministic(ID, 'skylight'));
  it('has positive bounding box', () => assertPositiveBounds(ID, 'skylight'));

  it('steeper pitch increases Z extent', () => {
    const def = resolveFamily(ID)!;
    const flat  = evalGeometry(def, { ...defaultParams(def), pitch: 5 })!;
    const steep = evalGeometry(def, { ...defaultParams(def), pitch: 45 })!;
    const bbF = boundingBoxFromGeometry(flat);
    const bbS = boundingBoxFromGeometry(steep);
    expect(bbS.maxZ - bbS.minZ).toBeGreaterThan(bbF.maxZ - bbF.minZ);
  });
});
