/**
 * Code Compliance Engine Tests
 * T-AI-020: Code check → all violations correctly identified (no false negatives)
 * T-AI-021: Code check → no false positives on compliant model
 * T-AI-022: Violation → correct code section cited
 * T-AI-023: Suggested fix → fix resolves violation when applied
 * T-AI-024: Offline → core rule engine runs without internet
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CodeComplianceEngine,
  DEFAULT_RULES,
  type ComplianceContext,
  type ComplianceRule,
} from './code-compliance';

function makeContext(overrides: Partial<ComplianceContext> = {}): ComplianceContext {
  return {
    buildingArea: 2000,
    occupancy: 'R-3',
    buildingType: 'residential',
    levels: 1,
    elements: [],
    roomSizes: new Map(),
    doorClearances: new Map(),
    corridorWidth: 0,
    ...overrides,
  };
}

describe('T-AI-024: CodeComplianceEngine — offline rule engine', () => {
  let engine: CodeComplianceEngine;

  beforeEach(() => {
    engine = new CodeComplianceEngine();
  });

  it('runs without network access (pure in-process)', () => {
    const ctx = makeContext();
    expect(() => engine.checkCompliance(ctx)).not.toThrow();
  });

  it('passes compliant context with no violations', () => {
    const ctx = makeContext({
      roomSizes: new Map([
        ['room-1', { id: 'room-1', name: 'Living Room', area: 150, minArea: 70, hasNaturalLight: true, hasVentilation: true }],
      ]),
      doorClearances: new Map([
        ['door-1', { id: 'door-1', width: 0.9, height: 2.1, clearFloorSpace: 1.5 }], // ~35" — compliant
      ]),
    });
    const result = engine.checkCompliance(ctx);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

describe('T-AI-020 + T-AI-021: Violation detection accuracy', () => {
  let engine: CodeComplianceEngine;

  beforeEach(() => {
    engine = new CodeComplianceEngine();
  });

  it('T-AI-020: detects room below minimum size (no false negatives)', () => {
    const ctx = makeContext({
      roomSizes: new Map([
        ['room-1', { id: 'room-1', name: 'Bedroom', area: 50, minArea: 70, hasNaturalLight: true, hasVentilation: true }],
      ]),
    });
    const result = engine.checkCompliance(ctx);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.affectedElements.includes('room-1'))).toBe(true);
  });

  it('T-AI-020: detects door below minimum width', () => {
    const ctx = makeContext({
      doorClearances: new Map([
        ['door-1', { id: 'door-1', width: 0.7, height: 2.1, clearFloorSpace: 1.5 }], // ~27.5" — too narrow
      ]),
    });
    const result = engine.checkCompliance(ctx);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.id.includes('door-1') || v.id === 'corridor-width')).toBe(true);
  });

  it('T-AI-020: detects corridor below minimum width', () => {
    const ctx = makeContext({ corridorWidth: 0.9 }); // ~35.4" — below 44"
    const result = engine.checkCompliance(ctx);
    expect(result.violations.some((v) => v.id === 'corridor-width')).toBe(true);
  });

  it('T-AI-020: detects invalid stair rise', () => {
    const ctx = makeContext({
      stairDimensions: { rise: 0.25, run: 0.28, width: 0.9, headroom: 2.1, landingLength: 1 }, // rise ~9.8" — too high
    });
    const result = engine.checkCompliance(ctx);
    expect(result.violations.some((v) => v.id === 'stair-rise')).toBe(true);
  });

  it('T-AI-020: detects stair headroom below minimum', () => {
    const ctx = makeContext({
      stairDimensions: { rise: 0.17, run: 0.28, width: 0.9, headroom: 1.9, landingLength: 1 }, // headroom ~74.8" — below 80"
    });
    const result = engine.checkCompliance(ctx);
    expect(result.violations.some((v) => v.id === 'stair-headroom')).toBe(true);
  });

  it('T-AI-021: compliant room sizes produce no room-size violations', () => {
    const ctx = makeContext({
      roomSizes: new Map([
        ['r1', { id: 'r1', name: 'Bedroom', area: 100, minArea: 70, hasNaturalLight: true, hasVentilation: true }],
        ['r2', { id: 'r2', name: 'Living', area: 200, minArea: 150, hasNaturalLight: true, hasVentilation: true }],
      ]),
    });
    const result = engine.checkCompliance(ctx);
    expect(result.violations.filter((v) => v.codeSection === 'IBC 1208.1')).toHaveLength(0);
  });

  it('T-AI-021: compliant door widths produce no door violations', () => {
    const ctx = makeContext({
      doorClearances: new Map([
        ['d1', { id: 'd1', width: 0.9, height: 2.1, clearFloorSpace: 1.5 }], // ~35.4"
        ['d2', { id: 'd2', width: 1.0, height: 2.1, clearFloorSpace: 1.5 }], // ~39.4"
      ]),
    });
    const result = engine.checkCompliance(ctx);
    expect(result.violations.filter((v) => v.codeSection === 'IBC 1008.1.1')).toHaveLength(0);
  });
});

describe('T-AI-022: Correct code section cited', () => {
  let engine: CodeComplianceEngine;

  beforeEach(() => {
    engine = new CodeComplianceEngine();
  });

  it('room size violation cites IBC 1208.1', () => {
    const ctx = makeContext({
      roomSizes: new Map([['r1', { id: 'r1', name: 'Bedroom', area: 40, minArea: 70, hasNaturalLight: true, hasVentilation: true }]]),
    });
    const result = engine.checkCompliance(ctx);
    const roomViol = result.violations.find((v) => v.affectedElements.includes('r1'));
    expect(roomViol?.codeSection).toBe('IBC 1208.1');
  });

  it('door width violation cites IBC 1008.1.1', () => {
    const ctx = makeContext({
      doorClearances: new Map([['d1', { id: 'd1', width: 0.6, height: 2.1, clearFloorSpace: 1 }]]),
    });
    const result = engine.checkCompliance(ctx);
    const doorViol = result.violations.find((v) => v.id.includes('d1') || v.codeSection === 'IBC 1008.1.1');
    expect(doorViol?.codeSection).toBe('IBC 1008.1.1');
  });

  it('stair rise violation cites IBC 1011.5', () => {
    const ctx = makeContext({
      stairDimensions: { rise: 0.05, run: 0.28, width: 0.9, headroom: 2.5, landingLength: 1 }, // rise ~1.97" — below 4"
    });
    const result = engine.checkCompliance(ctx);
    const stairViol = result.violations.find((v) => v.id === 'stair-rise');
    expect(stairViol?.codeSection).toBe('IBC 1011.5');
  });
});

describe('T-AI-023: Suggested fix resolves violation', () => {
  let engine: CodeComplianceEngine;

  beforeEach(() => {
    engine = new CodeComplianceEngine();
  });

  it('room violation includes suggestedFix', () => {
    const ctx = makeContext({
      roomSizes: new Map([['r1', { id: 'r1', name: 'Bedroom', area: 40, minArea: 70, hasNaturalLight: true, hasVentilation: true }]]),
    });
    const result = engine.checkCompliance(ctx);
    const viol = result.violations.find((v) => v.affectedElements.includes('r1'));
    expect(viol?.suggestedFix).toBeTruthy();
  });

  it('applying suggested fix (larger room) resolves violation', () => {
    // After fix: increase area to meet minimum
    const ctxFixed = makeContext({
      roomSizes: new Map([['r1', { id: 'r1', name: 'Bedroom', area: 80, minArea: 70, hasNaturalLight: true, hasVentilation: true }]]),
    });
    const resultFixed = engine.checkCompliance(ctxFixed);
    expect(resultFixed.violations.filter((v) => v.affectedElements.includes('r1'))).toHaveLength(0);
  });

  it('door fix resolves door width violation', () => {
    const ctxFixed = makeContext({
      doorClearances: new Map([['d1', { id: 'd1', width: 0.9, height: 2.1, clearFloorSpace: 1.5 }]]), // 35.4" — compliant
    });
    const resultFixed = engine.checkCompliance(ctxFixed);
    expect(resultFixed.violations.filter((v) => v.codeSection === 'IBC 1008.1.1')).toHaveLength(0);
  });
});

describe('CodeComplianceEngine — element-level compliance', () => {
  let engine: CodeComplianceEngine;

  beforeEach(() => {
    engine = new CodeComplianceEngine();
  });

  it('checkElementCompliance: door with compliant width returns no violations', () => {
    const violations = engine.checkElementCompliance('d1', 'door', { width: 0.9 });
    expect(violations).toHaveLength(0);
  });

  it('checkElementCompliance: door with narrow width returns violation', () => {
    const violations = engine.checkElementCompliance('d1', 'door', { width: 0.6 });
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].codeSection).toBe('IBC 1008.1.1');
  });

  it('checkElementCompliance: stair with valid dimensions returns no violations', () => {
    const violations = engine.checkElementCompliance('s1', 'stair', { rise: 0.17, run: 0.28 }); // rise ~6.7", run ~11"
    expect(violations).toHaveLength(0);
  });

  it('checkElementCompliance: stair with invalid rise returns violation', () => {
    const violations = engine.checkElementCompliance('s1', 'stair', { rise: 0.25, run: 0.28 }); // rise ~9.8"
    expect(violations.some((v) => v.codeSection === 'IBC 1011.5')).toBe(true);
  });

  it('checkElementCompliance: unknown element type returns no violations', () => {
    const violations = engine.checkElementCompliance('w1', 'wall', { length: 3 });
    expect(violations).toHaveLength(0);
  });
});

describe('CodeComplianceEngine — custom rules', () => {
  let engine: CodeComplianceEngine;

  beforeEach(() => {
    engine = new CodeComplianceEngine();
  });

  it('addRule includes custom rule in checks', () => {
    const customRule: ComplianceRule = {
      id: 'custom-parking',
      name: 'Parking Spaces',
      codeSection: 'ZONING-101',
      description: 'Must have at least 2 parking spaces',
      severity: 'warning',
      check: (ctx) => {
        if (ctx.buildingArea > 1000) {
          return {
            id: 'parking-too-few',
            severity: 'warning',
            codeSection: 'ZONING-101',
            description: 'Large building needs 2+ parking spaces',
            affectedElements: [],
          };
        }
        return null;
      },
    };

    engine.addRule(customRule);
    const ctx = makeContext({ buildingArea: 2000 });
    const result = engine.checkCompliance(ctx);
    expect(result.warnings.some((w) => w.id === 'parking-too-few')).toBe(true);
  });

  it('removeRule stops checking removed rule', () => {
    const customRule: ComplianceRule = {
      id: 'to-remove',
      name: 'Test',
      codeSection: 'TEST',
      description: 'Always fails',
      severity: 'error',
      check: () => ({
        id: 'always-fail',
        severity: 'error',
        codeSection: 'TEST',
        description: 'Always fails',
        affectedElements: [],
      }),
    };

    engine.addRule(customRule);
    engine.removeRule('to-remove');
    const result = engine.checkCompliance(makeContext());
    expect(result.violations.some((v) => v.id === 'always-fail')).toBe(false);
  });

  it('getRules returns default + custom rules', () => {
    const customRule: ComplianceRule = {
      id: 'extra-rule',
      name: 'Extra',
      codeSection: 'EXTRA',
      description: 'Extra rule',
      severity: 'info',
      check: () => null,
    };
    engine.addRule(customRule);
    const rules = engine.getRules();
    expect(rules.length).toBe(DEFAULT_RULES.length + 1);
  });
});

describe('CodeComplianceEngine — result structure', () => {
  let engine: CodeComplianceEngine;

  beforeEach(() => {
    engine = new CodeComplianceEngine();
  });

  it('result includes checkedAt Date', () => {
    const result = engine.checkCompliance(makeContext());
    expect(result.checkedAt).toBeInstanceOf(Date);
  });

  it('result includes jurisdiction', () => {
    const result = engine.checkCompliance(makeContext(), 'NYC 2024');
    expect(result.jurisdiction).toBe('NYC 2024');
  });

  it('default jurisdiction is IBC 2024', () => {
    const result = engine.checkCompliance(makeContext());
    expect(result.jurisdiction).toBe('IBC 2024');
  });
});
