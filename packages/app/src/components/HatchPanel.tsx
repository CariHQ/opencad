import React, { useState } from 'react';

export interface HatchConfig { pattern: string; scale: number; angle: number; spacing: number; }

const HATCH_PATTERNS = [
  { id: 'concrete', label: 'Concrete', description: 'Dotted triangle pattern' },
  { id: 'brick', label: 'Brick', description: 'Staggered horizontal lines' },
  { id: 'sand', label: 'Sand/Earth', description: 'Stipple dots' },
  { id: 'insulation', label: 'Insulation', description: 'Zigzag lines' },
  { id: 'gravel', label: 'Gravel', description: 'Random circles' },
  { id: 'stone', label: 'Cut Stone', description: 'Diagonal cross-hatch' },
  { id: 'timber', label: 'Timber', description: 'Diagonal lines with knots' },
  { id: 'steel', label: 'Steel (section)', description: 'Diagonal lines 45°' },
  { id: 'glass', label: 'Glass', description: 'Vertical lines' },
  { id: 'plasterboard', label: 'Plasterboard', description: 'Fine horizontal lines' },
  { id: 'water', label: 'Water', description: 'Wavy horizontal lines' },
  { id: 'earth', label: 'Earth/Ground', description: 'Horizontal with grass symbols' },
  { id: 'diagonal', label: 'Diagonal Lines', description: 'Simple 45° diagonal' },
  { id: 'crosshatch', label: 'Cross-hatch', description: 'Grid at 45°' },
  { id: 'dots', label: 'Dot Grid', description: 'Regular dot pattern' },
];

interface HatchPanelProps { onApply: (config: HatchConfig) => void; }

export function HatchPanel({ onApply }: HatchPanelProps) {
  const [selected, setSelected] = useState('concrete');
  const [scale, setScale] = useState(1.0);
  const [angle, setAngle] = useState(0);
  const [spacing, setSpacing] = useState(5);

  return (
    <div className="hatch-panel">
      <div className="panel-header"><span className="panel-title">Hatch Patterns</span></div>
      <div className="hatch-pattern-list">
        {HATCH_PATTERNS.map((p) => (
          <label key={p.id} className={`hatch-option ${selected === p.id ? 'selected' : ''}`}>
            <input type="radio" name="hatch" value={p.id} checked={selected === p.id}
              onChange={() => setSelected(p.id)} />
            <span className="hatch-label">{p.label}</span>
          </label>
        ))}
      </div>
      <div className="hatch-controls">
        <div className="hatch-row">
          <label htmlFor="hatch-scale">Scale</label>
          <input id="hatch-scale" type="number" min={0.1} max={100} step={0.1} value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value) || 1)} />
        </div>
        <div className="hatch-row">
          <label htmlFor="hatch-angle">Angle (°)</label>
          <input id="hatch-angle" type="number" min={0} max={360} step={15} value={angle}
            onChange={(e) => setAngle(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="hatch-row">
          <label htmlFor="hatch-spacing">Spacing (mm)</label>
          <input id="hatch-spacing" type="number" min={1} max={500} step={1} value={spacing}
            onChange={(e) => setSpacing(parseFloat(e.target.value) || 5)} />
        </div>
      </div>
      <button className="btn-primary" onClick={() => onApply({ pattern: selected, scale, angle, spacing })}
        aria-label="Apply hatch">Apply</button>
    </div>
  );
}
