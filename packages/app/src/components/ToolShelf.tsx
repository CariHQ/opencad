import React, { useState, useCallback } from 'react';
import {
  MousePointer2,
  Square,
  DoorOpen,
  Fence,
  Ruler,
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
  Spline,
  Type,
  Tag,
  MapPin,
  Scissors,
  Camera,
  Crop,
  Sun,
  Wind,
  Lightbulb,
  Columns3,
  Waves,
  Blinds,
  ArrowUpRight,
  BoxSelect,
  Cloud,
  Combine,
  Droplet,
  Fan,
  MoveHorizontal,
  Mountain,
  TextCursorInput,
  LandPlot,
  GitBranch,
  PanelBottom,
  Layers3,
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
  // ── Selection ──
  { id: 'select',       name: 'Select',       icon: MousePointer2,       shortcut: 'V' },

  // ── 2D drafting ──
  { id: 'line',         name: 'Line',         icon: Minus,               shortcut: 'L', separatorBefore: true },
  { id: 'rectangle',    name: 'Rectangle',    icon: Square,              shortcut: 'R' },
  { id: 'circle',       name: 'Circle',       icon: Circle,              shortcut: 'C' },
  { id: 'arc',          name: 'Arc',          icon: Slash,               shortcut: 'A' },
  { id: 'ellipse',      name: 'Ellipse',      icon: Circle,              shortcut: 'E' },
  { id: 'polygon',      name: 'Polygon',      icon: Pentagon,            shortcut: 'P' },
  { id: 'polyline',     name: 'Polyline',     icon: Waves,               shortcut: 'Y' },
  { id: 'spline',       name: 'Spline',       icon: Spline,              shortcut: 'Shift+S' },
  { id: 'hotspot',      name: 'Hotspot',      icon: MapPin,              shortcut: 'H' },

  // ── Structural / BIM ──
  { id: 'wall',         name: 'Wall',         icon: RectangleVertical,   shortcut: 'W', separatorBefore: true },
  { id: 'curtain_wall', name: 'Curtain Wall', icon: Blinds,              shortcut: 'Shift+W' },
  { id: 'column',       name: 'Column',       icon: Cylinder,            shortcut: 'K' },
  { id: 'beam',         name: 'Beam',         icon: RectangleHorizontal, shortcut: 'B' },
  { id: 'slab',         name: 'Slab',         icon: Square,              shortcut: 'S' },
  { id: 'roof',         name: 'Roof',         icon: Triangle,            shortcut: 'O' },
  { id: 'stair',        name: 'Stair',        icon: Footprints,          shortcut: 'T' },
  { id: 'ramp',         name: 'Ramp',         icon: ArrowUpRight,        shortcut: 'Shift+R' },
  { id: 'railing',      name: 'Railing',      icon: Fence,               shortcut: 'G' },
  { id: 'ceiling',      name: 'Ceiling',      icon: PanelBottom,         shortcut: 'Shift+C' },
  { id: 'foundation',   name: 'Foundation',   icon: Layers3,             shortcut: 'Shift+F' },
  { id: 'zone',         name: 'Zone',         icon: Columns3,            shortcut: 'Z' },
  { id: 'truss',        name: 'Truss',        icon: GitBranch,           shortcut: 'Shift+T' },
  { id: 'brace',        name: 'Brace',        icon: Slash,               shortcut: 'Shift+B' },
  { id: 'mass',         name: 'Mass',         icon: BoxSelect,           shortcut: 'Shift+M' },

  // ── Openings ──
  { id: 'door',         name: 'Door',         icon: DoorOpen,            shortcut: 'D', separatorBefore: true },
  { id: 'window',       name: 'Window',       icon: AppWindow,           shortcut: 'N' },
  { id: 'skylight',     name: 'Skylight',     icon: Sun,                 shortcut: 'Shift+N' },

  // ── MEP ──
  { id: 'duct',         name: 'Duct',         icon: Wind,                shortcut: 'U', separatorBefore: true },
  { id: 'pipe',         name: 'Pipe',         icon: Minus,               shortcut: 'I' },
  { id: 'cable_tray',   name: 'Cable Tray',   icon: MoveHorizontal,      shortcut: 'Shift+U' },
  { id: 'conduit',      name: 'Conduit',      icon: Combine,             shortcut: 'Shift+I' },
  { id: 'lamp',         name: 'Lamp',         icon: Lightbulb,           shortcut: 'Shift+L' },
  { id: 'air_terminal', name: 'Air Terminal', icon: Fan,                 shortcut: 'Shift+A' },
  { id: 'sprinkler',    name: 'Sprinkler',    icon: Droplet,             shortcut: 'Shift+K' },

  // ── Site ──
  { id: 'topo',         name: 'Topography',   icon: Mountain,            shortcut: 'Shift+O', separatorBefore: true },
  { id: 'property_line',name: 'Property Line',icon: LandPlot,            shortcut: 'Shift+P' },
  { id: 'room_separator', name: 'Room Separator', icon: Minus,           shortcut: 'Shift+H' },

  // ── Documentation ──
  { id: 'dimension',    name: 'Dimension',    icon: Ruler,               shortcut: 'M', separatorBefore: true },
  { id: 'text',         name: 'Text',         icon: Type,                shortcut: 'X' },
  { id: 'model_text',   name: 'Model Text',   icon: TextCursorInput,     shortcut: 'Shift+X' },
  { id: 'label',        name: 'Label',        icon: Tag,                 shortcut: 'F' },
  { id: 'section',      name: 'Section',      icon: Scissors,            shortcut: 'Shift+E' },
  { id: 'elevation',    name: 'Elevation',    icon: Camera,              shortcut: 'Shift+V' },
  { id: 'detail',       name: 'Detail',       icon: Crop,                shortcut: 'Shift+D' },
  { id: 'revision_cloud', name: 'Revision Cloud', icon: Cloud,           shortcut: 'Shift+Z' },
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
