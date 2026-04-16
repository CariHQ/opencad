import React, { useEffect, useState } from 'react';
import {
  FolderOpen,
  FileDown,
  Bot,
  Plus,
  Sun,
  Moon,
  PanelLeft,
  PanelRight,
  Layers,
  Settings2,
  Table2,
  LayoutDashboard,
  AlertTriangle,
  Camera,
  Sheet,
  MessageSquareWarning,
  Package,
  MessageCircle,
  Leaf,
  DollarSign,
  Palette,
  Stamp,
  Scissors,
  SunMedium,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToolShelf } from './components/ToolShelf';
import { Navigator } from './components/Navigator';
import { LayersPanel } from './components/LayerPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { Viewport } from './components/Viewport';
import { AIChatPanel } from './components/AIChatPanel';
import { LevelSelector } from './components/LevelSelector';
import { LevelManager } from './components/LevelManager';
import { ImportExportModal } from './components/ImportExportModal';
import { ColumnBeamPanel } from './components/ColumnBeamPanel';
import { StairRailingPanel } from './components/StairRailingPanel';
import { useDocumentStore } from './stores/documentStore';
import { useLocalStorage } from './hooks/useLocalStorage';
import { WallToolPanel } from './components/WallToolPanel';
import { SlabToolPanel } from './components/SlabToolPanel';
import { DoorWindowPanel } from './components/DoorWindowPanel';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useAutoSave } from './hooks/useAutoSave';
import { PanelErrorBoundary } from './components/ErrorBoundary';
import { SchedulePanel } from './components/SchedulePanel';
import { SpacePanel } from './components/SpacePanel';
import { ClashDetectionPanel } from './components/ClashDetectionPanel';
import { RenderPanel } from './components/RenderPanel';
import { SheetPanel } from './components/SheetPanel';
import { BCFPanel } from './components/BCFPanel';
import { MaterialLibrary } from './components/MaterialLibrary';
import { PresenceOverlay } from './components/PresenceOverlay';
import { CommandPalette } from './components/CommandPalette';
import { CommentsPanel } from './components/CommentsPanel';
import { CarbonPanel } from './components/CarbonPanel';
import { CostPanel } from './components/CostPanel';
import { HatchPanel } from './components/HatchPanel';
import { SymbolLibrary } from './components/SymbolLibrary';
import { ShadowAnalysisPanel } from './components/ShadowAnalysisPanel';
import { SectionBoxPanel } from './components/SectionBoxPanel';
import './styles/app.css';

type RightPanelTab =
  | 'layers'
  | 'properties'
  | 'schedule'
  | 'spaces'
  | 'clash'
  | 'render'
  | 'sheets'
  | 'bcf'
  | 'materials'
  | 'comments'
  | 'carbon'
  | 'cost'
  | 'hatch'
  | 'symbols'
  | 'shadow'
  | 'section';

const RIGHT_PANEL_TABS: { id: RightPanelTab; title: string; icon: React.ReactNode }[] = [
  { id: 'layers', title: 'Layers', icon: <Layers size={16} strokeWidth={2} /> },
  { id: 'properties', title: 'Properties', icon: <Settings2 size={16} strokeWidth={2} /> },
  { id: 'schedule', title: 'Schedule', icon: <Table2 size={16} strokeWidth={2} /> },
  { id: 'spaces', title: 'Spaces', icon: <LayoutDashboard size={16} strokeWidth={2} /> },
  { id: 'clash', title: 'Clash', icon: <AlertTriangle size={16} strokeWidth={2} /> },
  { id: 'render', title: 'Render', icon: <Camera size={16} strokeWidth={2} /> },
  { id: 'sheets', title: 'Sheets', icon: <Sheet size={16} strokeWidth={2} /> },
  { id: 'bcf', title: 'Issues', icon: <MessageSquareWarning size={16} strokeWidth={2} /> },
  { id: 'materials', title: 'Materials', icon: <Package size={16} strokeWidth={2} /> },
  { id: 'comments', title: 'Comments', icon: <MessageCircle size={16} strokeWidth={2} /> },
  { id: 'carbon', title: 'Carbon', icon: <Leaf size={16} strokeWidth={2} /> },
  { id: 'cost', title: 'Cost', icon: <DollarSign size={16} strokeWidth={2} /> },
  { id: 'hatch', title: 'Hatch', icon: <Palette size={16} strokeWidth={2} /> },
  { id: 'symbols', title: 'Symbols', icon: <Stamp size={16} strokeWidth={2} /> },
  { id: 'shadow', title: 'Shadow', icon: <SunMedium size={16} strokeWidth={2} /> },
  { id: 'section', title: 'Section', icon: <Scissors size={16} strokeWidth={2} /> },
];

