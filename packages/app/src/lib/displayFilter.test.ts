/**
 * T-VIZ-038 display filter tests (GitHub issue #331).
 *
 *   T-VIZ-038-001 — default (empty filter) shows all
 *   T-VIZ-038-002 — types filter
 *   T-VIZ-038-003 — hide ids
 *   T-VIZ-038-004 — solo ids (precedence over everything)
 */
import { describe, it, expect } from 'vitest';
import type { ElementSchema } from '@opencad/document';
import { applyFilter, isVisible, FILTER_PRESETS } from './displayFilter';

let __id = 0;
function mk(type: ElementSchema['type'], material?: string): ElementSchema {
  const props: Record<string, { type: string; value: unknown }> = {};
  if (material) props.Material = { type: 'string', value: material };
  return {
    id: `e-${++__id}`, type, layerId: 'l',
    properties: props,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

describe('T-VIZ-038: displayFilter', () => {
  it('T-VIZ-038-001: empty filter returns all elements', () => {
    const els = [mk('wall'), mk('door'), mk('slab')];
    expect(applyFilter(els, {})).toHaveLength(3);
  });

  it('T-VIZ-038-002: types filter keeps only matching types', () => {
    const els = [mk('wall'), mk('door'), mk('slab')];
    expect(applyFilter(els, { types: ['wall'] })).toHaveLength(1);
  });

  it('T-VIZ-038-003: hideIds removes listed ids', () => {
    const els = [mk('wall'), mk('wall'), mk('wall')];
    const r = applyFilter(els, { hideIds: [els[1]!.id] });
    expect(r).toHaveLength(2);
    expect(r.some((e) => e.id === els[1]!.id)).toBe(false);
  });

  it('T-VIZ-038-004: soloIds shows only listed ids (wins over types)', () => {
    const w = mk('wall'), d = mk('door'), s = mk('slab');
    const r = applyFilter([w, d, s], { soloIds: [d.id], types: ['wall'] });
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe(d.id);
  });

  it('material filter keeps elements with matching Material', () => {
    const a = mk('wall', 'Concrete'), b = mk('wall', 'Plasterboard');
    const r = applyFilter([a, b], { materials: ['Concrete'] });
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe(a.id);
  });

  it('where predicate = matches', () => {
    const w1 = mk('wall'); (w1.properties as Record<string, { type: string; value: unknown }>).Height = { type: 'number', value: 3000 };
    const w2 = mk('wall'); (w2.properties as Record<string, { type: string; value: unknown }>).Height = { type: 'number', value: 4500 };
    expect(isVisible(w1, { where: [{ key: 'Height', op: '=', value: 3000 }] })).toBe(true);
    expect(isVisible(w2, { where: [{ key: 'Height', op: '=', value: 3000 }] })).toBe(false);
  });

  it('FILTER_PRESETS has "all", "structural", "envelope", "mep"', () => {
    expect(FILTER_PRESETS.map((p) => p.id)).toEqual(['all', 'structural', 'envelope', 'mep']);
  });
});
