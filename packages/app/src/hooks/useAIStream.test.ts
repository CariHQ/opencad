/**
 * AI Streaming Tests
 * Issue #3: Implement real AI chat integration
 */

import { describe, it, expect, vi } from 'vitest';
import {
  AIStreamClient,
  type AIProvider,
  type StreamChunk,
} from './useAIStream';

describe('Issue #3: Real AI chat integration', () => {
  describe('AIStreamClient', () => {
    it('should stream response chunks from provider', async () => {
      const chunks: StreamChunk[] = [
        { type: 'delta', content: 'Hello' },
        { type: 'delta', content: ' World' },
        { type: 'done', content: '' },
      ];
      const mockProvider: AIProvider = {
        name: 'mock',
        stream: vi.fn(async function* () {
          for (const chunk of chunks) yield chunk;
        }),
      };

      const client = new AIStreamClient(mockProvider);
      const received: StreamChunk[] = [];
      for await (const chunk of client.stream('hi')) {
        received.push(chunk);
      }

      expect(received).toHaveLength(3);
      expect(received[0]!.content).toBe('Hello');
      expect(received[2]!.type).toBe('done');
    });

    it('should accumulate full response text', async () => {
      const mockProvider: AIProvider = {
        name: 'mock',
        stream: vi.fn(async function* () {
          yield { type: 'delta' as const, content: 'Foo' };
          yield { type: 'delta' as const, content: 'Bar' };
          yield { type: 'done' as const, content: '' };
        }),
      };

      const client = new AIStreamClient(mockProvider);
      let full = '';
      for await (const chunk of client.stream('test')) {
        if (chunk.type === 'delta') full += chunk.content;
      }
      expect(full).toBe('FooBar');
    });

    it('should support switching providers', () => {
      const p1: AIProvider = { name: 'openai', stream: vi.fn(async function* () {}) };
      const p2: AIProvider = { name: 'anthropic', stream: vi.fn(async function* () {}) };
      const client = new AIStreamClient(p1);
      client.setProvider(p2);
      expect(client.getProviderName()).toBe('anthropic');
    });

    it('should emit error chunk on provider failure', async () => {
      const mockProvider: AIProvider = {
        name: 'mock',
        stream: vi.fn(async function* () {
          throw new Error('Network error');
          yield { type: 'done' as const, content: '' }; // unreachable
        }),
      };

      const client = new AIStreamClient(mockProvider);
      const received: StreamChunk[] = [];
      for await (const chunk of client.stream('hi')) {
        received.push(chunk);
      }

      expect(received.some((c) => c.type === 'error')).toBe(true);
    });
  });

  describe('Chat history persistence', () => {
    it('should store and retrieve chat history', async () => {
      const storage = new Map<string, string>();
      const mockProvider: AIProvider = {
        name: 'mock',
        stream: vi.fn(async function* () {
          yield { type: 'done' as const, content: '' };
        }),
      };

      const client = new AIStreamClient(mockProvider, {
        storageGet: (k) => storage.get(k) ?? null,
        storageSet: (k, v) => { storage.set(k, v); },
      });

      client.saveHistory([
        { role: 'user', content: 'Hello', id: '1', timestamp: 0 },
        { role: 'assistant', content: 'Hi', id: '2', timestamp: 1 },
      ]);

      const history = client.loadHistory();
      expect(history).toHaveLength(2);
      expect(history[0]!.content).toBe('Hello');
    });

    it('should return empty array if no history saved', () => {
      const mockProvider: AIProvider = { name: 'mock', stream: vi.fn(async function* () {}) };
      const client = new AIStreamClient(mockProvider, {
        storageGet: () => null,
        storageSet: () => {},
      });
      expect(client.loadHistory()).toEqual([]);
    });
  });

  describe('Code compliance integration', () => {
    it('should include IBC violation context in compliance prompt', () => {
      const mockProvider: AIProvider = { name: 'mock', stream: vi.fn(async function* () {}) };
      const client = new AIStreamClient(mockProvider);
      const prompt = client.buildCompliancePrompt([
        {
          roomId: 'r1',
          type: 'min_dimension',
          rule: 'min_bedroom_dimension',
          severity: 'error',
          message: 'Bedroom width 2.5m below IBC min 3.0m',
        },
      ]);
      expect(prompt).toContain('IBC');
      expect(prompt).toContain('Bedroom');
    });
  });
});
