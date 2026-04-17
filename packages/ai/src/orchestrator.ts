/**
 * AI Orchestrator
 * Multi-model LLM routing and AI service coordination
 */

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface AIRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  provider: AIProvider;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter';
}

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  timeout?: number;
}

export class AIOrchestrator {
  private configs: Map<AIProvider, AIConfig> = new Map();
  private currentProvider: AIProvider = 'anthropic';

  configure(config: AIConfig): void {
    this.configs.set(config.provider, config);
  }

  setProvider(provider: AIProvider): void {
    if (!this.configs.has(provider)) {
      throw new Error(`Provider ${provider} not configured`);
    }
    this.currentProvider = provider;
  }

  getProvider(): AIProvider {
    return this.currentProvider;
  }

  async complete(request: Partial<AIRequest>): Promise<AIResponse> {
    const provider = request.provider || this.currentProvider;
    const config = this.configs.get(provider);

    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const model = request.model || config.defaultModel;
    const messages = request.messages || [];

    const response = await this.callProvider(provider, {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 2048,
      provider,
    });

    return response;
  }

  async streamComplete(
    request: Partial<AIRequest>,
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    const provider = request.provider || this.currentProvider;
    const config = this.configs.get(provider);

    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const model = request.model || config.defaultModel;
    const messages = request.messages || [];

    return this.streamProvider(
      provider,
      {
        model,
        messages,
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 2048,
        provider,
      },
      onChunk
    );
  }

  private async callProvider(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(request);
      case 'anthropic':
        return this.callAnthropic(request);
      case 'ollama':
        return this.callOllama(request);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async streamProvider(
    provider: AIProvider,
    request: AIRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    switch (provider) {
      case 'openai':
        return this.streamOpenAI(request, onChunk);
      case 'anthropic':
        return this.streamAnthropic(request, onChunk);
      case 'ollama':
        return this.streamOllama(request, onChunk);
      default:
        throw new Error(`Streaming not supported for provider: ${provider}`);
    }
  }

  private async callOpenAI(request: AIRequest): Promise<AIResponse> {
    const config = this.configs.get('openai');
    const url = config?.baseUrl || 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: data.choices[0]?.finish_reason || 'stop',
    };
  }

  private async callAnthropic(request: AIRequest): Promise<AIResponse> {
    const config = this.configs.get('anthropic');
    const url = config?.baseUrl || 'https://api.anthropic.com/v1/messages';

    const systemPrompt = request.messages.find((m) => m.role === 'system');
    const otherMessages = request.messages.filter((m) => m.role !== 'system');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config?.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        system: systemPrompt?.content,
        messages: otherMessages,
        temperature: request.temperature,
        max_tokens: request.maxTokens || 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.content[0]?.text || '',
      model: data.model,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      finishReason: data.stop_reason || 'stop',
    };
  }

  private async callOllama(request: AIRequest): Promise<AIResponse> {
    const config = this.configs.get('ollama');
    const baseUrl = config?.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.message?.content || '',
      model: data.model || request.model,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason: 'stop',
    };
  }

  private async streamOpenAI(
    request: AIRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    const config = this.configs.get('openai');
    const url = config?.baseUrl || 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) {
              content += text;
              onChunk(text);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    return {
      content,
      model: request.model,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason: 'stop',
    };
  }

  private async streamAnthropic(
    request: AIRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    const config = this.configs.get('anthropic');
    const url = config?.baseUrl || 'https://api.anthropic.com/v1/messages';

    const systemPrompt = request.messages.find((m) => m.role === 'system');
    const otherMessages = request.messages.filter((m) => m.role !== 'system');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config?.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        system: systemPrompt?.content,
        messages: otherMessages,
        temperature: request.temperature,
        max_tokens: request.maxTokens || 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let content = '';
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text;
            if (text) {
              content += text;
              onChunk(text);
            }
          } else if (parsed.type === 'message_delta' && parsed.usage) {
            outputTokens = parsed.usage.output_tokens || 0;
          } else if (parsed.type === 'message_start' && parsed.message?.usage) {
            inputTokens = parsed.message.usage.input_tokens || 0;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }

    return {
      content,
      model: request.model,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      finishReason: 'stop',
    };
  }

  private async streamOllama(
    request: AIRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    const config = this.configs.get('ollama');
    const baseUrl = config?.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line);
          const text = parsed.message?.content;
          if (text) {
            content += text;
            onChunk(text);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return {
      content,
      model: request.model,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason: 'stop',
    };
  }
}

export const aiOrchestrator = new AIOrchestrator();
