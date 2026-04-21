import React, { useState, useMemo } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import type { ElementSchema, ElementType } from '@opencad/document';
import { computeTakeoff } from '../lib/quantityTakeoff';
import { doorSchedule, windowSchedule, roomSchedule, scheduleToCSV } from '../lib/schedules';

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
          data-testid="export-csv-btn"
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
          {renderStructuredOrFallback(selectedType, elements, columns, doc)}
        </div>
      )}
    </div>
  );
}

/**
 * Door / window / space get a structured schedule from lib/schedules.ts
 * with proper typed columns (tag, width, height, material, host wall,
 * cost). Everything else falls back to the generic union-of-property-
 * keys table.
 */
function renderStructuredOrFallback(
  type: ElementType,
  elements: ElementSchema[],
  columns: string[],
  doc: ReturnType<typeof useDocumentStore.getState>['document'],
) {
  if (doc && type === 'door') {
    const rows = doorSchedule(doc);
    return (
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Tag</th><th>Width (mm)</th><th>Height (mm)</th>
            <th>Material</th><th>Host wall</th><th>Level</th><th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.elementId}>
              <td>{r.tag}</td><td>{r.width}</td><td>{r.height}</td>
              <td>{r.material || '—'}</td>
              <td>{r.hostWall ? r.hostWall.slice(0, 8) : '—'}</td>
              <td>{r.level || '—'}</td>
              <td>{r.cost || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (doc && type === 'window') {
    const rows = windowSchedule(doc);
    return (
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Tag</th><th>Width</th><th>Height</th><th>Sill</th>
            <th>Material</th><th>Host wall</th><th>Level</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.elementId}>
              <td>{r.tag}</td><td>{r.width}</td><td>{r.height}</td><td>{r.sill}</td>
              <td>{r.material || '—'}</td>
              <td>{r.hostWall ? r.hostWall.slice(0, 8) : '—'}</td>
              <td>{r.level || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (doc && type === 'space') {
    const rows = roomSchedule(doc);
    return (
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Tag</th><th>Name</th><th>Area (m²)</th>
            <th>Occupancy</th><th>Floor</th><th>Walls</th><th>Ceiling</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.elementId}>
              <td>{r.tag}</td><td>{r.name}</td>
              <td>{typeof r.area === 'number' ? r.area.toFixed(1) : '—'}</td>
              <td>{r.occupancy || '—'}</td>
              <td>{r.finishFloor || '—'}</td>
              <td>{r.finishWalls || '—'}</td>
              <td>{r.finishCeiling || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <table className="schedule-table">
      <thead>
        <tr>
          <th>ID</th>
          {columns.map((col) => <th key={col}>{col}</th>)}
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
            Total: {elements.length} {type}{elements.length !== 1 ? 's' : ''}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepSchedulesCSVExportAvailable: () => string = () => scheduleToCSV([]);

/**
 * QuantityTab — T-BIM-002
 *
 * Self-contained quantity takeoff tab that calls computeTakeoff against the
 * active document and renders Type | Count | Area (m2) | Volume (m3).
 * Auto-refreshes whenever the document reference changes (Zustand reactivity).
 */
export function QuantityTab() {
  const doc = useDocumentStore((s) => s.document);

  const rows = useMemo(() => {
    if (!doc) return [];
    return computeTakeoff(doc);
  }, [doc]);

  const handleExportCSV = () => {
    const header = 'Type,Count,Area (m2),Volume (m3)';
    const dataRows = rows.map((r) =>
      [
        r.type,
        r.count,
        r.totalArea !== undefined ? r.totalArea.toFixed(2) : '',
        r.totalVolume !== undefined ? r.totalVolume.toFixed(2) : '',
      ].join(','),
    );
    const csv = [header, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: 'quantity-takeoff.csv',
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="quantity-tab">
      <div className="panel-header">
        <span className="panel-title">Quantity Takeoff</span>
        <button
          className="btn-secondary"
          data-testid="export-csv-btn"
          onClick={handleExportCSV}
          aria-label="Export CSV"
        >
          Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="quantity-empty">No elements in model</div>
      ) : (
        <table className="quantity-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Count</th>
              <th>Area (m2)</th>
              <th>Volume (m3)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type}>
                <td>{row.type}</td>
                <td>{row.count}</td>
                <td>{row.totalArea !== undefined ? row.totalArea.toFixed(2) : '-'}</td>
                <td>{row.totalVolume !== undefined ? row.totalVolume.toFixed(2) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
