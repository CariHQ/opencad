import React from 'react';

interface Tool {
  id: string;
  name: string;
  icon: string;
  shortcut: string;
  category: 'structure' | 'opening' | '楼层' | 'annotation' | 'modify';
}

const tools: Tool[] = [
  { id: 'select', name: 'Select', icon: '↖', shortcut: 'V', category: 'modify' },
  { id: 'wall', name: 'Wall', icon: '▮', shortcut: 'W', category: 'structure' },
  { id: 'column', name: 'Column', icon: '⬡', shortcut: 'C', category: 'structure' },
  { id: 'beam', name: 'Beam', icon: '═', shortcut: 'B', category: 'structure' },
  { id: 'slab', name: 'Slab', icon: '▬', shortcut: 'S', category: 'structure' },
  { id: 'roof', name: 'Roof', icon: '⌒', shortcut: 'R', category: 'structure' },
  { id: 'stair', name: 'Stair', icon: '⇉', shortcut: 'T', category: 'structure' },
  { id: 'door', name: 'Door', icon: '⊟', shortcut: 'D', category: 'opening' },
  { id: 'window', name: 'Window', icon: '▭', shortcut: 'N', category: 'opening' },
  { id: ' railing', name: 'Railing', icon: '⊓', shortcut: 'G', category: 'opening' },
  { id: 'dimension', name: 'Dimension', icon: '↔', shortcut: 'M', category: 'annotation' },
  { id: 'text', name: 'Text', icon: 'T', shortcut: 'X', category: 'annotation' },
];

const categories = [
  { id: 'modify', name: 'Modify', icon: '⚙' },
  { id: 'structure', name: 'Structure', icon: '🏗' },
  { id: 'opening', name: 'Openings', icon: '🚪' },
  { id: 'annotation', name: 'Annotate', icon: '📐' },
];

export function ToolShelf() {
  const [activeTool, setActiveTool] = React.useState('select');
  const [activeCategory, setActiveCategory] = React.useState('modify');

  const filteredTools = tools.filter((t) => t.category === activeCategory);

  return (
    <div className="toolshelf">
      <div className="toolshelf-categories">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
            title={cat.name}
          >
            <span className="category-icon">{cat.icon}</span>
          </button>
        ))}
      </div>
      <div className="toolshelf-divider" />
      <div className="toolshelf-tools">
        {filteredTools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.name} (${tool.shortcut})`}
          >
            <span className="tool-icon">{tool.icon}</span>
          </button>
        ))}
      </div>
      <div className="toolshelf-divider" />
      <div className="toolshelf-info">
        <span className="current-tool">{activeTool}</span>
      </div>
    </div>
  );
}
