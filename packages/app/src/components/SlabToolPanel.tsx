import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

const SLAB_TYPES = ['floor', 'ceiling', 'roof'] as const;

export function SlabToolPanel() {
  const { toolParams, setToolParam } = useDocumentStore();
  const params = (toolParams?.['slab'] ?? {}) as {
    thickness: number;
    material: string;
    slopeAngle: number;
    elevationOffset: number;
    slabType: string;
  };

  return (
    <div className="placement-panel">
      <div className="placement-header">
        <span className="placement-title">Slab</span>
      </div>

      <div className="placement-params">
        <div className="placement-param">
          <label htmlFor="slab-type">Type</label>
          <select
            id="slab-type"
            value={params.slabType ?? 'floor'}
            onChange={(e) => setToolParam('slab', 'slabType', e.target.value)}
          >
            {SLAB_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="placement-param">
          <label htmlFor="slab-thickness">Thickness (mm)</label>
          <input
            id="slab-thickness"
            type="number"
            value={params.thickness ?? 250}
            min={50}
            max={2000}
            step={25}
            onChange={(e) => setToolParam('slab', 'thickness', Number(e.target.value))}
          />
        </div>

        <div className="placement-param">
          <label htmlFor="slab-material">Material</label>
          <input
            id="slab-material"
            type="text"
            value={params.material ?? 'Concrete'}
            onChange={(e) => setToolParam('slab', 'material', e.target.value)}
          />
        </div>

        <div className="placement-param">
          <label htmlFor="slab-slope">Slope Angle (°)</label>
          <input
            id="slab-slope"
            type="number"
            value={params.slopeAngle ?? 0}
            min={0}
            max={90}
            step={1}
            onChange={(e) => setToolParam('slab', 'slopeAngle', Number(e.target.value))}
          />
        </div>

        <div className="placement-param">
          <label htmlFor="slab-elevation">Elevation Offset (mm)</label>
          <input
            id="slab-elevation"
            type="number"
            value={params.elevationOffset ?? 0}
            step={100}
            onChange={(e) => setToolParam('slab', 'elevationOffset', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="placement-hint">Draw polygon boundary to place slab</div>
    </div>
  );
}
