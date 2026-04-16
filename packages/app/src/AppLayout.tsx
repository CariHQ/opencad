import React, { useEffect, useState, useCallback } from 'react';
import {
  FolderOpen, FileDown, Bot, Home, Sun, Moon, PanelLeft, PanelRight, History, GitPullRequest,
  Layers, Settings2, Table2, LayoutDashboard, AlertTriangle, Camera, Sheet,
  MessageSquareWarning, Package, MessageCircle, Leaf, DollarSign, Palette,
  Stamp, Scissors, SunMedium, MapPin, FileText, Image, Store, Wind, User, Shield,
  MessageCirclePlus,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToolShelf } from './components/ToolShelf';
import { Navigator } from './components/Navigator';
import { LayersPanel } from './components/LayerPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { AIChatPanel } from './components/AIChatPanel';
import { LevelManager } from './components/LevelManager';
import { ImportExportModal } from './components/ImportExportModal';
import { ColumnBeamPanel } from './components/ColumnBeamPanel';
import { StairRailingPanel } from './components/StairRailingPanel';
import { useDocumentStore } from './stores/documentStore';
import { useLocalStorage } from './hooks/useLocalStorage';
import { WallToolPanel } from './components/WallToolPanel';
import { CurtainWallPanel } from './components/CurtainWallPanel';
import { SlabToolPanel } from './components/SlabToolPanel';
import { DoorWindowPanel } from './components/DoorWindowPanel';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useAutoSave } from './hooks/useAutoSave';
import { useRole } from './hooks/useRole';
import { PanelErrorBoundary } from './components/ErrorBoundary';
import { SchedulePanel } from './components/SchedulePanel';
import { SpacePanel } from './components/SpacePanel';
import { ClashDetectionPanel } from './components/ClashDetectionPanel';
import { RenderPanel } from './components/RenderPanel';
import { SheetPanel } from './components/SheetPanel';
import { BCFPanel } from './components/BCFPanel';
import { MaterialLibrary } from './components/MaterialLibrary';
import { PresenceOverlay } from './components/PresenceOverlay';
import { EditNotifications } from './components/EditNotifications';
import { useEditNotifications } from './hooks/useEditNotifications';
import { CommandPalette } from './components/CommandPalette';
import { CommentsPanel } from './components/CommentsPanel';
import { CarbonPanel } from './components/CarbonPanel';
import { CostPanel } from './components/CostPanel';
import { HatchPanel } from './components/HatchPanel';
import { SymbolLibrary } from './components/SymbolLibrary';
import { ShadowAnalysisPanel } from './components/ShadowAnalysisPanel';
import { SectionBoxPanel } from './components/SectionBoxPanel';
import { SiteImportPanel } from './components/SiteImportPanel';
import { SpecWritingPanel } from './components/SpecWritingPanel';
import { PhotoToModelPanel } from './components/PhotoToModelPanel';
import { MarketplacePanel } from './components/MarketplacePanel';
import { WindAnalysisPanel } from './components/WindAnalysisPanel';
import { SplitViewport } from './components/SplitViewport';
import { PlacementPanel } from './components/PlacementPanel';
import { AuthModal } from './components/AuthModal';
import { VersionHistoryPanel } from './components/VersionHistoryPanel';
import { ReviewPanel } from './components/ReviewPanel';
import { UpdateBanner } from './components/UpdateBanner';
import { useAuthStore } from './stores/authStore';
import { APIKeyPanel } from './components/APIKeyPanel';
import { PermissionsPanel } from './components/PermissionsPanel';
import { SSOSettingsPanel } from './components/SSOSettingsPanel';
import { BillingPanel } from './components/BillingPanel';
import { SubscriptionModal } from './components/SubscriptionModal';
import { MobileViewer } from './components/MobileViewer';
import { VersionHistoryPanel } from './components/VersionHistoryPanel';
import { usePresence } from './hooks/usePresence';
import './styles/app.css';

