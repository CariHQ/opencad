/**
 * Building Code Compliance Engine Tests — DocumentSchema-based rule engine
 * T-AI-020: No false negatives — all violations identified
 * T-AI-021: No false positives on compliant model
 * T-AI-022: Violation → correct code section cited
 * T-AI-023: Suggested fix resolves violation when applied
 * T-AI-024: Offline — core rule engine runs without internet
 */
import { describe, it, expect, vi } from 'vitest';
import { checkCompliance, applyFix } from './codeCompliance';
import type { ComplianceReport, Violation } from './codeCompliance';
import type { DocumentSchema } from './types/document';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makePropertyValue(value: number): { type: 'number'; value: number } {
  return { type: 'number', value };
}

function makeStringValue(value: string): { type: 'string'; value: string } {
  return { type: 'string', value };
}

function baseSchema(): DocumentSchema {
  return {
    id: 'proj-test',
    name: 'Test Project',
    version: { clock: {} },
    metadata: { createdAt: 0, updatedAt: 0, createdBy: 'test', schemaVersion: '1.0.0' },
    content: { elements: {}, spaces: {} },
    organization: { layers: {}, levels: {} },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
  };
}

/**
 * Schema with 4 known violations:
 * 1. Bedroom of 6 m² (below IBC 1208.3 minimum of 7.43 m²)
 * 2. Corridor of 0.7 m width (below IBC 1005.1 minimum of 0.9 m)
 * 3. Egress door of 0.7 m width (below IBC 1010.1.1 minimum of 0.813 m)
 * 4. Habitable room ceiling height of 2.1 m (below IBC 1208.2 minimum of 2.29 m)
 */
function violatingSchema(): DocumentSchema {
  const schema = baseSchema();
  schema.content.elements = {
    'bedroom-1': {
      id: 'bedroom-1',
      type: 'space',
      properties: {
        spaceType: makeStringValue('bedroom'),
        area: makePropertyValue(6),    // 6 m² — violates IBC 1208.3 (min 7.43 m²)
        height: makePropertyValue(2.8),
        width: makePropertyValue(0),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: 'layer-0',
      levelId: 'level-0',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 1, y: 1, z: 1, _type: 'Point3D' },
      },
      metadata: {
        id: 'bedroom-1', createdBy: 'test', createdAt: 0, updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    },
    'corridor-1': {
      id: 'corridor-1',
      type: 'space',
      properties: {
        spaceType: makeStringValue('corridor'),
        width: makePropertyValue(0.7),  // 0.7 m — violates IBC 1005.1 (min 0.9 m)
        area: makePropertyValue(5),
        height: makePropertyValue(2.8),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: 'layer-0',
      levelId: 'level-0',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 1, y: 1, z: 1, _type: 'Point3D' },
      },
      metadata: {
        id: 'corridor-1', createdBy: 'test', createdAt: 0, updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    },
    'door-egress-1': {
      id: 'door-egress-1',
      type: 'door',
      properties: {
        width: makePropertyValue(0.7),  // 0.7 m — violates IBC 1010.1.1 (min 0.813 m)
        isEgress: { type: 'boolean', value: true },
        height: makePropertyValue(2.1),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: 'layer-0',
      levelId: 'level-0',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 1, y: 1, z: 1, _type: 'Point3D' },
      },
      metadata: {
        id: 'door-egress-1', createdBy: 'test', createdAt: 0, updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    },
    'room-low-ceiling': {
      id: 'room-low-ceiling',
      type: 'space',
      properties: {
        spaceType: makeStringValue('bedroom'),
        area: makePropertyValue(12),
        height: makePropertyValue(2.1),  // 2.1 m — violates IBC 1208.2 (min 2.29 m)
        width: makePropertyValue(0),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: 'layer-0',
      levelId: 'level-0',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 1, y: 1, z: 1, _type: 'Point3D' },
      },
      metadata: {
        id: 'room-low-ceiling', createdBy: 'test', createdAt: 0, updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    },
  };
  return schema;
}

/**
 * Schema where all dimensions meet IBC minimums.
 */
