import React, { useState } from 'react';

export interface WindAnalysisSettings {
  latitude: number;
  longitude: number;
  prevailingDirection: number;
  averageSpeedMs: number;
  showWindRose: boolean;
  showVentilationPotential: boolean;
}

const DEFAULT_SETTINGS: WindAnalysisSettings = {
  latitude: 51.5074,
  longitude: -0.1278,
  prevailingDirection: 225,   // SW — prevailing in London
  averageSpeedMs: 4.5,
  showWindRose: true,
  showVentilationPotential: false,
};

interface WindAnalysisPanelProps {
  onRun?: (settings: WindAnalysisSettings) => void;
  onChange?: (settings: WindAnalysisSettings) => void;
}

function directionLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8] ?? 'N';
}

export function WindAnalysisPanel({ onRun, onChange }: WindAnalysisPanelProps = {}) {
  const [settings, setSettings] = useState<WindAnalysisSettings>(DEFAULT_SETTINGS);

  const update = (patch: Partial<WindAnalysisSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    onChange?.(next);
  };

  return (
    <div className="wind-analysis-panel">
      <div className="panel-header">
        <span className="panel-title">Wind &amp; Microclimate Analysis</span>
      </div>

      <div className="analysis-section">
        <h4>Location</h4>
        <div className="field-row">
          <label htmlFor="wind-lat">Latitude</label>
          <input
            id="wind-lat"
            type="number"
            step={0.001}
            value={settings.latitude}
            onChange={(e) => update({ latitude: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field-row">
          <label htmlFor="wind-lng">Longitude</label>
          <input
            id="wind-lng"
            type="number"
            step={0.001}
            value={settings.longitude}
            onChange={(e) => update({ longitude: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="analysis-section">
        <h4>Wind Data</h4>
        <div className="field-row">
          <label htmlFor="wind-direction">Prevailing Wind Direction (°)</label>
          <input
            id="wind-direction"
            type="number"
            min={0}
            max={360}
            step={5}
            value={settings.prevailingDirection}
            onChange={(e) => update({ prevailingDirection: parseFloat(e.target.value) || 0 })}
          />
          <span className="direction-label">{directionLabel(settings.prevailingDirection)}</span>
        </div>

        <div className="field-row">
          <label htmlFor="wind-speed">Average Speed (m/s)</label>
          <input
            id="wind-speed"
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={settings.averageSpeedMs}
            onChange={(e) => update({ averageSpeedMs: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="compass-reference" aria-label="Compass reference">
          <span>North: 0° | South: 180° | East: 90° | West: 270°</span>
        </div>
      </div>

      <div className="analysis-section">
        <h4>Visualisation</h4>
        <div className="field-row">
          <label htmlFor="wind-rose-toggle">Show Wind Rose</label>
          <input
            id="wind-rose-toggle"
            type="checkbox"
            checked={settings.showWindRose}
            onChange={(e) => update({ showWindRose: e.target.checked })}
          />
        </div>
        <div className="field-row">
          <label htmlFor="ventilation-toggle">Show Ventilation Potential</label>
          <input
            id="ventilation-toggle"
            type="checkbox"
            checked={settings.showVentilationPotential}
            onChange={(e) => update({ showVentilationPotential: e.target.checked })}
          />
        </div>
      </div>

      <button
        aria-label="Run analysis"
        className="btn-run-analysis"
        onClick={() => onRun?.(settings)}
      >
        Run Analysis
      </button>
    </div>
  );
}
