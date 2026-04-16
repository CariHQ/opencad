/**
 * AI Streaming Client
 * Configurable provider abstraction supporting OpenAI, Anthropic, Ollama
 * Issue #3: Implement real AI chat integration
 */

export type StreamChunkType = 'delta' | 'done' | 'error';

export interface StreamChunk {
  type: StreamChunkType;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIProvider {
  name: string;
  stream(
    prompt: string,
    history?: ChatMessage[]
  ): AsyncGenerator<StreamChunk, void, unknown>;
}

export interface AIStorageAdapter {
  storageGet(key: string): string | null;
  storageSet(key: string, value: string): void;
}

const HISTORY_KEY = 'opencad-chat-history';

export class AIStreamClient {
  private _provider: AIProvider;
  private readonly _storage: AIStorageAdapter | null;

  constructor(provider: AIProvider, storage?: AIStorageAdapter) {
    this._provider = provider;
    this._storage = storage ?? null;
  }

  setProvider(provider: AIProvider): void {
    this._provider = provider;
  }

  getProviderName(): string {
    return this._provider.name;
  }

  async *stream(
    prompt: string,
    history?: ChatMessage[]
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      yield* this._provider.stream(prompt, history);
    } catch (err) {
      yield {
        type: 'error',
        content: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  saveHistory(messages: ChatMessage[]): void {
    this._storage?.storageSet(HISTORY_KEY, JSON.stringify(messages));
  }

  loadHistory(): ChatMessage[] {
    const raw = this._storage?.storageGet(HISTORY_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ChatMessage[];
    } catch {
      return [];
    }
  }

  /** Build a code compliance prompt from a list of violations. */
  buildCompliancePrompt(violations: Array<{ message: string; rule?: string; roomId?: string; type?: string; severity?: string }>): string {
    const lines = violations.map(
      (v, i) => `${i + 1}. ${v.message}${v.rule ? ` (${v.rule})` : ''}`
    );
    return [
      'The following IBC code compliance violations were detected in the current floor plan:',
      '',
      ...lines,
      '',
      'Please explain each violation and suggest how to fix it in OpenCAD.',
    ].join('\n');
  }
}

/** Ollama provider factory (local AI) */
export function createOllamaProvider(baseUrl = 'http://localhost:11434', model = 'llama3'): AIProvider {
  return {
    name: 'ollama',
    async *stream(prompt: string): AsyncGenerator<StreamChunk, void, unknown> {
      // Production: fetch from Ollama streaming API
      // In test environments this will not be called directly
      const resp = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: true }),
      });
      const reader = resp.body?.getReader();
      if (!reader) {
        yield { type: 'error', content: 'No response body' };
        return;
      }
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const json = JSON.parse(line) as { response?: string; done?: boolean };
            if (json.response) yield { type: 'delta', content: json.response };
            if (json.done) yield { type: 'done', content: '' };
          } catch {
            // skip malformed lines
          }
        }
      }
    },
  };
}

/** Mock provider for testing */
export function createMockProvider(responses: string[]): AIProvider {
  let idx = 0;
  return {
    name: 'mock',
    async *stream(): AsyncGenerator<StreamChunk, void, unknown> {
      const text = responses[idx++ % responses.length] ?? '';
      for (const char of text) {
        yield { type: 'delta', content: char };
      }
      yield { type: 'done', content: '' };
    },
  };
}

/**
 * OpenAI-compatible streaming provider.
 * Works with OpenAI, Ollama (/v1 endpoint), LM Studio, and any compatible proxy.
 */
export function createOpenAICompatibleProvider(
  baseUrl: string,
  apiKey: string,
  model: string
): AIProvider {
  return {
    name: 'openai-compatible',
    async *stream(prompt: string, history?: ChatMessage[]): AsyncGenerator<StreamChunk, void, unknown> {
      const messages = [
        ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: prompt },
      ];

      let resp: Response;
      try {
        resp = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ model, messages, stream: true }),
        });
      } catch (err) {
        yield { type: 'error', content: err instanceof Error ? err.message : 'Network error' };
        return;
      }

      if (!resp.ok) {
        yield { type: 'error', content: `HTTP ${resp.status}: ${resp.statusText}` };
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        yield { type: 'error', content: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { type: 'done', content: '' };
            return;
          }
          try {
            const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const text = json.choices?.[0]?.delta?.content;
            if (text) yield { type: 'delta', content: text };
          } catch {
            // skip malformed lines
          }
        }
      }
      yield { type: 'done', content: '' };
    },
  };
}
