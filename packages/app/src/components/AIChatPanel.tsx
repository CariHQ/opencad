import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, User, X, Settings, Zap, Eye, EyeOff, RefreshCw } from 'lucide-react';
import {
  AIStreamClient,
  createOpenAICompatibleProvider,
  createOllamaProvider,
  createAnthropicProvider,
  type ChatMessage,
} from '../hooks/useAIStream';
import { useDocumentStore } from '../stores/documentStore';

const AI_CONFIG_KEY = 'opencad-ai-config';

interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: 'anthropic' | 'openai' | 'ollama' | 'custom';
}

const DEFAULT_CONFIG: AIConfig = {
  baseUrl: '',
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY as string ?? '',
  model: 'claude-sonnet-4-6',
  provider: 'anthropic',
};

function loadConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AIConfig>) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(c: AIConfig): void {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(c));
}

const BIM_SYSTEM_PROMPT = `You are OpenCAD AI, an expert architectural design assistant embedded in a browser-native BIM platform. You help architects and designers with:
- Building layout and floor plan design
- IBC code compliance checking
- Wall, door, window, slab, column, beam, stair, and railing placement
- Material selection and cost estimation
- Section views and documentation
- IFC file handling and interoperability

Keep responses concise and actionable. When suggesting design changes, be specific about element types and dimensions. Use metric units (mm, m) by default.`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  streaming?: boolean;
}

interface AIChatPanelProps {
  onClose: () => void;
}

