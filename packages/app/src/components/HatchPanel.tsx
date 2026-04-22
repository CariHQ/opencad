import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';

export interface HatchConfig { pattern: string; scale: number; angle: number; spacing: number; }

const HATCH_PATTERNS = [
  { id: 'concrete',     label: 'Concrete',      symbol: '▦' },
  { id: 'brick',        label: 'Brick',          symbol: '▤' },
  { id: 'sand',         label: 'Sand/Earth',     symbol: '∷' },
  { id: 'insulation',   label: 'Insulation',     symbol: '≋' },
  { id: 'gravel',       label: 'Gravel',         symbol: '∘' },
  { id: 'stone',        label: 'Cut Stone',      symbol: '▩' },
  { id: 'timber',       label: 'Timber',         symbol: '⊞' },
  { id: 'steel',        label: 'Steel',          symbol: '▨' },
  { id: 'glass',        label: 'Glass',          symbol: '║' },
  { id: 'plasterboard', label: 'Plasterboard',   symbol: '≡' },
  { id: 'water',        label: 'Water',          symbol: '≈' },
  { id: 'earth',        label: 'Earth/Ground',   symbol: '≛' },
  { id: 'diagonal',     label: 'Diagonal',       symbol: '▧' },
  { id: 'crosshatch',   label: 'Cross-hatch',    symbol: '▦' },
  { id: 'dots',         label: 'Dot Grid',       symbol: '⋮' },
];

interface HatchPanelProps { onApply?: (config: HatchConfig) => void; }

export function HatchPanel({ onApply }: HatchPanelProps = {}) {
  const { t } = useTranslation('panels');
  const [selected, setSelected] = useState('concrete');
  const [scale, setScale] = useState(1.0);
  const [angle, setAngle] = useState(0);
  const [spacing, setSpacing] = useState(5);

  const { selectedIds, updateElement } = useDocumentStore();

  const handleApply = () => {
    const config: HatchConfig = { pattern: selected, scale, angle, spacing };
    // Apply hatch to all selected elements via document store
    if (selectedIds.length > 0) {
      selectedIds.forEach((id) => {
        updateElement(id, {
          properties: {
            HatchPattern: { type: 'string', value: selected },
            HatchScale: { type: 'number', value: scale },
            HatchAngle: { type: 'number', value: angle },
            HatchSpacing: { type: 'number', value: spacing },
          },
        });
      });
    }
    onApply?.(config);
  };

  return (
    <div className="hatch-panel">
      <div className="panel-header"><span className="panel-title">{t('hatch.title')}</span></div>

      {selectedIds.length === 0 && (
        <div className="hatch-notice">{t('hatch.selectHint', { defaultValue: 'Select elements to apply a hatch pattern.' })}</div>
      )}

      <div className="hatch-pattern-grid">
        {HATCH_PATTERNS.map((p) => (
          <label
            key={p.id}
            className={`hatch-tile${selected === p.id ? ' selected' : ''}`}
            title={p.label}
          >
            <input
              type="radio"
              name="hatch-pattern"
              value={p.id}
              checked={selected === p.id}
              onChange={() => setSelected(p.id)}
              className="sr-only"
              aria-label={p.label}
            />
            <span className="hatch-tile-symbol">{p.symbol}</span>
            <span className="hatch-tile-label">{p.label}</span>
          </label>
        ))}
      </div>

      <div className="hatch-controls">
        <div className="hatch-row">
          <label htmlFor="hatch-scale">{t('hatch.scale', { defaultValue: 'Scale' })}</label>
          <input id="hatch-scale" type="number" min={0.1} max={100} step={0.1} value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value) || 1)} />
        </div>
        <div className="hatch-row">
          <label htmlFor="hatch-angle">{t('hatch.angle', { defaultValue: 'Angle (°)' })}</label>
          <input id="hatch-angle" type="number" min={0} max={360} step={15} value={angle}
            onChange={(e) => setAngle(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="hatch-row">
          <label htmlFor="hatch-spacing">{t('hatch.spacing', { defaultValue: 'Spacing (mm)' })}</label>
          <input id="hatch-spacing" type="number" min={1} max={500} step={1} value={spacing}
            onChange={(e) => setSpacing(parseFloat(e.target.value) || 5)} />
        </div>
      </div>

      <button
        className="btn-primary hatch-apply-btn"
        onClick={handleApply}
        aria-label={t('hatch.apply', { defaultValue: 'Apply hatch' })}
      >
        {selectedIds.length > 0
          ? t('hatch.applyToCount', { count: selectedIds.length, defaultValue: 'Apply to {{count}} element(s)' })
          : t('hatch.apply', { defaultValue: 'Apply' })}
      </button>
    </div>
  );
}
