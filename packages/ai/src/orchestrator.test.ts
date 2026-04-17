/**
 * AI Orchestrator Tests
 * T-AI-030: Multi-model AI orchestration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIOrchestrator, type AIConfig } from './orchestrator';

const anthropicConfig: AIConfig = {
  provider: 'anthropic',
  apiKey: 'sk-ant-test',
  defaultModel: 'claude-sonnet-4-6',
};

const openaiConfig: AIConfig = {
  provider: 'openai',
  apiKey: 'sk-openai-test',
  defaultModel: 'gpt-4o-mini',
};

const ollamaConfig: AIConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  defaultModel: 'llama3',
};

describe('T-AI-030: AIOrchestrator', () => {
  let orchestrator: AIOrchestrator;

  beforeEach(() => {
    orchestrator = new AIOrchestrator();
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('configure registers a provider config', () => {
      orchestrator.configure(anthropicConfig);
      // If getProvider returns 'openai' by default and we configured anthropic,
      // we can setProvider to test it's stored
      orchestrator.configure(openaiConfig);
      orchestrator.setProvider('openai');
      expect(orchestrator.getProvider()).toBe('openai');
    });

    it('setProvider switches the active provider', () => {
      orchestrator.configure(anthropicConfig);
      orchestrator.configure(openaiConfig);
      orchestrator.setProvider('anthropic');
      expect(orchestrator.getProvider()).toBe('anthropic');
    });

    it('setProvider throws when provider not configured', () => {
      expect(() => orchestrator.setProvider('anthropic')).toThrow(/not configured/);
    });

    it('getProvider returns default anthropic', () => {
      expect(orchestrator.getProvider()).toBe('anthropic');
    });
  });

  describe('complete()', () => {
    it('throws when provider not configured', async () => {
      await expect(
        orchestrator.complete({ messages: [{ role: 'user', content: 'hello' }] })
      ).rejects.toThrow(/not configured/);
    });

    it('calls Anthropic API and returns response', async () => {
      orchestrator.configure(anthropicConfig);
      orchestrator.setProvider('anthropic');

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ text: 'Hello from Claude' }],
          model: 'claude-sonnet-4-6',
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'stop',
        }),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await orchestrator.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.content).toBe('Hello from Claude');
      expect(result.model).toBe('claude-sonnet-4-6');
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(5);
      expect(result.usage.totalTokens).toBe(15);
    });

    it('calls OpenAI API and returns response', async () => {
      orchestrator.configure(openaiConfig);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Hello from GPT' }, finish_reason: 'stop' }],
          model: 'gpt-4o-mini',
          usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
        }),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await orchestrator.complete({
        provider: 'openai',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.content).toBe('Hello from GPT');
      expect(result.usage.totalTokens).toBe(12);
    });

    it('calls Ollama API and returns response', async () => {
      orchestrator.configure(ollamaConfig);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          message: { content: 'Hello from Llama' },
          model: 'llama3',
        }),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await orchestrator.complete({
        provider: 'ollama',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.content).toBe('Hello from Llama');
    });

    it('throws on HTTP error from Anthropic', async () => {
      orchestrator.configure(anthropicConfig);
      orchestrator.setProvider('anthropic');

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

      await expect(
        orchestrator.complete({ messages: [{ role: 'user', content: 'test' }] })
      ).rejects.toThrow(/401/);
    });

    it('throws on HTTP error from OpenAI', async () => {
      orchestrator.configure(openaiConfig);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

      await expect(
        orchestrator.complete({ provider: 'openai', messages: [{ role: 'user', content: 'test' }] })
      ).rejects.toThrow(/429/);
    });

    it('uses override model when provided', async () => {
      orchestrator.configure(anthropicConfig);
      orchestrator.setProvider('anthropic');

      let capturedBody = '';
      vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, options: RequestInit) => {
        capturedBody = options.body as string;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: 'ok' }], model: 'custom-model',
            usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'stop',
          }),
        });
      }));

      await orchestrator.complete({
        model: 'claude-opus-4-6',
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(JSON.parse(capturedBody).model).toBe('claude-opus-4-6');
    });
  });

  describe('streamComplete()', () => {
    it('streams Anthropic SSE response and calls onChunk', async () => {
      orchestrator.configure(anthropicConfig);
      orchestrator.setProvider('anthropic');

      const sseLines = [
        'data: {"type":"message_start","message":{"usage":{"input_tokens":10}}}',
        'data: {"type":"content_block_delta","delta":{"text":"Hello"}}',
        'data: {"type":"content_block_delta","delta":{"text":" world"}}',
        'data: {"type":"message_delta","usage":{"output_tokens":5}}',
        'data: {"type":"message_stop"}',
      ].join('\n');

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseLines));
          controller.close();
        },
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

      const chunks: string[] = [];
      const result = await orchestrator.streamComplete(
        { messages: [{ role: 'user', content: 'test' }] },
        (chunk) => chunks.push(chunk)
      );

      expect(result.content).toBe('Hello world');
      expect(chunks).toEqual(['Hello', ' world']);
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(5);
    });

    it('throws when provider not configured', async () => {
      await expect(
        orchestrator.streamComplete(
          { messages: [{ role: 'user', content: 'test' }] },
          vi.fn()
        )
      ).rejects.toThrow(/not configured/);
    });
  });
});
