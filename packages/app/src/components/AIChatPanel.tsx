import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, X } from 'lucide-react';
import { FloorPlanGenerator } from '@opencad/ai';
import { useDocumentStore } from '../stores/documentStore';

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

const suggestedPrompts = [
  'Design a residential floor plan',
  'Add a staircase to level 2',
  'Check building code compliance',
  'Generate quantity takeoff',
  'Create a section view',
];

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // T-AI-001: Floor plan generation path — uses FloorPlanGenerator when
    // an Anthropic API key is configured and the message looks like a floor plan request.
    const anthropicApiKey = import.meta.env['VITE_ANTHROPIC_API_KEY'] as string | undefined;
    if (isFloorPlanRequest(input) && anthropicApiKey) {
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: 'Generating floor plan…', timestamp: Date.now() },
      ]);
      const generator = new FloorPlanGenerator({ apiKey: anthropicApiKey });
      try {
        const schema = await generator.generateFloorPlan(input);
        loadDocumentSchema(schema);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Floor plan generated and loaded into the canvas. Switch to 2D view to see the layout.' }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-chat-panel">
      <div className="chat-header">
        <span className="chat-title">AI Assistant</span>
        <button className="chat-close" onClick={onClose} aria-label="Close AI chat">
          <X size={18} />
        </button>
      </div>

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
          placeholder="Ask me anything..."
          rows={2}
        />
        <button className="chat-send" onClick={handleSend} disabled={!input.trim() || isLoading}>
          Send
        </button>
      </div>
    </div>
  );
}
