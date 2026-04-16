import React, { useState, useCallback } from 'react';
import {
  MousePointer2,
  Square,
  ArrowUpDown,
  DoorOpen,
  Fence,
  Ruler,
  Type,
  Boxes,
  Circle,
  Hexagon,
  Minus,
  RectangleHorizontal,
  Pentagon,
  Move,
  PenLine,
  AppWindow,
  Baseline,
  RectangleVertical,
  StretchHorizontal,
  Triangle,
  Spline,
} from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import { useRole } from '../hooks/useRole';

const EXPANDED_KEY = 'opencad-toolshelf-expanded';

// Clear any stale drag position that would make the toolbar float over the UI
try { localStorage.removeItem('opencad-toolshelf-pos'); } catch { /**/ }

function readStoredExpanded(): boolean {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    return raw ? (JSON.parse(raw) as boolean) : false;
  } catch {
    return false;
  }
}

interface Tool {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  shortcut: string;
}

const tools: Tool[] = [
  { id: 'select', name: 'Select', icon: MousePointer2, shortcut: 'V', category: 'modify' },
  { id: 'line', name: 'Line', icon: Minus, shortcut: 'L', category: 'draw' },
  { id: 'rectangle', name: 'Rectangle', icon: Square, shortcut: 'R', category: 'draw' },
  { id: 'circle', name: 'Circle', icon: Circle, shortcut: 'C', category: 'draw' },
  { id: 'arc', name: 'Arc', icon: Spline, shortcut: 'A', category: 'draw' },
  { id: 'polygon', name: 'Polygon', icon: Pentagon, shortcut: 'P', category: 'draw' },
  { id: 'wall', name: 'Wall', icon: RectangleVertical, shortcut: 'W', category: 'structure' },
  { id: 'column', name: 'Column', icon: Hexagon, shortcut: 'K', category: 'structure' },
  { id: 'beam', name: 'Beam', icon: StretchHorizontal, shortcut: 'B', category: 'structure' },
  { id: 'slab', name: 'Slab', icon: RectangleHorizontal, shortcut: 'S', category: 'structure' },
  { id: 'roof', name: 'Roof', icon: Triangle, shortcut: 'O', category: 'structure' },
  { id: 'stair', name: 'Stair', icon: ArrowUpDown, shortcut: 'T', category: 'structure' },
  { id: 'door', name: 'Door', icon: DoorOpen, shortcut: 'D', category: 'opening' },
  { id: 'window', name: 'Window', icon: AppWindow, shortcut: 'N', category: 'opening' },
  { id: 'railing', name: 'Railing', icon: Fence, shortcut: 'G', category: 'opening' },
  { id: 'dimension', name: 'Dimension', icon: Ruler, shortcut: 'M', category: 'annotation' },
  { id: 'text', name: 'Text', icon: Type, shortcut: 'X', category: 'annotation' },
];

const categories = [
  { id: 'modify', name: 'Modify', icon: Move },
  { id: 'draw', name: 'Draw', icon: PenLine },
  { id: 'structure', name: 'Structure', icon: Boxes },
  { id: 'opening', name: 'Openings', icon: AppWindow },
  { id: 'annotation', name: 'Annotate', icon: Baseline },
];

export function ToolShelf() {
  const { activeTool, setActiveTool } = useDocumentStore();
  const { can } = useRole();
  const [expanded, setExpanded] = useState<boolean>(() => readStoredExpanded());

  const handleDoubleClick = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(next)); } catch { /**/ }
  }, [expanded]);

  const allowedTools = tools.filter((t) => can(`tool:${t.id}`));

  const classNames = [
    'toolshelf',
    expanded ? 'toolshelf--expanded' : '',
    allowedTools.length === 0 ? 'toolshelf--empty' : '',
  ].filter(Boolean).join(' ');

  if (allowedTools.length === 0) {
    return <div className={classNames} />;
  }

  return (
    <div className="toolshelf">
      <div className="toolshelf-categories">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => handleSetCategory(cat.id)}
              title={cat.name}
            >
              <span className="tool-icon">
                <Icon size={16} strokeWidth={2} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="toolshelf-divider" />
      <div className="toolshelf-tools">
        {allowedTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`tool-btn${activeTool === tool.id ? ' active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.name} (${tool.shortcut})`}
            >
              <span className="tool-icon">
                <Icon size={16} strokeWidth={2} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
