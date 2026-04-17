import React, { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import {
  FolderOpen,
  FileDown,
  Bot,
  Home,
  Sun,
  Moon,
  PanelLeft,
  PanelRight,
  Settings2,
  Table2,
  LayoutDashboard,
  AlertTriangle,
  Camera,
  Sheet,
  MessageSquareWarning,
  Blocks,
  MessageCircle,
  Leaf,
  DollarSign,
  Palette,
  Waypoints,
  Slice,
  SunMedium,
  MapPin,
  FileText,
  Image,
  Store,
  Wind,
  User,
  Settings,
  History,
  Package,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from './stores/projectStore';
import { ToolShelf } from './components/ToolShelf';
import { Navigator } from './components/Navigator';

import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { LevelSelector } from './components/LevelSelector';
import { LevelManager } from './components/LevelManager';
import { useDocumentStore } from './stores/documentStore';
import { useShallow } from 'zustand/react/shallow';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useAutoSave } from './hooks/useAutoSave';
import { PanelErrorBoundary } from './components/ErrorBoundary';
import { PresenceOverlay } from './components/PresenceOverlay';
import { SplitViewport } from './components/SplitViewport';
import type { Material } from './lib/materials';

// Tool panels — lazy-loaded since only one is active at a time
const WallToolPanel = lazy(() => import('./components/WallToolPanel').then((m) => ({ default: m.WallToolPanel })));
const SlabToolPanel = lazy(() => import('./components/SlabToolPanel').then((m) => ({ default: m.SlabToolPanel })));
const DoorWindowPanel = lazy(() => import('./components/DoorWindowPanel').then((m) => ({ default: m.DoorWindowPanel })));
const ColumnBeamPanel = lazy(() => import('./components/ColumnBeamPanel').then((m) => ({ default: m.ColumnBeamPanel })));
const StairRailingPanel = lazy(() => import('./components/StairRailingPanel').then((m) => ({ default: m.StairRailingPanel })));
const PlacementPanel = lazy(() => import('./components/PlacementPanel').then((m) => ({ default: m.PlacementPanel })));

// Right-panel tabs — lazy-loaded since only one tab is visible at a time
const SchedulePanel = lazy(() => import('./components/SchedulePanel').then((m) => ({ default: m.SchedulePanel })));
const SpacePanel = lazy(() => import('./components/SpacePanel').then((m) => ({ default: m.SpacePanel })));
const ClashDetectionPanel = lazy(() => import('./components/ClashDetectionPanel').then((m) => ({ default: m.ClashDetectionPanel })));
const RenderPanel = lazy(() => import('./components/RenderPanel').then((m) => ({ default: m.RenderPanel })));
const SheetPanel = lazy(() => import('./components/SheetPanel').then((m) => ({ default: m.SheetPanel })));
const BCFPanel = lazy(() => import('./components/BCFPanel').then((m) => ({ default: m.BCFPanel })));
const MaterialLibrary = lazy(() => import('./components/MaterialLibrary').then((m) => ({ default: m.MaterialLibrary })));
const CommentsPanel = lazy(() => import('./components/CommentsPanel').then((m) => ({ default: m.CommentsPanel })));
const CarbonPanel = lazy(() => import('./components/CarbonPanel').then((m) => ({ default: m.CarbonPanel })));
const CostPanel = lazy(() => import('./components/CostPanel').then((m) => ({ default: m.CostPanel })));
const HatchPanel = lazy(() => import('./components/HatchPanel').then((m) => ({ default: m.HatchPanel })));
const SymbolLibrary = lazy(() => import('./components/SymbolLibrary').then((m) => ({ default: m.SymbolLibrary })));
const ShadowAnalysisPanel = lazy(() => import('./components/ShadowAnalysisPanel').then((m) => ({ default: m.ShadowAnalysisPanel })));
const SectionBoxPanel = lazy(() => import('./components/SectionBoxPanel').then((m) => ({ default: m.SectionBoxPanel })));
const SiteImportPanel = lazy(() => import('./components/SiteImportPanel').then((m) => ({ default: m.SiteImportPanel })));
const SpecWritingPanel = lazy(() => import('./components/SpecWritingPanel').then((m) => ({ default: m.SpecWritingPanel })));
const PhotoToModelPanel = lazy(() => import('./components/PhotoToModelPanel').then((m) => ({ default: m.PhotoToModelPanel })));
const MarketplacePanel = lazy(() => import('./components/MarketplacePanel').then((m) => ({ default: m.MarketplacePanel })));
const WindAnalysisPanel = lazy(() => import('./components/WindAnalysisPanel').then((m) => ({ default: m.WindAnalysisPanel })));
const VersionHistoryPanel = lazy(() => import('./components/VersionHistoryPanel').then((m) => ({ default: m.VersionHistoryPanel })));
const ObjectLibraryPanel = lazy(() => import('./components/ObjectLibraryPanel').then((m) => ({ default: m.ObjectLibraryPanel })));

// On-demand modals / overlays — lazy-loaded since they are hidden by default
const CommandPalette = lazy(() => import('./components/CommandPalette').then((m) => ({ default: m.CommandPalette })));
const AIChatPanel = lazy(() => import('./components/AIChatPanel').then((m) => ({ default: m.AIChatPanel })));
const ImportExportModal = lazy(() => import('./components/ImportExportModal').then((m) => ({ default: m.ImportExportModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const APIKeyPanel = lazy(() => import('./components/APIKeyPanel').then((m) => ({ default: m.APIKeyPanel })));
const PermissionsPanel = lazy(() => import('./components/PermissionsPanel').then((m) => ({ default: m.PermissionsPanel })));
const SSOSettingsPanel = lazy(() => import('./components/SSOSettingsPanel').then((m) => ({ default: m.SSOSettingsPanel })));
const MobileViewer = lazy(() => import('./components/MobileViewer').then((m) => ({ default: m.MobileViewer })));
import { usePresence } from './hooks/usePresence';
import './styles/app.css';

type RightPanelTab =
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
  | 'section'
  | 'site'
  | 'specs'
  | 'photo'
  | 'marketplace'
  | 'wind'
  | 'history'
  | 'objects';

const RIGHT_PANEL_TABS: { id: RightPanelTab; title: string; icon: React.ReactNode }[] = [
  { id: 'properties', title: 'Properties', icon: <Settings2 size={16} strokeWidth={2} /> },
  { id: 'schedule', title: 'Schedule', icon: <Table2 size={16} strokeWidth={2} /> },
  { id: 'spaces', title: 'Spaces', icon: <LayoutDashboard size={16} strokeWidth={2} /> },
  { id: 'clash', title: 'Clash', icon: <AlertTriangle size={16} strokeWidth={2} /> },
  { id: 'render', title: 'Render', icon: <Camera size={16} strokeWidth={2} /> },
  { id: 'sheets', title: 'Sheets', icon: <Sheet size={16} strokeWidth={2} /> },
  { id: 'bcf', title: 'Issues', icon: <MessageSquareWarning size={16} strokeWidth={2} /> },
  { id: 'materials', title: 'Materials', icon: <Blocks size={16} strokeWidth={2} /> },
  { id: 'comments', title: 'Comments', icon: <MessageCircle size={16} strokeWidth={2} /> },
  { id: 'carbon', title: 'Carbon', icon: <Leaf size={16} strokeWidth={2} /> },
  { id: 'cost', title: 'Cost', icon: <DollarSign size={16} strokeWidth={2} /> },
  { id: 'hatch', title: 'Hatch', icon: <Palette size={16} strokeWidth={2} /> },
  { id: 'symbols', title: 'Symbols', icon: <Waypoints size={16} strokeWidth={2} /> },
  { id: 'shadow', title: 'Shadow', icon: <SunMedium size={16} strokeWidth={2} /> },
  { id: 'section', title: 'Section', icon: <Slice size={16} strokeWidth={2} /> },
  { id: 'site', title: 'Site Import', icon: <MapPin size={16} strokeWidth={2} /> },
  { id: 'specs', title: 'Specs', icon: <FileText size={16} strokeWidth={2} /> },
  { id: 'photo', title: 'Photo to Model', icon: <Image size={16} strokeWidth={2} /> },
  { id: 'marketplace', title: 'Marketplace', icon: <Store size={16} strokeWidth={2} /> },
  { id: 'wind', title: 'Wind Analysis', icon: <Wind size={16} strokeWidth={2} /> },
  { id: 'history', title: 'History', icon: <History size={16} strokeWidth={2} /> },
  { id: 'objects', title: 'Objects', icon: <Package size={16} strokeWidth={2} /> },
];

export function AppLayout() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { document: doc, initProject, activeTool, selectedIds, setActiveTool, undo, redo, canUndo, canRedo, updateElement, pushHistory } = useDocumentStore(
    useShallow((s) => ({
      document: s.document,
      initProject: s.initProject,
      activeTool: s.activeTool,
      selectedIds: s.selectedIds,
      setActiveTool: s.setActiveTool,
      undo: s.undo,
      redo: s.redo,
      canUndo: s.canUndo,
      canRedo: s.canRedo,
      updateElement: s.updateElement,
      pushHistory: s.pushHistory,
    }))
  );
  const { projects, renameProject } = useProjectStore();
  const currentProject = projects.find((p) => p.id === projectId);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useUndoRedo({ undo, redo, canUndo, canRedo });
  useAutoSave();

  // Stable local user ID from localStorage so it survives refreshes
  const localUserId = React.useMemo(() => {
    const stored = localStorage.getItem('opencad-local-uid');
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem('opencad-local-uid', id);
    return id;
  }, []);
  const { users: presenceUsers } = usePresence({ userId: localUserId, displayName: 'You' });
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
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);

  const [showLeftPanel, setShowLeftPanel] = useLocalStorage('opencad-showLeftPanel', true);
  const [showRightPanel, setShowRightPanel] = useLocalStorage('opencad-showRightPanel', true);
  const [focusMode, setFocusMode] = useState(false);
  const [showModal, setShowModal] = useState<'import' | 'export' | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAuth, setShowAuth] = useState<'login' | 'register' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'apikeys' | 'permissions' | 'sso'>('apikeys');
  const [rightPanelTab, setRightPanelTab] = useLocalStorage<RightPanelTab>(
    'opencad-rightPanelTab',
    'properties'
  );

  const [leftPanelWidth, setLeftPanelWidth] = useLocalStorage('opencad-leftPanelWidth', 260);
  const [rightPanelWidth, setRightPanelWidth] = useLocalStorage('opencad-rightPanelWidth', 260);
  const resizingRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      side,
      startX: e.clientX,
      startWidth: side === 'left' ? leftPanelWidth : rightPanelWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftPanelWidth, rightPanelWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { side, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      if (side === 'left') {
        setLeftPanelWidth(Math.max(180, Math.min(480, startWidth + delta)));
      } else {
        setRightPanelWidth(Math.max(220, Math.min(520, startWidth - delta)));
      }
    };
    const onMouseUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [setLeftPanelWidth, setRightPanelWidth]);

  const leftVisible = showLeftPanel && !focusMode;
  const rightVisible = showRightPanel && !focusMode;
  const chromeVisible = !focusMode;

  // Auto-switch to properties tab on first selection (0 → 1+).
  // Does NOT switch if the user has already navigated to an element-contextual panel
  // (e.g. materials) so they can apply a material to the newly-selected element.
  const prevSelectedLenRef = useRef(selectedIds.length);
  useEffect(() => {
    const prev = prevSelectedLenRef.current;
    prevSelectedLenRef.current = selectedIds.length;
    const STICKY_TABS: RightPanelTab[] = ['materials', 'properties'];
    if (prev === 0 && selectedIds.length > 0 && !STICKY_TABS.includes(rightPanelTab)) {
      setRightPanelTab('properties');
    }
  }, [selectedIds, rightPanelTab, setRightPanelTab]);

  // Apply a material to all currently-selected elements
  const handleMaterialSelect = useCallback(
    (mat: Material) => {
      if (!doc || selectedIds.length === 0) return;
      for (const id of selectedIds) {
        const el = doc.content.elements[id];
        if (!el) continue;
        updateElement(id, {
          properties: {
            ...el.properties,
            Material: { type: 'string' as const, value: mat.name },
          },
        });
      }
      pushHistory('Apply material');
    },
    [selectedIds, doc, updateElement, pushHistory]
  );

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
    const TOOL_SHORTCUTS: Record<string, string> = {
      v: 'select', l: 'line', r: 'rectangle', c: 'circle', a: 'arc',
      p: 'polygon', w: 'wall', k: 'column', b: 'beam', s: 'slab',
      o: 'roof', t: 'stair', d: 'door', n: 'window', g: 'railing',
      m: 'dimension', x: 'text',
    };

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) {
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
        return;
      }

      if (e.key === '\\') {
        setFocusMode((f) => !f);
        return;
      }

      const toolId = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (toolId) {
        e.preventDefault();
        setActiveTool(toolId as Parameters<typeof setActiveTool>[0]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowLeftPanel, setShowRightPanel, setActiveTool]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleAIChat = () => setShowAIChat(!showAIChat);

  function handleCommandExecute(command: {
    id: string;
    label: string;
    category: string;
    action: () => void;
  }) {
    setShowCommandPalette(false);
    const toolIds = [
      'select', 'wall', 'door', 'window', 'slab', 'column', 'beam',
      'stair', 'railing', 'line', 'rectangle', 'circle', 'arc',
      'polyline', 'text', 'dimension', 'polygon',
    ];
    if (toolIds.includes(command.id)) {
      setActiveTool(command.id as Parameters<typeof setActiveTool>[0]);
    } else {
      switch (command.id) {
        case 'undo': undo(); break;
        case 'redo': redo(); break;
        case 'view-3d': setActiveView('3d'); break;
        case 'view-top': setActiveView('floor-plan'); break;
        case 'view-section': setActiveView('section'); break;
        case 'toggle-ai': toggleAIChat(); break;
        case 'import': setShowModal('import'); break;
        case 'export': setShowModal('export'); break;
        case 'focus-mode': setFocusMode((f) => !f); break;
        case 'panel-left': setShowLeftPanel((v) => !v); break;
        case 'panel-right': setShowRightPanel((v) => !v); break;
        case 'history': setRightPanelTab('history'); setShowRightPanel(true); break;

        case 'properties': setRightPanelTab('properties'); setShowRightPanel(true); break;
        default: break;
      }
    }
  }

  if (isMobile) {
    const levels = doc?.organization.levels
      ? Object.values(doc.organization.levels).map((l) => ({ id: l.id, name: l.name }))
      : [];
    const elementCount = doc?.content.elements ? Object.keys(doc.content.elements).length : undefined;
    return (
      <Suspense fallback={null}>
        <MobileViewer
          projectName={doc?.name ?? 'Project'}
          levels={levels}
          elementCount={elementCount}
        />
      </Suspense>
    );
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
              <span className="tool-icon">
                <PanelLeft size={15} strokeWidth={2} />
              </span>
            </button>
            <span className="brand-name">OpenCAD</span>
            <button
              className="toolbar-btn"
              onClick={() => navigate('/')}
              title="Home — back to projects"
            >
              <span className="tool-icon">
                <Home size={15} strokeWidth={2} />
              </span>
            </button>
            {currentProject && (
              editingName ? (
                <input
                  className="project-name-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={() => {
                    if (nameInput.trim()) renameProject(projectId!, nameInput.trim());
                    setEditingName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (nameInput.trim()) renameProject(projectId!, nameInput.trim());
                      setEditingName(false);
                    } else if (e.key === 'Escape') {
                      setEditingName(false);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <button
                  className="project-name-btn"
                  onClick={() => { setNameInput(currentProject.name); setEditingName(true); }}
                  title="Click to rename project"
                >
                  {currentProject.name}
                </button>
              )
            )}
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
            <button className="toolbar-btn" onClick={() => setShowAuth('login')} title="Sign In">
              <span className="tool-icon">
                <User size={15} />
              </span>
            </button>
            <button className="toolbar-btn" onClick={() => setShowSettings(true)} title="Settings">
              <span className="tool-icon">
                <Settings size={15} />
              </span>
            </button>
            <div className="toolbar-sep" />
            <button
              className={`toolbar-btn panel-toggle-btn${rightVisible ? ' panel-on' : ''}`}
              onClick={() => setShowRightPanel((v) => !v)}
              title="Toggle properties (⌘])"
            >
              <span className="tool-icon">
                <PanelRight size={15} strokeWidth={2} />
              </span>
            </button>
          </div>
        </header>
      )}

      <div className="app-body">
        <aside
          className={`app-left-panel${leftVisible ? '' : ' panel-collapsed'}`}
          style={leftVisible ? { width: leftPanelWidth, minWidth: leftPanelWidth } : undefined}
        >
          <Navigator />
          <LevelManager />
          {leftVisible && (
            <div
              className="panel-resize-handle"
              onMouseDown={(e) => startResize('left', e)}
              title="Drag to resize"
            />
          )}
        </aside>

        <div className={`app-toolshelf-container${chromeVisible ? '' : ' panel-collapsed'}`}>
          <ToolShelf />
        </div>

        <main className="app-main">
          <PanelErrorBoundary>
            <div className="viewport-wrapper">
              <SplitViewport viewType={activeView} />
              <PresenceOverlay
                collaborators={presenceUsers
                  .filter((u) => u.cursor !== null)
                  .map((u) => ({
                    userId: u.userId,
                    name: u.displayName,
                    color: u.color,
                    cursor: u.cursor!,
                    activeTool: u.activeTool,
                  }))}
              />
              {chromeVisible && (
                <div className="floating-level-selector">
                  <LevelSelector
                    levels={doc?.organization.levels || {}}
                    selectedLevel={selectedLevel}
                    onSelectLevel={setSelectedLevel}
                  />
                </div>
              )}
              {(activeTool === 'door' || activeTool === 'window') && (
                <Suspense fallback={null}>
                  <div className="floating-placement-panel">
                    <PlacementPanel
                      elementType={activeTool as 'door' | 'window'}
                      onClose={() => setActiveTool('select')}
                    />
                  </div>
                </Suspense>
              )}
              {focusMode && (
                <div className="focus-hint">
                  Press <kbd>\</kbd> to exit focus mode
                </div>
              )}
            </div>
          </PanelErrorBoundary>
        </main>

        <aside
          className={`app-right-panel${rightVisible ? '' : ' panel-collapsed'}`}
          style={rightVisible ? { width: rightPanelWidth, minWidth: rightPanelWidth } : undefined}
        >
          {rightVisible && (
            <div
              className="panel-resize-handle"
              onMouseDown={(e) => startResize('right', e)}
              title="Drag to resize"
            />
          )}
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
              <Suspense fallback={<div className="panel-loading" />}>
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
                  <MaterialLibrary onSelect={handleMaterialSelect} />
                )}
                {rightPanelTab === 'comments' && <CommentsPanel />}
                {rightPanelTab === 'carbon' && <CarbonPanel />}
                {rightPanelTab === 'cost' && <CostPanel />}
                {rightPanelTab === 'hatch' && <HatchPanel />}
                {rightPanelTab === 'symbols' && <SymbolLibrary />}
                {rightPanelTab === 'shadow' && <ShadowAnalysisPanel />}
                {rightPanelTab === 'section' && <SectionBoxPanel />}
                {rightPanelTab === 'site' && <SiteImportPanel />}
                {rightPanelTab === 'specs' && <SpecWritingPanel />}
                {rightPanelTab === 'photo' && <PhotoToModelPanel />}
                {rightPanelTab === 'marketplace' && <MarketplacePanel />}
                {rightPanelTab === 'wind' && <WindAnalysisPanel />}
                {rightPanelTab === 'history' && <VersionHistoryPanel />}
                {rightPanelTab === 'objects' && <ObjectLibraryPanel />}
              </Suspense>
            </PanelErrorBoundary>
          </div>
        </aside>

        {showAIChat && (
          <aside className={`app-ai-panel${chromeVisible ? '' : ' panel-collapsed'}`}>
            <Suspense fallback={null}>
              <AIChatPanel onClose={() => setShowAIChat(false)} />
            </Suspense>
          </aside>
        )}
      </div>

      {chromeVisible && <StatusBar />}

      {showModal && (
        <Suspense fallback={null}>
          <ImportExportModal mode={showModal} onClose={() => setShowModal(null)} />
        </Suspense>
      )}

      {showCommandPalette && (
        <Suspense fallback={null}>
          <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <CommandPalette
                onClose={() => setShowCommandPalette(false)}
                onExecute={handleCommandExecute}
              />
            </div>
          </div>
        </Suspense>
      )}

      {showAuth && (
        <Suspense fallback={null}>
          <AuthModal
            mode={showAuth}
            onClose={() => setShowAuth(null)}
            onLogin={() => setShowAuth(null)}
            onRegister={() => setShowAuth(null)}
          />
        </Suspense>
      )}

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2 className="settings-modal-title">Settings</h2>
              <button
                className="settings-close"
                aria-label="Close settings"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>
            <div className="settings-tabs">
              <button
                className={`settings-tab-btn${settingsTab === 'apikeys' ? ' active' : ''}`}
                onClick={() => setSettingsTab('apikeys')}
              >
                API Keys
              </button>
              <button
                className={`settings-tab-btn${settingsTab === 'permissions' ? ' active' : ''}`}
                onClick={() => setSettingsTab('permissions')}
              >
                Permissions
              </button>
              <button
                className={`settings-tab-btn${settingsTab === 'sso' ? ' active' : ''}`}
                onClick={() => setSettingsTab('sso')}
              >
                SSO
              </button>
            </div>
            <div className="settings-content">
              <Suspense fallback={null}>
                {settingsTab === 'apikeys' && <APIKeyPanel />}
                {settingsTab === 'permissions' && <PermissionsPanel />}
                {settingsTab === 'sso' && <SSOSettingsPanel />}
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
