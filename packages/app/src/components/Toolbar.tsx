import React from 'react';
import {
  MousePointer2,
  Minus,
  Square,
  Circle,
  DoorOpen,
  AppWindow,
  Ruler,
  Type,
  Square as WallIcon,
} from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';

interface Tool {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

const tools: Tool[] = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'wall', label: 'Wall', icon: WallIcon },
  { id: 'door', label: 'Door', icon: DoorOpen },
  { id: 'window', label: 'Window', icon: AppWindow },
  { id: 'dimension', label: 'Dimension', icon: Ruler },
  { id: 'text', label: 'Text', icon: Type },
];

export function Toolbar() {
  const { activeTool, setActiveTool } = useDocumentStore();

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">Tools</span>
        <div className="toolbar-tools">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                className={`toolbar-button ${activeTool === tool.id ? 'active' : ''}`}
                onClick={() => setActiveTool(tool.id)}
                title={tool.label}
              >
                <span className="tool-icon">
                  <Icon size={16} />
                </span>
                <span className="tool-label">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
