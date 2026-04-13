/**
 * AI Features
 * T-AI-001 through T-AI-005
 */

export type BuildStyle = 'residential' | 'commercial' | 'industrial';

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}
export type BuildingCode = 'IRC' | 'IBC' | 'NBC' | ' Alberta Building Code';

export interface ComplianceResult {
  passed: boolean;
  issues: ComplianceIssue[];
  score: number;
}

export interface ComplianceIssue {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  location?: string;
}

export interface BIMError {
  type: 'geometry' | 'property' | 'relationship' | 'topology';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  entityId?: string;
}

export interface EnergyAnalysis {
  heatingLoad: number;
  coolingLoad: number;
  totalEnergy: number;
  efficiency: string;
  recommendations: string[];
}

class AIProvider {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async complete(messages: Array<{ role: string; content: string }>): Promise<{ content: string }> {
    if (this.config.provider === 'local') {
      return this.localComplete(messages);
    }

    try {
      const response = await fetch(
        this.config.baseUrl || 'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            temperature: 0.3,
          }),
        }
      );

      const data = await response.json();
      return { content: data.choices?.[0]?.message?.content || '' };
    } catch {
      return { content: '' };
    }
  }

  private async localComplete(
    messages: Array<{ role: string; content: string }>
  ): Promise<{ content: string }> {
    return { content: `[Local AI] Processed: ${messages.length} messages` };
  }
}

export class DesignGenerator {
  private provider: AIProvider;

  constructor(config: AIConfig) {
    this.provider = new AIProvider(config);
  }

  async generateFromPrompt(prompt: string): Promise<{ rooms: unknown[]; circulation: unknown[] }> {
    const response = await this.provider.complete([
      { role: 'system', content: 'You are an architect. Generate floor plans as JSON.' },
      { role: 'user', content: prompt },
    ]);

    try {
      const data = JSON.parse(response.content);
      return { rooms: data.rooms || [], circulation: data.circulation || [] };
    } catch {
      return { rooms: [], circulation: [] };
    }
  }

  async suggestImprovements(layout: unknown): Promise<string[]> {
    const response = await this.provider.complete([
      { role: 'system', content: 'You are an architect. Suggest improvements.' },
      { role: 'user', content: JSON.stringify(layout) },
    ]);

    return response.content.split('\n').filter(Boolean).slice(0, 5);
  }
}

export class CodeComplianceChecker {
  private provider: AIProvider;

  constructor(config: AIConfig) {
    this.provider = new AIProvider(config);
  }

  async checkCompliance(document: unknown, code: BuildingCode = 'IRC'): Promise<ComplianceResult> {
    const response = await this.provider.complete([
      { role: 'system', content: `Check building code compliance against ${code}. Return JSON.` },
      { role: 'user', content: JSON.stringify(document) },
    ]);

    try {
      const data = JSON.parse(response.content);
      return {
        passed: data.passed ?? true,
        issues: data.issues ?? [],
        score: data.score ?? 100,
      };
    } catch {
      return { passed: true, issues: [], score: 100 };
    }
  }

  async quickCheck(document: unknown): Promise<ComplianceResult> {
    const elements = document as { elements?: Record<string, unknown> };
    const issues: ComplianceIssue[] = [];

    if (!elements.elements || Object.keys(elements.elements).length === 0) {
      issues.push({
        severity: 'warning',
        rule: 'EMPTY',
        message: 'Document has no elements',
      });
    }

    return {
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      score: Math.max(0, 100 - issues.length * 10),
    };
  }
}

export class BIMErrorDetector {
  async detectErrors(document: unknown): Promise<BIMError[]> {
    const errors: BIMError[] = [];
    const doc = document as { elements?: Record<string, unknown> };
    const elements = doc.elements || {};

    for (const [id, element] of Object.entries(elements)) {
      const el = element as Record<string, unknown>;

      if (!el.type) {
        errors.push({
          type: 'property',
          severity: 'major',
          description: `Element ${id} missing type`,
          entityId: id,
        });
      }

      if (!el.geometry) {
        errors.push({
          type: 'geometry',
          severity: 'minor',
          description: `Element ${id} missing geometry`,
          entityId: id,
        });
      }
    }

    return errors;
  }
}

export class EnergyAnalyzer {
  async analyze(document: unknown): Promise<EnergyAnalysis> {
    const doc = document as { elements?: Record<string, unknown> };
    const elements = Object.values(doc.elements || {});

    const wallCount = elements.filter((e) => (e as Record<string, unknown>).type === 'wall').length;
    const windowCount = elements.filter(
      (e) => (e as Record<string, unknown>).type === 'window'
    ).length;

    const heatingLoad = wallCount * 500 + windowCount * 200;
    const coolingLoad = wallCount * 400 + windowCount * 300;

    return {
      heatingLoad,
      coolingLoad,
      totalEnergy: heatingLoad + coolingLoad,
      efficiency: wallCount > 10 ? 'Good' : 'Fair',
      recommendations: [
        'Add insulation to exterior walls',
        windowCount < 5 ? 'Add more windows for natural light' : 'Windows are adequate',
      ],
    };
  }
}

export class SmartPlacement {
  async suggestPlacement(
    roomType: string,
    existingRooms: unknown[]
  ): Promise<{ x: number; y: number; rotation: number }> {
    const rooms = existingRooms as Array<{
      name: string;
      x: number;
      y: number;
      width: number;
      depth: number;
    }>;

    let bestX = 0;
    let bestY = 0;
    let bestRotation = 0;

    for (const room of rooms) {
      if (room.name === 'Kitchen' || room.name === 'Dining') {
        bestX = room.x + room.width + 10;
        bestY = room.y;
        bestRotation = 0;
      } else if (room.name === 'Bedroom' && roomType === 'Bathroom') {
        bestX = room.x;
        bestY = room.y + room.depth + 10;
      }
    }

    return { x: bestX, y: bestY, rotation: bestRotation };
  }
}

let globalConfig: AIConfig = {
  provider: 'local',
  model: 'gpt-4o',
};

export function configureAI(config: Partial<AIConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

export function createDesignGenerator(): DesignGenerator {
  return new DesignGenerator(globalConfig);
}

export function createCodeComplianceChecker(): CodeComplianceChecker {
  return new CodeComplianceChecker(globalConfig);
}

export function createBIMErrorDetector(): BIMErrorDetector {
  return new BIMErrorDetector();
}

export function createEnergyAnalyzer(): EnergyAnalyzer {
  return new EnergyAnalyzer();
}

export function createSmartPlacement(): SmartPlacement {
  return new SmartPlacement();
}
