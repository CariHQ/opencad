import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, User, X, Settings, Zap, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react';
import {
  AIStreamClient,
  createOpenAICompatibleProvider,
  createOllamaProvider,
  createAnthropicProvider,
  type ChatMessage,
} from '../hooks/useAIStream';
import { useDocumentStore } from '../stores/documentStore';

const AI_CONFIG_KEY = 'opencad-ai-config';
const CHAT_HISTORY_KEY = 'opencad-chat-history';

const FT_TO_MM = 304.8; // 1 foot in millimetres (canvas world units)
const WALL_HEIGHT_MM = 3000; // 3 m default residential wall height
const WALL_THICKNESS_MM = 200; // 200 mm default wall thickness

interface FloorPlanRoom {
  name: string;
  x?: number;
  y?: number;
  width_ft?: number;
  depth_ft?: number;
  area_sqft?: number;
}

/** Normalise a wall edge so (A→B) and (B→A) produce the same key. */
function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
  const ax = Math.round(x1), ay = Math.round(y1);
  const bx = Math.round(x2), by = Math.round(y2);
  return ax < bx || (ax === bx && ay < by)
    ? `${ax},${ay}|${bx},${by}`
    : `${bx},${by}|${ax},${ay}`;
}

/** Extract a floor plan JSON object (with a "rooms" array) from AI response text. */
function extractFloorPlan(content: string): { rooms: FloorPlanRoom[] } | null {
  // Strategy 1: fenced ```json ... ``` block
  const fencedRe = /```(?:json)?\s*\n([\s\S]*?)\n\s*```/g;
  let m: RegExpExecArray | null;
  while ((m = fencedRe.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(m[1]!);
      if (parsed && Array.isArray(parsed.rooms) && parsed.rooms.length > 0) return parsed;
    } catch { /* try next */ }
  }
  // Strategy 2: bare JSON object containing "rooms" key
  const bareRe = /\{\s*"rooms"\s*:[\s\S]*?"total_area_sqft"[\s\S]*?\}/g;
  while ((m = bareRe.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(m[0]);
      if (parsed && Array.isArray(parsed.rooms) && parsed.rooms.length > 0) return parsed;
    } catch { /* try next */ }
  }
  return null;
}

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

const BIM_SYSTEM_PROMPT = `You are OpenCAD AI, an expert architectural design assistant embedded in a professional browser-native BIM platform.

## Your Capabilities
You help architects and designers with:
- **Floor plan generation** — create room layouts from natural language descriptions
- **IBC/ADA code compliance** — check against IBC 2024, IRC, ADA Standards; cite specific sections
- **BIM element placement** — walls, doors, windows, slabs, columns, beams, stairs, railings, spaces
- **Design modifications** — move, resize, or remove elements based on natural language
- **Material & cost guidance** — suggest materials, estimate costs, recommend specifications
- **Documentation** — generate specs, construction notes, quantity takeoffs
- **IFC interoperability** — explain import/export workflows and data mapping

## OpenCAD Element Types
The platform uses these element types: \`wall\`, \`door\`, \`window\`, \`slab\`, \`column\`, \`beam\`, \`stair\`, \`railing\`, \`space\`, \`roof\`, \`curtain_wall\`, \`opening\`, \`furniture\`, \`mep\`.

## IBC Code Quick Reference
Key sections you should cite accurately:
- IBC §1208.1 — Minimum room area (habitable ≥ 70 sqft, bedrooms ≥ 120 sqft)
- IBC §1010.1.1 / §1008.1.1 — Egress door clear width ≥ 32" (32.5" net with 34" nominal door)
- IBC §1018.1 — Corridor width ≥ 44" (36" in R-3 single family)
- IBC §1011.5 — Stair rise 4–7", run ≥ 11" (IRC: 4–7.75" / ≥ 10")
- IBC §1205.2 — Natural light ≥ 8% of floor area for habitable rooms
- IBC §1203.4 — Ventilation ≥ 4% of floor area or mechanical equivalent
- IBC §1030 — Emergency egress windows (bedrooms): net clear ≥ 5.7 sqft, sill ≤ 44" AFF
- IBC §302 — Occupancy classification required before applying most code requirements
- ADA §404 — Accessible door clear width ≥ 32" (36" preferred)

## Project Context
Each user message may include a JSON block labelled [OpenCAD Project Context] showing the current model state. Use it to give specific, contextual answers — reference actual element counts, layer names, and level names from the context rather than speaking generically.

## Response Guidelines
- For **analysis and compliance questions**: respond conversationally with clear structure (headers, bullet points, tables). Use emojis sparingly: 🔴 errors, 🟡 warnings, ✅ passing. Keep answers under 400 words unless a detailed breakdown was requested.
- For **design generation requests**: describe the plan first in plain language, then provide a JSON floor plan object using this schema:
\`\`\`json
{
  "rooms": [{ "name": "", "area_sqft": 0, "width_ft": 0, "depth_ft": 0, "x": 0, "y": 0 }],
  "circulation": [{ "from": "", "to": "", "type": "direct|corridor" }],
  "total_area_sqft": 0
}
\`\`\`
- For **element placement commands**: include a structured command block:
\`\`\`json
{ "command": "add_element", "type": "wall", "properties": {} }
\`\`\`
- **Units**: accept both metric (mm, m) and imperial (in, ft). Default to imperial for IBC checks, metric for IFC/BIM data. When mixing, always state the unit explicitly.
- **Accuracy**: Never hallucinate code references. If unsure of a specific IBC section, say so and recommend the architect verify with the local AHJ.`;

