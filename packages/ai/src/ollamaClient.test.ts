/**
 * OllamaClient and AIRouter tests
 * T-DSK-005-001 through T-DSK-005-008
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaClient } from './ollamaClient';
import { createAIRouter } from './aiRouter';

describe('T-DSK-005: OllamaClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T-DSK-005-001
  it('uses correct default baseUrl', () => {
    const client = new OllamaClient();
    expect((client as unknown as { config: { baseUrl: string } }).config.baseUrl).toBe(
      'http://localhost:11434',
    );
  });

  // T-DSK-005-002
  it('uses correct default model', () => {
    const client = new OllamaClient();
    expect((client as unknown as { config: { model: string } }).config.model).toBe('llama3.2');
  });

  // T-DSK-005-003
  it('isAvailable returns false when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));
    const client = new OllamaClient();
    const result = await client.isAvailable();
    expect(result).toBe(false);
  });

  // T-DSK-005-004
  it('isAvailable returns true when /api/tags responds 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ models: [] }) }),
    );
    const client = new OllamaClient();
    const result = await client.isAvailable();
    expect(result).toBe(true);
  });

  // T-DSK-005-005
  it('generate sends correct POST to /api/generate', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        response: 'Hello from Ollama',
        model: 'llama3.2',
        done: true,
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    await client.generate('test prompt');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: expect.stringContaining('test prompt'),
      }),
    );
  });

  // T-DSK-005-006
  it('generate returns OllamaResponse with content field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          response: 'Generated content',
          model: 'llama3.2',
          done: true,
        }),
      }),
    );

    const client = new OllamaClient();
    const response = await client.generate('hello');

    expect(response.content).toBe('Generated content');
    expect(response.model).toBe('llama3.2');
    expect(response.done).toBe(true);
  });

  // T-DSK-005-007
  it('createAIRouter uses ollama when available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          response: 'Ollama response',
          model: 'llama3.2',
          done: true,
        }),
      }),
    );

    const client = new OllamaClient();
    const cloudGenerate = vi.fn().mockResolvedValue('cloud response');
    const router = await createAIRouter(cloudGenerate, client);

    expect(router.backend).toBe('ollama');
    const result = await router.generate('hello');
    expect(result).toBe('Ollama response');
    expect(cloudGenerate).not.toHaveBeenCalled();
  });

  // T-DSK-005-008
  it('createAIRouter falls back to cloud when ollama unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const client = new OllamaClient();
    const cloudGenerate = vi.fn().mockResolvedValue('cloud response');
    const router = await createAIRouter(cloudGenerate, client);

    expect(router.backend).toBe('cloud');
    const result = await router.generate('hello');
    expect(result).toBe('cloud response');
  });
});
