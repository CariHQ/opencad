import React from 'react';
import { DocumentModel, createProject } from '@opencad/document';

function App() {
  const [projectName, setProjectName] = React.useState('My First Project');
  const [model] = React.useState(() => new DocumentModel('test', 'user'));
  const [, forceUpdate] = React.useState({});

  const layers = Object.values(model.document.layers);
  const elements = Object.values(model.document.elements);
  const levels = Object.values(model.document.levels);

  const handleCreateProject = () => {
    model.document.name = projectName;
    forceUpdate({});
  };

  const handleAddLayer = () => {
    const color =
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0');
    model.addLayer({ name: `Layer ${layers.length + 1}`, color });
    forceUpdate({});
  };

  const handleAddElement = () => {
    if (layers.length === 0) return;
    model.addElement({
      type: 'wall',
      layerId: layers[0].id,
      properties: {
        Name: { type: 'string', value: `Wall ${elements.length + 1}` },
        Length: { type: 'number', value: 5000, unit: 'mm' },
        Height: { type: 'number', value: 3000, unit: 'mm' },
      },
    });
    forceUpdate({});
  };

  return (
    <div className="app">
      <header className="header">
        <h1>OpenCAD</h1>
        <p>Browser-native, AI-powered BIM platform</p>
      </header>

      <main className="main">
        <section className="project-section">
          <h2>Project</h2>
          <div className="input-group">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
            />
            <button onClick={handleCreateProject}>Set Name</button>
          </div>
          <div className="project-info">
            <p>
              <strong>Name:</strong> {model.document.name}
            </p>
            <p>
              <strong>ID:</strong> {model.id}
            </p>
            <p>
              <strong>Schema:</strong> {model.document.metadata.schemaVersion}
            </p>
          </div>
        </section>

        <section className="layers-section">
          <h2>Layers ({layers.length})</h2>
          <button onClick={handleAddLayer} className="add-btn">
            + Add Layer
          </button>
          <ul className="item-list">
            {layers.map((layer) => (
              <li key={layer.id} className="item">
                <span className="color-dot" style={{ backgroundColor: layer.color }} />
                {layer.name}
                {layer.visible ? ' 👁' : ' 🔒'}
              </li>
            ))}
          </ul>
        </section>

        <section className="levels-section">
          <h2>Levels ({levels.length})</h2>
          <ul className="item-list">
            {levels.map((level) => (
              <li key={level.id} className="item">
                {level.name} (Elevation: {level.elevation}mm, Height: {level.height}mm)
              </li>
            ))}
          </ul>
        </section>

        <section className="elements-section">
          <h2>Elements ({elements.length})</h2>
          <button onClick={handleAddElement} className="add-btn">
            + Add Wall
          </button>
          <ul className="item-list">
            {elements.map((element) => (
              <li key={element.id} className="item">
                {element.type}: {(element.properties.Name?.value as string) || 'Unnamed'}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="footer">
        <p>Built with TDD - Test-Driven Development</p>
      </footer>
    </div>
  );
}

export default App;
