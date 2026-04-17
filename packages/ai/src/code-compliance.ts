/**
 * Building Code Compliance Engine
 * Rule-based and AI-assisted code compliance checking
 */

export interface CodeViolation {
  id: string;
  severity: 'error' | 'warning' | 'info';
  codeSection: string;
  description: string;
  affectedElements: string[];
  suggestedFix?: string;
}

export interface ComplianceRule {
  id: string;
  name: string;
  codeSection: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (context: ComplianceContext) => CodeViolation | null;
}

export interface ComplianceContext {
  buildingArea: number;
  occupancy: string;
  buildingType: string;
  levels: number;
  elements: ElementInfo[];
  roomSizes: Map<string, RoomInfo>;
  doorClearances: Map<string, DoorInfo>;
  corridorWidth: number;
  stairDimensions?: StairInfo;
}

export interface ElementInfo {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  level: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  area: number;
  minArea: number;
  hasNaturalLight: boolean;
  hasVentilation: boolean;
}

export interface DoorInfo {
  id: string;
  width: number;
  height: number;
  clearFloorSpace: number;
}

export interface StairInfo {
  rise: number;
  run: number;
  width: number;
  headroom: number;
  landingLength: number;
}

export interface ComplianceResult {
  passed: boolean;
  violations: CodeViolation[];
  warnings: CodeViolation[];
  checkedAt: Date;
  jurisdiction: string;
}

export const DEFAULT_RULES: ComplianceRule[] = [
  {
    id: 'min-room-size',
    name: 'Minimum Room Size',
    codeSection: 'IBC 1208.1',
    description: 'Habitable rooms must meet minimum area requirements',
    severity: 'error',
    check: (ctx) => {
      const violations: CodeViolation[] = [];

      for (const [roomId, room] of ctx.roomSizes) {
        if (room.area < room.minArea) {
          violations.push({
            id: `min-room-${roomId}`,
            severity: 'error',
            codeSection: 'IBC 1208.1',
            description: `Room "${room.name}" area ${room.area} sq ft is below minimum ${room.minArea} sq ft`,
            affectedElements: [roomId],
            suggestedFix: `Increase room size or reduce minimum area requirement`,
          });
        }
      }

      return violations.length > 0 ? violations[0] : null;
    },
  },
  {
    id: 'egress-door-width',
    name: 'Minimum Egress Door Width',
    codeSection: 'IBC 1008.1.1',
    description: 'Egress doors must be at least 32 inches wide',
    severity: 'error',
    check: (ctx) => {
      const violations: CodeViolation[] = [];

      for (const [doorId, door] of ctx.doorClearances) {
        const widthInches = door.width * 39.37; // Convert meters to inches
        if (widthInches < 32) {
          violations.push({
            id: `door-width-${doorId}`,
            severity: 'error',
            codeSection: 'IBC 1008.1.1',
            description: `Door width ${widthInches.toFixed(1)}" is below minimum 32"`,
            affectedElements: [doorId],
            suggestedFix: `Increase door width to at least 32 inches`,
          });
        }
      }

      return violations.length > 0 ? violations[0] : null;
    },
  },
  {
    id: 'corridor-width',
    name: 'Minimum Corridor Width',
    codeSection: 'IBC 1018.1',
    description: 'Corridors must be at least 44 inches wide',
    severity: 'error',
    check: (ctx) => {
      const widthInches = ctx.corridorWidth * 39.37;
      if (ctx.corridorWidth > 0 && widthInches < 44) {
        return {
          id: 'corridor-width',
          severity: 'error',
          codeSection: 'IBC 1018.1',
          description: `Corridor width ${widthInches.toFixed(1)}" is below minimum 44"`,
          affectedElements: [],
          suggestedFix: `Widen corridor to at least 44 inches`,
        };
      }
      return null;
    },
  },
  {
    id: 'stair-rise-run',
    name: 'Stair Rise and Run',
    codeSection: 'IBC 1011.5',
    description: 'Stair rise must be 4-7 inches, run at least 10 inches',
    severity: 'error',
    check: (ctx) => {
      if (!ctx.stairDimensions) return null;

      const riseInches = ctx.stairDimensions.rise * 39.37;
      const runInches = ctx.stairDimensions.run * 39.37;

      if (riseInches < 4 || riseInches > 7) {
        return {
          id: 'stair-rise',
          severity: 'error',
          codeSection: 'IBC 1011.5',
          description: `Stair rise ${riseInches.toFixed(1)}" must be between 4" and 7"`,
          affectedElements: [],
          suggestedFix: `Adjust stair rise to be between 4 and 7 inches`,
        };
      }

      if (runInches < 10) {
        return {
          id: 'stair-run',
          severity: 'error',
          codeSection: 'IBC 1011.5',
          description: `Stair run ${runInches.toFixed(1)}" must be at least 10"`,
          affectedElements: [],
          suggestedFix: `Increase stair run to at least 10 inches`,
        };
      }

      return null;
    },
  },
  {
    id: 'stair-headroom',
    name: 'Minimum Stair Headroom',
    codeSection: 'IBC 1011.5',
    description: 'Stair headroom must be at least 80 inches',
    severity: 'error',
    check: (ctx) => {
      if (!ctx.stairDimensions) return null;

      const headroomInches = ctx.stairDimensions.headroom * 39.37;

      if (headroomInches < 80) {
        return {
          id: 'stair-headroom',
          severity: 'error',
          codeSection: 'IBC 1011.5',
          description: `Stair headroom ${headroomInches.toFixed(1)}" is below minimum 80"`,
          affectedElements: [],
          suggestedFix: `Increase headroom to at least 80 inches`,
        };
      }

      return null;
    },
  },
];

