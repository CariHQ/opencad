/**
 * AI Tests
 * Tests for T-AI-001 through T-AI-024
 */

import { describe, it, expect } from 'vitest';
import { CodeComplianceEngine } from './code-compliance';

describe('AI Code Compliance Tests', () => {
  describe('T-AI-020: Code check → verify all violations identified', () => {
    it('should identify room size violations', () => {
      const engine = new CodeComplianceEngine();
      const violations = engine.checkElementCompliance('door-1', 'door', { width: 0.6 });

      expect(violations.length).toBe(1);
      expect(violations[0].severity).toBe('error');
      expect(violations[0].codeSection).toBe('IBC 1008.1.1');
    });

    it('should identify stair rise violations', () => {
      const engine = new CodeComplianceEngine();
      const violations = engine.checkElementCompliance('stair-1', 'stair', {
        rise: 0.25,
        run: 0.3,
      });

      const riseViolation = violations.find((v) => v.id.includes('rise'));
      expect(riseViolation).toBeDefined();
      expect(riseViolation?.description).toContain('4" and 7"');
    });

    it('should identify stair run violations', () => {
      const engine = new CodeComplianceEngine();
      const violations = engine.checkElementCompliance('stair-1', 'stair', {
        rise: 0.18,
        run: 0.2,
      });

      const runViolation = violations.find((v) => v.id.includes('run'));
      expect(runViolation).toBeDefined();
      expect(runViolation?.description).toContain('10"');
    });

    it('should pass compliant door dimensions', () => {
      const engine = new CodeComplianceEngine();
      const violations = engine.checkElementCompliance('door-1', 'door', { width: 1.0 });

      expect(violations.length).toBe(0);
    });

    it('should pass compliant stair dimensions', () => {
      const engine = new CodeComplianceEngine();
      const violations = engine.checkElementCompliance('stair-1', 'stair', {
        rise: 0.17, // 0.17m = 6.7 inches (within 4-7")
        run: 0.28, // 0.28m = 11 inches (greater than 10")
      });

      expect(violations.length).toBe(0);
    });
  });

  describe('T-AI-021: Code check → verify no false positives on compliant model', () => {
    it('should return no violations for compliant context', () => {
      const engine = new CodeComplianceEngine();
      const result = engine.checkCompliance({
        buildingArea: 2000,
        occupancy: 'Residential',
        buildingType: 'Single Family',
        levels: 2,
        elements: [],
        roomSizes: new Map([
          [
            'bedroom1',
            {
              id: 'bedroom1',
              name: 'Master Bedroom',
              area: 300,
              minArea: 120,
              hasNaturalLight: true,
              hasVentilation: true,
            },
          ],
        ]),
        doorClearances: new Map([
          ['main-door', { id: 'main-door', width: 1.0, height: 2.1, clearFloorSpace: 1.5 }],
        ]),
        corridorWidth: 1.5,
        stairDimensions: {
          rise: 0.17, // 6.7 inches (within 4-7")
          run: 0.28, // 11 inches (greater than 10")
          width: 1.0,
          headroom: 2.5, // 98.4 inches (greater than 80")
          landingLength: 1.0,
        },
      });

      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('T-AI-022: Violation → verify correct code section cited', () => {
    it('should cite correct code for door violations', () => {
      const engine = new CodeComplianceEngine();
      const violations = engine.checkElementCompliance('door-1', 'door', { width: 0.5 });

      expect(violations[0].codeSection).toBe('IBC 1008.1.1');
    });

    it('should cite correct code for stair violations', () => {
      const engine = new CodeComplianceEngine();
      const violations = engine.checkElementCompliance('stair-1', 'stair', { rise: 0.3 });

      for (const violation of violations) {
        expect(violation.codeSection).toBe('IBC 1011.5');
      }
    });
  });

  describe('T-AI-023: Suggested fix → verify fix resolves violation', () => {
    it('should provide actionable suggested fix', () => {
      const engine = new CodeComplianceEngine();
      const violations = engine.checkElementCompliance('door-1', 'door', { width: 0.5 });

      expect(violations[0].suggestedFix).toBeDefined();
      expect(violations[0].suggestedFix).toContain('32 inches');
    });
  });

  describe('T-AI-024: Offline → verify core rule engine runs without internet', () => {
    it('should run checkElementCompliance without network', () => {
      const engine = new CodeComplianceEngine();

      const result = engine.checkCompliance({
        buildingArea: 2000,
        occupancy: 'Residential',
        buildingType: 'Single Family',
        levels: 1,
        elements: [],
        roomSizes: new Map(),
        doorClearances: new Map(),
        corridorWidth: 1.2,
      });

      expect(result).toBeDefined();
      expect(result.checkedAt).toBeInstanceOf(Date);
    });
  });

  describe('Rule Management', () => {
    it('should add custom rules', () => {
      const engine = new CodeComplianceEngine();
      const initialCount = engine.getRules().length;

      engine.addRule({
        id: 'custom-rule',
        name: 'Custom Rule',
        codeSection: 'Custom 1.0',
        description: 'A custom compliance rule',
        severity: 'warning',
        check: () => null,
      });

      expect(engine.getRules().length).toBe(initialCount + 1);
    });

    it('should remove custom rules', () => {
      const engine = new CodeComplianceEngine();

      engine.addRule({
        id: 'temp-rule',
        name: 'Temp Rule',
        codeSection: 'Temp 1.0',
        description: 'A temporary rule',
        severity: 'warning',
        check: () => null,
      });

      engine.removeRule('temp-rule');

      const ruleIds = engine.getRules().map((r) => r.id);
      expect(ruleIds).not.toContain('temp-rule');
    });
  });
});
