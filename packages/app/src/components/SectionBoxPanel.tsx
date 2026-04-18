import React, { useState } from 'react';
import {
  DEFAULT_SECTION_BOX,
  sectionBoxFromElements,
} from '../lib/sectionBox';
import type { SectionBox } from '../lib/sectionBox';

type SectionDirection = 'x' | 'y' | 'z';

interface SectionBoxPanelProps {
  onToggle?: (enabled: boolean) => void;
  onPositionChange?: (position: number) => void;
  onDirectionChange?: (direction: SectionDirection) => void;
  onSaveView?: () => void;
  initialBox?: SectionBox;
  onBoxChange?: (box: SectionBox) => void;
  elements?: Array<{ x?: number; y?: number; z?: number }>;
}

const AXIS_BUTTONS: { value: SectionDirection; label: string }[] = [
  { value: 'x', label: 'X' },
  { value: 'y', label: 'Y' },
  { value: 'z', label: 'Z' },
];

const SLIDER_MIN = -200;
const SLIDER_MAX = 200;

export function SectionBoxPanel({
  onToggle,
  onPositionChange,
  onDirectionChange,
  onSaveView,
  initialBox,
  onBoxChange,
  elements = [],
}: SectionBoxPanelProps = {}) {
  const [enabled, setEnabled] = useState(false);
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState<SectionDirection>('z');
  const [box, setBox] = useState<SectionBox>(initialBox ?? { ...DEFAULT_SECTION_BOX });

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

  const updateBox = (updates: Partial<SectionBox>) => {
    const next = { ...box, ...updates };
    setBox(next);
    onBoxChange?.(next);
  };

  const handleFitToModel = () => {
    const fitted = sectionBoxFromElements(elements);
    setBox(fitted);
    onBoxChange?.(fitted);
  };

  const handleReset = () => {
    const reset = { ...DEFAULT_SECTION_BOX };
    setBox(reset);
    onBoxChange?.(reset);
  };

  const handleDimChange = (key: keyof Omit<SectionBox, 'enabled'>, value: number) => {
    updateBox({ [key]: value });
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
        <div className="section-box-enhanced">
          <div className="panel-row">
            <label htmlFor="section-box-enabled-check">Activate Section Box</label>
            <input
              id="section-box-enabled-check"
              data-testid="section-box-enabled"
              aria-label="Activate Section Box"
              type="checkbox"
              checked={box.enabled}
              onChange={(e) => updateBox({ enabled: e.target.checked })}
            />
          </div>
          <div className="panel-row">
            <label htmlFor="section-min-x-slider">Min X: {box.minX.toFixed(1)}</label>
            <input
              id="section-min-x-slider"
              data-testid="section-min-x"
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step="1"
              value={box.minX}
              onChange={(e) => handleDimChange('minX', parseFloat(e.target.value))}
            />
          </div>
          <div className="panel-row">
            <label htmlFor="section-max-x-slider">Max X: {box.maxX.toFixed(1)}</label>
            <input
              id="section-max-x-slider"
              data-testid="section-max-x"
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step="1"
              value={box.maxX}
              onChange={(e) => handleDimChange('maxX', parseFloat(e.target.value))}
            />
          </div>
          <div className="panel-row">
            <label htmlFor="section-min-y-slider">Min Y: {box.minY.toFixed(1)}</label>
            <input
              id="section-min-y-slider"
              data-testid="section-min-y"
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step="1"
              value={box.minY}
              onChange={(e) => handleDimChange('minY', parseFloat(e.target.value))}
            />
          </div>
          <div className="panel-row">
            <label htmlFor="section-max-y-slider">Max Y: {box.maxY.toFixed(1)}</label>
            <input
              id="section-max-y-slider"
              data-testid="section-max-y"
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step="1"
              value={box.maxY}
              onChange={(e) => handleDimChange('maxY', parseFloat(e.target.value))}
            />
          </div>
          <div className="panel-row">
            <label htmlFor="section-min-z-slider">Min Z: {box.minZ.toFixed(1)}</label>
            <input
              id="section-min-z-slider"
              data-testid="section-min-z"
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step="1"
              value={box.minZ}
              onChange={(e) => handleDimChange('minZ', parseFloat(e.target.value))}
            />
          </div>
          <div className="panel-row">
            <label htmlFor="section-max-z-slider">Max Z: {box.maxZ.toFixed(1)}</label>
            <input
              id="section-max-z-slider"
              data-testid="section-max-z"
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step="1"
              value={box.maxZ}
              onChange={(e) => handleDimChange('maxZ', parseFloat(e.target.value))}
            />
          </div>
          <div className="panel-row section-box-actions">
            <button
              data-testid="fit-to-model-btn"
              className="btn-secondary"
              onClick={handleFitToModel}
            >
              Fit to Model
            </button>
            <button
              data-testid="reset-section-btn"
              className="btn-secondary"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
