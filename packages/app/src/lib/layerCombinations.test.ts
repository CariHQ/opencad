/**
 * T-VIZ-014 layer combos + overrides tests (GitHub issue #307).
 *
 *   T-VIZ-014-001 — visibleLayerIds returns only visible layers
 *   T-VIZ-014-003 — resolveStyle applies matching override
 *   T-VIZ-014-004 — multiple overrides merge in priority order
 *   T-VIZ-014-005 — unmatched element → default (empty) style
 */
import { describe, it, expect } from 'vitest';
import type { ElementSchema } from '@opencad/document';
import {
  visibleLayerIds, resolveStyle, DEFAULT_COMBINATIONS,
  type LayerCombination, type GraphicOverride,
} from './layerCombinations';

let __id = 0;
function mk(type: ElementSchema['type'], props: Record<string, string | number> = {}): ElementSchema {
  const p: Record<string, { type: string; value: unknown }> = {};
  for (const [k, v] of Object.entries(props)) p[k] = { type: typeof v === 'number' ? 'number' : 'string', value: v };
  return {
    id: `e-${++__id}`, type, layerId: 'l',
    properties: p,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

describe('T-VIZ-014: layer combos + overrides', () => {
  it('T-VIZ-014-001: visibleLayerIds returns only visible layers', () => {
    const combo: LayerCombination = {
      id: 'c', name: 't',
      layers: {
        a: { visible: true,  locked: false },
        b: { visible: false, locked: false },
        c: { visible: true,  locked: true },
      },
    };
    expect(visibleLayerIds(combo)).toEqual(['a', 'c']);
  });

  it('T-VIZ-014-003: resolveStyle on matching type returns override style', () => {
    const w = mk('wall');
    const override: GraphicOverride = {
      id: 'o', name: 'structural-red', priority: 1,
      filter: { types: ['wall'] },
      style: { strokeColor: '#ff0000' },
      enabled: true,
    };
    expect(resolveStyle(w, [override]).strokeColor).toBe('#ff0000');
  });

  it('T-VIZ-014-004: multiple overrides merge in priority order', () => {
    const w = mk('wall', { Material: 'Concrete' });
    const overrides: GraphicOverride[] = [
      { id: 'a', name: 'walls red',     priority: 1, filter: { types: ['wall'] }, style: { strokeColor: '#ff0000', opacity: 0.5 }, enabled: true },
      { id: 'b', name: 'concrete blue', priority: 2, filter: { materials: ['Concrete'] }, style: { strokeColor: '#0000ff' }, enabled: true },
    ];
    const s = resolveStyle(w, overrides);
    // Higher-priority override wins for conflicting strokeColor
    expect(s.strokeColor).toBe('#0000ff');
    // Opacity from the lower-priority override is preserved
    expect(s.opacity).toBe(0.5);
  });

  it('T-VIZ-014-005: element matching no override returns empty style', () => {
    const d = mk('door');
    const override: GraphicOverride = {
      id: 'o', name: 'walls', priority: 1,
      filter: { types: ['wall'] },
      style: { strokeColor: '#ff0000' },
      enabled: true,
    };
    expect(resolveStyle(d, [override])).toEqual({});
  });

  it('disabled override is ignored', () => {
    const w = mk('wall');
    const override: GraphicOverride = {
      id: 'o', name: 'x', priority: 1,
      filter: { types: ['wall'] },
      style: { strokeColor: '#ff0000' },
      enabled: false,
    };
    expect(resolveStyle(w, [override])).toEqual({});
  });

  it('where predicate filters by property', () => {
    const tall = mk('wall', { Height: 4500 });
    const short = mk('wall', { Height: 2400 });
    const override: GraphicOverride = {
      id: 'o', name: 'tall-only', priority: 1,
      filter: { where: [{ key: 'Height', op: '>', value: 3000 }] },
      style: { strokeColor: '#ffff00' },
      enabled: true,
    };
    expect(resolveStyle(tall, [override]).strokeColor).toBe('#ffff00');
    expect(resolveStyle(short, [override]).strokeColor).toBeUndefined();
  });

  it('DEFAULT_COMBINATIONS lists 3 starter combos', () => {
    expect(DEFAULT_COMBINATIONS).toHaveLength(3);
    expect(DEFAULT_COMBINATIONS.map((c) => c.id)).toContain('combo-all');
  });
});
