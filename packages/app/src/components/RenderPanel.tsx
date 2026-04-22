import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('panels');
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS);
  const update = (patch: Partial<RenderSettings>) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <div className="render-panel">
      <div className="panel-header">
        <span className="panel-title">{t('rendering.title', { defaultValue: 'Render Settings' })}</span>
      </div>

      <div className="render-section">
        <h4>{t('rendering.lighting', { defaultValue: 'Lighting' })}</h4>

        <div className="render-field">
          <label htmlFor="ao-toggle">{t('rendering.ambientOcclusion', { defaultValue: 'Ambient Occlusion' })}</label>
          <input
            id="ao-toggle"
            data-testid="enable-ao-checkbox"
            type="checkbox"
            checked={settings.enableAO}
            onChange={(e) => update({ enableAO: e.target.checked })}
          />
        </div>

        <div className="render-field">
          <label htmlFor="shadows-toggle">{t('rendering.shadows', { defaultValue: 'Shadows' })}</label>
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
            <label htmlFor="shadow-intensity">{t('rendering.shadowIntensity', { defaultValue: 'Shadow Intensity' })}</label>
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
          <label htmlFor="exposure-range">{t('rendering.exposure', { defaultValue: 'Exposure' })}</label>
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
          <label htmlFor="tone-mapping-select">{t('rendering.toneMapping', { defaultValue: 'Tone Mapping' })}</label>
          <select
            id="tone-mapping-select"
            value={settings.toneMapping}
            onChange={(e) => update({ toneMapping: e.target.value as ToneMapping })}
          >
            <option value="linear">{t('rendering.tone.linear', { defaultValue: 'Linear' })}</option>
            <option value="aces">{t('rendering.tone.aces', { defaultValue: 'ACES Filmic' })}</option>
            <option value="reinhard">{t('rendering.tone.reinhard', { defaultValue: 'Reinhard' })}</option>
            <option value="cineon">{t('rendering.tone.cineon', { defaultValue: 'Cineon' })}</option>
          </select>
        </div>
      </div>

      <div className="render-section">
        <h4>{t('rendering.environment', { defaultValue: 'Environment' })}</h4>

        <div className="render-field">
          <label htmlFor="env-map-select">{t('rendering.environmentMap', { defaultValue: 'Environment Map' })}</label>
          <select
            id="env-map-select"
            value={settings.environmentMap}
            onChange={(e) => update({ environmentMap: e.target.value as EnvironmentMap })}
          >
            <option value="studio">{t('rendering.env.studio', { defaultValue: 'Studio' })}</option>
            <option value="outdoor">{t('rendering.env.outdoor', { defaultValue: 'Outdoor' })}</option>
            <option value="interior">{t('rendering.env.interior', { defaultValue: 'Interior' })}</option>
            <option value="night">{t('rendering.env.night', { defaultValue: 'Night' })}</option>
          </select>
        </div>

        <div className="render-field">
          <label htmlFor="render-quality-select">{t('rendering.renderQuality', { defaultValue: 'Render Quality' })}</label>
          <select
            id="render-quality-select"
            value={settings.renderQuality}
            onChange={(e) => update({ renderQuality: e.target.value as RenderQuality })}
          >
            <option value="draft">{t('rendering.quality.draft', { defaultValue: 'Draft' })}</option>
            <option value="standard">{t('rendering.quality.standard', { defaultValue: 'Standard' })}</option>
            <option value="high">{t('rendering.quality.high', { defaultValue: 'High' })}</option>
          </select>
        </div>

        <div className="render-field">
          <label htmlFor="ground-reflections-toggle">{t('rendering.groundReflections', { defaultValue: 'Ground Reflections' })}</label>
          <input
            id="ground-reflections-toggle"
            type="checkbox"
            checked={settings.groundReflections}
            onChange={(e) => update({ groundReflections: e.target.checked })}
          />
        </div>
      </div>

      <div className="render-section">
        <h4>{t('rendering.postProcessing', { defaultValue: 'Post-Processing' })}</h4>

        <div className="render-field">
          <label htmlFor="bloom-toggle">{t('rendering.bloom', { defaultValue: 'Bloom' })}</label>
          <input
            id="bloom-toggle"
            type="checkbox"
            checked={settings.bloomEnabled}
            onChange={(e) => update({ bloomEnabled: e.target.checked })}
          />
        </div>

        {settings.bloomEnabled && (
          <div className="render-field">
            <label htmlFor="bloom-strength">{t('rendering.bloomStrength', { defaultValue: 'Bloom Strength' })}</label>
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
