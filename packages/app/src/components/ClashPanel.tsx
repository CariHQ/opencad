import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Clash } from '../lib/clashDetection';

interface ClashPanelProps {
  onRunDetection: () => Clash[];
}

export function ClashPanel({ onRunDetection }: ClashPanelProps) {
  const { t } = useTranslation('panels');
  const [clashes, setClashes] = useState<Clash[] | null>(null);

  const handleRun = () => {
    const result = onRunDetection();
    setClashes(result);
  };

  const handleExportCsv = () => {
    if (!clashes) return;
    const header = 'Element A,Element B,Severity,Overlap Volume (m³)';
    const rows = clashes.map(
      (c) => `${c.elementAId},${c.elementBId},${c.severity},${c.overlapVolume}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clash-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="clash-panel panel">
      <div className="panel-header">
        <span className="panel-title">{t('clash.title')}</span>
      </div>
      <div className="panel-body">
        <button
          data-testid="run-clash-btn"
          className="btn-primary"
          onClick={handleRun}
        >
          {t('clash.runFull', { defaultValue: 'Run Clash Detection' })}
        </button>

        {clashes !== null && (
          <>
            <div data-testid="clash-count" className="clash-count">
              {t('clash.clashes', { count: clashes.length, defaultValue: '{{count}} clash(es) found' })}
            </div>

            <table data-testid="clash-table" className="clash-table">
              <thead>
                <tr>
                  <th>{t('clash.elementA', { defaultValue: 'Element A' })}</th>
                  <th>{t('clash.elementB', { defaultValue: 'Element B' })}</th>
                  <th>{t('clash.severity', { defaultValue: 'Severity' })}</th>
                  <th>{t('clash.overlap', { defaultValue: 'Overlap (m³)' })}</th>
                </tr>
              </thead>
              <tbody>
                {clashes.map((clash, i) => (
                  <tr
                    key={i}
                    className={`clash-row clash-${clash.severity}`}
                  >
                    <td>{clash.elementAId}</td>
                    <td>{clash.elementBId}</td>
                    <td className={clash.severity === 'hard' ? 'text-red' : 'text-amber'}>
                      {clash.severity}
                    </td>
                    <td>{clash.overlapVolume.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              data-testid="export-clash-csv"
              className="btn-secondary"
              onClick={handleExportCsv}
            >
              {t('clash.exportCsv', { defaultValue: 'Export CSV' })}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
