/**
 * T-ANA-044 clash rule tests (GitHub issue #337).
 *
 *   T-ANA-044-001 — candidatePairs for wall + pipe rule finds one pair
 *   T-ANA-044-003 — no elements matching either filter → zero pairs
 *   T-ANA-044-006 — setClashStatus transitions lifecycle
 */
import { describe, it, expect } from 'vitest';
import type { ElementSchema } from '@opencad/document';
import {
  matchesFilter, candidatePairs, setClashStatus, DEFAULT_CLASH_RULES,
  type ClashRule, type Clash,
} from './clashRules';

let __id = 0;
function mk(type: ElementSchema['type'], props: Record<string, number | string> = {}): ElementSchema {
  const propObj: Record<string, { type: string; value: unknown }> = {};
  for (const [k, v] of Object.entries(props)) {
    propObj[k] = { type: typeof v === 'number' ? 'number' : 'string', value: v };
  }
  return {
    id: `e-${++__id}`, type, layerId: 'l',
    properties: propObj,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1000, y: 1000, z: 3000 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

describe('T-ANA-044: clash rules', () => {
  it('T-ANA-044-001: wall + pipe rule finds one candidate pair', () => {
    const rule: ClashRule = {
      id: 'r1', name: 'test', setA: { types: ['wall'] }, setB: { types: ['pipe'] as unknown as string[] },
      tolerance: 50, severity: 'critical', enabled: true,
    };
    const wall = mk('wall', {});
    const pipe = { ...mk('wall', {}), type: 'pipe' } as ElementSchema;
    const pairs = candidatePairs(rule, [wall, pipe]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]![0]!.id).toBe(wall.id);
    expect(pairs[0]![1]!.id).toBe(pipe.id);
  });

  it('T-ANA-044-003: no matches in either filter → zero pairs', () => {
    const rule: ClashRule = DEFAULT_CLASH_RULES[0]!;
    const pairs = candidatePairs(rule, [mk('door'), mk('window')]);
    expect(pairs).toHaveLength(0);
  });

  it('matchesFilter material predicate filters on property', () => {
    const w = mk('wall', { Material: 'Concrete' });
    expect(matchesFilter(w, { types: ['wall'], materials: ['Concrete'] })).toBe(true);
    expect(matchesFilter(w, { types: ['wall'], materials: ['Plasterboard'] })).toBe(false);
  });

  it('matchesFilter where predicate ">" comparison', () => {
    const w = mk('wall', { Height: 3500 });
    expect(matchesFilter(w, { where: [{ key: 'Height', op: '>', value: 3000 }] })).toBe(true);
    expect(matchesFilter(w, { where: [{ key: 'Height', op: '<', value: 3000 }] })).toBe(false);
  });

  it('T-ANA-044-006: setClashStatus transitions lifecycle', () => {
    const clash: Clash = {
      id: 'c1', ruleId: 'r1', elementIdA: 'a', elementIdB: 'b',
      point: { x: 0, y: 0, z: 0 }, status: 'new', createdAt: 0,
    };
    expect(setClashStatus(clash, 'resolved').status).toBe('resolved');
    // Original is unmodified
    expect(clash.status).toBe('new');
  });

  it('DEFAULT_CLASH_RULES has 3 starter rules', () => {
    expect(DEFAULT_CLASH_RULES).toHaveLength(3);
    expect(DEFAULT_CLASH_RULES[0]!.name).toBe('Structure vs MEP');
  });
});
