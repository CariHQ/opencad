import React, { useState, useCallback } from 'react';
import {
  MousePointer2,
  Square,
  ArrowUpDown,
  DoorOpen,
  Fence,
  Ruler,
  Type,
  Circle,
  Hexagon,
  Minus,
  RectangleHorizontal,
  Pentagon,
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
  { id: 'select',    name: 'Select',    icon: MousePointer2,      shortcut: 'V' },
  { id: 'line',      name: 'Line',      icon: Minus,              shortcut: 'L' },
  { id: 'rectangle', name: 'Rectangle', icon: Square,             shortcut: 'R' },
  { id: 'circle',    name: 'Circle',    icon: Circle,             shortcut: 'C' },
  { id: 'arc',       name: 'Arc',       icon: Spline,             shortcut: 'A' },
  { id: 'spline',    name: 'Spline',    icon: Spline,             shortcut: 'U' },
  { id: 'polygon',   name: 'Polygon',   icon: Pentagon,           shortcut: 'P' },
  { id: 'wall',      name: 'Wall',      icon: RectangleVertical,  shortcut: 'W' },
  { id: 'column',    name: 'Column',    icon: Hexagon,            shortcut: 'K' },
  { id: 'beam',      name: 'Beam',      icon: StretchHorizontal,  shortcut: 'B' },
  { id: 'slab',      name: 'Slab',      icon: RectangleHorizontal, shortcut: 'S' },
  { id: 'roof',      name: 'Roof',      icon: Triangle,           shortcut: 'O' },
  { id: 'stair',     name: 'Stair',     icon: ArrowUpDown,        shortcut: 'T' },
  { id: 'door',      name: 'Door',      icon: DoorOpen,           shortcut: 'D' },
  { id: 'window',    name: 'Window',    icon: AppWindow,          shortcut: 'N' },
  { id: 'railing',      name: 'Railing',      icon: Fence,       shortcut: 'G' },
  { id: 'curtain_wall', name: 'Curtain Wall', icon: LayoutGrid, shortcut: 'J' },
  { id: 'dimension',    name: 'Dimension',    icon: Ruler,       shortcut: 'M' },
  { id: 'text',      name: 'Text',      icon: Type,               shortcut: 'X' },
  { id: 'polyline',  name: 'Polyline',  icon: PenLine,            shortcut: 'Y' },
];

const categories = [
  { id: 'modify', name: 'Modify', icon: Settings },
  { id: 'draw', name: 'Draw', icon: Square },
  { id: 'structure', name: 'Structure', icon: Boxes },
  { id: 'opening', name: 'Openings', icon: DoorOpen },
  { id: 'annotation', name: 'Annotate', icon: FileText },
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
    <div className={classNames} onDoubleClick={handleDoubleClick}>
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
              <Icon size={16} strokeWidth={activeTool === tool.id ? 2.5 : 1.5} />
              {expanded && <span className="tool-name">{tool.name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
