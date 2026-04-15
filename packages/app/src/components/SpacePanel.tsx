import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

const USAGE_TYPES = [
  { value: 'living', label: 'Living Area' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'office', label: 'Office' },
  { value: 'circulation', label: 'Circulation' },
  { value: 'storage', label: 'Storage' },
  { value: 'utility', label: 'Utility' },
];

function isAreaDeficit(actual: number, required: number): boolean {
  if (required <= 0) return false;
  return actual < required * 0.95;
}

export function SpacePanel() {
  const { document: doc, toolParams, setToolParam } = useDocumentStore();

  const spaceParams = (toolParams as Record<string, Record<string, unknown>>)?.space ?? {
    name: 'Room',
    usageType: 'living',
    requiredArea: 20,
  };
  const name = String(spaceParams.name ?? 'Room');
  const usageType = String(spaceParams.usageType ?? 'living');
  const requiredArea = Number(spaceParams.requiredArea ?? 20);

  const spaces = doc
    ? Object.values(doc.content.elements).filter((el) => el.type === ('space' as string))
    : [];

  const totalArea = spaces.reduce((sum, sp) => {
    const actual = Number(sp.properties['actualArea']?.value ?? 0);
    return sum + actual;
  }, 0);

  return (
    <div className="tool-panel">
      <div className="tool-panel-header">Space Tool</div>

      <div className="tool-panel-group">
        <div className="tool-panel-row">
          <label htmlFor="space-name">Room Name</label>
          <input
            id="space-name"
            type="text"
            className="tool-panel-input"
            defaultValue={name}
            onBlur={(e) => setToolParam('space', 'name', e.target.value)}
          />
        </div>

        <div className="tool-panel-row">
          <label htmlFor="space-usage">Usage Type</label>
          <select
            id="space-usage"
            aria-label="Usage Type"
            className="tool-panel-select"
            value={usageType}
            onChange={(e) => setToolParam('space', 'usageType', e.target.value)}
          >
            {USAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-panel-row">
          <label htmlFor="space-required-area">Required Area (m²)</label>
          <input
            id="space-required-area"
            type="number"
            className="tool-panel-input"
            defaultValue={requiredArea}
            min={0}
            step={1}
            onBlur={(e) => setToolParam('space', 'requiredArea', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="tool-panel-hint">Click inside walls to place space</div>
      </div>

      {spaces.length > 0 && (
        <div className="tool-panel-group">
          <div className="tool-panel-group-title">Spaces ({spaces.length})</div>
          {spaces.map((sp) => {
            const spName = String(sp.properties['name']?.value ?? sp.id);
            const actual = Number(sp.properties['actualArea']?.value ?? 0);
            const required = Number(sp.properties['requiredArea']?.value ?? 0);
            const deficit = isAreaDeficit(actual, required);
            return (
              <div key={sp.id} className="space-row">
                <div className="space-row-info">
                  <span className="space-name">{spName}</span>
                  <span className="space-area">{actual} m²</span>
                </div>
                {deficit && (
                  <div role="alert" className="compliance-warning">
                    Area deficit: {actual} m² &lt; required {required} m²
                  </div>
                )}
              </div>
            );
          })}
          <div className="space-total">Total floor area: {totalArea} m²</div>
        </div>
      )}
    </div>
  );
}
