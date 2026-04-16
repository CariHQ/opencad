import React, { useState } from 'react';

export interface ShadowAnalysisSettings {
  latitude: number;
  longitude: number;
  date: string;
  time: string;
  showSunPath: boolean;
  showShadowMap: boolean;
}

const DEFAULT_SETTINGS: ShadowAnalysisSettings = {
  latitude: 51.5074,   // London
  longitude: -0.1278,
  date: new Date().toISOString().slice(0, 10),
  time: '12:00',
  showSunPath: true,
  showShadowMap: true,
};

interface ShadowAnalysisPanelProps {
  onRun?: (settings: ShadowAnalysisSettings) => void;
  onChange?: (settings: ShadowAnalysisSettings) => void;
}

export function ShadowAnalysisPanel({ onRun, onChange }: ShadowAnalysisPanelProps = {}) {
  const [settings, setSettings] = useState<ShadowAnalysisSettings>(DEFAULT_SETTINGS);

  const update = (patch: Partial<ShadowAnalysisSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    onChange?.(next);
  };

  return (
    <div className="shadow-analysis-panel">
      <div className="panel-header">
        <span className="panel-title">Shadow &amp; Daylight Analysis</span>
      </div>

      <div className="analysis-section">
        <h4>Location</h4>
        <div className="field-row">
          <label htmlFor="shadow-lat">Latitude</label>
          <input
            id="shadow-lat"
            type="number"
            step={0.001}
            value={settings.latitude}
            onChange={(e) => update({ latitude: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field-row">
          <label htmlFor="shadow-lng">Longitude</label>
          <input
            id="shadow-lng"
            type="number"
            step={0.001}
            value={settings.longitude}
            onChange={(e) => update({ longitude: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="analysis-section">
        <h4>Sun Position</h4>
        <div className="field-row">
          <label htmlFor="shadow-date">Date</label>
          <input
            id="shadow-date"
            type="date"
            value={settings.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </div>
        <div className="field-row">
          <label htmlFor="shadow-time">Time</label>
          <input
            id="shadow-time"
            type="time"
            value={settings.time}
            onChange={(e) => update({ time: e.target.value })}
          />
        </div>
      </div>

      <div className="analysis-section">
        <h4>Visualisation</h4>
        <div className="field-row">
          <label htmlFor="sun-path-toggle">Show Sun Path</label>
          <input
            id="sun-path-toggle"
            type="checkbox"
            checked={settings.showSunPath}
            onChange={(e) => update({ showSunPath: e.target.checked })}
          />
        </div>
        <div className="field-row">
          <label htmlFor="shadow-map-toggle">Show Shadow Map</label>
          <input
            id="shadow-map-toggle"
            type="checkbox"
            checked={settings.showShadowMap}
            onChange={(e) => update({ showShadowMap: e.target.checked })}
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
