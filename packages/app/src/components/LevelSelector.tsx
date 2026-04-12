import React from 'react';

interface Level {
  id: string;
  name: string;
  elevation: number;
  height: number;
  order: number;
}

interface LevelSelectorProps {
  levels: Record<string, Level>;
  selectedLevel: string | null;
  onSelectLevel: (levelId: string) => void;
}

export function LevelSelector({ levels, selectedLevel, onSelectLevel }: LevelSelectorProps) {
  const sortedLevels = Object.values(levels).sort((a, b) => b.elevation - a.elevation);

  return (
    <div className="level-selector">
      <div className="level-selector-label">Level:</div>
      <div className="level-tabs">
        {sortedLevels.map((level) => (
          <button
            key={level.id}
            className={`level-tab ${selectedLevel === level.id ? 'active' : ''}`}
            onClick={() => onSelectLevel(level.id)}
          >
            <span className="level-name">{level.name}</span>
            <span className="level-elevation">{level.elevation.toFixed(0)}m</span>
          </button>
        ))}
      </div>
    </div>
  );
}
