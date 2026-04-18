/**
 * Canvas Pipeline Tests — T-RENDER-RUST
 * Tests for ElementBatch, pickElement, fitViewport,
 * triangulateCircle, triangulateArc, computeFaceNormals, computeSmoothNormals.
 */
import { describe, it, expect } from 'vitest';
import {
  ElementBatch,
  snapToGrid,
  pickElement,
  fitViewport,
  triangulateCircle,
  triangulateArc,
  computeFaceNormals,
  computeSmoothNormals,
} from './canvas-pipeline';

// ── ElementBatch (existing behaviour) ────────────────────────────────────────

describe('ElementBatch', () => {
  it('push + len', () => {
    const b = new ElementBatch();
    b.push(1, 0, 0, 10, 10);
    b.push(2, 20, 20, 30, 30);
    expect(b.len()).toBe(2);
  });

  it('clear resets the batch', () => {
    const b = new ElementBatch();
    b.push(1, 0, 0, 10, 10);
    b.clear();
    expect(b.len()).toBe(0);
  });

  it('cullVisible — element inside frustum is visible', () => {
    const b = new ElementBatch();
    b.push(1, 0, 0, 10, 10);
    b.push(2, 500, 500, 510, 510);
    const vis = b.cullVisible(0, 0, 100, 100);
    expect(Array.from(vis)).toEqual([1]);
  });

  it('cullVisible — partial overlap included', () => {
    const b = new ElementBatch();
    b.push(1, -5, -5, 5, 5);
    const vis = b.cullVisible(0, 0, 100, 100);
    expect(Array.from(vis)).toContain(1);
  });

  it('transformToScreen — identity transform', () => {
    const b = new ElementBatch();
    b.push(1, 10, 20, 30, 40);
    // scale=1, pan=(0,0), canvas=100×100 → screen = world + canvas/2
    const vt = new Float32Array([1, 0, 0, 100, 100]);
    const out = b.transformToScreen(vt);
    expect(out[0]).toBeCloseTo(60, 3); // 10 - 0 / 1 + 50 = 60
    expect(out[1]).toBeCloseTo(70, 3);
    expect(out[2]).toBeCloseTo(80, 3);
    expect(out[3]).toBeCloseTo(90, 3);
  });

  it('transformToScreen — zero scale returns zeroes', () => {
    const b = new ElementBatch();
    b.push(1, 10, 20, 30, 40);
    const vt = new Float32Array([0, 0, 0, 100, 100]);
    const out = b.transformToScreen(vt);
    expect(Array.from(out)).toEqual([0, 0, 0, 0]);
  });
});

// ── snapToGrid ────────────────────────────────────────────────────────────────

describe('snapToGrid', () => {
  it('snaps to nearest grid point', () => {
    const [x, y] = snapToGrid(7.3, 4.9, 5);
    expect(x).toBeCloseTo(5, 3);
    expect(y).toBeCloseTo(5, 3);
  });

  it('snaps up when past midpoint', () => {
    const [x] = snapToGrid(8, 0, 5);
    expect(x).toBeCloseTo(10, 3);
  });

  it('gridSize=0 returns unchanged coords', () => {
    expect(snapToGrid(3.7, 9.1, 0)).toEqual([3.7, 9.1]);
  });
});

// ── pickElement ───────────────────────────────────────────────────────────────

describe('pickElement', () => {
  it('returns id of hit element', () => {
    const b = new ElementBatch();
    b.push(42, 0, 0, 10, 10);
    b.push(99, 20, 20, 30, 30);
    expect(pickElement(b, 5, 5)).toBe(42);
    expect(pickElement(b, 25, 25)).toBe(99);
  });

  it('returns 0 when nothing is hit', () => {
    const b = new ElementBatch();
    b.push(1, 0, 0, 10, 10);
    expect(pickElement(b, 50, 50)).toBe(0);
  });

  it('smallest AABB wins on overlap', () => {
    const b = new ElementBatch();
    b.push(1, 0, 0, 100, 100);   // large outer box
    b.push(2, 40, 40, 60, 60);   // small inner box
    expect(pickElement(b, 50, 50)).toBe(2);
  });

  it('empty batch returns 0', () => {
    const b = new ElementBatch();
    expect(pickElement(b, 0, 0)).toBe(0);
  });
});

// ── fitViewport ───────────────────────────────────────────────────────────────

