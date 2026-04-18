import React, { useState } from 'react';

type SectionDirection = 'x' | 'y' | 'z';

interface SectionBoxPanelProps {
  onToggle?: (enabled: boolean) => void;
  onPositionChange?: (position: number) => void;
  onDirectionChange?: (direction: SectionDirection) => void;
  onSaveView?: () => void;
}

const AXIS_BUTTONS: { value: SectionDirection; label: string }[] = [
  { value: 'x', label: 'X' },
  { value: 'y', label: 'Y' },
  { value: 'z', label: 'Z' },
];

export function SectionBoxPanel({
  onToggle,
  onPositionChange,
  onDirectionChange,
  onSaveView,
}: SectionBoxPanelProps = {}) {
  const [enabled, setEnabled] = useState(false);
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState<SectionDirection>('z');

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    onToggle?.(next);
  };

  const handlePositionChange = (value: number) => {
    setPosition(value);
    onPositionChange?.(value);
  };

  const handleDirectionChange = (value: SectionDirection) => {
    setDirection(value);
    onDirectionChange?.(value);
  };

  return (
    <div className="section-box-panel panel">
      <div className="panel-header">
        <span className="panel-title">Section View</span>
      </div>

      <div className="panel-body">
        <div className="panel-row">
          <label htmlFor="section-enable" className="section-toggle-label">
            Enable section cut
          </label>
          <input
            id="section-enable"
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            aria-label="Enable section cut"
          />
        </div>

        <div className="panel-row">
          <span className="panel-label">Axis</span>
          <div className="axis-selector">
            {AXIS_BUTTONS.map((btn) => (
              <button
                key={btn.value}
                className={`axis-btn${direction === btn.value ? ' active' : ''}`}
                aria-pressed={direction === btn.value}
                onClick={() => handleDirectionChange(btn.value)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {enabled && (
          <>
            <div className="panel-row">
              <label htmlFor="section-position">Position: {position}mm</label>
              <input
                id="section-position"
                type="range"
                aria-label="Position"
                min="0"
                max="20000"
                step="100"
                value={position}
                onChange={(e) => handlePositionChange(parseInt(e.target.value, 10))}
                className="section-position-slider"
              />
            </div>

            <div className="panel-row">
              <button
                className="btn-secondary"
                onClick={() => onSaveView?.()}
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