export class CodeComplianceEngine {
  private rules: ComplianceRule[] = DEFAULT_RULES;
  private customRules: ComplianceRule[] = [];

  addRule(rule: ComplianceRule): void {
    this.customRules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.customRules = this.customRules.filter((r) => r.id !== ruleId);
  }

  getRules(): ComplianceRule[] {
    return [...this.rules, ...this.customRules];
  }

  checkCompliance(context: ComplianceContext, jurisdiction: string = 'IBC 2024'): ComplianceResult {
    const violations: CodeViolation[] = [];
    const warnings: CodeViolation[] = [];

    const allRules = [...this.rules, ...this.customRules];

    for (const rule of allRules) {
      try {
        const violation = rule.check(context);
        if (violation) {
          if (violation.severity === 'error') {
            violations.push(violation);
          } else {
            warnings.push(violation);
          }
        }
      } catch (error) {
        console.error(`Error checking rule ${rule.id}:`, error);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      checkedAt: new Date(),
      jurisdiction,
    };
  }

  checkElementCompliance(
    elementId: string,
    elementType: string,
    properties: Record<string, unknown>
  ): CodeViolation[] {
    const violations: CodeViolation[] = [];

    if (elementType === 'door') {
      const width = (properties.width as number) || 0;
      const widthInches = width * 39.37;

      if (widthInches > 0 && widthInches < 32) {
        violations.push({
          id: `door-compliance-${elementId}`,
          severity: 'error',
          codeSection: 'IBC 1008.1.1',
          description: `Door width ${widthInches.toFixed(1)}" is below minimum 32" for egress`,
          affectedElements: [elementId],
          suggestedFix: 'Increase door width to at least 32 inches',
        });
      }
    }

    if (elementType === 'stair') {
      const rise = (properties.rise as number) || 0;
      const run = (properties.run as number) || 0;
      const riseInches = rise * 39.37;
      const runInches = run * 39.37;

      if (riseInches > 0 && (riseInches < 4 || riseInches > 7)) {
        violations.push({
          id: `stair-rise-compliance-${elementId}`,
          severity: 'error',
          codeSection: 'IBC 1011.5',
          description: `Stair rise ${riseInches.toFixed(1)}" must be between 4" and 7"`,
          affectedElements: [elementId],
          suggestedFix: 'Adjust stair rise to 4-7 inches',
        });
      }

      if (runInches > 0 && runInches < 10) {
        violations.push({
          id: `stair-run-compliance-${elementId}`,
          severity: 'error',
          codeSection: 'IBC 1011.5',
          description: `Stair run ${runInches.toFixed(1)}" must be at least 10"`,
          affectedElements: [elementId],
          suggestedFix: 'Increase stair run to at least 10 inches',
        });
      }
    }

    return violations;
  }
}

export const codeComplianceEngine = new CodeComplianceEngine();

export interface ExplainedViolation extends CodeViolation {
  plainLanguageExplanation: string;
  priorityRank: number;
}

export class CodeComplianceAIExplainer {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-6') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async explainViolations(violations: CodeViolation[]): Promise<ExplainedViolation[]> {
    if (violations.length === 0) return [];

    const prompt = `You are a building code expert. For each violation below, provide:
1. A plain-language explanation a non-expert homeowner would understand (1-2 sentences)
2. A priority rank (1=most urgent, higher=less urgent) based on safety impact

Violations:
${JSON.stringify(violations, null, 2)}

Respond ONLY with a JSON array matching this schema:
[
  {
    "id": "same id as input",
    "plainLanguageExplanation": "string",
    "priorityRank": number
  }
]`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          system: 'You are a building code compliance expert. Respond only with valid JSON.',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const explanations: Array<{ id: string; plainLanguageExplanation: string; priorityRank: number }> =
        jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      return violations.map((v) => {
        const explanation = explanations.find((e) => e.id === v.id);
        return {
          ...v,
          plainLanguageExplanation: explanation?.plainLanguageExplanation ?? v.description,
          priorityRank: explanation?.priorityRank ?? 999,
        };
      });
    } catch {
      // Fall back to violations with default explanations
      return violations.map((v, i) => ({
        ...v,
        plainLanguageExplanation: v.description,
        priorityRank: i + 1,
      }));
    }
  }
}
