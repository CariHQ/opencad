import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, X, Settings } from 'lucide-react';
import { FloorPlanGenerator, validateElement } from '@opencad/ai';
import { useDocumentStore } from '../stores/documentStore';
import type { DocumentSchema } from '@opencad/document';

/**
 * Run BIM validation on all elements in a generated schema.
 * Returns a human-readable summary of errors and warnings, or null if all pass.
 */
function buildValidationSummary(schema: DocumentSchema): string | null {
  const layers = schema.organization.layers as Record<string, { name: string; locked: boolean }>;
  const elements = Object.values(schema.content.elements);
  if (elements.length === 0) return null;

  const minimalDoc = {
    organization: { layers },
    content: {
      elements: schema.content.elements as Parameters<typeof validateElement>[1]['content']['elements'],
    },
  };

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const el of elements) {
    const result = validateElement(
      el as Parameters<typeof validateElement>[0],
      minimalDoc,
    );
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  if (allErrors.length === 0 && allWarnings.length === 0) return null;

  const lines: string[] = [];
  if (allErrors.length > 0) {
    lines.push(`BIM Validation — ${allErrors.length} error(s):`);
    allErrors.forEach((e) => lines.push(`  • ${e}`));
  }
  if (allWarnings.length > 0) {
    lines.push(`BIM Validation — ${allWarnings.length} warning(s):`);
    allWarnings.forEach((w) => lines.push(`  ⚠ ${w}`));
  }
  return lines.join('\n');
}

/** Returns true when the message looks like a floor-plan generation request. */
function isFloorPlanRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const keywords = [
    'bedroom', 'room', 'house', 'apartment', 'flat', 'floor plan',
    'floorplan', 'm²', 'm2', 'sqft', 'sq ft', 'square feet',
    'generate a', 'design a', 'create a',
  ];
  return keywords.some((kw) => lower.includes(kw));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIChatPanelProps {
  onClose: () => void;
}

interface AIConfig {
  provider: 'anthropic' | 'ollama' | 'openai';
  apiKey: string;
  ollamaBaseUrl: string;
}

const STORAGE_KEY = 'opencad-ai-config';

const suggestedPrompts = [
  'Design a residential floor plan',
  'Add a staircase to level 2',
  'Check building code compliance',
  'Generate quantity takeoff',
  'Create a section view',
];

function loadConfig(): AIConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AIConfig;
  } catch { /* ignore */ }
  return null;
}

function saveConfig(config: AIConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const { loadDocumentSchema } = useDocumentStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm your OpenCAD AI assistant. I can help you with:\n• Designing building layouts\n• Checking code compliance\n• Generating documentation\n• Modifying elements\n\nWhat would you like to do?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<AIConfig>(() => loadConfig() ?? {
    provider: 'anthropic',
    apiKey: '',
    ollamaBaseUrl: 'http://localhost:11434',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isConfigured = Boolean(
    config.apiKey || config.provider === 'ollama'
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const doSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // T-AI-001: Floor plan generation path — uses FloorPlanGenerator when
    // an Anthropic API key is configured and the message looks like a floor plan request.
    const anthropicApiKey = config.apiKey || (import.meta.env['VITE_ANTHROPIC_API_KEY'] as string | undefined);
    if (isFloorPlanRequest(text) && anthropicApiKey) {
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: 'Generating floor plan…', timestamp: Date.now() },
      ]);
      const generator = new FloorPlanGenerator({ apiKey: anthropicApiKey });
      try {
        const schema = await generator.generateFloorPlan(text);
        loadDocumentSchema(schema);
        const validationSummary = buildValidationSummary(schema);
        const baseContent = 'Floor plan generated and loaded into the canvas. Switch to 2D view to see the layout.';
        const content = validationSummary
          ? `${baseContent}\n\n${validationSummary}`
          : baseContent;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content }
              : m
          )
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Failed to generate floor plan: ${err instanceof Error ? err.message : 'Unknown error'}` }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm processing your request. This feature is powered by AI and will be available soon. In the meantime, you can use the manual tools to create walls, doors, and other elements.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSend = () => {
    void doSend(input);
    setInput('');
  };

  const handleSuggestion = (prompt: string) => {
    void doSend(prompt);
    // Input stays empty — suggestion auto-sends
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveConfig = () => {
    saveConfig(config);
    setShowConfig(false);
  };

  if (showConfig) {
    return (
      <div className="ai-chat-panel">
        <div className="chat-header">
          <span className="chat-title">AI Provider Setup</span>
          <button className="chat-close" onClick={() => setShowConfig(false)} aria-label="Close AI chat">
            <X size={18} />
          </button>
        </div>

        <div className="ai-config-panel">
          <div className="config-field">
            <label htmlFor="ai-provider">Provider</label>
            <select
              id="ai-provider"
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value as AIConfig['provider'] })}
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </div>

          {config.provider !== 'ollama' && (
            <div className="config-field">
              <label htmlFor="ai-api-key">
                {config.provider === 'anthropic' ? 'Anthropic API Key' : 'OpenAI API Key'}
              </label>
              <input
                id="ai-api-key"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>
          )}

          {config.provider === 'ollama' && (
            <div className="config-field">
              <label htmlFor="ai-ollama-url">Ollama base URL</label>
              <input
                id="ai-ollama-url"
                type="url"
                value={config.ollamaBaseUrl}
                onChange={(e) => setConfig({ ...config, ollamaBaseUrl: e.target.value })}
              />
            </div>
          )}

          <button
            className="btn-save-config"
            onClick={handleSaveConfig}
            aria-label="Save AI configuration"
          >
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-chat-panel">
      <div className="chat-header">
        <span className="chat-title">AI Assistant</span>
        <div className="chat-header-actions">
          <button
            className="chat-config-btn"
            onClick={() => setShowConfig(true)}
            aria-label="Configure AI"
            title="Configure AI provider"
          >
            <Settings size={16} />
          </button>
          <button className="chat-close" onClick={onClose} aria-label="Close AI chat">
            <X size={18} />
          </button>
        </div>
      </div>

      {!isConfigured && (
        <div className="ai-setup-banner">
          <p>Configure an AI provider to enable chat</p>
          <button
            className="btn-setup-ai"
            onClick={() => setShowConfig(true)}
            aria-label="Set up AI provider"
          >
            Set Up
          </button>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className="message-content">
              {msg.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <Bot size={16} />
            </div>
            <div className="message-content typing">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-suggestions">
        {suggestedPrompts.map((prompt) => (
          <button key={prompt} className="suggestion-btn" onClick={() => handleSuggestion(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-input-container">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Configure AI provider to chat"
          rows={2}
        />
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
}
