import React, { useState, useCallback } from 'react';
import {
  MousePointer2,
  Square,
  DoorOpen,
  Fence,
  Ruler,
  Type,
  Circle,
  Minus,
  RectangleHorizontal,
  Pentagon,
  AppWindow,
  RectangleVertical,
  Triangle,
  Cylinder,
  Footprints,
  Slash,
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
  /** Render a horizontal separator above this tool to group related ones. */
  separatorBefore?: boolean;
}

const tools: Tool[] = [
  // ── Selection / navigation ──
  { id: 'select',    name: 'Select',    icon: MousePointer2,     shortcut: 'V' },

  // ── 2D drafting ──
  { id: 'line',      name: 'Line',      icon: Minus,             shortcut: 'L', separatorBefore: true },
  { id: 'rectangle', name: 'Rectangle', icon: Square,            shortcut: 'R' },
  { id: 'circle',    name: 'Circle',    icon: Circle,            shortcut: 'C' },
  { id: 'arc',       name: 'Arc',       icon: Slash,             shortcut: 'A' },
  { id: 'polygon',   name: 'Polygon',   icon: Pentagon,          shortcut: 'P' },

  // ── Structural / building ──
  { id: 'wall',      name: 'Wall',      icon: RectangleVertical, shortcut: 'W', separatorBefore: true },
  { id: 'column',    name: 'Column',    icon: Cylinder,          shortcut: 'K' },
  { id: 'beam',      name: 'Beam',      icon: RectangleHorizontal, shortcut: 'B' },
  { id: 'slab',      name: 'Slab',      icon: Square,            shortcut: 'S' },
  { id: 'roof',      name: 'Roof',      icon: Triangle,          shortcut: 'O' },
  { id: 'stair',     name: 'Stair',     icon: Footprints,        shortcut: 'T' },

  // ── Openings ──
  { id: 'door',      name: 'Door',      icon: DoorOpen,          shortcut: 'D', separatorBefore: true },
  { id: 'window',    name: 'Window',    icon: AppWindow,         shortcut: 'N' },
  { id: 'railing',   name: 'Railing',   icon: Fence,             shortcut: 'G' },

  // ── Annotation ──
  { id: 'dimension', name: 'Dimension', icon: Ruler,             shortcut: 'M', separatorBefore: true },
  { id: 'text',      name: 'Text',      icon: Type,              shortcut: 'X' },
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
      {allowedTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <React.Fragment key={tool.id}>
            {tool.separatorBefore && <div className="toolshelf-divider" />}
            <button
              className={`tool-btn${isActive ? ' active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.name} (${tool.shortcut})`}
              aria-pressed={isActive}
              aria-label={tool.name}
            >
              <span className="tool-icon">
                <Icon size={16} strokeWidth={2} />
              </span>
              {expanded && <span className="tool-name">{tool.name}</span>}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
