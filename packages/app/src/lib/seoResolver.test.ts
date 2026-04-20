/**
 * T-GEO-001 SEO resolver tests (GitHub issue #295).
 *
 * Cases:
 *   T-GEO-001-001 — wall inside roof polygon → one wall-roof-clip op
 *   T-GEO-001-002 — wall outside roof → no op
 *   T-GEO-001-003 — changing ElevationOffset is a deterministic re-resolve
 *   T-GEO-001-004 — stair matching slab elevation → slab-stair-cut
 *   T-GEO-001-005 — removing either side removes the op
 *   T-GEO-001-006 — beam-column-trim fires for a column on the beam line
 *   T-GEO-001-007 — trimBeamAtColumns shortens the beam to column faces
 */
import { describe, it, expect } from 'vitest';
import type { DocumentSchema, ElementSchema } from '@opencad/document';
import { resolveOperations, trimBeamAtColumns } from './seoResolver';

let __id = 0;
function mkEl(type: ElementSchema['type'], props: Record<string, number | string>): ElementSchema {
  const id = `e-${++__id}`;
  const propObj: Record<string, { type: string; value: unknown }> = {};
  for (const [k, v] of Object.entries(props)) {
    propObj[k] = { type: typeof v === 'number' ? 'number' : 'string', value: v };
  }
  return {
    id, type, layerId: 'l1', properties: propObj,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

function mkDoc(els: ElementSchema[]): DocumentSchema {
  const elements: Record<string, ElementSchema> = {};
  for (const e of els) elements[e.id] = e;
  return {
    id: 'doc', name: 't', version: { clock: {} },
    metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u1', schemaVersion: '1' },
    content: { elements, spaces: {} },
    organization: { layers: {}, levels: {} },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
  } as DocumentSchema;
}

describe('T-GEO-001: SEO resolver', () => {
  it('T-GEO-001-001: wall inside a roof polygon yields exactly one wall-roof-clip op', () => {
    const wall = mkEl('wall', { StartX: 0, StartY: 0, EndX: 5000, EndY: 0 });
    // A 10×10m roof polygon centred at origin
    const roof = mkEl('roof', {
      Points: JSON.stringify([
        { x: -5000, y: -5000 }, { x: 5000, y: -5000 },
        { x: 5000, y: 5000 },   { x: -5000, y: 5000 },
      ]),
      Thickness: 250,
    });
    const ops = resolveOperations(mkDoc([wall, roof]));
    const wallRoofOps = ops.filter((o) => o.kind === 'wall-roof-clip');
    expect(wallRoofOps).toHaveLength(1);
    expect(wallRoofOps[0]!.targetId).toBe(wall.id);
    expect(wallRoofOps[0]!.operatorId).toBe(roof.id);
  });

  it('T-GEO-001-002: wall whose midpoint is outside the roof polygon yields no op', () => {
    const wall = mkEl('wall', { StartX: 10000, StartY: 10000, EndX: 15000, EndY: 10000 });
    const roof = mkEl('roof', {
      Points: JSON.stringify([
        { x: -5000, y: -5000 }, { x: 5000, y: -5000 },
        { x: 5000, y: 5000 },   { x: -5000, y: 5000 },
      ]),
    });
    const ops = resolveOperations(mkDoc([wall, roof]));
    expect(ops.filter((o) => o.kind === 'wall-roof-clip')).toHaveLength(0);
  });

  it('T-GEO-001-003: resolver is deterministic across repeated calls', () => {
    const wall = mkEl('wall', { StartX: 0, StartY: 0, EndX: 5000, EndY: 0 });
    const roof = mkEl('roof', {
      Points: JSON.stringify([
        { x: -5000, y: -5000 }, { x: 5000, y: -5000 },
        { x: 5000, y: 5000 },   { x: -5000, y: 5000 },
      ]),
    });
    const doc = mkDoc([wall, roof]);
    const a = resolveOperations(doc).map((o) => o.id).sort();
    const b = resolveOperations(doc).map((o) => o.id).sort();
    expect(a).toEqual(b);
  });

  it('T-GEO-001-004: stair whose ElevationOffset matches the slab top-plane yields slab-stair-cut', () => {
    const slab = mkEl('slab', {
      Points: JSON.stringify([{x:0,y:0},{x:5000,y:0},{x:5000,y:5000},{x:0,y:5000}]),
      ElevationOffset: 0, Thickness: 200,
    });
    const stair = mkEl('stair', { X: 500, Y: 500, Width: 1200, Length: 3000, ElevationOffset: 200 });
    const ops = resolveOperations(mkDoc([slab, stair]));
    const ssc = ops.filter((o) => o.kind === 'slab-stair-cut');
    expect(ssc).toHaveLength(1);
    expect(ssc[0]!.operatorId).toBe(stair.id);
    expect(ssc[0]!.targetId).toBe(slab.id);
  });

  it('T-GEO-001-005: removing the operator element removes the op', () => {
    const wall = mkEl('wall', { StartX: 0, StartY: 0, EndX: 5000, EndY: 0 });
    const roof = mkEl('roof', {
      Points: JSON.stringify([
        { x: -5000, y: -5000 }, { x: 5000, y: -5000 },
        { x: 5000, y: 5000 },   { x: -5000, y: 5000 },
      ]),
    });
    const withBoth = mkDoc([wall, roof]);
    expect(resolveOperations(withBoth).length).toBeGreaterThan(0);
    const withoutRoof = mkDoc([wall]);
    expect(resolveOperations(withoutRoof)).toHaveLength(0);
  });

  it('T-GEO-001-006: beam-column-trim fires for a column at the beam end', () => {
    const beam = mkEl('beam', { StartX: 0, StartY: 0, EndX: 5000, EndY: 0, Width: 200, Height: 400 });
    const col  = mkEl('column', { X: 5000, Y: 0, Diameter: 400 });
    const ops = resolveOperations(mkDoc([beam, col]));
    expect(ops.filter((o) => o.kind === 'beam-column-trim')).toHaveLength(1);
  });

  it('T-GEO-001-007: trimBeamAtColumns shortens a beam to the column face', () => {
    const beam = mkEl('beam', { StartX: 0, StartY: 0, EndX: 5000, EndY: 0 });
    const col  = mkEl('column', { X: 5000, Y: 0, Diameter: 400 });
    const trimmed = trimBeamAtColumns(beam, [col]);
    expect(trimmed.start.x).toBeCloseTo(0, 1);
    // Column radius = 200, so beam should stop at 5000 - 200 = 4800
    expect(trimmed.end.x).toBeCloseTo(4800, 1);
  });

  it('trim leaves a standalone beam alone', () => {
    const beam = mkEl('beam', { StartX: 0, StartY: 0, EndX: 5000, EndY: 0 });
    const trimmed = trimBeamAtColumns(beam, []);
    expect(trimmed.start.x).toBe(0);
    expect(trimmed.end.x).toBe(5000);
  });
});
