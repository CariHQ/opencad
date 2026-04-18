/**
 * T-COMP-001: Compliance Rule Engine Tests
 *
 * Tests for the local building code compliance engine that checks
 * DocumentSchema against IBC / residential code rules.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect } from 'vitest';
import {
  runComplianceCheck,
  COMPLIANCE_RULES,
} from './complianceEngine';
import type { DocumentSchema, ElementSchema } from '@opencad/document';
expect.extend(jestDomMatchers);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_META = {
  id: 'el',
  createdAt: 0,
  updatedAt: 0,
  createdBy: 'test',
  version: { clock: {} },
};

const BASE_TRANSFORM = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const BASE_BBOX = {
  min: { _type: 'Point3D' as const, x: 0, y: 0, z: 0 },
  max: { _type: 'Point3D' as const, x: 1, y: 1, z: 1 },
};

function makeElement(
  id: string,
  type: ElementSchema['type'],
  numProps: Record<string, number> = {},
  boolProps: Record<string, boolean> = {},
  strProps: Record<string, string> = {},
): ElementSchema {
  const properties: ElementSchema['properties'] = {};
  for (const [k, v] of Object.entries(numProps)) {
    properties[k] = { type: 'number', value: v };
  }
  for (const [k, v] of Object.entries(boolProps)) {
    properties[k] = { type: 'boolean', value: v };
  }
  for (const [k, v] of Object.entries(strProps)) {
    properties[k] = { type: 'string', value: v };
  }
  return {
    id,
    type,
    properties,
    propertySets: [],
    geometry: { type: 'brep', data: {} },
    layerId: 'layer-1',
    levelId: null,
    transform: BASE_TRANSFORM,
    boundingBox: BASE_BBOX,
    metadata: { ...BASE_META, id },
    visible: true,
    locked: false,
  };
}

function makeDoc(elements: ElementSchema[] = [], spaces: Record<string, { id: string; name: string; area: number; volume: number; levelId: string; boundaries: string[] }> = {}): DocumentSchema {
  const elMap: Record<string, ElementSchema> = {};
  for (const el of elements) {
    elMap[el.id] = el;
  }
  return {
    id: 'doc-test',
    name: 'Test Document',
    version: { clock: {} },
    metadata: { createdAt: 0, updatedAt: 0, createdBy: 'test', schemaVersion: '1.0.0' },
    content: { elements: elMap, spaces },
    organization: { layers: {}, levels: {} },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
  };
}

// ---------------------------------------------------------------------------
// T-COMP-001: Core engine behaviour
// ---------------------------------------------------------------------------

describe('T-COMP-001: Compliance rule engine', () => {
  it('returns empty array for empty document', () => {
    const doc = makeDoc();
    const violations = runComplianceCheck(doc);
    expect(violations).toEqual([]);
  });

  it('each violation has a ruleId and message', () => {
    // A door below minimum width triggers R001
    const door = makeElement('door-1', 'door', { Width: 700 });
    const doc = makeDoc([door]);
    const violations = runComplianceCheck(doc);
    expect(violations.length).toBeGreaterThan(0);
    for (const v of violations) {
      expect(v.ruleId).toBeTruthy();
      expect(v.message).toBeTruthy();
    }
  });

  it('groups violations by severity — errors present when door is too narrow', () => {
    const door = makeElement('door-narrow', 'door', { Width: 600 });
    const doc = makeDoc([door]);
    const violations = runComplianceCheck(doc);
    const errors = violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// R001: Minimum door width (810 mm / ADA)
// ---------------------------------------------------------------------------

describe('T-COMP-001: R001 — Minimum door width', () => {
  it('detects door below minimum width', () => {
    const door = makeElement('door-small', 'door', { Width: 700 });
    const doc = makeDoc([door]);
    const violations = runComplianceCheck(doc);
    const r001 = violations.filter((v) => v.ruleId === 'R001');
    expect(r001.length).toBeGreaterThan(0);
    expect(r001[0].elementId).toBe('door-small');
    expect(r001[0].severity).toBe('error');
    expect(r001[0].message).toContain('700');
  });

  it('passes check for compliant door (width = 900 mm)', () => {
    const door = makeElement('door-ok', 'door', { Width: 900 });
    const doc = makeDoc([door]);
    const violations = runComplianceCheck(doc);
    const r001 = violations.filter((v) => v.ruleId === 'R001');
    expect(r001).toHaveLength(0);
  });

  it('passes check for door with default width (no Width property)', () => {
    // Default 900 mm assumed when Width not set — should be compliant
    const door = makeElement('door-default', 'door');
    const doc = makeDoc([door]);
    const violations = runComplianceCheck(doc);
    const r001 = violations.filter((v) => v.ruleId === 'R001');
    expect(r001).toHaveLength(0);
  });

  it('violation includes suggestedFix', () => {
    const door = makeElement('door-tiny', 'door', { Width: 500 });
    const doc = makeDoc([door]);
    const violations = runComplianceCheck(doc);
    const r001 = violations.filter((v) => v.ruleId === 'R001');
    expect(r001[0].suggestedFix).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// R002: Minimum ceiling height (2400 mm)
// ---------------------------------------------------------------------------

describe('T-COMP-001: R002 — Minimum ceiling height', () => {
  it('detects ceiling height violation on a space element', () => {
    const space = makeElement('room-1', 'space', { CeilingHeight: 2000 });
    const doc = makeDoc([space]);
    const violations = runComplianceCheck(doc);
    const r002 = violations.filter((v) => v.ruleId === 'R002');
    expect(r002.length).toBeGreaterThan(0);
    expect(r002[0].elementId).toBe('room-1');
    expect(r002[0].severity).toBe('error');
  });

  it('passes check for compliant ceiling height (2400 mm)', () => {
    const space = makeElement('room-ok', 'space', { CeilingHeight: 2400 });
    const doc = makeDoc([space]);
    const violations = runComplianceCheck(doc);
    const r002 = violations.filter((v) => v.ruleId === 'R002');
    expect(r002).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// R003: Stair riser height (max 196 mm)
// ---------------------------------------------------------------------------

describe('T-COMP-001: R003 — Stair riser height', () => {
  it('detects stair riser height violation', () => {
    const stair = makeElement('stair-1', 'stair', { RiserHeight: 220 });
    const doc = makeDoc([stair]);
    const violations = runComplianceCheck(doc);
    const r003 = violations.filter((v) => v.ruleId === 'R003');
    expect(r003.length).toBeGreaterThan(0);
    expect(r003[0].elementId).toBe('stair-1');
  });

  it('passes check for compliant stair riser (175 mm)', () => {
    const stair = makeElement('stair-ok', 'stair', { RiserHeight: 175 });
    const doc = makeDoc([stair]);
    const violations = runComplianceCheck(doc);
    const r003 = violations.filter((v) => v.ruleId === 'R003');
    expect(r003).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// R004: Hallway minimum width (900 mm)
// ---------------------------------------------------------------------------

describe('T-COMP-001: R004 — Hallway minimum width', () => {
  it('detects hallway below minimum width', () => {
    const hall = makeElement('hall-1', 'space', { Width: 800 }, {}, { spaceType: 'corridor' });
    const doc = makeDoc([hall]);
    const violations = runComplianceCheck(doc);
    const r004 = violations.filter((v) => v.ruleId === 'R004');
    expect(r004.length).toBeGreaterThan(0);
    expect(r004[0].elementId).toBe('hall-1');
  });

  it('passes check for compliant hallway width (1000 mm)', () => {
    const hall = makeElement('hall-ok', 'space', { Width: 1000 }, {}, { spaceType: 'hallway' });
    const doc = makeDoc([hall]);
    const violations = runComplianceCheck(doc);
    const r004 = violations.filter((v) => v.ruleId === 'R004');
    expect(r004).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// R005: Window area >= 10% of floor area
// ---------------------------------------------------------------------------

describe('T-COMP-001: R005 — Window to floor area ratio', () => {
  it('detects insufficient window area', () => {
    const win = makeElement('win-1', 'window', { Area: 0.5, FloorArea: 20 });
    const doc = makeDoc([win]);
    const violations = runComplianceCheck(doc);
    const r005 = violations.filter((v) => v.ruleId === 'R005');
    expect(r005.length).toBeGreaterThan(0);
    expect(r005[0].severity).toBe('warning');
  });

  it('passes check for compliant window area ratio', () => {
    const win = makeElement('win-ok', 'window', { Area: 3, FloorArea: 20 });
    const doc = makeDoc([win]);
    const violations = runComplianceCheck(doc);
    const r005 = violations.filter((v) => v.ruleId === 'R005');
    expect(r005).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// R006: Minimum habitable room area (7 sqm)
// ---------------------------------------------------------------------------

describe('T-COMP-001: R006 — Minimum habitable room area', () => {
  it('detects room below 7 sqm', () => {
    const room = makeElement('room-tiny', 'space', { Area: 5 }, {}, { spaceType: 'bedroom' });
    const doc = makeDoc([room]);
    const violations = runComplianceCheck(doc);
    const r006 = violations.filter((v) => v.ruleId === 'R006');
    expect(r006.length).toBeGreaterThan(0);
    expect(r006[0].elementId).toBe('room-tiny');
    expect(r006[0].severity).toBe('error');
  });

  it('passes check for compliant room area (10 sqm)', () => {
    const room = makeElement('room-ok', 'space', { Area: 10 }, {}, { spaceType: 'bedroom' });
    const doc = makeDoc([room]);
    const violations = runComplianceCheck(doc);
    const r006 = violations.filter((v) => v.ruleId === 'R006');
    expect(r006).toHaveLength(0);
  });

  it('non-habitable space types are not checked for room area', () => {
    // A storage room at 3 sqm should NOT trigger R006
    const room = makeElement('storage-1', 'space', { Area: 3 }, {}, { spaceType: 'storage' });
    const doc = makeDoc([room]);
    const violations = runComplianceCheck(doc);
    const r006 = violations.filter((v) => v.ruleId === 'R006');
    expect(r006).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// COMPLIANCE_RULES export
// ---------------------------------------------------------------------------

describe('COMPLIANCE_RULES array', () => {
  it('exports at least 6 rules', () => {
    expect(COMPLIANCE_RULES.length).toBeGreaterThanOrEqual(6);
  });

  it('each rule has id, name, category, severity, and check function', () => {
    for (const rule of COMPLIANCE_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(rule.severity).toMatch(/^(error|warning|info)$/);
      expect(typeof rule.check).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// Multiple violations in one document
// ---------------------------------------------------------------------------

describe('T-COMP-001: Multiple violations', () => {
  it('detects multiple violation types in a single document', () => {
    const narrowDoor = makeElement('door-narrow', 'door', { Width: 600 });
    const lowCeiling = makeElement('room-low', 'space', { CeilingHeight: 1800 });
    const tinyRoom = makeElement('room-tiny', 'space', { Area: 4 }, {}, { spaceType: 'bedroom' });
    const doc = makeDoc([narrowDoor, lowCeiling, tinyRoom]);
    const violations = runComplianceCheck(doc);
    const ruleIds = new Set(violations.map((v) => v.ruleId));
    expect(ruleIds.size).toBeGreaterThanOrEqual(3);
  });
});
