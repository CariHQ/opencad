import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

const GLAZING_TYPES = ['single', 'double', 'triple'] as const;

export function CurtainWallPanel() {
  const { toolParams, setToolParam } = useDocumentStore();
  const params = (toolParams['curtain_wall'] ?? {}) as {
    height: number;
    frameDepth: number;
    glazingType: string;
    frameColor: string;
  };

  return (
    <div className="placement-panel">
      <div className="placement-header">
        <span className="placement-title">Curtain Wall</span>
      </div>

      <div className="placement-params">
        <div className="placement-param">
          <label htmlFor="cw-height">Height (mm)</label>
          <input
            id="cw-height"
            type="number"
            value={params.height ?? 3000}
            min={500}
            max={20000}
            step={100}
            onChange={(e) => setToolParam('curtain_wall', 'height', Number(e.target.value))}
          />
        </div>

        <div className="placement-param">
          <label htmlFor="cw-frame-depth">Frame Depth (mm)</label>
          <input
            id="cw-frame-depth"
            type="number"
            value={params.frameDepth ?? 150}
            min={50}
            max={500}
            step={10}
            onChange={(e) => setToolParam('curtain_wall', 'frameDepth', Number(e.target.value))}
          />
        </div>

        <div className="placement-param">
          <label htmlFor="cw-glazing">Glazing Type</label>
          <select
            id="cw-glazing"
            value={params.glazingType ?? 'double'}
            onChange={(e) => setToolParam('curtain_wall', 'glazingType', e.target.value)}
          >
            {GLAZING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="placement-param">
          <label htmlFor="cw-frame-color">Frame Color</label>
          <input
            id="cw-frame-color"
            type="color"
            value={params.frameColor ?? '#888888'}
            onChange={(e) => setToolParam('curtain_wall', 'frameColor', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