function compliantSchema(): DocumentSchema {
  const schema = baseSchema();
  schema.content.elements = {
    'bedroom-ok': {
      id: 'bedroom-ok',
      type: 'space',
      properties: {
        spaceType: makeStringValue('bedroom'),
        area: makePropertyValue(9),     // 9 m² — above 7.43 m² minimum
        height: makePropertyValue(2.5), // 2.5 m — above 2.29 m minimum
        width: makePropertyValue(0),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: 'layer-0',
      levelId: 'level-0',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 1, y: 1, z: 1, _type: 'Point3D' },
      },
      metadata: {
        id: 'bedroom-ok', createdBy: 'test', createdAt: 0, updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    },
    'corridor-ok': {
      id: 'corridor-ok',
      type: 'space',
      properties: {
        spaceType: makeStringValue('corridor'),
        width: makePropertyValue(1.0),  // 1.0 m — above 0.9 m minimum
        area: makePropertyValue(8),
        height: makePropertyValue(2.5),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: 'layer-0',
      levelId: 'level-0',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 1, y: 1, z: 1, _type: 'Point3D' },
      },
      metadata: {
        id: 'corridor-ok', createdBy: 'test', createdAt: 0, updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    },
    'door-egress-ok': {
      id: 'door-egress-ok',
      type: 'door',
      properties: {
        width: makePropertyValue(0.9),  // 0.9 m — above 0.813 m minimum
        isEgress: { type: 'boolean', value: true },
        height: makePropertyValue(2.1),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: 'layer-0',
      levelId: 'level-0',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 1, y: 1, z: 1, _type: 'Point3D' },
      },
      metadata: {
        id: 'door-egress-ok', createdBy: 'test', createdAt: 0, updatedAt: 0,
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    },
  };
  return schema;
}

// ---------------------------------------------------------------------------
// T-AI-020: No false negatives — all violations identified
// ---------------------------------------------------------------------------