export function AppLayout() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { document: doc, initProject, activeTool, selectedIds, setActiveTool, undo, redo, canUndo, canRedo } = useDocumentStore();

  useUndoRedo({ undo, redo, canUndo, canRedo });
  useAutoSave();
  const [showAIChat, setShowAIChat] = useLocalStorage('opencad-showAIChat', false);
  const [activeView, setActiveView] = useLocalStorage<'floor-plan' | '3d' | 'section'>(
    'opencad-activeView',
    '3d'
  );
  const [selectedLevel, setSelectedLevel] = useLocalStorage<string | null>(
    'opencad-selectedLevel',
    null
  );

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('opencad-theme', systemTheme);

  const [showLeftPanel, setShowLeftPanel] = useLocalStorage('opencad-showLeftPanel', true);
  const [showRightPanel, setShowRightPanel] = useLocalStorage('opencad-showRightPanel', true);
  const [focusMode, setFocusMode] = useState(false);
  const [showModal, setShowModal] = useState<'import' | 'export' | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useLocalStorage<RightPanelTab>(
    'opencad-rightPanelTab',
    'layers'
  );

  const leftVisible = showLeftPanel && !focusMode;
  const rightVisible = showRightPanel && !focusMode;
  const chromeVisible = !focusMode;

  // Auto-switch to properties tab when an element is selected
  useEffect(() => {
    if (selectedIds.length > 0) {
      setRightPanelTab('properties');
    }
  }, [selectedIds, setRightPanelTab]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#f0f0f0' : '#1e1e1e');
    }
    window.dispatchEvent(new Event('theme-change'));
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  useEffect(() => {
    if (projectId) {
      initProject(projectId, 'user-1');
    }
  }, [projectId, initProject]);

  useEffect(() => {
    if (doc?.organization.levels && Object.keys(doc.organization.levels).length > 0 && !selectedLevel) {
      const firstLevel = Object.keys(doc.organization.levels)[0];
      setSelectedLevel(firstLevel);
    }
  }, [doc, selectedLevel, setSelectedLevel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === '\\' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        setFocusMode((f) => !f);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        setShowLeftPanel((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        setShowRightPanel((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowLeftPanel, setShowRightPanel]);

  const toggleAIChat = () => setShowAIChat(!showAIChat);

  function handleCommandExecute(command: {
    id: string;
    label: string;
    category: string;
    action: () => void;
  }) {
    setShowCommandPalette(false);
    const toolIds = [
      'select',
      'wall',
      'door',
      'window',
      'slab',
      'column',
      'beam',
      'stair',
      'railing',
      'line',
      'rectangle',
      'circle',
      'text',
    ];
    if (toolIds.includes(command.id)) {
      setActiveTool(command.id as Parameters<typeof setActiveTool>[0]);
    }
  }

  return (
    <div className={`app-container${focusMode ? ' focus-mode' : ''}`}>
      {chromeVisible && (
        <header className="app-toolbar">
          <div className="toolbar-left">
            <button
              className={`toolbar-btn panel-toggle-btn${leftVisible ? ' panel-on' : ''}`}
              onClick={() => setShowLeftPanel((v) => !v)}
              title="Toggle navigator (⌘[)"
            >
              <PanelLeft
                size={16}
                strokeWidth={2}
                color={leftVisible
                  ? (theme === 'dark' ? '#18a0fb' : '#0d99ff')
                  : (theme === 'dark' ? '#a0a0a0' : '#6b6b6b')}
              />
            </button>
            <span className="brand-name">OpenCAD</span>
            <button
              className="toolbar-btn"
              onClick={() => navigate('/')}
              title="Back to projects"
            >
              <Plus size={14} strokeWidth={2} />
            </button>
          </div>

          <div className="toolbar-tabs">
            <button
              className={`tab-btn${activeView === 'floor-plan' ? ' active' : ''}`}
              onClick={() => setActiveView('floor-plan')}
            >
              Floor Plan
            </button>
            <button
              className={`tab-btn${activeView === '3d' ? ' active' : ''}`}
              onClick={() => setActiveView('3d')}
            >
              3D View
            </button>
            <button
              className={`tab-btn${activeView === 'section' ? ' active' : ''}`}
              onClick={() => setActiveView('section')}
            >
              Section
            </button>
          </div>

          <div className="toolbar-right">
            <button className="toolbar-btn" onClick={toggleTheme} title="Toggle Theme">
              <span className="tool-icon">
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              </span>
            </button>
            <button
              className="toolbar-btn"
              onClick={() => setShowModal('import')}
              title="Import IFC"
            >
              <span className="tool-icon">
                <FolderOpen size={15} />
              </span>
            </button>
            <button
              className="toolbar-btn"
              onClick={() => setShowModal('export')}
              title="Export IFC"
            >
              <span className="tool-icon">
                <FileDown size={15} />
              </span>
            </button>
            <button className="toolbar-btn" onClick={toggleAIChat} title="AI Assistant">
              <span className="tool-icon">
                <Bot size={15} />
              </span>
            </button>
            <div className="toolbar-sep" />
            <button
              className={`toolbar-btn panel-toggle-btn${rightVisible ? ' panel-on' : ''}`}
              onClick={() => setShowRightPanel((v) => !v)}
              title="Toggle properties (⌘])"
            >
              <PanelRight
                size={16}
                strokeWidth={2}
                color={rightVisible
                  ? (theme === 'dark' ? '#18a0fb' : '#0d99ff')
                  : (theme === 'dark' ? '#a0a0a0' : '#6b6b6b')}
              />
            </button>
          </div>
        </header>
      )}

      <div className="app-body">
        <aside className={`app-left-panel${leftVisible ? '' : ' panel-collapsed'}`}>
          <Navigator />
          <LevelManager />
        </aside>

        <div className={`app-toolshelf-container${chromeVisible ? '' : ' panel-collapsed'}`}>
          <ToolShelf
            onToggleAI={toggleAIChat}
            onToggleProperties={() => setShowRightPanel((v) => !v)}
            propertiesVisible={rightVisible}
            theme={theme}
          />
        </div>

        <main className="app-main">
          <PanelErrorBoundary>
            <div className="viewport-wrapper">
              <Viewport viewType={activeView} />
              <PresenceOverlay collaborators={[]} />
              {chromeVisible && (
                <div className="floating-level-selector">
                  <LevelSelector
                    levels={doc?.organization.levels || {}}
                    selectedLevel={selectedLevel}
                    onSelectLevel={setSelectedLevel}
                  />
                </div>
              )}
              {focusMode && (
                <div className="focus-hint">
                  Press <kbd>\</kbd> to exit focus mode
                </div>
              )}
            </div>
          </PanelErrorBoundary>
        </main>

        <aside className={`app-right-panel${rightVisible ? '' : ' panel-collapsed'}`}>
          <div className="right-panel-tab-bar">
            {RIGHT_PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`right-panel-tab-btn${rightPanelTab === tab.id ? ' active' : ''}`}
                onClick={() => setRightPanelTab(tab.id)}
                title={tab.title}
                aria-label={tab.title}
              >
                {tab.icon}
              </button>
            ))}
          </div>

          <div className="right-panel-content">
            <PanelErrorBoundary>
              {rightPanelTab === 'layers' && <LayersPanel />}

              {rightPanelTab === 'properties' && (
                <>
                  {activeTool === 'wall' && <WallToolPanel />}
                  {activeTool === 'slab' && <SlabToolPanel />}
                  {(activeTool === 'door' || activeTool === 'window') && <DoorWindowPanel />}
                  {(activeTool === 'column' || activeTool === 'beam') && <ColumnBeamPanel />}
                  {(activeTool === 'stair' || activeTool === 'railing') && <StairRailingPanel />}
                  <PropertiesPanel />
                </>
              )}

              {rightPanelTab === 'schedule' && <SchedulePanel />}
              {rightPanelTab === 'spaces' && <SpacePanel />}
              {rightPanelTab === 'clash' && <ClashDetectionPanel />}
              {rightPanelTab === 'render' && <RenderPanel />}
              {rightPanelTab === 'sheets' && <SheetPanel />}
              {rightPanelTab === 'bcf' && <BCFPanel />}
              {rightPanelTab === 'materials' && (
                <MaterialLibrary
                  onSelect={() => {
                    /* material selection is a no-op at layout level */
                  }}
                />
              )}
              {rightPanelTab === 'comments' && <CommentsPanel />}
              {rightPanelTab === 'carbon' && <CarbonPanel />}
              {rightPanelTab === 'cost' && <CostPanel />}
              {rightPanelTab === 'hatch' && <HatchPanel />}
              {rightPanelTab === 'symbols' && <SymbolLibrary />}
              {rightPanelTab === 'shadow' && <ShadowAnalysisPanel />}
              {rightPanelTab === 'section' && <SectionBoxPanel />}
            </PanelErrorBoundary>
          </div>
        </aside>

        {showAIChat && (
          <aside className={`app-ai-panel${chromeVisible ? '' : ' panel-collapsed'}`}>
            <AIChatPanel onClose={() => setShowAIChat(false)} />
          </aside>
        )}
      </div>

      {chromeVisible && <StatusBar />}

      {showModal && <ImportExportModal mode={showModal} onClose={() => setShowModal(null)} />}

      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CommandPalette
              onClose={() => setShowCommandPalette(false)}
              onExecute={handleCommandExecute}
            />
          </div>
        </div>
      )}
    </div>
  );
}
