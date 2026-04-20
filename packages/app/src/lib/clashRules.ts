/**
 * Clash detection — rule-based expansion (T-ANA-044, #337).
 *
 * The existing clashDetection module ships a single structural-vs-MEP
 * pass. Real BIM coordinators run multiple named rule sets: architecture-
 * vs-HVAC, plumbing-vs-electrical, etc. This module adds the rule +
 * clash-set data model so a rule engine can run any number of disjoint
 * rule sets and track each clash's lifecycle (new → active → approved →
 * resolved).
 */

import type { ElementSchema } from '@opencad/document';

export interface ElementFilter {
  types?: string[];
  materials?: string[];
  /** Free-form property predicates: { key, op, value }. */
  where?: Array<{ key: string; op: '=' | '!=' | '<' | '<=' | '>' | '>='; value: string | number }>;
}

export interface ClashRule {
  id: string;
  name: string;
  setA: ElementFilter;
  setB: ElementFilter;
  /** mm — pairs closer than this register as a clash. */
  tolerance: number;
  severity: 'critical' | 'moderate' | 'low';
  enabled: boolean;
}

export type ClashStatus = 'new' | 'active' | 'approved' | 'resolved';

export interface Clash {
  id: string;
  ruleId: string;
  elementIdA: string;
  elementIdB: string;
  /** Rough intersection point (world mm). */
  point: { x: number; y: number; z: number };
  status: ClashStatus;
  assignee?: string;
  note?: string;
  createdAt: number;
}

export interface ClashSet {
  id: string;
  name: string;
  ruleIds: string[];
  clashes: Clash[];
  createdAt: number;
}

function getProp(el: ElementSchema, key: string): unknown {
  return (el.properties as Record<string, { value: unknown }>)[key]?.value;
}

/** Test whether an element matches a filter. */
export function matchesFilter(el: ElementSchema, filter: ElementFilter): boolean {
  if (filter.types && !filter.types.includes(el.type)) return false;
  if (filter.materials) {
    const m = getProp(el, 'Material');
    if (typeof m !== 'string' || !filter.materials.includes(m)) return false;
  }
  if (filter.where) {
    for (const pred of filter.where) {
      const v = getProp(el, pred.key);
      if (v === undefined) return false;
      switch (pred.op) {
        case '=':  if (v !== pred.value) return false; break;
        case '!=': if (v === pred.value) return false; break;
        case '<':  if (!(typeof v === 'number' && v < (pred.value as number))) return false; break;
        case '<=': if (!(typeof v === 'number' && v <= (pred.value as number))) return false; break;
        case '>':  if (!(typeof v === 'number' && v > (pred.value as number))) return false; break;
        case '>=': if (!(typeof v === 'number' && v >= (pred.value as number))) return false; break;
      }
    }
  }
  return true;
}

/** Default rules seeded on new projects. */
export const DEFAULT_CLASH_RULES: ClashRule[] = [
  {
    id: 'rule-struct-vs-mep',
    name: 'Structure vs MEP',
    setA: { types: ['wall', 'column', 'beam', 'slab', 'roof'] },
    setB: { types: ['duct', 'pipe', 'conduit', 'cable_tray', 'hvac', 'plumbing'] },
    tolerance: 50, severity: 'critical', enabled: true,
  },
  {
    id: 'rule-arch-vs-hvac',
    name: 'Architecture vs HVAC',
    setA: { types: ['wall', 'slab', 'roof', 'door', 'window'] },
    setB: { types: ['hvac', 'duct'] },
    tolerance: 50, severity: 'moderate', enabled: true,
  },
  {
    id: 'rule-plumb-vs-elec',
    name: 'Plumbing vs Electrical',
    setA: { types: ['plumbing', 'pipe'] },
    setB: { types: ['conduit', 'cable_tray'] },
    tolerance: 25, severity: 'moderate', enabled: true,
  },
];

/**
 * Identify pairs of elements that should be clash-tested under a rule.
 * Pure — does not perform the actual geometric clash test. A geometric
 * kernel is called on each candidate pair by the caller.
 */
export function candidatePairs(
  rule: ClashRule,
  elements: ElementSchema[],
): Array<[ElementSchema, ElementSchema]> {
  const setA = elements.filter((el) => matchesFilter(el, rule.setA));
  const setB = elements.filter((el) => matchesFilter(el, rule.setB));
  const pairs: Array<[ElementSchema, ElementSchema]> = [];
  for (const a of setA) {
    for (const b of setB) {
      if (a.id === b.id) continue;
      pairs.push([a, b]);
    }
  }
  return pairs;
}

/** Transition a clash through its lifecycle. */
export function setClashStatus(clash: Clash, status: ClashStatus): Clash {
  return { ...clash, status };
}
