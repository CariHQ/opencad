import React from 'react';

type ToneMapping = 'linear' | 'aces' | 'reinhard' | 'cineon';
type EnvironmentMap = 'studio' | 'outdoor' | 'sunset' | 'night' | 'none';

export interface RenderSettings {
  ambientOcclusion: boolean;
  shadows: boolean;
  shadowIntensity: number;
  exposure: number;
  toneMapping: ToneMapping;
  environmentMap: EnvironmentMap;
  groundReflections: boolean;
  bloomEnabled: boolean;
  bloomStrength: number;
}

interface RenderPanelProps {
  settings: RenderSettings;
  onChange: (settings: RenderSettings) => void;
}

export function RenderPanel({ settings, onChange }: RenderPanelProps) {
  const update = (patch: Partial<RenderSettings>) => onChange({ ...settings, ...patch });

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
            type="checkbox"
            checked={settings.ambientOcclusion}
            onChange={(e) => update({ ambientOcclusion: e.target.checked })}
          />
        </div>

        <div className="render-field">
          <label htmlFor="shadows-toggle">Shadows</label>
          <input
            id="shadows-toggle"
            type="checkbox"
            checked={settings.shadows}
            onChange={(e) => update({ shadows: e.target.checked })}
          />
        </div>

        {settings.shadows && (
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
            min={0.1}
            max={3}
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
            <option value="sunset">Sunset</option>
            <option value="night">Night</option>
            <option value="none">None</option>
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
