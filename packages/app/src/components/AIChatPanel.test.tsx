/**
 * AIChatPanel component tests
 * T-AI-006: AI chat panel rendering and interactions
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIChatPanel } from './AIChatPanel';

// Mock the AI stream hook to avoid network calls
vi.mock('../hooks/useAIStream', () => ({
  AIStreamClient: vi.fn().mockImplementation(() => ({
    stream: vi.fn().mockImplementation(async function* () {}),
    saveHistory: vi.fn(),
    loadHistory: vi.fn().mockReturnValue([]),
  })),
  createAnthropicProvider: vi.fn().mockReturnValue({}),
  createOllamaProvider: vi.fn().mockReturnValue({}),
  createOpenAICompatibleProvider: vi.fn().mockReturnValue({}),
}));

// Mock the document store — also expose getState() so module-level helpers
// (dispatchTools, applyFloorPlan) can call it without crashing.
// vi.hoisted ensures the value is available before the hoisted vi.mock factory runs.
const _mockStoreState = vi.hoisted(() => ({
  document: {
    id: 'test-project',
    name: 'Test Project',
    content: { elements: {}, spaces: {} },
    organization: { layers: {}, levels: {} },
  },
  addElement: vi.fn(),
  deleteElement: vi.fn(),
  pushHistory: vi.fn(),
  loadDocumentSchema: vi.fn(),
}));
vi.mock('../stores/documentStore', () => {
  // Selector-aware: when called with a selector fn, apply it to the state.
  const hook = vi.fn((selector?: unknown) =>
    typeof selector === 'function' ? (selector as (s: typeof _mockStoreState) => unknown)(_mockStoreState) : _mockStoreState,
  );
  return {
    useDocumentStore: Object.assign(hook, { getState: vi.fn().mockReturnValue(_mockStoreState) }),
  };
});

// Mock @opencad/ai so /plan doesn't hit the network.
vi.mock('@opencad/ai', () => ({
  generateProject: vi.fn(async ({ prompt }: { prompt: string }) => ({
    document: {
      id: 'gen-1',
      name: `Generated: ${prompt}`,
      content: { elements: { w1: { id: 'w1', type: 'wall' } }, spaces: {} },
      organization: { layers: {}, levels: {} },
    },
    description: 'Test fixture',
    warnings: [],
    validation: [],
  })),
}));

describe('T-AI-006: AIChatPanel', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // jsdom doesn't implement scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders the AI Assistant title', () => {
    render(<AIChatPanel onClose={onClose} />);
    expect(screen.getAllByText(/AI Assistant/i).length).toBeGreaterThan(0);
  });

  it('renders initial greeting message', () => {
    render(<AIChatPanel onClose={onClose} />);
    expect(screen.getByText(/Hello! I'm your OpenCAD AI assistant/i)).toBeInTheDocument();
  });

  it('renders textarea for user input', () => {
    render(<AIChatPanel onClose={onClose} />);
    expect(screen.getByPlaceholderText(/Configure AI provider to chat/i)).toBeInTheDocument();
  });

  it('renders Send button', () => {
    render(<AIChatPanel onClose={onClose} />);
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('renders suggested prompts', () => {
    render(<AIChatPanel onClose={onClose} />);
    expect(screen.getByText(/\/plan a two-bedroom cottage/i)).toBeInTheDocument();
  });

  it('renders settings button', () => {
    render(<AIChatPanel onClose={onClose} />);
    expect(screen.getByRole('button', { name: /configure AI/i })).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<AIChatPanel onClose={onClose} />);
    expect(screen.getByRole('button', { name: /close ai chat/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<AIChatPanel onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close ai chat/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows setup banner when not configured', () => {
    render(<AIChatPanel onClose={onClose} />);
    expect(screen.getByText(/Configure an AI provider to enable chat/i)).toBeInTheDocument();
  });

  it('Set up button opens config panel', () => {
    render(<AIChatPanel onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /set up AI provider/i }));
    expect(screen.getByText(/AI Provider Setup/i)).toBeInTheDocument();
  });

  it('settings button opens config panel', () => {
    render(<AIChatPanel onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /configure AI/i }));
    expect(screen.getByText(/AI Provider Setup/i)).toBeInTheDocument();
  });

  it('typing in input updates the textarea value', () => {
    render(<AIChatPanel onClose={onClose} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'How many walls?' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('How many walls?');
  });

  it('clicking a suggestion fills the input', () => {
    render(<AIChatPanel onClose={onClose} />);
    fireEvent.click(screen.getByText(/Check building code compliance/i));
    // feat branch: suggestions fill the input (not auto-send)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/Check building code compliance/i);
  });

  it('Send button is disabled when input is empty', () => {
    render(<AIChatPanel onClose={onClose} />);
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('Send button is enabled when input has text', () => {
    render(<AIChatPanel onClose={onClose} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    expect(screen.getByRole('button', { name: /send message/i })).not.toBeDisabled();
  });

  describe('/plan slash command', () => {
    it('sends /plan through generateProject and loads the returned schema', async () => {
      const { generateProject } = await import('@opencad/ai');
      render(<AIChatPanel onClose={onClose} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '/plan a tiny studio' } });
      fireEvent.click(screen.getByRole('button', { name: /send message/i }));
      // The slash-command branch runs synchronously enough that the echoed
      // user message and the "Loaded" / "Generating" assistant message
      // both appear after microtask flush.
      await new Promise((r) => setTimeout(r, 0));
      expect(generateProject).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'a tiny studio' }),
      );
      expect(_mockStoreState.loadDocumentSchema).toHaveBeenCalledTimes(1);
      expect(await screen.findByText(/Loaded 1 element/i)).toBeInTheDocument();
    });
  });

  describe('Config panel', () => {
    it('shows provider select in config panel', () => {
      render(<AIChatPanel onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /configure AI/i }));
      expect(screen.getByLabelText(/Provider/i)).toBeInTheDocument();
    });

    it('shows API key field for Anthropic provider', () => {
      render(<AIChatPanel onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /configure AI/i }));
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    it('shows Save Configuration button', () => {
      render(<AIChatPanel onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /configure AI/i }));
      expect(screen.getByRole('button', { name: /save ai configuration/i })).toBeInTheDocument();
    });

    it('saves config to localStorage on save', () => {
      render(<AIChatPanel onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /configure AI/i }));
      const apiKeyInput = screen.getByLabelText(/API Key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-test-key' } });
      fireEvent.click(screen.getByRole('button', { name: /save ai configuration/i }));
      const stored = localStorage.getItem('opencad-ai-config');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).apiKey).toBe('sk-ant-test-key');
    });

    it('closes config on save', () => {
      render(<AIChatPanel onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /configure AI/i }));
      fireEvent.click(screen.getByRole('button', { name: /save ai configuration/i }));
      expect(screen.queryByText(/AI Provider Setup/i)).not.toBeInTheDocument();
    });

    it('switching to Ollama shows Ollama base URL field', () => {
      render(<AIChatPanel onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /configure AI/i }));
      const providerSelect = screen.getByLabelText(/Provider/i);
      fireEvent.change(providerSelect, { target: { value: 'ollama' } });
      expect(screen.getByLabelText(/Ollama base URL/i)).toBeInTheDocument();
    });
  });
});