type RightPanelTab =
  | 'layers' | 'properties' | 'schedule' | 'spaces' | 'clash' | 'render' | 'sheets'
  | 'bcf' | 'materials' | 'comments' | 'carbon' | 'cost' | 'hatch' | 'symbols'
  | 'shadow' | 'section' | 'site' | 'specs' | 'photo' | 'marketplace' | 'wind' | 'admin'
  | 'history' | 'review';

const RIGHT_PANEL_TABS: { id: RightPanelTab; title: string; icon: React.ReactNode }[] = [
  { id: 'layers',      title: 'Layers',           icon: <Layers size={16} strokeWidth={2} /> },
  { id: 'properties',  title: 'Properties',        icon: <Settings2 size={16} strokeWidth={2} /> },
  { id: 'schedule',    title: 'Schedule',           icon: <Table2 size={16} strokeWidth={2} /> },
  { id: 'spaces',      title: 'Spaces',             icon: <LayoutDashboard size={16} strokeWidth={2} /> },
  { id: 'clash',       title: 'Clash',              icon: <AlertTriangle size={16} strokeWidth={2} /> },
  { id: 'render',      title: 'Render',             icon: <Camera size={16} strokeWidth={2} /> },
  { id: 'sheets',      title: 'Sheets',             icon: <Sheet size={16} strokeWidth={2} /> },
  { id: 'bcf',         title: 'Issues',             icon: <MessageSquareWarning size={16} strokeWidth={2} /> },
  { id: 'materials',   title: 'Materials',          icon: <Package size={16} strokeWidth={2} /> },
  { id: 'comments',    title: 'Comments',           icon: <MessageCircle size={16} strokeWidth={2} /> },
  { id: 'carbon',      title: 'Carbon',             icon: <Leaf size={16} strokeWidth={2} /> },
  { id: 'cost',        title: 'Cost',               icon: <DollarSign size={16} strokeWidth={2} /> },
  { id: 'hatch',       title: 'Hatch',              icon: <Palette size={16} strokeWidth={2} /> },
  { id: 'symbols',     title: 'Symbols',            icon: <Stamp size={16} strokeWidth={2} /> },
  { id: 'shadow',      title: 'Shadow',             icon: <SunMedium size={16} strokeWidth={2} /> },
  { id: 'section',     title: 'Section',            icon: <Scissors size={16} strokeWidth={2} /> },
  { id: 'site',        title: 'Site Import',        icon: <MapPin size={16} strokeWidth={2} /> },
  { id: 'specs',       title: 'Specs',              icon: <FileText size={16} strokeWidth={2} /> },
  { id: 'photo',       title: 'Photo to Model',     icon: <Image size={16} strokeWidth={2} /> },
  { id: 'marketplace', title: 'Marketplace',        icon: <Store size={16} strokeWidth={2} /> },
  { id: 'wind',        title: 'Wind Analysis',      icon: <Wind size={16} strokeWidth={2} /> },
  { id: 'admin',       title: 'Admin',              icon: <Shield size={16} strokeWidth={2} /> },
  { id: 'history',     title: 'History',            icon: <History size={16} strokeWidth={2} /> },
  { id: 'review',      title: 'Review',             icon: <GitPullRequest size={16} strokeWidth={2} /> },
];

