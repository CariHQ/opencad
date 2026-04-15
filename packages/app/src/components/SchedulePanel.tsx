import React, { useState, useMemo } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import type { ElementType } from '@opencad/document';

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

export function SchedulePanel() {
  const { document: doc } = useDocumentStore();
  const [selectedType, setSelectedType] = useState<ElementType>('wall');

  const elements = useMemo(() => {
    if (!doc) return [];
    return Object.values(doc.elements).filter((el) => el.type === selectedType);
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

  const handleExportCSV = () => {
    const header = ['ID', ...columns].join(',');
    const rows = elements.map((el) => {
      const cells = [el.id, ...columns.map((col) => el.properties[col]?.value ?? '')];
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
