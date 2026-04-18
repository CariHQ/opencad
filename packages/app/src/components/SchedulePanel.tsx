import React, { useState, useMemo } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import type { ElementSchema, ElementType } from '@opencad/document';

const SCHEDULE_TYPES: { value: ElementType; label: string }[] = [
  { value: 'wall', label: 'Wall' },
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'slab', label: 'Slab' },
  { value: 'column', label: 'Column' },
  { value: 'beam', label: 'Beam' },
  { value: 'stair', label: 'Stair' },
  { value: 'railing', label: 'Railing' },
];

/** Wall/slab area from bounding box: (max.x - min.x) * height / 1e6 → m² */
function calcArea(el: ElementSchema): number | null {
  const bb = el.boundingBox;
  if (!bb) return null;
  const width = (bb.max.x - bb.min.x) / 1000;  // mm → m
  const height = (bb.max.z - bb.min.z) / 1000;  // mm → m
  if (width <= 0 || height <= 0) return null;
  return width * height;
}

/** Length from bounding box: max.x - min.x / 1000 → m */
function calcLength(el: ElementSchema): number | null {
  const bb = el.boundingBox;
  if (!bb) return null;
  const len = (bb.max.x - bb.min.x) / 1000;  // mm → m
  return len > 0 ? len : null;
}

export function SchedulePanel() {
  const { document: doc } = useDocumentStore();
  const [selectedType, setSelectedType] = useState<ElementType>('wall');

  const elements = useMemo(() => {
    if (!doc) return [];
    return Object.values(doc.content.elements).filter((el) => el.type === selectedType);
  }, [doc, selectedType]);

  // Derive column headers from the union of property keys
  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const el of elements) {
      for (const k of Object.keys(el.properties)) {
        keys.add(k);
      }
    }
    return Array.from(keys);
  }, [elements]);

  // Quantity takeoff summary: count + totals for the selected type
  const qtySummary = useMemo(() => {
    const count = elements.length;
    const areas = elements
      .map(calcArea)
      .filter((a): a is number => a !== null);
    const lengths = elements
      .map(calcLength)
      .filter((l): l is number => l !== null);
    const totalArea = areas.length > 0 ? areas.reduce((s, a) => s + a, 0) : null;
    const totalLength = lengths.length > 0 ? lengths.reduce((s, l) => s + l, 0) : null;
    return { count, totalArea, totalLength };
  }, [elements]);

  const handleExportCSV = () => {
    const header = ['ID', 'Type', ...columns].join(',');
    const rows = elements.map((el) => {
      const cells = [el.id, el.type, ...columns.map((col) => el.properties[col]?.value ?? '')];
      return cells.map((c) => `"${c}"`).join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${selectedType}-schedule.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="schedule-panel">
      <div className="panel-header">
        <span className="panel-title">Schedule</span>
      </div>

      <div className="schedule-controls">
        <label htmlFor="schedule-type" className="schedule-label">
          Element Type
        </label>
        <select
          id="schedule-type"
          aria-label="Element Type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as ElementType)}
          className="schedule-type-select"
        >
          {SCHEDULE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <button
          className="btn-secondary"
          onClick={handleExportCSV}
          aria-label="Export CSV"
        >
          Export CSV
        </button>
      </div>

      {/* T-BIM-002: Quantity takeoff summary table */}
      <div className="schedule-qty-summary">
        <table className="schedule-qty-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Count</th>
              <th>Area (m²)</th>
              <th>Length (m)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{selectedType}</td>
              <td>{qtySummary.count}</td>
              <td>{qtySummary.totalArea !== null ? qtySummary.totalArea.toFixed(2) : '—'}</td>
              <td>{qtySummary.totalLength !== null ? qtySummary.totalLength.toFixed(2) : '—'}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {elements.length === 0 ? (
        <div className="schedule-empty">No {selectedType} elements in model</div>
      ) : (
        <div className="schedule-table-wrapper">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>ID</th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {elements.map((el) => (
                <tr key={el.id}>
                  <td>{el.id}</td>
                  {columns.map((col) => {
                    const prop = el.properties[col];
                    return (
                      <td key={col}>
                        {prop ? `${prop.value}${prop.unit ? ' ' + prop.unit : ''}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={columns.length + 1} className="schedule-total">
                  Total: {elements.length} {selectedType}{elements.length !== 1 ? 's' : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
