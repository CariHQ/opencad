import React from 'react';

type SectionDirection = 'x' | 'y' | 'z';

interface SectionBoxPanelProps {
  enabled: boolean;
  position: number;
  direction: SectionDirection;
  onToggle: () => void;
  onPositionChange: (position: number) => void;
  onDirectionChange: (direction: SectionDirection) => void;
  onSaveView: () => void;
}

const DIRECTION_OPTIONS: { value: SectionDirection; label: string }[] = [
  { value: 'x', label: 'X (Left/Right)' },
  { value: 'y', label: 'Y (Front/Back)' },
  { value: 'z', label: 'Z (Top/Bottom)' },
];

export function SectionBoxPanel({
  enabled,
  position,
  direction,
  onToggle,
  onPositionChange,
  onDirectionChange,
  onSaveView,
}: SectionBoxPanelProps) {
  return (
    <div className="tool-panel">
      <div className="tool-panel-header">Section View</div>

      <div className="tool-panel-group">
        <div className="tool-panel-row">
          <label htmlFor="section-enable" className="section-toggle-label">
            Enable section cut
          </label>
          <input
            id="section-enable"
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            aria-label="Enable section cut"
          />
        </div>

        {enabled && (
          <>
            <div className="tool-panel-row">
              <label htmlFor="section-direction">Direction</label>
              <select
                id="section-direction"
                aria-label="Direction"
                className="tool-panel-select"
                value={direction}
                onChange={(e) => onDirectionChange(e.target.value as SectionDirection)}
              >
                {DIRECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="tool-panel-row">
              <label htmlFor="section-position">Position: {position}mm</label>
              <input
                id="section-position"
                type="range"
                aria-label="Position"
                min="-10000"
                max="10000"
                step="100"
                value={position}
                onChange={(e) => onPositionChange(parseInt(e.target.value, 10))}
                className="section-position-slider"
              />
            </div>

            <div className="tool-panel-row">
              <button
                className="btn-secondary"
                onClick={onSaveView}
                aria-label="Save section view"
              >
                Save View
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
