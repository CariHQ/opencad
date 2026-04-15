import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

const WALL_TYPES = ['exterior', 'interior', 'partition', 'curtain'] as const;

export function WallToolPanel() {
  const { toolParams, setToolParam } = useDocumentStore();
  const params = (toolParams['wall'] ?? {}) as {
    height: number;
    thickness: number;
    material: string;
    wallType: string;
  };

  return (
    <div className="placement-panel">
      <div className="placement-header">
        <span className="placement-title">Wall</span>
      </div>

      <div className="placement-params">
        <div className="placement-param">
          <label htmlFor="wall-height">Height (mm)</label>
          <input
            id="wall-height"
            type="number"
            value={params.height ?? 3000}
            min={100}
            max={20000}
            step={100}
            onChange={(e) => setToolParam('wall', 'height', Number(e.target.value))}
          />
        </div>

        <div className="placement-param">
          <label htmlFor="wall-thickness">Thickness (mm)</label>
          <input
            id="wall-thickness"
            type="number"
            value={params.thickness ?? 200}
            min={50}
            max={1000}
            step={25}
            onChange={(e) => setToolParam('wall', 'thickness', Number(e.target.value))}
          />
        </div>

        <div className="placement-param">
          <label htmlFor="wall-material">Material</label>
          <input
            id="wall-material"
            type="text"
            value={params.material ?? 'Concrete'}
            onChange={(e) => setToolParam('wall', 'material', e.target.value)}
          />
        </div>

        <div className="placement-param">
          <label htmlFor="wall-type">Type</label>
          <select
            id="wall-type"
            value={params.wallType ?? 'interior'}
            onChange={(e) => setToolParam('wall', 'wallType', e.target.value)}
          >
            {WALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="placement-hint">Click and drag to place wall</div>
    </div>
  );
}
