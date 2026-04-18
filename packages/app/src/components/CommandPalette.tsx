import React, { useState, useCallback, useMemo } from 'react';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
  onExecute: (command: Command) => void;
}

const BUILT_IN_COMMANDS: Omit<Command, 'action'>[] = [
  { id: 'select', label: 'Select', shortcut: 'V', category: 'Tools' },
  { id: 'wall', label: 'Wall', shortcut: 'W', category: 'Tools' },
  { id: 'door', label: 'Door', shortcut: 'D', category: 'Tools' },
  { id: 'window', label: 'Window', shortcut: 'N', category: 'Tools' },
  { id: 'slab', label: 'Slab', shortcut: 'S', category: 'Tools' },
  { id: 'column', label: 'Column', shortcut: 'C', category: 'Tools' },
  { id: 'beam', label: 'Beam', shortcut: 'B', category: 'Tools' },
  { id: 'stair', label: 'Stair', category: 'Tools' },
  { id: 'railing', label: 'Railing', category: 'Tools' },
  { id: 'line', label: 'Line', shortcut: 'L', category: '2D Tools' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', category: '2D Tools' },
  { id: 'circle', label: 'Circle', category: '2D Tools' },
  { id: 'text', label: 'Text', shortcut: 'T', category: '2D Tools' },
  { id: 'view-3d', label: '3D View', category: 'Views' },
  { id: 'view-top', label: 'Top View', category: 'Views' },
  { id: 'view-front', label: 'Front View', category: 'Views' },
  { id: 'undo', label: 'Undo', shortcut: '⌘Z', category: 'Edit' },
  { id: 'redo', label: 'Redo', shortcut: '⌘⇧Z', category: 'Edit' },
];

function fuzzyMatch(query: string, label: string): boolean {
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (l.includes(q)) return true;
  // Simple fuzzy: each char of query must appear in order in label
  let qi = 0;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette({ onClose, onExecute }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isAiMode = query.startsWith('>');
  const searchQuery = isAiMode ? query.slice(1).trim() : query.trim();

  const commands: Command[] = useMemo(
    () => BUILT_IN_COMMANDS.map((c) => ({ ...c, action: () => onExecute({ ...c, action: () => {} }) })),
    [onExecute]
  );

  const results = useMemo(() => {
    if (isAiMode) return [{ id: '__ai__', label: `AI: ${searchQuery || '…'}`, isAi: true, shortcut: undefined, command: undefined }];
    const filtered = searchQuery === '' ? commands : commands.filter((c) => fuzzyMatch(searchQuery, c.label));
    return filtered.map((c) => ({ id: c.id, label: c.label, shortcut: c.shortcut, isAi: false, command: c }));
  }, [isAiMode, searchQuery, commands]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        const item = results[selectedIndex];
        if (item?.command) {
          item.command.action();
        } else if (item?.isAi) {
          onExecute({ id: '__ai__', label: item.label, category: 'AI', action: () => {} });
        }
      }
    },
    [results, selectedIndex, onClose, onExecute]
  );

  return (
    <div className="command-palette" role="dialog" aria-label="Command Palette">
      <input
        role="combobox"
        aria-autocomplete="list"
        aria-controls="command-palette-listbox"
        aria-expanded={results.length > 0}
        className="command-palette-input"
        placeholder="Search commands, tools, views…"
        value={query}
        autoFocus
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedIndex(0);
        }}
        onKeyDown={handleKeyDown}
      />
      <ul
        id="command-palette-listbox"
        role="listbox"
        className="command-palette-results"
      >
        {results.length === 0 && !isAiMode && (
          <li className="command-palette-empty">No commands found</li>
        )}
        {results.map((item, idx) => (
          <li
            key={item.id}
            role="option"
            aria-selected={idx === selectedIndex}
            className={`command-palette-option ${idx === selectedIndex ? 'selected' : ''}`}
            onClick={() => {
              if (item.command) {
                item.command.action();
              } else if (item.isAi) {
                onExecute({ id: '__ai__', label: item.label, category: 'AI', action: () => {} });
              }
            }}
          >
            <span className="command-palette-label">{item.label}</span>
            {item.shortcut && (
              <span className="command-palette-shortcut">{item.shortcut}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
