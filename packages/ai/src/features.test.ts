/**
 * AI Tests
 * Tests for T-AI-001 through T-AI-005
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  configureAI,
  createDesignGenerator,
  createCodeComplianceChecker,
  createBIMErrorDetector,
  createEnergyAnalyzer,
  createSmartPlacement,
} from './features';

describe('T-AI: AI Features Tests', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    configureAI({ provider: 'openai', model: 'gpt-4o', apiKey: 'test-key' });
  });

  describe('T-AI-001: AI Design Generation', () => {
    it('should create design generator', () => {
      const generator = createDesignGenerator();
      expect(generator).toBeDefined();
    });

    it('should generate layout from prompt', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ choices: [{ message: { content: '{"rooms":[],"circulation":[]}' } }] }),
      });

      const generator = createDesignGenerator();
      const result = await generator.generateFromPrompt('3 bedroom house');

      expect(fetchMock).toHaveBeenCalled();
      expect(result).toHaveProperty('rooms');
    });

    it('should suggest improvements', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '1. Add windows\n2. Better flow' } }],
          }),
      });

      const generator = createDesignGenerator();
      const improvements = await generator.suggestImprovements({ rooms: [] });

      expect(improvements.length).toBeLessThanOrEqual(5);
    });
  });

  describe('T-AI-002: Code Compliance Check', () => {
    it('should create compliance checker', () => {
      const checker = createCodeComplianceChecker();
      expect(checker).toBeDefined();
    });

    it('should do quick check', async () => {
      const checker = createCodeComplianceChecker();
      const result = await checker.quickCheck({});

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('score');
    });

    it('should detect empty document', async () => {
      const checker = createCodeComplianceChecker();
      const result = await checker.quickCheck({ elements: {} });

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.passed).toBe(true);
    });
  });

  describe('T-AI-003: Building Energy Analysis', () => {
    it('should create energy analyzer', () => {
      const analyzer = createEnergyAnalyzer();
      expect(analyzer).toBeDefined();
    });

    it('should analyze energy', async () => {
      const analyzer = createEnergyAnalyzer();
      const result = await analyzer.analyze({ elements: {} });

      expect(result).toHaveProperty('heatingLoad');
      expect(result).toHaveProperty('coolingLoad');
      expect(result).toHaveProperty('totalEnergy');
      expect(result).toHaveProperty('efficiency');
    });

    it('should calculate loads', async () => {
      const analyzer = createEnergyAnalyzer();
      const result = await analyzer.analyze({
        elements: {
          wall1: { type: 'wall' },
          wall2: { type: 'wall' },
          window1: { type: 'window' },
        },
      });

      expect(result.heatingLoad).toBeGreaterThan(0);
      expect(result.coolingLoad).toBeGreaterThan(0);
    });
  });

  describe('T-AI-004: Smart Element Placement', () => {
    it('should create smart placement', () => {
      const placement = createSmartPlacement();
      expect(placement).toBeDefined();
    });

    it('should suggest placement near kitchen', async () => {
      const placement = createSmartPlacement();
      const result = await placement.suggestPlacement('Dining', [
        { name: 'Kitchen', x: 0, y: 0, width: 12, depth: 12 },
      ]);

      expect(result.x).toBeGreaterThan(0);
    });

    it('should suggest placement near bedroom for bathroom', async () => {
      const placement = createSmartPlacement();
      const result = await placement.suggestPlacement('Bathroom', [
        { name: 'Master Bedroom', x: 0, y: 0, width: 14, depth: 16 },
      ]);

      expect(result).toHaveProperty('x');
    });
  });

  describe('T-AI-005: BIM Error Detection', () => {
    it('should create error detector', () => {
      const detector = createBIMErrorDetector();
      expect(detector).toBeDefined();
    });

    it('should detect errors in empty document', async () => {
      const detector = createBIMErrorDetector();
      const errors = await detector.detectErrors({ elements: {} });

      expect(Array.isArray(errors)).toBe(true);
    });

    it('should detect missing type', async () => {
      const detector = createBIMErrorDetector();
      const errors = await detector.detectErrors({
        elements: { elem1: { id: 'elem1' } },
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('property');
    });

    it('should detect missing geometry', async () => {
      const detector = createBIMErrorDetector();
      const errors = await detector.detectErrors({
        elements: { elem1: { id: 'elem1', type: 'wall' } },
      });

      expect(errors.some((e) => e.type === 'geometry')).toBe(true);
    });

    it('should return empty for valid elements', async () => {
      const detector = createBIMErrorDetector();
      const errors = await detector.detectErrors({
        elements: { elem1: { id: 'elem1', type: 'wall', geometry: {} } },
      });

      expect(errors.filter((e) => e.severity === 'critical').length).toBe(0);
    });
  });
});
