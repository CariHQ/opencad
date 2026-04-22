/**
 * HelpPanel — slide-out help overlay reachable from the toolbar
 * Help icon. Three tabs:
 *
 *   Shortcuts  — every keybinding grouped by category (tools, view,
 *                edit, navigation), with a search box.
 *   How To     — concise procedural recipes (draw a wall, place a
 *                door, run a section, export PDF, etc.).
 *   Tips       — surprising / delightful tricks (snap modifiers,
 *                power user moves).
 *
 * Plus a "Take the tour" button that re-runs the guided tour.
 */
import { useState, useMemo } from 'react';
import { X, Search, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

interface ShortcutEntry {
  keys: string;
  description: string;
  category: 'Tools' | 'View' | 'Edit' | 'Navigation' | 'Misc';
}

const SHORTCUTS: ShortcutEntry[] = [
  // Tools
  { keys: 'V',     description: 'Select tool',          category: 'Tools' },
  { keys: 'W',     description: 'Wall tool',            category: 'Tools' },
  { keys: 'D',     description: 'Door tool',            category: 'Tools' },
  { keys: 'N',     description: 'Window tool',          category: 'Tools' },
  { keys: 'S',     description: 'Slab tool',            category: 'Tools' },
  { keys: 'O',     description: 'Roof tool',            category: 'Tools' },
  { keys: 'K',     description: 'Column tool',          category: 'Tools' },
  { keys: 'B',     description: 'Beam tool',            category: 'Tools' },
  { keys: 'T',     description: 'Stair tool',           category: 'Tools' },
  { keys: 'G',     description: 'Railing tool',         category: 'Tools' },
  { keys: 'L',     description: 'Line tool',            category: 'Tools' },
  { keys: 'R',     description: 'Rectangle tool',       category: 'Tools' },
  { keys: 'C',     description: 'Circle tool',          category: 'Tools' },
  { keys: 'A',     description: 'Arc tool',             category: 'Tools' },
  { keys: 'P',     description: 'Polygon tool',         category: 'Tools' },
  { keys: 'M',     description: 'Dimension tool',       category: 'Tools' },

  // View
  { keys: '0',     description: 'Zoom to fit (3D)',                  category: 'View' },
  { keys: '1',     description: 'Top view (3D)',                     category: 'View' },
  { keys: '2',     description: 'Front elevation (3D)',              category: 'View' },
  { keys: '3',     description: 'Right elevation (3D)',              category: 'View' },
  { keys: '4',     description: 'Left elevation (3D)',               category: 'View' },
  { keys: 'Scroll',description: 'Zoom (cursor-anchored)',            category: 'View' },
  { keys: 'Middle-drag', description: 'Pan the view',                category: 'View' },
  { keys: '\\',    description: 'Toggle focus mode (hide chrome)',   category: 'View' },

  // Edit
  { keys: 'Ctrl+Z',         description: 'Undo',                     category: 'Edit' },
  { keys: 'Ctrl+Shift+Z',   description: 'Redo',                     category: 'Edit' },
  { keys: 'Ctrl+S',         description: 'Save snapshot',            category: 'Edit' },
  { keys: 'Ctrl+A',         description: 'Select all',               category: 'Edit' },
  { keys: 'Ctrl+D',         description: 'Deselect all',             category: 'Edit' },
  { keys: 'Ctrl+C',         description: 'Copy selection',           category: 'Edit' },
  { keys: 'Ctrl+V',         description: 'Paste',                    category: 'Edit' },
  { keys: 'Delete',         description: 'Delete selection',         category: 'Edit' },
  { keys: 'Esc',            description: 'Cancel current operation', category: 'Edit' },
  { keys: 'Enter',          description: 'Commit numeric values (coord box)', category: 'Edit' },
  { keys: 'Tab',            description: 'Cycle coord-box fields',   category: 'Edit' },
  { keys: 'Shift (drag)',   description: 'Lock dominant axis',       category: 'Edit' },
  { keys: 'Alt+click',      description: 'Pick up parameters (eyedropper)', category: 'Edit' },
  { keys: 'Alt+Shift+click',description: 'Inject held parameters',   category: 'Edit' },

  // Navigation
  { keys: 'Ctrl+[',  description: 'Toggle left panel',  category: 'Navigation' },
  { keys: 'Ctrl+]',  description: 'Toggle right panel', category: 'Navigation' },
  { keys: 'Ctrl+K',  description: 'Open command palette', category: 'Navigation' },

  // Misc
  { keys: '?',  description: 'Open this Help panel',    category: 'Misc' },
];

interface HowTo { title: string; steps: string[]; }
const HOW_TOS: HowTo[] = [
  {
    title: 'Draw your first wall',
    steps: [
      'Press W to activate the Wall tool.',
      'Click once on the canvas to set the start point.',
      'Move the cursor — type a length (e.g. 4500 or 4.5m), Tab to enter an angle, then Enter to commit.',
      'Or just click again to commit at the cursor position.',
    ],
  },
  {
    title: 'Place a door in a wall',
    steps: [
      'Press D for the Door tool.',
      'Hover over an existing wall — the door will host on it.',
      'Click to place. The door cuts through the wall automatically.',
    ],
  },
  {
    title: 'Build a multi-story tower',
    steps: [
      'Use the Levels selector (left panel) to create new stories.',
      'Walls inherit ElevationOffset from the active level.',
      'Switch the 3D view to All Stories to see the whole stack.',
    ],
  },
  {
    title: 'Generate a door schedule',
    steps: [
      'Open the Schedules tab in the right panel.',
      'Doors auto-tag (D-001, D-002…) the moment you draw them.',
      'Click any row to fly the camera to that door in 3D.',
      'Export → CSV for spreadsheets.',
    ],
  },
  {
    title: 'Section through the model',
    steps: [
      'Click the Section button in the top toolbar.',
      'Drop a two-click section line on the plan.',
      'The Section view shows everything cut by the line, with poché on each composite layer.',
    ],
  },
  {
    title: 'Save a wall preset (Favorite)',
    steps: [
      'Configure a wall the way you like (thickness, composite, material).',
      'Right-click → Save as Favorite, name it.',
      'Recall from the Favorites panel — one click loads the preset.',
    ],
  },
];

interface Tip { title: string; body: string; }
const TIPS: Tip[] = [
  { title: 'Numeric drawing', body: 'While any drag tool is active, just start typing a length — the coord box appears automatically. Tab cycles fields, Enter commits.' },
  { title: 'Magic wand', body: 'Click inside a wall-bounded room with the Slab/Zone tool active — the boundary auto-traces.' },
  { title: 'Inference snaps', body: 'Move slowly near an existing endpoint and a dotted guide appears. Cursor snaps to its X or Y for clean alignment.' },
  { title: 'Mirror & array', body: 'Got something good? Use Mirror, Rotate Array, or Linear Array (right-click the selection) to multiply with one click.' },
  { title: 'Pick up & inject', body: 'Alt+click an element to copy its parameters; Alt+Shift+click another to paste.' },
  { title: 'Composite walls', body: 'Each wall is a multi-layer composite — toggle layers in 3D to see the structure or in 2D to see the hatch.' },
  { title: 'Solo a selection', body: 'Select a few elements + the Solo button to render only them. Reset brings the rest back.' },
  { title: 'Compliance violations', body: 'The Compliance panel auto-runs every rule. Click a violation to fly to the offending element.' },
  { title: 'Story filters', body: 'Plans default to current-level only. Switch the dropdown to See All to view every story at once.' },
];

type Tab = 'shortcuts' | 'howto' | 'tips';

export function HelpPanel({ open, onClose, onStartTour }: HelpPanelProps) {
  const { t } = useTranslation('dialogs');
  const [tab, setTab] = useState<Tab>('shortcuts');
  const [query, setQuery] = useState('');

  const filteredShortcuts = useMemo(() => {
    if (!query.trim()) return SHORTCUTS;
    const q = query.toLowerCase();
    return SHORTCUTS.filter((s) => s.keys.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    const out: Record<string, ShortcutEntry[]> = {};
    for (const s of filteredShortcuts) (out[s.category] ??= []).push(s);
    return out;
  }, [filteredShortcuts]);

  if (!open) return null;
  return (
    <div className="help-overlay" role="dialog" aria-label={t('help.title', { defaultValue: 'Help' })} onClick={onClose}>
      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        <header className="help-header">
          <h2>{t('help.title', { defaultValue: 'Help' })}</h2>
          <button className="help-close" onClick={onClose} aria-label={t('help.close', { defaultValue: 'Close help' })}><X size={16} /></button>
        </header>
        <nav className="help-tabs">
          <button className={`help-tab ${tab === 'shortcuts' ? 'active' : ''}`} onClick={() => setTab('shortcuts')}>{t('help.tabs.shortcuts', { defaultValue: 'Shortcuts' })}</button>
          <button className={`help-tab ${tab === 'howto' ? 'active' : ''}`} onClick={() => setTab('howto')}>{t('help.tabs.howTo', { defaultValue: 'How To' })}</button>
          <button className={`help-tab ${tab === 'tips' ? 'active' : ''}`} onClick={() => setTab('tips')}>{t('help.tabs.tips', { defaultValue: 'Tips' })}</button>
        </nav>
        <div className="help-tour-cta">
          <button className="help-tour-btn" onClick={onStartTour}>
            <Sparkles size={14} /> {t('help.takeGuidedTour', { defaultValue: 'Take the guided tour' })}
          </button>
        </div>
        <div className="help-body">
          {tab === 'shortcuts' && (
            <>
              <div className="help-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder={t('help.searchShortcuts', { defaultValue: 'Search shortcuts…' })}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={t('help.searchShortcuts', { defaultValue: 'Search shortcuts' })}
                />
              </div>
              {Object.entries(grouped).map(([cat, list]) => (
                <section key={cat} className="help-section">
                  <h3>{cat}</h3>
                  <ul className="help-shortcut-list">
                    {list.map((s) => (
                      <li key={`${s.keys}-${s.description}`}>
                        <kbd>{s.keys}</kbd>
                        <span>{s.description}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {filteredShortcuts.length === 0 && (
                <p className="help-empty">{t('help.noShortcutsMatch', { query, defaultValue: 'No shortcuts match “{{query}}”.' })}</p>
              )}
            </>
          )}
          {tab === 'howto' && (
            <>
              {HOW_TOS.map((h) => (
                <section key={h.title} className="help-section">
                  <h3>{h.title}</h3>
                  <ol className="help-steps">
                    {h.steps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                </section>
              ))}
            </>
          )}
          {tab === 'tips' && (
            <ul className="help-tips">
              {TIPS.map((tip) => (
                <li key={tip.title}>
                  <strong>{tip.title}</strong>
                  <p>{tip.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="help-footer">
          {t('help.needMore', { defaultValue: 'Need more?' })} <a href="https://github.com/CariHQ/opencad/issues/new" target="_blank" rel="noreferrer">{t('help.openIssue', { defaultValue: 'Open an issue' })}</a>
        </footer>
      </div>
    </div>
  );
}