export function AppLayout() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { document: doc, initProject, activeTool, selectedIds, setActiveTool, undo, redo, canUndo, canRedo, loadDocumentSchema, updateElement, renameProject } = useDocumentStore();
  const leftPanelRef = React.useRef<HTMLElement>(null);
  const rightPanelRef = React.useRef<HTMLElement>(null);
  const wsRef = React.useRef<WebSocket | null>(null);

  // Inline project rename state
  const [isRenamingProject, setIsRenamingProject] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState('');
  const renameInputRef = React.useRef<HTMLInputElement>(null);

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

  const [showAIChat, setShowAIChat] = useLocalStorage('opencad-showAIChat', false);
  const [activeView, setActiveView] = useLocalStorage<'floor-plan' | '3d' | 'section'>('opencad-activeView', '3d');
  const [selectedLevel, setSelectedLevel] = useLocalStorage<string | null>('opencad-selectedLevel', null);
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('opencad-theme', systemTheme);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [showLeftPanel, setShowLeftPanel] = useLocalStorage('opencad-showLeftPanel', true);
  const [showRightPanel, setShowRightPanel] = useLocalStorage('opencad-showRightPanel', true);
  const [focusMode, setFocusMode] = useState(false);
  const [showModal, setShowModal] = useState<'import' | 'export' | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAuth, setShowAuth] = useState<'login' | 'register' | null>(null);
  const { status: authStatus, profile: authProfile, signOut: authSignOut } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'apikeys' | 'permissions' | 'sso' | 'billing'>('apikeys');
  const [rightPanelTab, setRightPanelTab] = useLocalStorage<RightPanelTab>('opencad-rightPanelTab', 'layers');
  const [currentFilePath, setCurrentFilePath] = useLocalStorage<string | null>('opencad-currentFilePath', null);
  const [tauriUpdateInfo, setTauriUpdateInfo] = React.useState<TauriUpdateInfo | null>(null);

  const handleNativeSave = useCallback(async (): Promise<void> => {
    if (!doc) return;
    const path = currentFilePath ?? await saveFileDialog(`${(doc as { name?: string }).name ?? 'untitled'}.opencad`);
    if (!path) return;
    setCurrentFilePath(path);
    await saveFile(path, JSON.stringify(doc));
  }, [doc, currentFilePath, setCurrentFilePath]);

  const handleNativeOpen = useCallback(async (): Promise<void> => {
    const path = await openFileDialog();
    if (!path) return;
    const schema = await openFile(path);
    loadDocumentSchema(schema);
    setCurrentFilePath(path);
  }, [loadDocumentSchema, setCurrentFilePath]);

  const leftVisible = showLeftPanel && !focusMode;
  const rightVisible = showRightPanel && !focusMode;
  const chromeVisible = !focusMode;

  // Auto-switch to first allowed view if current view is locked out by role
  useEffect(() => {
    if (!allowedViews.includes(activeView)) {
      const first = allowedViews[0] as typeof activeView | undefined;
      if (first) setActiveView(first);
    }
  }, [allowedViews, activeView, setActiveView]);

  // Auto-switch right panel tab to first allowed tab if current tab is locked out
  useEffect(() => {
    if (!can(`panel:${rightPanelTab}`)) {
      const first = RIGHT_PANEL_TABS.find((t) => can(`panel:${t.id}`));
      if (first) setRightPanelTab(first.id);
    }
  }, [can, rightPanelTab, setRightPanelTab]);

  // When an element is selected from the Layers tab, auto-switch to Properties.
  // Do NOT override if the user is already on any other panel (e.g. Materials).
  useEffect(() => {
    if (selectedIds.length > 0 && can('panel:properties') && rightPanelTab === 'layers') {
      setRightPanelTab('properties');
    }
  }, [selectedIds, can, rightPanelTab, setRightPanelTab]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', theme === 'light' ? '#f0f0f0' : '#1e1e1e');
    window.dispatchEvent(new Event('theme-change'));
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  useEffect(() => {
    if (projectId) initProject(projectId, 'user-1');
  }, [projectId, initProject]);

  useEffect(() => {
    if (doc?.organization.levels && Object.keys(doc.organization.levels).length > 0 && !selectedLevel) {
      setSelectedLevel(Object.keys(doc.organization.levels)[0]);
    }
  }, [doc, selectedLevel, setSelectedLevel]);

  useEffect(() => {
    if (!isTauri()) return;
    const unlisten = onFileDrop((paths) => {
      const first = paths[0];
      if (!first) return;
      void openFile(first).then((schema) => {
        loadDocumentSchema(schema);
        setCurrentFilePath(first);
      }).catch(() => {});
    });
    return unlisten;
  }, [loadDocumentSchema, setCurrentFilePath]);

  useEffect(() => {
    if (!isTauri()) return;
    void checkForUpdates().then((info) => {
      if (info) setTauriUpdateInfo(info);
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '\\' && !e.metaKey && !e.ctrlKey && !e.shiftKey) { setFocusMode((f) => !f); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === '[') { e.preventDefault(); setShowLeftPanel((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === ']') { e.preventDefault(); setShowRightPanel((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && isTauri()) { e.preventDefault(); void handleNativeSave(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o' && isTauri()) { e.preventDefault(); void handleNativeOpen(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowLeftPanel, setShowRightPanel, handleNativeSave, handleNativeOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleAIChat = () => setShowAIChat(!showAIChat);

  function handleCommandExecute(command: { id: string; label: string; category: string; action: () => void }) {
    setShowCommandPalette(false);
    const toolIds = ['select','wall','door','window','slab','column','beam','stair','railing','line','rectangle','circle','text'];
    if (toolIds.includes(command.id)) setActiveTool(command.id as Parameters<typeof setActiveTool>[0]);
  }

  if (isMobile) {
    const levels = doc?.organization.levels ? Object.values(doc.organization.levels).map((l) => ({ id: l.id, name: l.name })) : [];
    const elementCount = doc?.content.elements ? Object.keys(doc.content.elements).length : undefined;
    return <MobileViewer projectName={doc?.name ?? 'Project'} levels={levels} elementCount={elementCount} />;
  }

  // No active project → show the full-screen project browser / home screen
  if (!doc) {
    return (
      <ProjectHomeScreen
        onImport={(file) => {
          // Attempt to parse as JSON schema; fall back to import modal for binary formats
          void (async () => {
            const text = await file.text();
            try {
              loadDocumentSchema(JSON.parse(text));
            } catch {
              setShowModal('import');
            }
          })();
        }}
      />
    );
  }

  return (
    <div className={`app-container${focusMode ? ' focus-mode' : ''}`}>
      {chromeVisible && (
        <header
          className={`app-toolbar${isTauri() && navigator.platform.includes('Mac') ? ' tauri-macos' : ''}`}
          onDoubleClick={(e) => {
            // Only trigger on the drag region — not on buttons/inputs
            if ((e.target as HTMLElement).closest('button, a, input, select')) return;
            if (isTauri()) {
              tauriToggleMaximize();
            } else {
              // Browser: toggle fullscreen
              if (!document.fullscreenElement) {
                void document.documentElement.requestFullscreen().catch(() => {});
              } else {
                void document.exitFullscreen().catch(() => {});
              }
            }
          }}
        >
          <div className="toolbar-left">
            <button className={`toolbar-btn panel-toggle-btn${leftVisible ? ' panel-on' : ''}`} onClick={() => setShowLeftPanel((v) => !v)} title="Toggle navigator (⌘[)">
              <PanelLeft size={16} strokeWidth={2} color={leftVisible ? (theme === 'dark' ? '#18a0fb' : '#0d99ff') : (theme === 'dark' ? '#a0a0a0' : '#6b6b6b')} />
            </button>
            <img src="/favicon.svg" alt="OpenCAD" className="brand-logo-img" />
            <button className="toolbar-btn" onClick={() => navigate('/')} title="Back to projects"><Home size={14} strokeWidth={2} /></button>
            <div className="toolbar-sep" />
            {isRenamingProject ? (
              <input
                ref={renameInputRef}
                className="project-name-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  const trimmed = renameValue.trim();
                  if (trimmed) renameProject(trimmed);
                  setIsRenamingProject(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = renameValue.trim();
                    if (trimmed) renameProject(trimmed);
                    setIsRenamingProject(false);
                  } else if (e.key === 'Escape') {
                    setIsRenamingProject(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <button
                className="toolbar-btn project-name-btn"
                title="Click to rename project"
                onClick={() => {
                  setRenameValue(doc?.name ?? 'Untitled Project');
                  setIsRenamingProject(true);
                  setTimeout(() => renameInputRef.current?.select(), 0);
                }}
              >
                <span className="project-name-text">{doc?.name ?? 'Untitled Project'}</span>
              </button>
            )}
          </div>

          <div className="toolbar-tabs">
            {allowedViews.includes('floor-plan') && (
              <button className={`tab-btn${activeView === 'floor-plan' ? ' active' : ''}`} onClick={() => setActiveView('floor-plan')}>Floor Plan</button>
            )}
            {allowedViews.includes('3d') && (
              <button className={`tab-btn${activeView === '3d' ? ' active' : ''}`} onClick={() => setActiveView('3d')}>3D View</button>
            )}
            {allowedViews.includes('section') && (
              <button className={`tab-btn${activeView === 'section' ? ' active' : ''}`} onClick={() => setActiveView('section')}>Section</button>
            )}
          </div>

          <div className="toolbar-right">
            <button className="toolbar-btn" onClick={() => setShowFeedback(true)} title="Send feedback" style={{ color: 'var(--accent-primary)' }}><span className="tool-icon"><MessageCirclePlus size={15} /></span></button>
            <button className="toolbar-btn" onClick={toggleTheme} title="Toggle Theme"><span className="tool-icon">{theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}</span></button>
            <button className="toolbar-btn" onClick={isTauri() ? () => void handleNativeOpen() : () => setShowModal('import')} title={isTauri() ? 'Open file (⌘O)' : 'Import IFC'}><span className="tool-icon"><FolderOpen size={15} /></span></button>
            <button className="toolbar-btn" onClick={isTauri() ? () => void handleNativeSave() : () => setShowModal('export')} title={isTauri() ? 'Save file (⌘S)' : 'Export IFC'}><span className="tool-icon"><FileDown size={15} /></span></button>
            {can('panel:ai') && (
              <button className="toolbar-btn" onClick={toggleAIChat} title="AI Assistant"><span className="tool-icon"><Bot size={15} /></span></button>
            )}
            {authStatus === 'authenticated' && authProfile ? (
              <button
                className="toolbar-btn toolbar-btn--user"
                onClick={() => setShowSettings(true)}
                title={authProfile.name || authProfile.email}
              >
                <span className="tool-icon user-avatar">
                  {(authProfile.name || authProfile.email).charAt(0).toUpperCase()}
                </span>
              </button>
            ) : (
              <button className="toolbar-btn" onClick={() => setShowAuth('login')} title="Sign In"><span className="tool-icon"><User size={15} /></span></button>
            )}
            <div className="toolbar-sep" />
            <button className={`toolbar-btn panel-toggle-btn${rightVisible ? ' panel-on' : ''}`} onClick={() => setShowRightPanel((v) => !v)} title="Toggle properties (⌘])">
              <PanelRight size={16} strokeWidth={2} color={rightVisible ? (theme === 'dark' ? '#18a0fb' : '#0d99ff') : (theme === 'dark' ? '#a0a0a0' : '#6b6b6b')} />
            </button>
          </div>
        </header>
      )}

      {tauriUpdateInfo && (
        <UpdateBanner info={tauriUpdateInfo} onDismiss={() => setTauriUpdateInfo(null)} />
      )}
      <div className="app-body">
        <aside ref={leftPanelRef} className={`app-left-panel${leftVisible ? '' : ' panel-collapsed'}`}>
          {can('panel:navigator') && <Navigator />}
          {can('panel:levels') && <LevelManager />}
        </aside>
        {leftVisible && <PanelResizer panelRef={leftPanelRef} side="right" minWidth={180} maxWidth={480} />}

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
                <div className="floating-placement-panel">
                  <PlacementPanel elementType={activeTool as 'door' | 'window'} onClose={() => setActiveTool('select')} />
                </div>
              )}
              {focusMode && <div className="focus-hint">Press <kbd>\</kbd> to exit focus mode</div>}
            </div>
          </PanelErrorBoundary>
        </main>

        {rightVisible && <PanelResizer panelRef={rightPanelRef} side="left" minWidth={200} maxWidth={600} />}
        <aside ref={rightPanelRef} className={`app-right-panel${rightVisible ? '' : ' panel-collapsed'}`}>
          <div className="right-panel-tab-bar">
            {RIGHT_PANEL_TABS.filter((tab) => can(`panel:${tab.id}`)).map((tab) => (
              <button key={tab.id} className={`right-panel-tab-btn${rightPanelTab === tab.id ? ' active' : ''}`} onClick={() => setRightPanelTab(tab.id)} title={tab.title} aria-label={tab.title}>
                {tab.icon}
              </button>
            ))}
          </div>

          <div className="right-panel-content">
            <PanelErrorBoundary>
              {rightPanelTab === 'layers' && <LayersPanel />}
              {rightPanelTab === 'properties' && can('panel:properties') && (
                <>
                  {activeTool === 'wall' && <WallToolPanel />}
                  {activeTool === 'curtain_wall' && <CurtainWallPanel />}
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
                  selectedCount={selectedIds.length}
                  currentMaterialName={
                    selectedIds.length > 0 && doc
                      ? (doc.content.elements[selectedIds[0]] as { material?: string } | undefined)?.material
                      : undefined
                  }
                  onSelect={(mat) => {
                    selectedIds.forEach((id) => updateElement(id, { material: mat.name }));
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
              {rightPanelTab === 'site' && <SiteImportPanel />}
              {rightPanelTab === 'specs' && <SpecWritingPanel />}
              {rightPanelTab === 'photo' && <PhotoToModelPanel />}
              {rightPanelTab === 'marketplace' && <MarketplacePanel />}
              {rightPanelTab === 'wind' && <WindAnalysisPanel />}
              {rightPanelTab === 'admin' && <AdminPanel can={can} />}
              {rightPanelTab === 'history' && <VersionHistoryPanel />}
              {rightPanelTab === 'review' && <ReviewPanel />}
            </PanelErrorBoundary>
          </div>
        </aside>

        {showAIChat && can('panel:ai') && (
          <aside className={`app-ai-panel${chromeVisible ? '' : ' panel-collapsed'}`}>
            <AIChatPanel onClose={() => setShowAIChat(false)} />
          </aside>
        )}
      </div>

      {chromeVisible && <StatusBar viewType={activeView} />}
      <FeedbackWidget open={showFeedback} onClose={() => setShowFeedback(false)} />

      {showModal && <ImportExportModal mode={showModal} onClose={() => setShowModal(null)} />}

      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CommandPalette onClose={() => setShowCommandPalette(false)} onExecute={handleCommandExecute} />
          </div>
        </div>
      )}

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(null)} />
      )}

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2 className="settings-modal-title">Settings</h2>
              <div className="settings-header-actions">
                <button className="settings-signout" aria-label="Sign out" onClick={() => { setShowSettings(false); void authSignOut(); }}>Sign out</button>
                <button className="settings-close" aria-label="Close settings" onClick={() => setShowSettings(false)}>×</button>
              </div>
            </div>
            <div className="settings-tabs">
              <button className={`settings-tab-btn${settingsTab === 'apikeys' ? ' active' : ''}`} onClick={() => setSettingsTab('apikeys')}>API Keys</button>
              <button className={`settings-tab-btn${settingsTab === 'permissions' ? ' active' : ''}`} onClick={() => setSettingsTab('permissions')}>Permissions</button>
              <button className={`settings-tab-btn${settingsTab === 'sso' ? ' active' : ''}`} onClick={() => setSettingsTab('sso')}>SSO</button>
              <button className={`settings-tab-btn${settingsTab === 'billing' ? ' active' : ''}`} onClick={() => setSettingsTab('billing')}>Billing</button>
            </div>
            <div className="settings-content">
              {settingsTab === 'apikeys' && <APIKeyPanel />}
              {settingsTab === 'permissions' && <PermissionsPanel />}
              {settingsTab === 'sso' && <SSOSettingsPanel />}
              {settingsTab === 'billing' && (
                <BillingPanel onUpgrade={() => { setShowSettings(false); setShowUpgrade(true); }} />
              )}
            </div>
          </div>
        </div>
      )}

      {showUpgrade && <SubscriptionModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
