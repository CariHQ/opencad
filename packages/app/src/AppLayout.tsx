import React, { useCallback, useEffect, useState } from 'react';
import { FolderOpen, FileDown, Bot, Plus, Sun, Moon } from 'lucide-react';
import { ToolShelf } from './components/ToolShelf';
import { Navigator } from './components/Navigator';
import { LayersPanel } from './components/LayerPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { Viewport } from './components/Viewport';
import { AIChatPanel } from './components/AIChatPanel';
import { LevelSelector } from './components/LevelSelector';
import { ImportExportModal } from './components/ImportExportModal';
import { CommandPalette } from './components/CommandPalette';
import { useDocumentStore } from './stores/documentStore';
import { useLocalStorage } from './hooks/useLocalStorage';
import './styles/app.css';

export function AppLayout() {
  const { document: doc, initProject, activeTool } = useDocumentStore();
  const [showAIChat, setShowAIChat] = useLocalStorage('opencad-showAIChat', false);
  const [activeView, setActiveView] = useLocalStorage<'floor-plan' | '3d' | 'section'>(
    'opencad-activeView',
    '3d'
  );
  const [selectedLevel, setSelectedLevel] = useLocalStorage<string | null>(
    'opencad-selectedLevel',
    null
  );
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('opencad-theme', 'light');
  const [showModal, setShowModal] = useState<'import' | 'export' | 'projects' | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#ffffff' : '#1a1a2e');
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
  }, [doc, selectedLevel]);

  const toggleAIChat = () => setShowAIChat(!showAIChat);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowCommandPalette((s) => !s);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app-container">
      <header className="app-toolbar">
        <div className="toolbar-brand">
          <button
            className="toolbar-btn"
            onClick={() => setShowModal('projects')}
            title="New Project"
          >
            <span className="tool-icon">
              <Plus size={18} />
            </span>
          </button>
          <span className="brand-logo">OC</span>
          <span className="brand-name">OpenCAD</span>
        </div>

        <div className="toolbar-tabs">
          <button
            className={`tab-btn ${activeView === 'floor-plan' ? 'active' : ''}`}
            onClick={() => setActiveView('floor-plan')}
          >
            Floor Plan
          </button>
          <button
            className={`tab-btn ${activeView === '3d' ? 'active' : ''}`}
            onClick={() => setActiveView('3d')}
          >
            3D View
          </button>
          <button
            className={`tab-btn ${activeView === 'section' ? 'active' : ''}`}
            onClick={() => setActiveView('section')}
          >
            Section
          </button>
        </div>

        <div className="toolbar-actions">
          <button className="toolbar-btn" onClick={toggleTheme} title="Toggle Theme">
            <span className="tool-icon">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </span>
          </button>
          <button className="toolbar-btn" onClick={() => setShowModal('import')} title="Import IFC">
            <span className="tool-icon">
              <FolderOpen size={18} />
            </span>
          </button>
          <button className="toolbar-btn" onClick={() => setShowModal('export')} title="Export IFC">
            <span className="tool-icon">
              <FileDown size={18} />
            </span>
          </button>
          <button className="toolbar-btn" onClick={toggleAIChat} title="AI Assistant">
            <span className="tool-icon">
              <Bot size={18} />
            </span>
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-left-panel">
          <Navigator />
        </aside>

        <div className="app-toolshelf-container">
          <ToolShelf />
        </div>

        <main className="app-main">
          <div className="viewport-wrapper">
            <Viewport viewType={activeView} />
          </div>
          <LevelSelector
            levels={doc?.levels || {}}
            selectedLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
          />
        </main>

        <aside className="app-right-panel">
          <LayersPanel />
          <PropertiesPanel />
        </aside>

        {showAIChat && (
          <aside className="app-ai-panel">
            <AIChatPanel onClose={() => setShowAIChat(false)} />
          </aside>
        )}
      </div>

      <StatusBar />

      {showModal && <ImportExportModal mode={showModal} onClose={() => setShowModal(null)} />}
      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CommandPalette
              onClose={() => setShowCommandPalette(false)}
              onExecute={() => setShowCommandPalette(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
