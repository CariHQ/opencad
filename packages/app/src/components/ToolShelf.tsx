import React from 'react';
import {
  MousePointer2,
  Square,
  GitCommit,
  Home,
  ArrowUpDown,
  DoorOpen,
  Fence,
  Ruler,
  Type,
  Settings,
  Boxes,
  FileText,
  Circle,
  Hexagon,
  Minus,
  RectangleHorizontal,
  Maximize2,
  Pentagon,
} from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';

interface Tool {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  shortcut: string;
  category: 'structure' | 'opening' | 'annotation' | 'modify' | 'draw';
}

const tools: Tool[] = [
  { id: 'select', name: 'Select', icon: MousePointer2, shortcut: 'V', category: 'modify' },
  { id: 'line', name: 'Line', icon: Minus, shortcut: 'L', category: 'draw' },
  { id: 'rectangle', name: 'Rectangle', icon: Square, shortcut: 'R', category: 'draw' },
  { id: 'circle', name: 'Circle', icon: Circle, shortcut: 'C', category: 'draw' },
  { id: 'arc', name: 'Arc', icon: Maximize2, shortcut: 'A', category: 'draw' },
  { id: 'polygon', name: 'Polygon', icon: Pentagon, shortcut: 'P', category: 'draw' },
  { id: 'wall', name: 'Wall', icon: Square, shortcut: 'W', category: 'structure' },
  { id: 'column', name: 'Column', icon: Hexagon, shortcut: 'K', category: 'structure' },
  { id: 'beam', name: 'Beam', icon: GitCommit, shortcut: 'B', category: 'structure' },
  { id: 'slab', name: 'Slab', icon: RectangleHorizontal, shortcut: 'S', category: 'structure' },
  { id: 'roof', name: 'Roof', icon: Home, shortcut: 'O', category: 'structure' },
  { id: 'stair', name: 'Stair', icon: ArrowUpDown, shortcut: 'T', category: 'structure' },
  { id: 'door', name: 'Door', icon: DoorOpen, shortcut: 'D', category: 'opening' },
  { id: 'window', name: 'Window', icon: Square, shortcut: 'N', category: 'opening' },
  { id: 'railing', name: 'Railing', icon: Fence, shortcut: 'G', category: 'opening' },
  { id: 'dimension', name: 'Dimension', icon: Ruler, shortcut: 'M', category: 'annotation' },
  { id: 'text', name: 'Text', icon: Type, shortcut: 'X', category: 'annotation' },
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
  const [activeCategory, setActiveCategory] = React.useState<string>(() => {
    try { return localStorage.getItem('opencad-activeCategory') ?? 'modify'; } catch { return 'modify'; }
  });

  // When activeTool changes (e.g. via keyboard shortcut), sync the category panel
  React.useEffect(() => {
    const toolDef = tools.find((t) => t.id === activeTool);
    if (toolDef) {
      setActiveCategory(toolDef.category);
      try { localStorage.setItem('opencad-activeCategory', toolDef.category); } catch { /* ignore */ }
    }
  }, [activeTool]);

  const handleSetCategory = (catId: string) => {
    setActiveCategory(catId);
    try { localStorage.setItem('opencad-activeCategory', catId); } catch { /* ignore */ }
  };

  const filteredTools = tools.filter((t) => t.category === activeCategory);

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
                <Icon size={18} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="toolshelf-divider" />
      <div className="toolshelf-tools">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.name} (${tool.shortcut})`}
            >
              <span className="tool-icon">
                <Icon size={18} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="toolshelf-active-label">{activeTool}</div>
    </div>
  );
}
