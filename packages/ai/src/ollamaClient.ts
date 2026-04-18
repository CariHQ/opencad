/**
 * OllamaClient — communicates with a locally running Ollama instance.
 * T-DSK-005: Local AI via Ollama for offline desktop.
 */

export interface OllamaConfig {
  /** Base URL of the Ollama HTTP server. Default: 'http://localhost:11434' */
  baseUrl: string;
  /** Model name to use. Default: 'llama3.2' */
  model: string;
  /** Request timeout in milliseconds. Default: 30000 */
  timeout: number;
}

export interface OllamaResponse {
  content: string;
  model: string;
  done: boolean;
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2',
  timeout: 30000,
};

export class OllamaClient {
  readonly config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Returns true if the Ollama server is reachable (GET /api/tags returns 200).
   * Returns false on any network error or non-2xx response.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Send a prompt to Ollama and return the full (non-streaming) response.
   */
  async generate(prompt: string): Promise<OllamaResponse> {
    const res = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!res.ok) {
      throw new Error(`Ollama generate failed: ${res.status}`);
    }

    const data = (await res.json()) as { response: string; model: string; done: boolean };
    return {
      content: data.response,
      model: data.model,
      done: data.done,
    };
  }

  /**
   * Stream a response from Ollama, calling `onChunk` for each partial text.
   */
  async generateStream(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    const res = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        stream: true,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!res.ok) {
      throw new Error(`Ollama stream failed: ${res.status}`);
    }

    const body = res.body;
    if (!body) return;

    const reader = body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as { response: string; done: boolean };
            if (chunk.response) onChunk(chunk.response);
            if (chunk.done) return;
          } catch {
            // skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
