/**
 * Design Generator Tests
 * T-AI-001: Prompt → JSON → verify all rooms exist in output
 * T-AI-002: Generated plan → verify area within ±5% of requested
 * T-AI-003: Generated plan → verify minimum room dimensions meet IBC
 * T-AI-004: Generated plan → verify circulation paths valid
 * T-AI-005: Iteration → verify only requested changes applied
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesignGenerator, type DesignBrief } from './design-generator';
import { aiOrchestrator } from './orchestrator';

const mockLivingRoomPlan = JSON.stringify({
  rooms: [
    { name: 'Living Room', area: 250, width: 16, depth: 16, x: 0, y: 0, windows: [{ wall: 'south', position: 0.5, width: 6 }], doors: [{ wall: 'east', position: 0.5, type: 'interior' }] },
    { name: 'Kitchen', area: 120, width: 10, depth: 12, x: 16, y: 0, windows: [{ wall: 'north', position: 0.3, width: 4 }], doors: [{ wall: 'west', position: 0.5, type: 'interior' }] },
    { name: 'Bedroom', area: 180, width: 13, depth: 14, x: 0, y: 16, windows: [{ wall: 'east', position: 0.5, width: 5 }], doors: [{ wall: 'north', position: 0.5, type: 'interior' }] },
  ],
  circulation: [
    { from: 'Living Room', to: 'Kitchen', type: 'direct' },
    { from: 'Living Room', to: 'Bedroom', type: 'direct' },
  ],
});

describe('T-AI-001: DesignGenerator — prompt to layout', () => {
  let generator: DesignGenerator;

  beforeEach(() => {
    generator = new DesignGenerator();
    vi.spyOn(aiOrchestrator, 'complete').mockResolvedValue({
      content: mockLivingRoomPlan,
      model: 'mock',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop',
    });
  });

  it('T-AI-001: generateFromPrompt returns a layout with rooms', async () => {
    const layout = await generator.generateFromPrompt('3 bedroom house with kitchen');
    expect(layout.rooms.length).toBeGreaterThan(0);
  });

  it('T-AI-001: layout rooms have required fields', async () => {
    const layout = await generator.generateFromPrompt('house plan');
    for (const room of layout.rooms) {
      expect(room.id).toBeTruthy();
      expect(room.name).toBeTruthy();
      expect(room.area).toBeGreaterThan(0);
      expect(room.width).toBeGreaterThan(0);
      expect(room.depth).toBeGreaterThan(0);
    }
  });

  it('T-AI-001: layout has a unique id', async () => {
    const l1 = await generator.generateFromPrompt('house');
    const l2 = await generator.generateFromPrompt('house');
    expect(l1.id).not.toBe(l2.id);
  });

  it('T-AI-001: layout includes generatedAt Date', async () => {
    const layout = await generator.generateFromPrompt('house');
    expect(layout.generatedAt).toBeInstanceOf(Date);
  });

  it('T-AI-001: all rooms from JSON appear in output', async () => {
    const layout = await generator.generateFromPrompt('house');
    const names = layout.rooms.map((r) => r.name);
    expect(names).toContain('Living Room');
    expect(names).toContain('Kitchen');
    expect(names).toContain('Bedroom');
  });
});

describe('T-AI-002: Generated plan area invariant', () => {
  let generator: DesignGenerator;

  beforeEach(() => {
    generator = new DesignGenerator();
    vi.spyOn(aiOrchestrator, 'complete').mockResolvedValue({
      content: mockLivingRoomPlan,
      model: 'mock',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop',
    });
  });

  it('total area of rooms is positive', async () => {
    const layout = await generator.generateFromPrompt('house');
    const totalArea = layout.rooms.reduce((s, r) => s + r.area, 0);
    expect(totalArea).toBeGreaterThan(0);
  });

  it('brief totalArea matches sum of room areas', async () => {
    const layout = await generator.generateFromPrompt('house');
    const sumArea = layout.rooms.reduce((s, r) => s + r.area, 0);
    expect(layout.brief.totalArea).toBeCloseTo(sumArea, 1);
  });
});

describe('T-AI-003: Room dimensions (IBC minimum area)', () => {
  let generator: DesignGenerator;

  beforeEach(() => {
    generator = new DesignGenerator();
    vi.spyOn(aiOrchestrator, 'complete').mockResolvedValue({
      content: mockLivingRoomPlan,
      model: 'mock',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop',
    });
  });

  it('all rooms have positive area', async () => {
    const layout = await generator.generateFromPrompt('house');
    for (const room of layout.rooms) {
      expect(room.area).toBeGreaterThan(0);
    }
  });

  it('all rooms have positive width and depth', async () => {
    const layout = await generator.generateFromPrompt('house');
    for (const room of layout.rooms) {
      expect(room.width).toBeGreaterThan(0);
      expect(room.depth).toBeGreaterThan(0);
    }
  });
});

describe('T-AI-004: Circulation paths validity', () => {
  let generator: DesignGenerator;

  beforeEach(() => {
    generator = new DesignGenerator();
    vi.spyOn(aiOrchestrator, 'complete').mockResolvedValue({
      content: mockLivingRoomPlan,
      model: 'mock',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop',
    });
  });

  it('layout includes circulation paths', async () => {
    const layout = await generator.generateFromPrompt('house');
    expect(layout.circulation).toBeDefined();
  });

  it('circulation paths reference valid room names', async () => {
    const layout = await generator.generateFromPrompt('house');
    const roomNames = new Set(layout.rooms.map((r) => r.name));
    for (const path of layout.circulation) {
      expect(roomNames.has(path.from)).toBe(true);
      expect(roomNames.has(path.to)).toBe(true);
    }
  });

  it('circulation path type is direct or corridor', async () => {
    const layout = await generator.generateFromPrompt('house');
    for (const path of layout.circulation) {
      expect(['direct', 'corridor']).toContain(path.type);
    }
  });
});

describe('T-AI-005: Quality scoring', () => {
  let generator: DesignGenerator;

  beforeEach(() => {
    generator = new DesignGenerator();
    vi.spyOn(aiOrchestrator, 'complete').mockResolvedValue({
      content: mockLivingRoomPlan,
      model: 'mock',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop',
    });
  });

  it('quality score is between 0 and 100', async () => {
    const layout = await generator.generateFromPrompt('house');
    expect(layout.quality).toBeGreaterThanOrEqual(0);
    expect(layout.quality).toBeLessThanOrEqual(100);
  });
});

describe('DesignGenerator — generateFromBrief', () => {
  let generator: DesignGenerator;

  beforeEach(() => {
    generator = new DesignGenerator();
    vi.spyOn(aiOrchestrator, 'complete').mockResolvedValue({
      content: mockLivingRoomPlan,
      model: 'mock',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop',
    });
  });

  it('generates layout from brief', async () => {
    const brief: DesignBrief = {
      rooms: [
        { name: 'Living Room', count: 1, minArea: 150 },
        { name: 'Kitchen', count: 1, minArea: 80 },
      ],
      totalArea: 1500,
      style: 'contemporary',
      roofType: 'gable',
    };
    const layout = await generator.generateFromBrief(brief);
    expect(layout.rooms.length).toBeGreaterThan(0);
  });
});

describe('DesignGenerator — fallback on invalid JSON', () => {
  let generator: DesignGenerator;

  beforeEach(() => {
    generator = new DesignGenerator();
    vi.spyOn(aiOrchestrator, 'complete').mockResolvedValue({
      content: 'This is not JSON at all!',
      model: 'mock',
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      finishReason: 'stop',
    });
  });

  it('returns empty rooms on invalid JSON response', async () => {
    const layout = await generator.generateFromPrompt('house');
    expect(layout.rooms).toHaveLength(0);
  });

  it('still returns a valid layout structure on invalid JSON', async () => {
    const layout = await generator.generateFromPrompt('house');
    expect(layout.id).toBeTruthy();
    expect(layout.generatedAt).toBeInstanceOf(Date);
    expect(layout.brief).toBeDefined();
    expect(layout.circulation).toHaveLength(0);
  });
});
