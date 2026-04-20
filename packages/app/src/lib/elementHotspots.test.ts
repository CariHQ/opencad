/**
 * T-MOD-027 hotspot tests (GitHub issue #320).
 *
 *   T-MOD-027-001 — wall returns 3 hotspots
 *   T-MOD-027-002 — slab with 4 vertices returns 8 hotspots (4 + 4 midpoints)
 *   T-MOD-027-003 — vertex apply patches StartX/StartY
 *   T-MOD-027-004 — midpoint apply translates both endpoints
 *   T-MOD-027-005 — slab edge midpoint translates its two endpoints
 */
import { describe, it, expect } from 'vitest';
import type { ElementSchema } from '@opencad/document';
import { hotspotsFor } from './elementHotspots';

function wall(x1: number, y1: number, x2: number, y2: number): ElementSchema {
  return {
    id: 'w', type: 'wall', layerId: 'l',
    properties: {
      StartX: { type: 'number', value: x1 }, StartY: { type: 'number', value: y1 },
      EndX:   { type: 'number', value: x2 }, EndY:   { type: 'number', value: y2 },
    },
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}
function slab(points: Array<{ x: number; y: number }>): ElementSchema {
  return {
    id: 's', type: 'slab', layerId: 'l',
    properties: { Points: { type: 'string', value: JSON.stringify(points) } },
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

describe('T-MOD-027: hotspots', () => {
  it('T-MOD-027-001: wall returns 3 hotspots (start, end, midpoint)', () => {
    const h = hotspotsFor(wall(0, 0, 1000, 0));
    expect(h).toHaveLength(3);
    expect(h.map((x) => x.kind)).toEqual(['vertex', 'vertex', 'segment-midpoint']);
  });

  it('T-MOD-027-002: 4-vertex slab returns 8 hotspots', () => {
    const h = hotspotsFor(slab([
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    ]));
    expect(h).toHaveLength(8);
    expect(h.filter((x) => x.kind === 'vertex')).toHaveLength(4);
    expect(h.filter((x) => x.kind === 'edge-midpoint')).toHaveLength(4);
  });

  it('T-MOD-027-003: wall start-vertex apply patches StartX/StartY', () => {
    const h = hotspotsFor(wall(0, 0, 1000, 0));
    const patch = h[0]!.apply({ x: 50, y: 10 });
    expect(patch.StartX?.value).toBe(50);
    expect(patch.StartY?.value).toBe(10);
    expect(patch.EndX).toBeUndefined();
  });

  it('T-MOD-027-004: wall midpoint apply translates both endpoints', () => {
    const h = hotspotsFor(wall(0, 0, 1000, 0));
    const mid = h.find((x) => x.kind === 'segment-midpoint')!;
    const patch = mid.apply({ x: 100, y: 200 });
    expect(patch.StartX?.value).toBe(100);
    expect(patch.StartY?.value).toBe(200);
    expect(patch.EndX?.value).toBe(1100);
    expect(patch.EndY?.value).toBe(200);
  });

  it('T-MOD-027-005: slab edge midpoint apply moves its two endpoints', () => {
    const h = hotspotsFor(slab([
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    ]));
    const edge = h.filter((x) => x.kind === 'edge-midpoint')[0]!;  // (0,0)→(100,0)
    const patch = edge.apply({ x: 0, y: -20 });
    const nextPoints = JSON.parse(patch.Points?.value as string);
    expect(nextPoints[0]).toEqual({ x: 0, y: -20 });
    expect(nextPoints[1]).toEqual({ x: 100, y: -20 });
    // Non-edge vertices stay put
    expect(nextPoints[2]).toEqual({ x: 100, y: 100 });
    expect(nextPoints[3]).toEqual({ x: 0, y: 100 });
  });

  it('element types without hotspots return []', () => {
    expect(hotspotsFor(
      { id: 'd', type: 'door', layerId: 'l', properties: {},
        boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        createdAt: 0, updatedAt: 0 } as ElementSchema,
    )).toEqual([]);
  });
});
