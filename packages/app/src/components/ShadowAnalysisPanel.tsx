import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateSolarPosition, estimateDaylightHours } from '../lib/solarAnalysis';
import { useSceneStore } from '../stores/sceneStore';

export interface ShadowAnalysisSettings {
  latitude: number;
  longitude: number;
  date: string;
  time: string;
  showSunPath: boolean;
  showShadowMap: boolean;
}

const DEFAULT_SETTINGS: ShadowAnalysisSettings = {
  latitude: 40.7,    // NYC (per spec)
  longitude: -74.0,
  date: new Date().toISOString().slice(0, 10),
  time: '12:00',
  showSunPath: true,
  showShadowMap: true,
};

interface ShadowAnalysisPanelProps {
  onRun?: (settings: ShadowAnalysisSettings) => void;
  onChange?: (settings: ShadowAnalysisSettings) => void;
}

/** Parse "HH:MM" time string into an hour number (e.g. "14:30" → 14.5) */
function parseHour(time: string): number {
  const [h = '12', m = '0'] = time.split(':');
  return parseInt(h, 10) + parseInt(m, 10) / 60;
}

/** Parse a date string "YYYY-MM-DD" into a month number (1–12) */
function parseMonth(date: string): number {
  const parts = date.split('-');
  const month = parseInt(parts[1] ?? '6', 10);
  return isNaN(month) ? 6 : month;
}

export function ShadowAnalysisPanel({ onRun, onChange }: ShadowAnalysisPanelProps = {}) {
  const { t } = useTranslation('panels');
  const [settings, setSettings] = useState<ShadowAnalysisSettings>(DEFAULT_SETTINGS);
  const setSun = useSceneStore((s) => s.setSun);
  const setShadowsEnabled = useSceneStore((s) => s.setShadowsEnabled);

  const update = (patch: Partial<ShadowAnalysisSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    onChange?.(next);
  };

  // Derived solar calculations
  const solarData = useMemo(() => {
    const month = parseMonth(settings.date);
    const hour = parseHour(settings.time);
    const position = calculateSolarPosition({
      latitude: settings.latitude,
      longitude: settings.longitude,
      month,
      hour,
    });
    const daylightHours = estimateDaylightHours(settings.latitude, month);
    return { position, daylightHours };
  }, [settings.latitude, settings.longitude, settings.date, settings.time]);

  // Push the computed sun direction into the scene store so the 3D viewport's
  // DirectionalLight tracks the time-of-day slider in real time.
  useEffect(() => {
    setSun({
      elevationDeg: solarData.position.elevation,
      azimuthDeg: solarData.position.azimuth,
    });
  }, [solarData.position.elevation, solarData.position.azimuth, setSun]);

  useEffect(() => {
    setShadowsEnabled(settings.showShadowMap);
  }, [settings.showShadowMap, setShadowsEnabled]);

  return (
    <div className="shadow-analysis-panel">
      <div className="panel-header">
        <span className="panel-title">{t('shadow.fullTitle', { defaultValue: 'Shadow & Daylight Analysis' })}</span>
      </div>

      <div className="analysis-section">
        <h4>{t('shadow.location', { defaultValue: 'Location' })}</h4>
        <div className="field-row">
          <label htmlFor="shadow-lat">{t('shadow.latitude', { defaultValue: 'Latitude' })}</label>
          <input
            id="shadow-lat"
            type="number"
            step={0.001}
            value={settings.latitude}
            onChange={(e) => update({ latitude: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field-row">
          <label htmlFor="shadow-lng">{t('shadow.longitude', { defaultValue: 'Longitude' })}</label>
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
        <h4>{t('shadow.sunPosition', { defaultValue: 'Sun Position' })}</h4>
        <div className="field-row">
          <label htmlFor="shadow-date">{t('shadow.date')}</label>
          <input
            id="shadow-date"
            type="date"
            value={settings.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </div>
        <div className="field-row">
          <label htmlFor="shadow-time">{t('shadow.time')}</label>
          <input
            id="shadow-time"
            type="time"
            value={settings.time}
            onChange={(e) => update({ time: e.target.value })}
          />
        </div>

        {/* Month slider (1–12) */}
        <div className="field-row">
          <label htmlFor="shadow-month">{t('shadow.month', { defaultValue: 'Month' })}</label>
          <input
            id="shadow-month"
            type="range"
            min={1}
            max={12}
            step={1}
            value={parseMonth(settings.date)}
            onChange={(e) => {
              const month = parseInt(e.target.value, 10);
              const year = new Date().getFullYear();
              const pad = (n: number) => String(n).padStart(2, '0');
              update({ date: `${year}-${pad(month)}-01` });
            }}
          />
          <span className="field-value">{parseMonth(settings.date)}</span>
        </div>

        {/* Hour slider (6–18) */}
        <div className="field-row">
          <label htmlFor="shadow-hour">{t('shadow.hour', { defaultValue: 'Hour' })}</label>
          <input
            id="shadow-hour"
            type="range"
            min={6}
            max={18}
            step={1}
            value={Math.round(parseHour(settings.time))}
            onChange={(e) => {
              const h = parseInt(e.target.value, 10);
              const pad = (n: number) => String(n).padStart(2, '0');
              update({ time: `${pad(h)}:00` });
            }}
          />
          <span className="field-value">{Math.round(parseHour(settings.time))}:00</span>
        </div>
      </div>

      {/* Solar Analysis Results */}
      <div className="analysis-section">
        <h4>{t('shadow.solarAnalysis', { defaultValue: 'Solar Analysis' })}</h4>
        <div className="field-row">
          <span className="field-label">{t('shadow.elevation', { defaultValue: 'Elevation' })}</span>
          <span className="field-value">{solarData.position.elevation.toFixed(1)}°</span>
        </div>
        <div className="field-row">
          <span className="field-label">{t('shadow.azimuth', { defaultValue: 'Azimuth' })}</span>
          <span className="field-value">{solarData.position.azimuth.toFixed(1)}°</span>
        </div>
        <div className="field-row">
          <span className="field-label">{t('shadow.daylightHours', { defaultValue: 'Daylight Hours' })}</span>
          <span className="field-value">{solarData.daylightHours.toFixed(1)} h</span>
        </div>
      </div>

      <div className="analysis-section">
        <h4>{t('shadow.visualisation', { defaultValue: 'Visualisation' })}</h4>
        <div className="field-row">
          <label htmlFor="sun-path-toggle">{t('shadow.showSunPath', { defaultValue: 'Show Sun Path' })}</label>
          <input
            id="sun-path-toggle"
            type="checkbox"
            checked={settings.showSunPath}
            onChange={(e) => update({ showSunPath: e.target.checked })}
          />
        </div>
        <div className="field-row">
          <label htmlFor="shadow-map-toggle">{t('shadow.showShadowMap', { defaultValue: 'Show Shadow Map' })}</label>
          <input
            id="shadow-map-toggle"
            type="checkbox"
            checked={settings.showShadowMap}
            onChange={(e) => update({ showShadowMap: e.target.checked })}
          />
        </div>
      </div>

      <button
        aria-label={t('shadow.runAnalysis', { defaultValue: 'Run analysis' })}
        className="btn-run-analysis"
        onClick={() => onRun?.(settings)}
      >
        {t('shadow.runAnalysis', { defaultValue: 'Run Analysis' })}
      </button>
    </div>
  );
}
