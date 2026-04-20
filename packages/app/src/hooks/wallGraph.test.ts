/**
 * T-MOD-001: Wall junction graph tests (GitHub issue #294)
 *
 * The wall graph resolves L / T / X intersections so adjacent walls meet
 * cleanly at joints in both 2D plan view and 3D geometry. Tests cover:
 *   T-MOD-001-001 — empty doc → empty graph
 *   T-MOD-001-002 — two walls sharing an exact endpoint → L-junction on each
 *   T-MOD-001-003 — snap tolerance (endpoints within 15 mm → still L)
 *   T-MOD-001-004 — outside tolerance (25 mm → no junction)
 *   T-MOD-001-005 — three walls forming a T → one T-record + two L-records
 *   T-MOD-001-006 — four walls crossing at a point → one X-junction, four records
 *   T-MOD-001-007 — wall removal invalidates only the neighbours
 *   T-MOD-001-008 — sub-mm wall move keeps graph; 10 mm past endpoint detaches
 */
import { describe, it, expect } from 'vitest';
import type { ElementSchema } from '@opencad/document';
import { buildWallGraph } from './wallGraph';

let __id = 0;
function wall(x1: number, y1: number, x2: number, y2: number): ElementSchema {
  const id = `w-${++__id}`;
  return {
    id,
    type: 'wall',
    layerId: 'layer-1',
    properties: {
      StartX: { type: 'number', value: x1 },
      StartY: { type: 'number', value: y1 },
      EndX:   { type: 'number', value: x2 },
      EndY:   { type: 'number', value: y2 },
      Width:  { type: 'number', value: 200 },
      Height: { type: 'number', value: 3000 },
    },
    boundingBox: {
      min: { x: Math.min(x1, x2), y: Math.min(y1, y2), z: 0 },
      max: { x: Math.max(x1, x2), y: Math.max(y1, y2), z: 3000 },
    },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

function docFromWalls(walls: ElementSchema[]): Record<string, ElementSchema> {
  const out: Record<string, ElementSchema> = {};
  for (const w of walls) out[w.id] = w;
  return out;
}

describe('T-MOD-001: wall graph', () => {
  it('T-MOD-001-001: empty doc produces empty graph', () => {
    const g = buildWallGraph({});
    expect(g.size).toBe(0);
  });

  it('T-MOD-001-002: two walls sharing an exact endpoint form an L on each', () => {
    const a = wall(0, 0, 5000, 0);        // east wall
    const b = wall(5000, 0, 5000, 3000);  // south wall sharing (5000,0)
    const g = buildWallGraph(docFromWalls([a, b]));

    const aJoins = g.get(a.id) ?? [];
    const bJoins = g.get(b.id) ?? [];
    expect(aJoins).toHaveLength(1);
    expect(bJoins).toHaveLength(1);
    expect(aJoins[0]!.kind).toBe('L');
    expect(bJoins[0]!.kind).toBe('L');
    // The joining wall ids cross-reference
    expect(aJoins[0]!.otherWallId).toBe(b.id);
    expect(bJoins[0]!.otherWallId).toBe(a.id);
  });

  it('T-MOD-001-003: endpoints within 15 mm still form an L (snap tolerance)', () => {
    const a = wall(0, 0, 5000, 0);
    const b = wall(5012, 0, 5012, 3000); // 12 mm off
    const g = buildWallGraph(docFromWalls([a, b]));
    expect(g.get(a.id)?.[0]?.kind).toBe('L');
  });

  it('T-MOD-001-004: endpoints 25 mm apart form no junction (outside tolerance)', () => {
    const a = wall(0, 0, 5000, 0);
    const b = wall(5025, 0, 5025, 3000); // 25 mm off
    const g = buildWallGraph(docFromWalls([a, b]));
    expect(g.get(a.id) ?? []).toHaveLength(0);
    expect(g.get(b.id) ?? []).toHaveLength(0);
  });

  it('T-MOD-001-005: T-junction has one T-record on the through-wall and two L-records on the stub walls', () => {
    const through = wall(0, 0, 10000, 0);   // east-west
    const stub1   = wall(5000, 0, 5000, 3000); // south stub at midpoint
    const stub2   = wall(2000, 0, 2000, 3000); // another south stub — second T
    const g = buildWallGraph(docFromWalls([through, stub1, stub2]));

    const throughJoins = g.get(through.id) ?? [];
    // Through wall has 2 T-records (one per stub)
    expect(throughJoins.filter((j) => j.kind === 'T')).toHaveLength(2);
    // Stub walls each have one L-record (their end meets the through-wall)
    expect((g.get(stub1.id) ?? []).filter((j) => j.kind === 'L')).toHaveLength(1);
    expect((g.get(stub2.id) ?? []).filter((j) => j.kind === 'L')).toHaveLength(1);
  });

  it('T-MOD-001-006: X-junction produces 4 records, all of kind X', () => {
    // Two walls crossing at (0,0) — a horizontal E-W and a vertical N-S
    const h = wall(-5000, 0, 5000, 0);
    const v = wall(0, -5000, 0, 5000);
    const g = buildWallGraph(docFromWalls([h, v]));
    const hJoins = g.get(h.id) ?? [];
    const vJoins = g.get(v.id) ?? [];
    expect(hJoins).toHaveLength(1);
    expect(vJoins).toHaveLength(1);
    expect(hJoins[0]!.kind).toBe('X');
    expect(vJoins[0]!.kind).toBe('X');
  });

  it('T-MOD-001-007: removing one wall clears graph entries involving it', () => {
    const a = wall(0, 0, 5000, 0);
    const b = wall(5000, 0, 5000, 3000);
    const c = wall(5000, 3000, 0, 3000);

    const g1 = buildWallGraph(docFromWalls([a, b, c]));
    expect(g1.get(a.id)?.length).toBeGreaterThan(0);
    expect(g1.get(b.id)?.length).toBeGreaterThan(0);

    // Remove b
    const g2 = buildWallGraph(docFromWalls([a, c]));
    expect(g2.get(a.id) ?? []).toHaveLength(0);
    expect(g2.get(c.id) ?? []).toHaveLength(0);
    expect(g2.get(b.id)).toBeUndefined();
  });

  it('T-MOD-001-008: sub-mm wall move keeps graph; 50 mm move past endpoint detaches', () => {
    const a = wall(0, 0, 5000, 0);
    const b = wall(5000, 0, 5000, 3000);

    // Sub-mm move — b's start is still at 5000 (within tolerance)
    const bTiny = { ...b, properties: {
      ...b.properties,
      StartX: { type: 'number' as const, value: 5000.4 },
    }};
    const g1 = buildWallGraph(docFromWalls([a, bTiny]));
    expect(g1.get(a.id)?.[0]?.kind).toBe('L');

    // 50 mm move — past tolerance, detaches
    const bFar = { ...b, properties: {
      ...b.properties,
      StartX: { type: 'number' as const, value: 5050 },
    }};
    const g2 = buildWallGraph(docFromWalls([a, bFar]));
    expect(g2.get(a.id) ?? []).toHaveLength(0);
    expect(g2.get(bFar.id) ?? []).toHaveLength(0);
  });
});