describe('T-AI-020: No false negatives', () => {
  it('detects bedroom area violation (6 m² < 7.43 m²)', () => {
    const report: ComplianceReport = checkCompliance(violatingSchema());
    const violation = report.violations.find(
      (v) => v.elementId === 'bedroom-1' && v.ruleId === 'IBC-1208.3'
    );
    expect(violation).toBeDefined();
  });

  it('detects corridor width violation (0.7 m < 0.9 m)', () => {
    const report: ComplianceReport = checkCompliance(violatingSchema());
    const violation = report.violations.find(
      (v) => v.elementId === 'corridor-1' && v.ruleId === 'IBC-1005.1'
    );
    expect(violation).toBeDefined();
  });

  it('detects egress door width violation (0.7 m < 0.813 m)', () => {
    const report: ComplianceReport = checkCompliance(violatingSchema());
    const violation = report.violations.find(
      (v) => v.elementId === 'door-egress-1' && v.ruleId === 'IBC-1010.1.1'
    );
    expect(violation).toBeDefined();
  });

  it('detects ceiling height violation (2.1 m < 2.29 m)', () => {
    const report: ComplianceReport = checkCompliance(violatingSchema());
    const violation = report.violations.find(
      (v) => v.elementId === 'room-low-ceiling' && v.ruleId === 'IBC-1208.2'
    );
    expect(violation).toBeDefined();
  });

  it('returns all 4 violations from violatingSchema (no false negatives)', () => {
    const report: ComplianceReport = checkCompliance(violatingSchema());
    const ruleIds = report.violations.map((v) => v.ruleId);
    expect(ruleIds).toContain('IBC-1208.3');
    expect(ruleIds).toContain('IBC-1005.1');
    expect(ruleIds).toContain('IBC-1010.1.1');
    expect(ruleIds).toContain('IBC-1208.2');
    expect(report.violations.length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// T-AI-021: No false positives on compliant model
// ---------------------------------------------------------------------------

describe('T-AI-021: No false positives on compliant model', () => {
  it('checkCompliance(compliantSchema).violations is empty', () => {
    const report: ComplianceReport = checkCompliance(compliantSchema());
    expect(report.violations).toHaveLength(0);
    expect(report.compliant).toBe(true);
  });

  it('empty schema has no violations', () => {
    const report: ComplianceReport = checkCompliance(baseSchema());
    expect(report.violations).toHaveLength(0);
    expect(report.compliant).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-AI-022: Correct code section cited
// ---------------------------------------------------------------------------

describe('T-AI-022: Correct code sections cited', () => {
  it('bedroom area violation cites IBC Section 1208.3', () => {
    const report: ComplianceReport = checkCompliance(violatingSchema());
    const v = report.violations.find((v) => v.elementId === 'bedroom-1' && v.ruleId === 'IBC-1208.3');
    expect(v?.section).toBe('IBC Section 1208.3');
  });

  it('corridor width violation cites IBC Section 1005.1', () => {
    const report: ComplianceReport = checkCompliance(violatingSchema());
    const v = report.violations.find((v) => v.elementId === 'corridor-1' && v.ruleId === 'IBC-1005.1');
    expect(v?.section).toBe('IBC Section 1005.1');
  });

  it('egress door width violation cites IBC Section 1010.1.1', () => {
    const report: ComplianceReport = checkCompliance(violatingSchema());
    const v = report.violations.find((v) => v.elementId === 'door-egress-1' && v.ruleId === 'IBC-1010.1.1');
    expect(v?.section).toBe('IBC Section 1010.1.1');
  });

  it('ceiling height violation cites IBC Section 1208.2', () => {
    const report: ComplianceReport = checkCompliance(violatingSchema());
    const v = report.violations.find((v) => v.elementId === 'room-low-ceiling' && v.ruleId === 'IBC-1208.2');
    expect(v?.section).toBe('IBC Section 1208.2');
  });
});

// ---------------------------------------------------------------------------
// T-AI-023: Suggested fix resolves violation when applied
// ---------------------------------------------------------------------------

describe('T-AI-023: Suggested fix resolves violation', () => {
  it('applyFix for bedroom area expands room to minimum and removes violation', () => {
    const schema = violatingSchema();
    const report = checkCompliance(schema);
    const violation = report.violations.find(
      (v) => v.elementId === 'bedroom-1' && v.ruleId === 'IBC-1208.3'
    ) as Violation;

    const fixed = applyFix(schema, violation);
    const reportAfterFix = checkCompliance(fixed);
    const stillViolating = reportAfterFix.violations.find(
      (v) => v.elementId === 'bedroom-1' && v.ruleId === 'IBC-1208.3'
    );
    expect(stillViolating).toBeUndefined();
  });

  it('applyFix for corridor width widens corridor to minimum and removes violation', () => {
    const schema = violatingSchema();
    const report = checkCompliance(schema);
    const violation = report.violations.find(
      (v) => v.elementId === 'corridor-1' && v.ruleId === 'IBC-1005.1'
    ) as Violation;

    const fixed = applyFix(schema, violation);
    const reportAfterFix = checkCompliance(fixed);
    const stillViolating = reportAfterFix.violations.find(
      (v) => v.elementId === 'corridor-1' && v.ruleId === 'IBC-1005.1'
    );
    expect(stillViolating).toBeUndefined();
  });

  it('applyFix returns a new schema (immutable — original unchanged)', () => {
    const schema = violatingSchema();
    const report = checkCompliance(schema);
    const violation = report.violations.find(
      (v) => v.elementId === 'bedroom-1' && v.ruleId === 'IBC-1208.3'
    ) as Violation;

    const fixed = applyFix(schema, violation);
    expect(fixed).not.toBe(schema);
    // Original still violates
    const originalReport = checkCompliance(schema);
    expect(originalReport.violations.find((v) => v.elementId === 'bedroom-1')).toBeDefined();
  });

  it('each violation has a suggestedFix string', () => {
    const report = checkCompliance(violatingSchema());
    for (const v of report.violations) {
      expect(typeof v.suggestedFix).toBe('string');
      expect(v.suggestedFix.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// T-AI-024: Offline — core rule engine is purely synchronous, no network
// ---------------------------------------------------------------------------

describe('T-AI-024: Offline — purely synchronous rule engine', () => {
  it('checkCompliance is synchronous (returns ComplianceReport, not Promise)', () => {
    const result = checkCompliance(compliantSchema());
    // If it were async, result would be a Promise and not have .violations directly
    expect(result).not.toBeInstanceOf(Promise);
    expect(Array.isArray(result.violations)).toBe(true);
  });

  it('applyFix is synchronous (returns DocumentSchema, not Promise)', () => {
    const schema = violatingSchema();
    const report = checkCompliance(schema);
    const violation = report.violations.find(
      (v) => v.ruleId === 'IBC-1208.3'
    ) as Violation;
    const result = applyFix(schema, violation);
    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof result.id).toBe('string');
  });

  it('runs correctly when navigator.onLine is mocked to false', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const report = checkCompliance(violatingSchema());
    expect(report.violations.length).toBeGreaterThanOrEqual(4);
    vi.unstubAllGlobals();
  });

  it('all T-AI-020 violations are detected offline (navigator.onLine = false)', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const report = checkCompliance(violatingSchema());
    const ruleIds = report.violations.map((v) => v.ruleId);
    expect(ruleIds).toContain('IBC-1208.3');
    expect(ruleIds).toContain('IBC-1005.1');
    expect(ruleIds).toContain('IBC-1010.1.1');
    expect(ruleIds).toContain('IBC-1208.2');
    vi.unstubAllGlobals();
  });

  it('checkedRules lists all rule IDs that were evaluated', () => {
    const report = checkCompliance(compliantSchema());
    expect(Array.isArray(report.checkedRules)).toBe(true);
    expect(report.checkedRules.length).toBeGreaterThan(0);
    expect(report.checkedRules).toContain('IBC-1208.3');
    expect(report.checkedRules).toContain('IBC-1005.1');
    expect(report.checkedRules).toContain('IBC-1010.1.1');
    expect(report.checkedRules).toContain('IBC-1208.2');
  });
});