// ─── Inline Markdown Renderer ──────────────────────────────────────────────
// Renders the subset of Markdown that Claude commonly outputs in BIM context:
// headings (h1–h4), bold, italic, inline code, code blocks, tables,
// ordered and unordered lists, horizontal rules, and plain paragraphs.
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  // Inline formatting: **bold**, *italic*, `code`, ~~strike~~
  function renderInline(raw: string, key: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let cur = raw;
    let partIdx = 0;
    while (cur.length) {
      const bold = cur.match(/^\*\*(.+?)\*\*/s);
      const italic = cur.match(/^\*(.+?)\*/s);
      const code = cur.match(/^`(.+?)`/s);
      const strike = cur.match(/^~~(.+?)~~/s);
      if (bold) {
        parts.push(<strong key={`${key}-b-${partIdx++}`}>{bold[1]}</strong>);
        cur = cur.slice(bold[0].length);
      } else if (italic) {
        parts.push(<em key={`${key}-i-${partIdx++}`}>{italic[1]}</em>);
        cur = cur.slice(italic[0].length);
      } else if (code) {
        parts.push(<code key={`${key}-c-${partIdx++}`}>{code[1]}</code>);
        cur = cur.slice(code[0].length);
      } else if (strike) {
        parts.push(<s key={`${key}-s-${partIdx++}`}>{strike[1]}</s>);
        cur = cur.slice(strike[0].length);
      } else {
        // advance one char
        parts.push(cur[0]);
        cur = cur.slice(1);
      }
    }
    return <>{parts}</>;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={`pre-${i}`} className="md-code-block" data-lang={lang || undefined}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$|^\*\*\*+$/.test(line.trim())) {
      nodes.push(<hr key={`hr-${i}`} className="md-hr" />);
      i++;
      continue;
    }

    // Headings h1–h4
    const hMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      const level = Math.min(hMatch[1].length, 4) as 1 | 2 | 3 | 4;
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      nodes.push(
        <Tag key={`h-${i}`} className={`md-h${level}`}>
          {renderInline(hMatch[2], `h-${i}`)}
        </Tag>
      );
      i++;
      continue;
    }

    // Table (detect by | at start after trimming)
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // Skip separator row (---|---)
      const headerRow = tableLines[0];
      const dataRows = tableLines.slice(2); // skip separator
      const parseRow = (row: string) =>
        row.split('|').slice(1, -1).map((c) => c.trim());

      nodes.push(
        <div key={`tbl-${i}`} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {parseRow(headerRow).map((cell, ci) => (
                  <th key={ci}>{renderInline(cell, `th-${i}-${ci}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri}>
                  {parseRow(row).map((cell, ci) => (
                    <td key={ci}>{renderInline(cell, `td-${i}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) {
        const content = lines[i].replace(/^[\s]*[-*+]\s/, '');
        items.push(<li key={i}>{renderInline(content, `li-${i}`)}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="md-ul">{items}</ul>);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const content = lines[i].replace(/^\d+\.\s/, '');
        items.push(<li key={i}>{renderInline(content, `oli-${i}`)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="md-ol">{items}</ol>);
      continue;
    }

    // Blank line — skip (paragraph spacing handled by margins)
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Plain paragraph
    nodes.push(
      <p key={`p-${i}`} className="md-p">
        {renderInline(line, `p-${i}`)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}

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
  const { document: doc, addElement: storeAddElement, pushHistory } = useDocumentStore();
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

  // Restore chat history from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }>;
      if (saved.length > 0) setMessages(saved);
    } catch {
      // Corrupt storage — leave default welcome message in place
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /**
   * Parse any floor plan JSON out of an AI response and materialise it on the
   * canvas as space + wall elements.
   *
   * Returns [roomCount, wallCount].
   */
  const applyFloorPlan = useCallback((content: string): [number, number] => {
    const state = useDocumentStore.getState();
    if (!state.document) return [0, 0];

    const plan = extractFloorPlan(content);
    if (!plan || plan.rooms.length === 0) return [0, 0];

    const layerIds = Object.keys(state.document.organization.layers);
    if (layerIds.length === 0) return [0, 0];
    const layerId = layerIds[0]!;

    state.pushHistory('Before AI floor plan');

    // ── Pass 1: collect unique wall edges across all rooms ──────────────────
    // Two adjacent rooms share an edge — we deduplicate by normalised key so
    // only one wall element is created for each physical boundary.
    const seenEdges = new Set<string>();
    const wallEdges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (const room of plan.rooms) {
      const x = (room.x ?? 0) * FT_TO_MM;
      const y = (room.y ?? 0) * FT_TO_MM;
      const w = (room.width_ft ?? 10) * FT_TO_MM;
      const h = (room.depth_ft ?? 10) * FT_TO_MM;

      const roomEdges = [
        { x1: x,     y1: y,     x2: x + w, y2: y },      // south
        { x1: x + w, y1: y,     x2: x + w, y2: y + h },  // east
        { x1: x,     y1: y + h, x2: x + w, y2: y + h },  // north
        { x1: x,     y1: y,     x2: x,     y2: y + h },  // west
      ];

      for (const edge of roomEdges) {
        const k = edgeKey(edge.x1, edge.y1, edge.x2, edge.y2);
        if (!seenEdges.has(k)) {
          seenEdges.add(k);
          wallEdges.push(edge);
        }
      }
    }

    // ── Pass 2: add space elements (floor semantics + 2D labels) ───────────
    let rooms = 0;
    for (const room of plan.rooms) {
      const x = (room.x ?? 0) * FT_TO_MM;
      const y = (room.y ?? 0) * FT_TO_MM;
      const w = (room.width_ft ?? 10) * FT_TO_MM;
      const h = (room.depth_ft ?? 10) * FT_TO_MM;
      const areaSqft = room.area_sqft ?? Math.round((w / FT_TO_MM) * (h / FT_TO_MM));

      state.addElement({
        type: 'space',
        layerId,
        properties: {
          StartX:   { type: 'number', value: x },
          StartY:   { type: 'number', value: y },
          EndX:     { type: 'number', value: x + w },
          EndY:     { type: 'number', value: y + h },
          Name:     { type: 'string', value: room.name ?? 'Room' },
          AreaSqft: { type: 'number', value: areaSqft },
        },
      });
      rooms++;
    }

    // ── Pass 3: add wall elements for every unique edge ─────────────────────
    for (const edge of wallEdges) {
      state.addElement({
        type: 'wall',
        layerId,
        properties: {
          StartX: { type: 'number', value: edge.x1 },
          StartY: { type: 'number', value: edge.y1 },
          EndX:   { type: 'number', value: edge.x2 },
          EndY:   { type: 'number', value: edge.y2 },
          Height: { type: 'number', value: WALL_HEIGHT_MM },
          Width:  { type: 'number', value: WALL_THICKNESS_MM },
        },
      });
    }

    state.pushHistory('AI floor plan applied');
    return [rooms, wallEdges.length];
  }, [storeAddElement, pushHistory]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const userText = (overrideText ?? input).trim();
    if (!userText || isLoading) return;
    if (!overrideText) setInput('');
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
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

    // Append live project context to the user message so Claude can give
    // specific answers about the current model. BIM_SYSTEM_PROMPT is already
    // passed as the Anthropic `system` param — do NOT duplicate it here.
    const ctx = buildContext();
    const systemAugmentedPrompt = ctx
      ? `${userText}\n\n[OpenCAD Project Context]\n${ctx}`
      : userText;

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
      // Bridge: apply any floor plan JSON to the canvas
      const [roomsAdded, wallsAdded] = applyFloorPlan(accumulated);
      const finalContent = roomsAdded > 0
        ? `${accumulated}\n\n---\n_Applied to canvas: ${roomsAdded} room${roomsAdded !== 1 ? 's' : ''}, ${wallsAdded} wall${wallsAdded !== 1 ? 's' : ''}. Switch to 3D view to see the model. Use Ctrl+Z to undo._`
        : accumulated || '(no response)';

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: finalContent, streaming: false } : m
        )
      );
      client.saveHistory([
        ...history,
        { id: userMessage.id, role: 'user', content: userText, timestamp: userMessage.timestamp },
        { id: assistantId, role: 'assistant', content: finalContent, timestamp: Date.now() },
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
  }, [input, isLoading, isConfigured, messages, buildClient, buildContext, applyFloorPlan]);

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

  const handleClearHistory = () => {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Chat history cleared. How can I help you?",
      timestamp: Date.now(),
    }]);
  };

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
          <button className="chat-icon-btn" onClick={handleClearHistory} title="Clear chat history" aria-label="Clear history">
            <Trash2 size={15} />
          </button>
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
                {msg.role === 'assistant'
                  ? msg.streaming
                    // During streaming: plain text so partial markdown delimiters don't bleed through
                    ? <span className="streaming-raw">{msg.content}</span>
                    // After streaming: full markdown render
                    : renderMarkdown(msg.content)
                  : msg.content.split('\n').map((line, i) => (
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
          <button key={prompt} className="suggestion-btn" onClick={() => void handleSend(prompt)}>
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
