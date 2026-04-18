/**
 * AIRouter — selects between cloud AI and local Ollama.
 * T-DSK-005: Local AI via Ollama for offline desktop.
 */

import { OllamaClient } from './ollamaClient';

export type AIBackend = 'cloud' | 'ollama';

export interface AIRouter {
  backend: AIBackend;
  generate(prompt: string): Promise<string>;
}

/**
 * Create an AIRouter that uses the local Ollama instance when available,
 * otherwise falls back to the provided cloud generate function.
 *
 * @param cloudGenerate  Cloud AI generate function (used as fallback)
 * @param ollama         Optional OllamaClient; if not provided, always uses cloud
 */
export async function createAIRouter(
  cloudGenerate: (prompt: string) => Promise<string>,
  ollama?: OllamaClient,
): Promise<AIRouter> {
  if (ollama) {
    const available = await ollama.isAvailable();
    if (available) {
      return {
        backend: 'ollama',
        async generate(prompt: string): Promise<string> {
          const response = await ollama.generate(prompt);
          return response.content;
        },
      };
    }
  }

  return {
    backend: 'cloud',
    generate: cloudGenerate,
  };
}
