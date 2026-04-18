import React, { useState } from 'react';

type ToneMapping = 'linear' | 'aces' | 'reinhard' | 'cineon';
type EnvironmentMap = 'studio' | 'outdoor' | 'interior' | 'night';
type RenderQuality = 'draft' | 'standard' | 'high';

export interface RenderSettings {
  enableAO: boolean;
  enableShadows: boolean;
  shadowIntensity: number;
  exposure: number;
  toneMapping: ToneMapping;
  environmentMap: EnvironmentMap;
  renderQuality: RenderQuality;
  groundReflections: boolean;
  bloomEnabled: boolean;
  bloomStrength: number;
}

const DEFAULT_SETTINGS: RenderSettings = {
  enableAO: true,
  enableShadows: true,
  shadowIntensity: 0.5,
  exposure: 1.0,
  toneMapping: 'aces',
  environmentMap: 'studio',
  renderQuality: 'standard',
  groundReflections: false,
  bloomEnabled: false,
  bloomStrength: 0.3,
};

export function RenderPanel() {
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS);
  const update = (patch: Partial<RenderSettings>) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <div className="render-panel">
      <div className="panel-header">
        <span className="panel-title">Render Settings</span>
      </div>

      <div className="render-section">
        <h4>Lighting</h4>

        <div className="render-field">
          <label htmlFor="ao-toggle">Ambient Occlusion</label>
          <input
            id="ao-toggle"
            data-testid="enable-ao-checkbox"
            type="checkbox"
            checked={settings.enableAO}
            onChange={(e) => update({ enableAO: e.target.checked })}
          />
        </div>

        <div className="render-field">
          <label htmlFor="shadows-toggle">Shadows</label>
          <input
            id="shadows-toggle"
            data-testid="enable-shadows-checkbox"
            type="checkbox"
            checked={settings.enableShadows}
            onChange={(e) => update({ enableShadows: e.target.checked })}
          />
        </div>

        {settings.enableShadows && (
          <div className="render-field">
            <label htmlFor="shadow-intensity">Shadow Intensity</label>
            <input
              id="shadow-intensity"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.shadowIntensity}
              onChange={(e) => update({ shadowIntensity: parseFloat(e.target.value) })}
            />
            <span>{settings.shadowIntensity.toFixed(2)}</span>
          </div>
        )}

        <div className="render-field">
          <label htmlFor="exposure-range">Exposure</label>
          <input
            id="exposure-range"
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={settings.exposure}
            onChange={(e) => update({ exposure: parseFloat(e.target.value) })}
          />
          <span>{settings.exposure.toFixed(1)}</span>
        </div>

        <div className="render-field">
          <label htmlFor="tone-mapping-select">Tone Mapping</label>
          <select
            id="tone-mapping-select"
            value={settings.toneMapping}
            onChange={(e) => update({ toneMapping: e.target.value as ToneMapping })}
          >
            <option value="linear">Linear</option>
            <option value="aces">ACES Filmic</option>
            <option value="reinhard">Reinhard</option>
            <option value="cineon">Cineon</option>
          </select>
        </div>
      </div>

      <div className="render-section">
        <h4>Environment</h4>

        <div className="render-field">
          <label htmlFor="env-map-select">Environment Map</label>
          <select
            id="env-map-select"
            value={settings.environmentMap}
            onChange={(e) => update({ environmentMap: e.target.value as EnvironmentMap })}
          >
            <option value="studio">Studio</option>
            <option value="outdoor">Outdoor</option>
            <option value="interior">Interior</option>
            <option value="night">Night</option>
          </select>
        </div>

        <div className="render-field">
          <label htmlFor="render-quality-select">Render Quality</label>
          <select
            id="render-quality-select"
            value={settings.renderQuality}
            onChange={(e) => update({ renderQuality: e.target.value as RenderQuality })}
          >
            <option value="draft">Draft</option>
            <option value="standard">Standard</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="render-field">
          <label htmlFor="ground-reflections-toggle">Ground Reflections</label>
          <input
            id="ground-reflections-toggle"
            type="checkbox"
            checked={settings.groundReflections}
            onChange={(e) => update({ groundReflections: e.target.checked })}
          />
        </div>
      </div>

      <div className="render-section">
        <h4>Post-Processing</h4>

        <div className="render-field">
          <label htmlFor="bloom-toggle">Bloom</label>
          <input
            id="bloom-toggle"
            type="checkbox"
            checked={settings.bloomEnabled}
            onChange={(e) => update({ bloomEnabled: e.target.checked })}
          />
        </div>

        {settings.bloomEnabled && (
          <div className="render-field">
            <label htmlFor="bloom-strength">Bloom Strength</label>
            <input
              id="bloom-strength"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.bloomStrength}
              onChange={(e) => update({ bloomStrength: parseFloat(e.target.value) })}
            />
            <span>{settings.bloomStrength.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
