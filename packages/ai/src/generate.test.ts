/**
 * T-AI-001: AI project generation tests
 * TDD: these tests are written first (Red), then generate.ts is implemented (Green).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GenerateProjectResult } from './generate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid Anthropic streaming SSE response for a JSON document. */
function makeAnthropicStreamResponse(jsonContent: string): Response {
  const encoder = new TextEncoder();
  const sseLines = [
    `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: jsonContent } })}`,
    `data: ${JSON.stringify({ type: 'message_stop' })}`,
  ].join('\n');

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseLines));
      controller.close();
    },
  });

  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

/** Build a minimal DocumentSchema-shaped JSON string the API could return. */
function buildDocumentJson(): string {
  return JSON.stringify({
    id: 'gen-001',
    name: 'AI Generated House',
    version: { clock: {} },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'ai',
      schemaVersion: '1.0.0',
    },
    content: {
      elements: {
        'wall-1': {
          id: 'wall-1',
          type: 'wall',
          properties: {
            StartX: { type: 'number', value: 0 },
            StartY: { type: 'number', value: 0 },
            EndX: { type: 'number', value: 6000 },
            EndY: { type: 'number', value: 0 },
            Height: { type: 'number', value: 3000 },
          },
          propertySets: [],
          geometry: { type: 'curve', data: null },
          layerId: 'layer-1',
          levelId: 'level-1',
          transform: {
            translation: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          boundingBox: {
            min: { _type: 'Point3D', x: 0, y: 0, z: 0 },
            max: { _type: 'Point3D', x: 6000, y: 0, z: 3000 },
          },
          metadata: {
            id: 'wall-1',
            createdBy: 'ai',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: { clock: {} },
          },
          visible: true,
          locked: false,
        },
        'wall-2': {
          id: 'wall-2',
          type: 'wall',
          properties: {
            StartX: { type: 'number', value: 6000 },
            StartY: { type: 'number', value: 0 },
            EndX: { type: 'number', value: 6000 },
            EndY: { type: 'number', value: 9000 },
            Height: { type: 'number', value: 3000 },
          },
          propertySets: [],
          geometry: { type: 'curve', data: null },
          layerId: 'layer-1',
          levelId: 'level-1',
          transform: {
            translation: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          boundingBox: {
            min: { _type: 'Point3D', x: 6000, y: 0, z: 0 },
            max: { _type: 'Point3D', x: 6000, y: 9000, z: 3000 },
          },
          metadata: {
            id: 'wall-2',
            createdBy: 'ai',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: { clock: {} },
          },
          visible: true,
          locked: false,
        },
        'wall-3': {
          id: 'wall-3',
          type: 'wall',
          properties: {
            StartX: { type: 'number', value: 0 },
            StartY: { type: 'number', value: 9000 },
            EndX: { type: 'number', value: 6000 },
            EndY: { type: 'number', value: 9000 },
            Height: { type: 'number', value: 3000 },
          },
          propertySets: [],
          geometry: { type: 'curve', data: null },
          layerId: 'layer-1',
          levelId: 'level-1',
          transform: {
            translation: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          boundingBox: {
            min: { _type: 'Point3D', x: 0, y: 9000, z: 0 },
            max: { _type: 'Point3D', x: 6000, y: 9000, z: 3000 },
          },
          metadata: {
            id: 'wall-3',
            createdBy: 'ai',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: { clock: {} },
          },
          visible: true,
          locked: false,
        },
      },
      spaces: {},
    },
    organization: {
      layers: {
        'layer-1': {
          id: 'layer-1',
          name: 'Walls',
          color: '#ffffff',
          visible: true,
          locked: false,
          order: 0,
        },
      },
      levels: {
        'level-1': {
          id: 'level-1',
          name: 'Ground Floor',
          elevation: 0,
          height: 3000,
          order: 0,
        },
      },
    },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('T-AI-001: AI project generation', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a document with wall elements when API succeeds', async () => {
    fetchSpy.mockResolvedValueOnce(makeAnthropicStreamResponse(buildDocumentJson()));

    const { generateProject } = await import('./generate');
    const result: GenerateProjectResult = await generateProject({
      prompt: 'generate a 2-bedroom house',
      apiKey: 'test-key',
    });

    expect(result.document).toBeDefined();
    const elements = Object.values(result.document.content?.elements ?? {});
    const walls = elements.filter((e) => e.type === 'wall');
    expect(walls.length).toBeGreaterThan(0);
  });

  it('falls back to template when API key is missing', async () => {
    const { generateProject } = await import('./generate');
    const result: GenerateProjectResult = await generateProject({
      prompt: 'generate a 2-bedroom house',
      // no apiKey
    });

    expect(result.document).toBeDefined();
    const elements = Object.values(result.document.content?.elements ?? {});
    const walls = elements.filter((e) => e.type === 'wall');
    expect(walls.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.toLowerCase().includes('fallback') || w.toLowerCase().includes('template') || w.toLowerCase().includes('api key'))).toBe(true);
  });

  it('handles API error gracefully and returns fallback template', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    const { generateProject } = await import('./generate');
    const result: GenerateProjectResult = await generateProject({
      prompt: 'generate a 2-bedroom house',
      apiKey: 'test-key',
    });

    // Should not throw — fallback document must be returned
    expect(result.document).toBeDefined();
    const elements = Object.values(result.document.content?.elements ?? {});
    expect(elements.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('generated walls have StartX/StartY/EndX/EndY/Height properties', async () => {
    fetchSpy.mockResolvedValueOnce(makeAnthropicStreamResponse(buildDocumentJson()));

    const { generateProject } = await import('./generate');
    const result: GenerateProjectResult = await generateProject({
      prompt: 'generate a 2-bedroom house',
      apiKey: 'test-key',
    });

    const elements = Object.values(result.document.content?.elements ?? {});
    const walls = elements.filter((e) => e.type === 'wall');
    expect(walls.length).toBeGreaterThan(0);

    for (const wall of walls) {
      const props = wall.properties;
      expect(props).toHaveProperty('StartX');
      expect(props).toHaveProperty('StartY');
      expect(props).toHaveProperty('EndX');
      expect(props).toHaveProperty('EndY');
      expect(props).toHaveProperty('Height');
    }
  });

  it('result includes a description string', async () => {
    fetchSpy.mockResolvedValueOnce(makeAnthropicStreamResponse(buildDocumentJson()));

    const { generateProject } = await import('./generate');
    const result: GenerateProjectResult = await generateProject({
      prompt: 'generate a 2-bedroom house',
      apiKey: 'test-key',
    });

    expect(typeof result.description).toBe('string');
    expect(result.description.length).toBeGreaterThan(0);
  });

  it('result includes warnings array (may be empty on success)', async () => {
    fetchSpy.mockResolvedValueOnce(makeAnthropicStreamResponse(buildDocumentJson()));

    const { generateProject } = await import('./generate');
    const result: GenerateProjectResult = await generateProject({
      prompt: 'generate a 2-bedroom house',
      apiKey: 'test-key',
    });

    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('fallback template contains levels and layers', async () => {
    const { generateProject } = await import('./generate');
    const result: GenerateProjectResult = await generateProject({
      prompt: 'generate a 2-bedroom house',
    });

    expect(result.document.organization?.levels).toBeDefined();
    expect(Object.keys(result.document.organization?.levels ?? {}).length).toBeGreaterThan(0);
    expect(result.document.organization?.layers).toBeDefined();
    expect(Object.keys(result.document.organization?.layers ?? {}).length).toBeGreaterThan(0);
  });

  it('handles malformed JSON response and falls back to template', async () => {
    fetchSpy.mockResolvedValueOnce(makeAnthropicStreamResponse('not valid json at all!!!'));

    const { generateProject } = await import('./generate');
    const result: GenerateProjectResult = await generateProject({
      prompt: 'generate a 2-bedroom house',
      apiKey: 'test-key',
    });

    expect(result.document).toBeDefined();
    const elements = Object.values(result.document.content?.elements ?? {});
    expect(elements.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
