/**
 * AIRouter tests
 * T-DSK-005: Local AI via Ollama routing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaClient } from './ollamaClient';
import { createAIRouter } from './aiRouter';

describe('T-DSK-005: AIRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses cloud when no ollama provided', async () => {
    const cloudGenerate = vi.fn().mockResolvedValue('cloud result');
    const router = await createAIRouter(cloudGenerate);

    expect(router.backend).toBe('cloud');
  });

  it('uses ollama when available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          response: 'ollama result',
          model: 'llama3.2',
          done: true,
        }),
      }),
    );

    const client = new OllamaClient();
    const cloudGenerate = vi.fn().mockResolvedValue('cloud result');
    const router = await createAIRouter(cloudGenerate, client);

    expect(router.backend).toBe('ollama');
  });

  it('falls back to cloud when ollama unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const client = new OllamaClient();
    const cloudGenerate = vi.fn().mockResolvedValue('cloud result');
    const router = await createAIRouter(cloudGenerate, client);

    expect(router.backend).toBe('cloud');
  });

  it('returns string from the active backend', async () => {
    const cloudGenerate = vi.fn().mockResolvedValue('cloud string output');
    const router = await createAIRouter(cloudGenerate);

    const result = await router.generate('test prompt');
    expect(result).toBe('cloud string output');
    expect(typeof result).toBe('string');
  });
});