describe('fitViewport', () => {
  it('empty batch returns identity transform', () => {
    const b = new ElementBatch();
    const [scale, panX, panY] = fitViewport(b, 800, 600, 0);
    expect(scale).toBe(1);
    expect(panX).toBe(0);
    expect(panY).toBe(0);
  });

  it('single element centred at correct pan', () => {
    const b = new ElementBatch();
    b.push(1, 0, 0, 100, 100);
    const [scale, panX, panY] = fitViewport(b, 400, 400, 0);
    // world 100×100 in 400×400 → scale = 100/400 = 0.25
    expect(scale).toBeCloseTo(0.25, 4);
    expect(panX).toBeCloseTo(50, 4); // centre of [0,100]
    expect(panY).toBeCloseTo(50, 4);
  });

  it('wider world uses scale that fits narrower axis', () => {
    const b = new ElementBatch();
    b.push(1, 0, 0, 200, 100); // 200×100 in 400×400
    const [scale] = fitViewport(b, 400, 400, 0);
    // scale_x = 200/400 = 0.5 > scale_y = 100/400 = 0.25 → scale = 0.5
    expect(scale).toBeCloseTo(0.5, 4);
  });

  it('margin reduces available space', () => {
    const b = new ElementBatch();
    b.push(1, 0, 0, 100, 100);
    const [withMargin] = fitViewport(b, 400, 400, 50);   // avail = 300×300
    const [noMargin]   = fitViewport(b, 400, 400, 0);
    expect(withMargin).toBeGreaterThan(noMargin); // more zoom-out needed
  });
});

// ── triangulateCircle ─────────────────────────────────────────────────────────

describe('triangulateCircle', () => {
  it('returns segments × 9 floats', () => {
    const verts = triangulateCircle(0, 0, 5, 12);
    expect(verts.length).toBe(12 * 9);
  });

  it('clamps to minimum 3 segments', () => {
    const verts = triangulateCircle(0, 0, 1, 1);
    expect(verts.length).toBe(3 * 9);
  });

  it('all outer vertices are within radius', () => {
    const cx = 10, cy = 20, r = 3;
    const verts = triangulateCircle(cx, cy, r, 32);
    const floatArr = Array.from(verts);
    for (let i = 0; i < floatArr.length; i += 3) {
      const dx = floatArr[i]! - cx;
      const dy = floatArr[i + 1]! - cy;
      expect(Math.sqrt(dx*dx + dy*dy)).toBeLessThanOrEqual(r + 1e-4);
    }
  });

  it('z component equals provided z value', () => {
    const verts = triangulateCircle(0, 0, 1, 4, 7);
    for (let i = 2; i < verts.length; i += 3) {
      expect(verts[i]).toBeCloseTo(7, 4);
    }
  });
});

// ── triangulateArc ────────────────────────────────────────────────────────────

describe('triangulateArc', () => {
  it('returns segments × 9 floats', () => {
    const verts = triangulateArc(0, 0, 1, 0, Math.PI, 6);
    expect(verts.length).toBe(6 * 9);
  });

  it('full circle via arc equals full triangulateCircle', () => {
    const circle = triangulateCircle(0, 0, 5, 8);
    const arc    = triangulateArc(0, 0, 5, 0, 2 * Math.PI, 8);
    expect(circle.length).toBe(arc.length);
    for (let i = 0; i < circle.length; i++) {
      expect(circle[i]).toBeCloseTo(arc[i]!, 4);
    }
  });
});

// ── computeFaceNormals ────────────────────────────────────────────────────────

describe('computeFaceNormals', () => {
  it('XY-plane triangle produces (0,0,1) face normal', () => {
    const verts = new Float32Array([0,0,0, 1,0,0, 0.5,1,0]);
    const normals = computeFaceNormals(verts);
    expect(normals.length).toBe(9);
    // All 3 vertices get the same face normal
    for (let k = 0; k < 3; k++) {
      expect(normals[k * 3 + 0]).toBeCloseTo(0, 4);
      expect(normals[k * 3 + 1]).toBeCloseTo(0, 4);
      expect(normals[k * 3 + 2]).toBeCloseTo(1, 4);
    }
  });

  it('output same length as input', () => {
    const verts = new Float32Array(18); // 2 triangles
    const normals = computeFaceNormals(verts);
    expect(normals.length).toBe(18);
  });

  it('degenerate triangle falls back to z-up normal', () => {
    const verts = new Float32Array([1,1,1, 1,1,1, 1,1,1]);
    const normals = computeFaceNormals(verts);
    expect(normals[2]).toBeCloseTo(1, 4); // nz = 1
  });

  it('normals are unit vectors', () => {
    const verts = new Float32Array([0,0,0, 3,0,0, 0,4,0]); // 3-4-5 right triangle in XY
    const normals = computeFaceNormals(verts);
    const nx = normals[0]!, ny = normals[1]!, nz = normals[2]!;
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
    expect(len).toBeCloseTo(1, 4);
  });
});

// ── computeSmoothNormals ──────────────────────────────────────────────────────

describe('computeSmoothNormals', () => {
  it('same length as input', () => {
    const verts = new Float32Array([0,0,0, 1,0,0, 0.5,1,0]);
    const normals = computeSmoothNormals(verts);
    expect(normals.length).toBe(verts.length);
  });

  it('single flat triangle produces z-up normals', () => {
    const verts = new Float32Array([0,0,0, 1,0,0, 0.5,1,0]);
    const normals = computeSmoothNormals(verts);
    for (let k = 0; k < 3; k++) {
      expect(normals[k * 3 + 2]).toBeCloseTo(1, 3);
    }
  });
});
