import React, { useEffect, useState } from 'react';
import { FolderOpen, FileDown, Bot, Plus, Sun, Moon, PanelLeft, PanelRight } from 'lucide-react';
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
import { useDocumentStore } from './stores/documentStore';
import { useLocalStorage } from './hooks/useLocalStorage';
import { WallToolPanel } from './components/WallToolPanel';
import { useUndoRedo } from './hooks/useUndoRedo';
import './styles/app.css';

export function AppLayout() {
  const { document: doc, initProject, activeTool, undo, redo, canUndo, canRedo } = useDocumentStore();

  useUndoRedo({ undo, redo, canUndo, canRedo });
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
  const [showModal, setShowModal] = useState<'import' | 'export' | 'projects' | null>(null);

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
    initProject('project-1', 'user-1');
  }, [initProject]);

  useEffect(() => {
    if (doc?.levels && Object.keys(doc.levels).length > 0 && !selectedLevel) {
      const firstLevel = Object.keys(doc.levels)[0];
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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowLeftPanel, setShowRightPanel]);

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
              <PanelLeft size={16} strokeWidth={1.75} />
            </button>
            <span className="brand-logo">OC</span>
            <span className="brand-name">OpenCAD</span>
            <button
              className="toolbar-btn"
              onClick={() => setShowModal('projects')}
              title="New Project"
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
              <PanelRight size={16} strokeWidth={1.75} />
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
          <ToolShelf />
        </div>

        <main className="app-main">
          <div className="viewport-wrapper">
            <Viewport viewType={activeView} />
            {chromeVisible && (
              <div className="floating-level-selector">
                <LevelSelector
                  levels={doc?.levels || {}}
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
          <LayersPanel />
          <PropertiesPanel />
        </aside>

        {showAIChat && (
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
