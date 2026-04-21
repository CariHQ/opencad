/**
 * T-MOD-018 morph op tests (GitHub issue #311).
 *
 *   T-MOD-018-001 — seed box has 8 vertices, 6 faces
 *   T-MOD-018-002 — push-pull +1 on +Z face adds 0 vertices, preserves face count
 *   T-MOD-018-003 — bevel one edge adds 2 vertices + 1 face
 *   T-MOD-018-005 — extrude face creates 1 side face per edge
 */
import { describe, it, expect } from 'vitest';
import {
  seedBox, pushPullFace, moveVertex, bevelEdge, splitFace, extrudeFace,
} from './morphOps';

describe('T-MOD-018: morph ops', () => {
  it('T-MOD-018-001: seed box has 8 vertices and 6 faces', () => {
    const m = seedBox();
    expect(m.vertices).toHaveLength(8);
    expect(m.faces).toHaveLength(6);
    // 12 unique edges (each quad has 4 edges, each shared between 2 faces = 24 / 2)
    const edges = new Set<string>();
    for (const f of m.faces) {
      for (let i = 0; i < f.length; i++) {
        const a = f[i]!, b = f[(i + 1) % f.length]!;
        edges.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
      }
    }
    expect(edges.size).toBe(12);
  });

  it('T-MOD-018-002: push-pull +Z face by 1000 moves 4 vertices, face count stays 6', () => {
    const m = seedBox({ x: 1000, y: 1000, z: 1000 });
    const pulled = pushPullFace(m, 1, { x: 0, y: 0, z: 1000 });
    expect(pulled.vertices).toHaveLength(8);
    expect(pulled.faces).toHaveLength(6);
    // The 4 top vertices should have moved by +Z 1000
    const topIds = pulled.faces[1]!;
    for (const id of topIds) {
      expect(pulled.vertices[id]!.z).toBe(2000);
    }
  });

  it('moveVertex translates only the target', () => {
    const m = seedBox();
    const out = moveVertex(m, 0, { x: 0.5, y: 0, z: 0 });
    expect(out.vertices[0]).toEqual({ x: 0.5, y: 0, z: 0 });
    expect(out.vertices[1]).toEqual(m.vertices[1]);
  });

  it('T-MOD-018-003: bevelEdge adds 2 vertices + 1 chamfer face', () => {
    const m = seedBox();
    // Bevel edge between vertices 0 and 1 (bottom-front edge, length 1)
    const out = bevelEdge(m, [0, 1], 0.1);
    expect(out.vertices.length).toBe(m.vertices.length + 2);
    expect(out.faces.length).toBeGreaterThanOrEqual(m.faces.length + 1);
  });

  it('splitFace divides a quad along a non-adjacent pair', () => {
    const m = seedBox();
    // Bottom face has indices [0, 3, 2, 1]. Split between 0 and 2
    // (diagonal, non-adjacent in the face list [0,3,2,1]).
    const out = splitFace(m, 0, 0, 2);
    expect(out.faces.length).toBe(m.faces.length + 1);
  });

  it('splitFace on adjacent vertices is a no-op', () => {
    const m = seedBox();
    // In face [0,3,2,1], 0 and 3 are adjacent.
    const out = splitFace(m, 0, 0, 3);
    expect(out.faces.length).toBe(m.faces.length);
  });

  it('T-MOD-018-005: extrudeFace creates 1 side face per edge of the extruded face', () => {
    const m = seedBox();
    const out = extrudeFace(m, 1, { x: 0, y: 0, z: 1 });   // extrude top
    // Original 6 faces + 4 side faces = 10
    expect(out.faces.length).toBe(m.faces.length + 4);
    // Added 4 new vertices (duplicates of the top face)
    expect(out.vertices.length).toBe(m.vertices.length + 4);
  });
});