const suggestedPrompts = [
  'Design a residential floor plan',
  'Check building code compliance',
  'Add a staircase to level 2',
  'Generate quantity takeoff',
  'What elements are in my model?',
];

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const { document: doc } = useDocumentStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your OpenCAD AI assistant. I can help you design buildings, check code compliance, and answer architecture questions.\n\nWhat would you like to do?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<AIConfig>(loadConfig);
  const [configDraft, setConfigDraft] = useState<AIConfig>(loadConfig);
  const [showKey, setShowKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isConfigured =
    (config.provider === 'anthropic' && config.apiKey.length > 0) ||
    config.provider === 'ollama' ||
    config.baseUrl.length > 0;

  const buildClient = useCallback((): AIStreamClient => {
    const storage = {
      storageGet: (k: string) => localStorage.getItem(k),
      storageSet: (k: string, v: string) => localStorage.setItem(k, v),
    };
    if (config.provider === 'anthropic') {
      return new AIStreamClient(
        createAnthropicProvider(config.apiKey, config.model || 'claude-sonnet-4-6', BIM_SYSTEM_PROMPT),
        storage
      );
    }
    if (config.provider === 'ollama') {
      const url = config.baseUrl || 'http://localhost:11434';
      return new AIStreamClient(createOllamaProvider(url, config.model || 'llama3'), storage);
    }
    return new AIStreamClient(
      createOpenAICompatibleProvider(config.baseUrl, config.apiKey, config.model),
      storage
    );
  }, [config]);

  const buildContext = useCallback((): string => {
    if (!doc) return '';
    const elements = doc.content.elements ? Object.values(doc.content.elements) : [];
    const layers = doc.organization.layers ? Object.values(doc.organization.layers) : [];
    const levels = doc.organization.levels ? Object.values(doc.organization.levels) : [];
    return `\n\nCurrent project context:\n- Project: ${doc.name}\n- Levels: ${levels.map((l) => l.name).join(', ') || 'none'}\n- Layers: ${layers.map((l) => l.name).join(', ') || 'none'}\n- Elements: ${elements.length} total (${Object.entries(elements.reduce<Record<string,number>>((acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + 1; return acc; }, {})).map(([t, c]) => `${c} ${t}s`).join(', ') || 'none'})`;
  }, [doc]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (!isConfigured) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Please configure your AI provider first. Click the ⚙ icon above to enter your Anthropic API key, or set up Ollama for offline AI.',
          timestamp: Date.now(),
        },
      ]);
      setIsLoading(false);
      return;
    }

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), streaming: true },
    ]);

    const client = buildClient();
    const history: ChatMessage[] = messages
      .filter((m) => !m.streaming)
      .map((m) => ({ id: m.id, role: m.role, content: m.content, timestamp: m.timestamp }));

    const systemAugmentedPrompt = BIM_SYSTEM_PROMPT + buildContext() + '\n\nUser: ' + userText;

    let cancelled = false;
    abortRef.current = () => { cancelled = true; };

    try {
      let accumulated = '';
      for await (const chunk of client.stream(systemAugmentedPrompt, history)) {
        if (cancelled) break;
        if (chunk.type === 'delta') {
          accumulated += chunk.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        } else if (chunk.type === 'done' || chunk.type === 'error') {
          if (chunk.type === 'error' && accumulated === '') {
            accumulated = `Error: ${chunk.content}`;
          }
          break;
        }
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: accumulated || '(no response)', streaming: false } : m
        )
      );
      client.saveHistory([
        ...history,
        { id: userMessage.id, role: 'user', content: userText, timestamp: userMessage.timestamp },
        { id: assistantId, role: 'assistant', content: accumulated, timestamp: Date.now() },
      ]);
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, streaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, isConfigured, messages, buildClient, buildContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleStop = () => {
    abortRef.current?.();
    setIsLoading(false);
  };

  const handleRetry = useCallback(() => {
    // Find the last user message and re-send it
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    // Strip the subsequent failed assistant message so we get a clean retry
    setMessages((prev) => prev.filter((m) => m.id !== lastUser.id));
    setInput(lastUser.content);
  }, [messages]);

  const handleSaveConfig = () => {
    saveConfig(configDraft);
    setConfig(configDraft);
    setShowConfig(false);
  };

  if (showConfig) {
    return (
      <div className="ai-chat-panel">
        <div className="chat-header">
          <span className="chat-title">AI Provider Setup</span>
          <button className="chat-close" onClick={() => setShowConfig(false)} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>
        <div className="ai-config-form">
          <div className="config-field">
            <label htmlFor="ai-provider">Provider</label>
            <select
              id="ai-provider"
              value={configDraft.provider}
              onChange={(e) => {
                const p = e.target.value as AIConfig['provider'];
                setConfigDraft((d) => ({
                  ...d,
                  provider: p,
                  model: p === 'anthropic' ? 'claude-sonnet-4-6' : p === 'ollama' ? 'llama3' : 'gpt-4o-mini',
                  baseUrl: p === 'anthropic' ? '' : d.baseUrl,
                }));
              }}
            >
              <option value="anthropic">Anthropic Claude (recommended)</option>
              <option value="openai">OpenAI / OpenAI-compatible</option>
              <option value="ollama">Ollama (local / offline)</option>
            </select>
          </div>

          {configDraft.provider === 'anthropic' && (
            <>
              <div className="config-field">
                <label htmlFor="ai-api-key">Anthropic API Key</label>
                <div className="config-key-row">
                  <input
                    id="ai-api-key"
                    type={showKey ? 'text' : 'password'}
                    value={configDraft.apiKey}
                    onChange={(e) => setConfigDraft((d) => ({ ...d, apiKey: e.target.value }))}
                    placeholder="sk-ant-..."
                    className="config-key-input"
                  />
                  <button
                    type="button"
                    className="config-key-toggle"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {configDraft.apiKey && (
                    <button
                      type="button"
                      className="config-key-clear"
                      onClick={() => setConfigDraft((d) => ({ ...d, apiKey: '' }))}
                      aria-label="Clear API key"
                      title="Clear key"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <p className="config-hint">
                  Stored in browser localStorage (<code>opencad-ai-config</code>).{' '}
                  Get your key at <strong>console.anthropic.com → API Keys</strong>.
                  Make sure it&apos;s from the workspace that has credits.
                </p>
              </div>
              <div className="config-field">
                <label htmlFor="ai-model-name">Model</label>
                <select
                  id="ai-model-name"
                  value={configDraft.model}
                  onChange={(e) => setConfigDraft((d) => ({ ...d, model: e.target.value }))}
                >
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (recommended)</option>
                  <option value="claude-opus-4-6">Claude Opus 4.6 (most capable)</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fastest)</option>
                </select>
              </div>
            </>
          )}

          {configDraft.provider === 'ollama' && (
            <>
              <div className="config-field">
                <label htmlFor="ai-ollama-url">Ollama base URL</label>
                <input
                  id="ai-ollama-url"
                  type="text"
                  value={configDraft.baseUrl || 'http://localhost:11434'}
                  onChange={(e) => setConfigDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                  placeholder="http://localhost:11434"
                />
              </div>
              <div className="config-field">
                <label htmlFor="ai-model">Model</label>
                <input
                  id="ai-model"
                  type="text"
                  value={configDraft.model}
                  onChange={(e) => setConfigDraft((d) => ({ ...d, model: e.target.value }))}
                  placeholder="llama3"
                />
              </div>
              <p className="config-hint">Install Ollama from ollama.com, then run: <code>ollama pull llama3</code></p>
            </>
          )}

          {(configDraft.provider === 'openai' || configDraft.provider === 'custom') && (
            <>
              <div className="config-field">
                <label htmlFor="ai-base-url">Base URL</label>
                <input
                  id="ai-base-url"
                  type="text"
                  value={configDraft.baseUrl}
                  onChange={(e) => setConfigDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div className="config-field">
                <label htmlFor="ai-api-key-openai">API Key</label>
                <input
                  id="ai-api-key-openai"
                  type="password"
                  value={configDraft.apiKey}
                  onChange={(e) => setConfigDraft((d) => ({ ...d, apiKey: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>
              <div className="config-field">
                <label htmlFor="ai-model-openai">Model</label>
                <input
                  id="ai-model-openai"
                  type="text"
                  value={configDraft.model}
                  onChange={(e) => setConfigDraft((d) => ({ ...d, model: e.target.value }))}
                  placeholder="gpt-4o-mini"
                />
              </div>
              <p className="config-hint">Supports OpenAI, LM Studio, and any OpenAI-compatible endpoint.</p>
            </>
          )}

          <button className="btn-save-config" onClick={handleSaveConfig} aria-label="Save AI configuration">
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
          {isConfigured && (
            <span className="ai-provider-badge" title={`Provider: ${config.provider}`}>
              <Zap size={12} />
              {config.provider === 'ollama' ? 'Local AI' : config.model}
            </span>
          )}
          <button className="chat-icon-btn" onClick={() => setShowConfig(true)} title="Configure AI provider" aria-label="Configure AI">
            <Settings size={15} />
          </button>
          <button className="chat-close" onClick={onClose} aria-label="Close AI chat">
            <X size={18} />
          </button>
        </div>
      </div>

      {!isConfigured && (
        <div className="ai-setup-banner">
          <Zap size={16} />
          <span>Configure an AI provider to enable chat.</span>
          <button onClick={() => setShowConfig(true)} className="btn-setup-ai" aria-label="Set up AI provider">Set up</button>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg) => {
          const isError = msg.role === 'assistant' && msg.content.startsWith('Error:') && !msg.streaming;
          return (
            <div key={msg.id} className={`message ${msg.role}${isError ? ' message-error' : ''}`}>
              <div className="message-avatar">
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="message-content">
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line || '\u00a0'}</p>
                ))}
                {msg.streaming && <span className="streaming-cursor">▌</span>}
                {isError && (
                  <div className="message-error-actions">
                    <button
                      className="btn-retry"
                      onClick={handleRetry}
                      title="Retry last message"
                      aria-label="Retry"
                    >
                      <RefreshCw size={12} /> Retry
                    </button>
                    <button
                      className="btn-open-settings"
                      onClick={() => setShowConfig(true)}
                      title="Update API key"
                      aria-label="Update API key"
                    >
                      <Settings size={12} /> Update API key
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && messages[messages.length - 1]?.streaming !== true && (
          <div className="message assistant">
            <div className="message-avatar"><Bot size={16} /></div>
            <div className="message-content typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-suggestions">
        {suggestedPrompts.map((prompt) => (
          <button key={prompt} className="suggestion-btn" onClick={() => setInput(prompt)}>
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
          placeholder={isConfigured ? 'Ask me anything…' : 'Configure AI provider to chat'}
          rows={2}
        />
        {isLoading ? (
          <button className="chat-stop" onClick={handleStop} aria-label="Stop generation">Stop</button>
        ) : (
          <button
            className="chat-send"
            onClick={() => void handleSend()}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
