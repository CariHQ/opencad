import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

export function LevelManager() {
  const { document: doc, addLevel, updateLevel, deleteLevel, pushHistory } = useDocumentStore();

  if (!doc) return null;

  const sortedLevels = Object.values(doc.levels).sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    const maxElev = sortedLevels.length > 0
      ? Math.max(...sortedLevels.map((l) => l.elevation)) + 3000
      : 0;
    pushHistory('Add level');
    addLevel({ name: `Level ${sortedLevels.length + 1}`, elevation: maxElev, height: 3000 });
  };

  const handleNameBlur = (levelId: string, value: string) => {
    if (!value.trim()) return;
    pushHistory('Rename level');
    updateLevel(levelId, { name: value.trim() });
  };

  const handleElevBlur = (levelId: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    pushHistory('Edit level elevation');
    updateLevel(levelId, { elevation: num });
  };

  const handleDelete = (levelId: string) => {
    pushHistory('Delete level');
    deleteLevel(levelId);
  };

  return (
    <div className="level-manager">
      <div className="panel-header">
        <span className="panel-title">Levels</span>
        <button className="panel-action-btn" title="Add level" onClick={handleAdd}>
          +
        </button>
      </div>
      <div className="level-manager-list">
        {sortedLevels.map((level) => (
          <div key={level.id} className="level-manager-row">
            <input
              type="text"
              className="level-name-input"
              defaultValue={level.name}
              onBlur={(e) => handleNameBlur(level.id, e.target.value)}
            />
            <input
              type="number"
              className="level-elev-input"
              defaultValue={level.elevation}
              onBlur={(e) => handleElevBlur(level.id, e.target.value)}
              title="Elevation (mm)"
            />
            <button
              className="panel-action-btn danger"
              title="Delete level"
              onClick={() => handleDelete(level.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
