import React, { useEffect, useState } from 'react';
import { FolderOpen, Send, Bot, FolderDown, FileDown } from 'lucide-react';
import { ToolShelf } from './components/ToolShelf';
import { Navigator } from './components/Navigator';
import { LayersPanel } from './components/LayerPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { Viewport } from './components/Viewport';
import { AIChatPanel } from './components/AIChatPanel';
import { LevelSelector } from './components/LevelSelector';
import { useDocumentStore } from './stores/documentStore';
import './styles/app.css';

export function AppLayout() {
  const { document: doc, initProject } = useDocumentStore();
  const [showAIChat, setShowAIChat] = useState(false);
  const [activeView, setActiveView] = useState<'floor-plan' | '3d' | 'section'>('3d');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

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

  return (
    <div className="app-container">
      <header className="app-toolbar">
        <div className="toolbar-brand">
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
          <button className="toolbar-btn" title="Import IFC">
            <FolderOpen size={18} />
          </button>
          <button className="toolbar-btn" title="Export IFC">
            <FileDown size={18} />
          </button>
          <button className="toolbar-btn" title="AI Assistant" onClick={toggleAIChat}>
            <Bot size={18} />
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
    </div>
  );
}
