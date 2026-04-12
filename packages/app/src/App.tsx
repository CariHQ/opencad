import React, { useEffect } from 'react';
import { Toolbar, LayerPanel, PropertiesPanel, Viewport, StatusBar } from './components';
import { useDocumentStore } from './stores/documentStore';
import './styles/app.css';

function App() {
  const { document: doc, initProject, addLayer, addElement } = useDocumentStore();

  useEffect(() => {
    initProject('project-1', 'user-1');
  }, [initProject]);

  const handleAddLayer = () => {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    const name = `Layer ${Object.keys(doc?.layers || {}).length + 1}`;
    const color = colors[Math.floor(Math.random() * colors.length)];
    addLayer({ name, color });
  };

  const handleAddWall = () => {
    if (!doc) return;
    const layerId = Object.keys(doc.layers)[0];
    if (!layerId) return;

    addElement({
      type: 'wall',
      layerId,
      properties: {
        Name: { type: 'string', value: `Wall ${Object.keys(doc.elements).length + 1}` },
        Length: { type: 'number', value: 3000, unit: 'mm' },
        Height: { type: 'number', value: 2700, unit: 'mm' },
        Thickness: { type: 'number', value: 150, unit: 'mm' },
      },
    });
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-logo">OpenCAD</h1>
          <span className="app-tagline">Browser-native BIM</span>
        </div>
        <div className="header-center">
          <span className="project-name">{doc?.name || 'Untitled'}</span>
        </div>
        <div className="header-right">
          <button className="header-btn">File</button>
          <button className="header-btn">Edit</button>
          <button className="header-btn">View</button>
          <button className="header-btn primary">Export</button>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar left">
          <div className="sidebar-section">
            <div className="section-header">
              <h3>Quick Actions</h3>
            </div>
            <div className="quick-actions">
              <button className="action-btn" onClick={handleAddWall}>
                <span className="action-icon">▮</span>
                <span>Add Wall</span>
              </button>
              <button className="action-btn" onClick={handleAddLayer}>
                <span className="action-icon">+</span>
                <span>Add Layer</span>
              </button>
            </div>
          </div>
          <LayerPanel />
        </aside>

        <main className="app-main">
          <Toolbar />
          <Viewport />
        </main>

        <aside className="app-sidebar right">
          <PropertiesPanel />
        </aside>
      </div>

      <StatusBar />
    </div>
  );
}

export default App;
