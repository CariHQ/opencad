import React from 'react';
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
  PenLine,
  AppWindow,
  RectangleVertical,
  StretchHorizontal,
  Triangle,
  Spline,
} from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import { useRole } from '../hooks/useRole';

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
  { id: 'railing',   name: 'Railing',   icon: Fence,              shortcut: 'G' },
  { id: 'dimension', name: 'Dimension', icon: Ruler,              shortcut: 'M' },
  { id: 'text',      name: 'Text',      icon: Type,               shortcut: 'X' },
  { id: 'polyline',  name: 'Polyline',  icon: PenLine,            shortcut: 'Y' },
];

export function ToolShelf() {
  const { activeTool, setActiveTool } = useDocumentStore();
  const { can } = useRole();

  const allowedTools = tools.filter((t) => can(`tool:${t.id}`));

  if (allowedTools.length === 0) {
    return <div className="toolshelf toolshelf--empty" />;
  }

  return (
    <div className="toolshelf">
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
