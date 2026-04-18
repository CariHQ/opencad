/**
 * AI-enhanced compliance suggestions.
 *
 * This module is the ONLY async/network-touching part of the compliance
 * subsystem. The core rule engine (codeCompliance.ts + rules/ibc.ts) is
 * kept completely synchronous and offline-capable.
 */

import type { Violation } from './codeCompliance';

/**
 * Calls the Claude API to provide a detailed, human-readable explanation and
 * suggested remediation for a given code violation.
 *
 * Requires a valid Anthropic API key and network access.
 */
export async function getAISuggestion(
  violation: Violation,
  apiKey: string
): Promise<string> {
  const prompt = `You are a building code compliance expert. Explain the following IBC violation in plain language and suggest how an architect can resolve it.

Violation:
- Rule: ${violation.section}
- Element: ${violation.elementId}
- Description: ${violation.description}
- Basic fix: ${violation.suggestedFix}

Provide a 2-3 sentence explanation a non-expert can understand, followed by practical design advice.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      system: 'You are a building code expert. Give concise, practical advice.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };

  return data.content?.[0]?.text ?? violation.suggestedFix;
}
