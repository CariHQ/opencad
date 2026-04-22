import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';

const SLAB_TYPES = ['floor', 'ceiling', 'roof'] as const;

export function SlabToolPanel() {
  const { t } = useTranslation('panels');
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
        <span className="placement-title">{t('tool.slab.title', { defaultValue: 'Slab' })}</span>
      </div>

      <div className="placement-params">
        <div className="placement-param">
          <label htmlFor="slab-type">{t('tool.slab.type', { defaultValue: 'Type' })}</label>
          <select
            id="slab-type"
            value={params.slabType ?? 'floor'}
            onChange={(e) => setToolParam('slab', 'slabType', e.target.value)}
          >
            {SLAB_TYPES.map((st) => (
              <option key={st} value={st}>
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="placement-param">
          <label htmlFor="slab-thickness">{t('tool.slab.thickness', { defaultValue: 'Thickness (mm)' })}</label>
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
          <label htmlFor="slab-material">{t('tool.slab.material', { defaultValue: 'Material' })}</label>
          <input
            id="slab-material"
            type="text"
            value={params.material ?? 'Concrete'}
            onChange={(e) => setToolParam('slab', 'material', e.target.value)}
          />
        </div>

        <div className="placement-param">
          <label htmlFor="slab-slope">{t('tool.slab.slopeAngle', { defaultValue: 'Slope Angle (°)' })}</label>
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
          <label htmlFor="slab-elevation">{t('tool.slab.elevationOffset', { defaultValue: 'Elevation Offset (mm)' })}</label>
          <input
            id="slab-elevation"
            type="number"
            value={params.elevationOffset ?? 0}
            step={100}
            onChange={(e) => setToolParam('slab', 'elevationOffset', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="placement-hint">{t('tool.slab.placeHint', { defaultValue: 'Draw polygon boundary to place slab' })}</div>
    </div>
  );
}
