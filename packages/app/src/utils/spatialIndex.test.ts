/**
 * T-2D-SNAP-001: SpatialGrid — unit tests
 *
 * Verifies correctness and performance of the 2D grid-based spatial index
 * used by the snapping engine in useViewport.
 */
import { describe, it, expect } from 'vitest';
import { SpatialGrid } from './spatialIndex';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeGrid(cellSize = 500): SpatialGrid {
  return new SpatialGrid(cellSize);
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ─── basic correctness ───────────────────────────────────────────────────────

describe('SpatialGrid — basic correctness', () => {
  it('returns nothing when the index is empty', () => {
    const grid = makeGrid();
    expect(grid.query(0, 0, 100)).toHaveLength(0);
  });

  it('finds a point within radius', () => {
    const grid = makeGrid();
    grid.insert(100, 100, 'A');
    const results = grid.query(100, 100, 1);
    expect(results).toHaveLength(1);
    expect(results[0]!.payload).toBe('A');
  });

  it('does not return points outside radius', () => {
    const grid = makeGrid(500);
    grid.insert(0, 0, 'origin');
    grid.insert(1000, 0, 'far');
    // query with radius 50 — only origin is within range
    const results = grid.query(0, 0, 50);
    expect(results).toHaveLength(1);
    expect(results[0]!.payload).toBe('origin');
  });

  it('returns a point exactly on the radius boundary (inclusive)', () => {
    const grid = makeGrid(500);
    grid.insert(100, 0, 'boundary');
    const results = grid.query(0, 0, 100);
    expect(results).toHaveLength(1);
  });

  it('preserves the x/y coordinates in returned entries', () => {
    const grid = makeGrid();
    grid.insert(42, 77, { id: 'test-payload' });
    const [entry] = grid.query(42, 77, 1);
    expect(entry).toBeDefined();
    expect(entry!.x).toBe(42);
    expect(entry!.y).toBe(77);
    expect((entry!.payload as { id: string }).id).toBe('test-payload');
  });

  it('handles multiple points in the same cell', () => {
    const grid = makeGrid(1000);
    grid.insert(10, 10, 'p1');
    grid.insert(20, 20, 'p2');
    grid.insert(30, 30, 'p3');
    const results = grid.query(20, 20, 50);
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it('handles points spread across different cells', () => {
    const grid = makeGrid(500);
    // Points in 4 different cells
    grid.insert(0, 0, 'q1');
    grid.insert(600, 0, 'q2');
    grid.insert(0, 600, 'q3');
    grid.insert(600, 600, 'q4');
    // Query centred at origin with radius 50 — only q1 in range
    const results = grid.query(0, 0, 50);
    const payloads = results.map((r) => r.payload);
    expect(payloads).toContain('q1');
    expect(payloads).not.toContain('q2');
    expect(payloads).not.toContain('q3');
    expect(payloads).not.toContain('q4');
  });

  it('handles negative coordinates', () => {
    const grid = makeGrid(500);
    grid.insert(-250, -250, 'neg');
    const results = grid.query(-250, -250, 10);
    expect(results).toHaveLength(1);
    expect(results[0]!.payload).toBe('neg');
  });

  it('returns all points when radius spans many cells', () => {
    const grid = makeGrid(500);
    const coords = [
      [0, 0], [600, 0], [-600, 0], [0, 600], [0, -600],
    ];
    for (const [x, y] of coords) grid.insert(x!, y!, `${x},${y}`);
    const results = grid.query(0, 0, 700);
    expect(results).toHaveLength(5);
  });
});

// ─── clear() ────────────────────────────────────────────────────────────────

describe('SpatialGrid — clear()', () => {
  it('removes all entries after clear()', () => {
    const grid = makeGrid();
    grid.insert(0, 0, 'A');
    grid.insert(10, 10, 'B');
    grid.clear();
    expect(grid.query(0, 0, 100)).toHaveLength(0);
    expect(grid.cellCount).toBe(0);
  });

  it('can be re-populated after clear()', () => {
    const grid = makeGrid();
    grid.insert(0, 0, 'old');
    grid.clear();
    grid.insert(0, 0, 'new');
    const results = grid.query(0, 0, 1);
    expect(results).toHaveLength(1);
    expect(results[0]!.payload).toBe('new');
  });
});

// ─── large-scale / performance ────────────────────────────────────────────────

describe('SpatialGrid — large-scale and performance', () => {
  /**
   * T-2D-SNAP-001-perf: Insert 10,000 points on a 100×100 grid and query a
   * small area. Verify:
   *   1. Only nearby points are returned (correctness at scale)
   *   2. The spatial query is substantially faster than an O(n) linear scan
   */
  it('returns only nearby points from 10,000-point dataset', () => {
    const grid = makeGrid(500);
    const N = 10_000;
    const SIDE = 100;
    const STEP = 1000; // world units between points

    // Lay out N points on an evenly spaced grid
    for (let i = 0; i < SIDE; i++) {
      for (let j = 0; j < SIDE; j++) {
        grid.insert(i * STEP, j * STEP, i * SIDE + j);
      }
    }

    const qx = 50_000;
    const qy = 50_000;
    const radius = 600; // just over one grid step — should capture ~4 neighbours

    const results = grid.query(qx, qy, radius);

    // Verify all returned points are actually within radius
    for (const { x, y } of results) {
      expect(dist(x, y, qx, qy)).toBeLessThanOrEqual(radius);
    }

    // Sanity: at least the exact-centre point should be returned
    expect(results.length).toBeGreaterThan(0);

    // Verify we did NOT return all 10,000 points
    expect(results.length).toBeLessThan(N);
  });

  it('spatial query is significantly faster than a linear scan over 60,000+ points', () => {
    const CELL = 500;
    const SIDE = 250;   // 250×250 = 62,500 points — large enough that O(n) dominates
    const STEP = 1000;

    // Build the spatial index
    const grid = new SpatialGrid(CELL);
    const allPoints: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < SIDE; i++) {
      for (let j = 0; j < SIDE; j++) {
        const x = i * STEP;
        const y = j * STEP;
        grid.insert(x, y, null);
        allPoints.push({ x, y });
      }
    }

    const qx = 125_000;
    const qy = 125_000;
    const radius = 600;  // small radius → spatial visits ~16 cells; linear scans all 62,500
    const REPS = 200;

    // Time the spatial query
    const t0 = performance.now();
    for (let r = 0; r < REPS; r++) {
      grid.query(qx, qy, radius);
    }
    const spatialMs = performance.now() - t0;

    // Time a naive O(n) linear scan
    const t1 = performance.now();
    for (let r = 0; r < REPS; r++) {
      allPoints.filter((p) => dist(p.x, p.y, qx, qy) <= radius);
    }
    const linearMs = performance.now() - t1;

    // At 62,500 points the spatial grid visits ~16 cells vs 62,500 for linear.
    // Require a modest 3× speedup — reliable even under test-runner noise.
    expect(spatialMs).toBeLessThan(linearMs / 3);
  });
});

// ─── edge cases ──────────────────────────────────────────────────────────────

describe('SpatialGrid — edge cases', () => {
  it('throws when constructed with zero cellSize', () => {
    expect(() => new SpatialGrid(0)).toThrow(RangeError);
  });

  it('throws when constructed with negative cellSize', () => {
    expect(() => new SpatialGrid(-1)).toThrow(RangeError);
  });

  it('works with very small cell size', () => {
    const grid = new SpatialGrid(1);
    grid.insert(0, 0, 'tiny');
    expect(grid.query(0, 0, 0.5)).toHaveLength(1);
  });

  it('works with very large cell size', () => {
    const grid = new SpatialGrid(1_000_000);
    grid.insert(0, 0, 'huge-cell');
    grid.insert(999_999, 999_999, 'same-huge-cell');
    const results = grid.query(500_000, 500_000, 1_000_000);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('handles radius of zero (exact-point lookup)', () => {
    const grid = makeGrid();
    grid.insert(50, 50, 'exact');
    grid.insert(51, 50, 'near');
    const results = grid.query(50, 50, 0);
    expect(results).toHaveLength(1);
    expect(results[0]!.payload).toBe('exact');
  });

  it('can store arbitrary payload types', () => {
    const grid = makeGrid();
    const obj = { type: 'endpoint', elementId: 'abc' };
    grid.insert(10, 20, obj);
    const [entry] = grid.query(10, 20, 1);
    expect(entry!.payload).toBe(obj);
  });
});
