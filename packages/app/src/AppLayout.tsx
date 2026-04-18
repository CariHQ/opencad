import React, { useEffect, useState, useCallback } from 'react';
import { FolderOpen, FileDown, Bot, Plus, Sun, Moon, PanelLeft, PanelRight } from 'lucide-react';
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
import { useRole } from './hooks/useRole';
import {
  isTauri,
  openFile,
  saveFile,
  saveFileDialog,
  openFileDialog,
  onFileDrop,
} from './hooks/useTauri';
import './styles/app.css';

export function AppLayout() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { document: doc, initProject, activeTool, undo, redo, canUndo, canRedo, loadDocumentSchema } = useDocumentStore();

  useUndoRedo({ undo, redo, canUndo, canRedo });
  const { can } = useRole();
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
  const [currentFilePath, setCurrentFilePath] = useLocalStorage<string | null>(
    'opencad-currentFilePath',
    null
  );

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

  // T-DSK-005: OS file-drop handler
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
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && isTauri()) {
        e.preventDefault();
        void handleNativeSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o' && isTauri()) {
        e.preventDefault();
        void handleNativeOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowLeftPanel, setShowRightPanel, handleNativeSave, handleNativeOpen]);

  const toggleAIChat = () => setShowAIChat(!showAIChat);

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
              <PanelLeft size={16} strokeWidth={2} color={leftVisible ? (theme === 'dark' ? '#18a0fb' : '#0d99ff') : undefined} style={leftVisible ? { stroke: theme === 'dark' ? '#18a0fb' : '#0d99ff' } : undefined} />
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
              onClick={isTauri() ? () => void handleNativeOpen() : () => setShowModal('import')}
              title={isTauri() ? 'Open file (⌘O)' : 'Import IFC'}
            >
              <span className="tool-icon">
                <FolderOpen size={15} />
              </span>
            </button>
            <button
              className="toolbar-btn"
              onClick={isTauri() ? () => void handleNativeSave() : () => setShowModal('export')}
              title={isTauri() ? 'Save file (⌘S)' : 'Export IFC'}
            >
              <span className="tool-icon">
                <FileDown size={15} />
              </span>
            </button>
            {can('panel:ai') && (
              <button className="toolbar-btn" onClick={toggleAIChat} title="AI Assistant">
                <span className="tool-icon">
                  <Bot size={15} />
                </span>
              </button>
            )}
            <div className="toolbar-sep" />
            <button
              className={`toolbar-btn panel-toggle-btn${rightVisible ? ' panel-on' : ''}`}
              onClick={() => setShowRightPanel((v) => !v)}
              title="Toggle properties (⌘])"
            >
              <PanelRight size={16} strokeWidth={2} color={rightVisible ? (theme === 'dark' ? '#18a0fb' : '#0d99ff') : undefined} style={rightVisible ? { stroke: theme === 'dark' ? '#18a0fb' : '#0d99ff' } : undefined} />
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
          <div className="viewport-wrapper">
            <Viewport viewType={activeView} />
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
        </main>

        <aside className={`app-right-panel${rightVisible ? '' : ' panel-collapsed'}`}>
          {activeTool === 'wall' && <WallToolPanel />}
          {activeTool === 'slab' && <SlabToolPanel />}
          {(activeTool === 'door' || activeTool === 'window') && <DoorWindowPanel />}
          {(activeTool === 'column' || activeTool === 'beam') && <ColumnBeamPanel />}
          {(activeTool === 'stair' || activeTool === 'railing') && <StairRailingPanel />}
          <LayersPanel />
          {can('panel:properties') && <PropertiesPanel />}
        </aside>

        {showAIChat && can('panel:ai') && (
          <aside className={`app-ai-panel${chromeVisible ? '' : ' panel-collapsed'}`}>
            <AIChatPanel onClose={() => setShowAIChat(false)} />
          </aside>
        )}
      </div>

      {chromeVisible && <StatusBar />}

      {showModal && <ImportExportModal mode={showModal} onClose={() => setShowModal(null)} />}
    </div>
  );
}
