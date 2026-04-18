import React from 'react';

export type LifecycleStage = 'A1-A3' | 'A4' | 'A5' | 'B1-B7' | 'C1-C4' | 'D';

export interface CarbonEntry {
  id: string;
  material: string;
  quantity: number;
  unit: string;
  kgCO2ePerUnit: number;
  totalKgCO2e: number;
  stage: LifecycleStage;
}

interface CarbonPanelProps {
  entries?: CarbonEntry[];
  onExport?: (entries: CarbonEntry[]) => void;
}

function formatCarbon(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function CarbonPanel({ entries = [], onExport }: CarbonPanelProps = {}) {
  const totalKgCO2e = entries.reduce((sum, e) => sum + e.totalKgCO2e, 0);

  return (
    <div className="carbon-panel">
      <div className="panel-header">
        <span className="panel-title">Carbon Calculator</span>
        <button
          aria-label="Export carbon report"
          className="btn-export"
          onClick={() => onExport?.(entries)}
          disabled={entries.length === 0}
        >
          Export
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="carbon-empty">No carbon data. Add materials with carbon factors to calculate.</div>
      ) : (
        <>
          <div className="carbon-summary">
            <span className="carbon-total-label">Total Embodied Carbon</span>
            <span className="carbon-total-value">
              {formatCarbon(totalKgCO2e)} kgCO2e
            </span>
          </div>

          <table className="carbon-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>kgCO2e/unit</th>
                <th>Total kgCO2e</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="carbon-row">
                  <td>{entry.material}</td>
                  <td>{entry.quantity}</td>
                  <td>{entry.unit}</td>
                  <td>{entry.kgCO2ePerUnit}</td>
                  <td>{formatCarbon(entry.totalKgCO2e)}</td>
                  <td className="stage-badge">{entry.stage}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}><strong>Total</strong></td>
                <td colSpan={2}><strong>{formatCarbon(totalKgCO2e)} kgCO2e</strong></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}
