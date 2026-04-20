/**
 * T-ANA-043 structural export tests (GitHub issue #336).
 *
 *   T-ANA-043-001 — column produces a line + 2 joints
 *   T-ANA-043-002 — beam connects two columns; shared joints
 *   T-ANA-043-003 — slab polygon becomes an area element
 *   T-ANA-043-004 — non-structural wall is excluded
 */
import { describe, it, expect } from 'vitest';
import type { DocumentSchema, ElementSchema } from '@opencad/document';
import { buildAnalyticalModel, exportAnalyticalCSV } from './structuralExport';

let __id = 0;
function mk(type: ElementSchema['type'], props: Record<string, number | string> = {}): ElementSchema {
  const propObj: Record<string, { type: string; value: unknown }> = {};
  for (const [k, v] of Object.entries(props)) {
    propObj[k] = { type: typeof v === 'number' ? 'number' : 'string', value: v };
  }
  return {
    id: `e-${++__id}`, type, layerId: 'l',
    properties: propObj,
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

describe('T-ANA-043: structural export', () => {
  it('T-ANA-043-001: a column produces one line + 2 joints', () => {
    const col = mk('column', { X: 0, Y: 0, Height: 3000 });
    const m = buildAnalyticalModel(mkDoc([col]));
    expect(m.lines).toHaveLength(1);
    expect(m.joints).toHaveLength(2);
    expect(m.lines[0]!.kind).toBe('column');
  });

  it('T-ANA-043-002: beam between two columns shares end joints with them', () => {
    const c1 = mk('column', { X: 0, Y: 0, Height: 3000 });
    const c2 = mk('column', { X: 5000, Y: 0, Height: 3000 });
    const b  = mk('beam',   { StartX: 0, StartY: 0, EndX: 5000, EndY: 0, ElevationOffset: 3000 });
    const m = buildAnalyticalModel(mkDoc([c1, c2, b]));
    // Each column adds 2 joints but beam endpoints coincide with column tops
    // → total joints ≤ 4
    expect(m.joints.length).toBeLessThanOrEqual(4);
    expect(m.lines).toHaveLength(3);  // 2 columns + 1 beam
  });

  it('T-ANA-043-003: slab polygon becomes an area element', () => {
    const s = mk('slab', {
      Points: JSON.stringify([{x:0,y:0},{x:5000,y:0},{x:5000,y:5000},{x:0,y:5000}]),
      ElevationOffset: 0, Thickness: 200,
    });
    const m = buildAnalyticalModel(mkDoc([s]));
    expect(m.areas).toHaveLength(1);
    expect(m.areas[0]!.kind).toBe('slab');
    expect(m.areas[0]!.vertices).toHaveLength(4);
  });

  it('T-ANA-043-004: non-structural wall is excluded', () => {
    const w = mk('wall', { StartX: 0, StartY: 0, EndX: 5000, EndY: 0, Height: 3000 });
    const m = buildAnalyticalModel(mkDoc([w]));
    expect(m.areas).toHaveLength(0);
  });

  it('wall tagged Structural=true IS included', () => {
    const w = mk('wall', {
      StartX: 0, StartY: 0, EndX: 5000, EndY: 0, Height: 3000, Structural: 'true',
    });
    const m = buildAnalyticalModel(mkDoc([w]));
    expect(m.areas).toHaveLength(1);
    expect(m.areas[0]!.kind).toBe('wall');
  });

  it('morph element is flagged as unsupported', () => {
    const morph = mk('morph' as ElementSchema['type']);
    const m = buildAnalyticalModel(mkDoc([morph]));
    expect(m.unsupportedSourceIds).toContain(morph.id);
  });

  it('exportAnalyticalCSV emits a header row', () => {
    const m = { joints: [], lines: [], areas: [], unsupportedSourceIds: [] };
    const csv = exportAnalyticalCSV(m);
    expect(csv.split('\n')[0]).toContain('entity,id');
  });
});
