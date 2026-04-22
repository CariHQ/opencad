import React from 'react';
import { useTranslation } from 'react-i18next';

export interface RoomFinishes {
  floor: string;
  ceiling: string;
  walls: string;
}

export interface RoomDataSheet {
  id: string;
  roomName: string;
  area: number;
  height: number;
  finishes: RoomFinishes;
  services: string[];
  notes: string;
}

interface SpecWritingPanelProps {
  sheets?: RoomDataSheet[];
  onGenerate?: () => void;
  onExport?: (sheets: RoomDataSheet[]) => void;
}

export function SpecWritingPanel({ sheets = [], onGenerate, onExport }: SpecWritingPanelProps = {}) {
  const { t } = useTranslation('panels');
  return (
    <div className="spec-writing-panel">
      <div className="panel-header">
        <span className="panel-title">{t('specs.roomDataTitle', { defaultValue: 'Room Data Sheets' })}</span>
      </div>
      <div className="spec-actions">
        <button
          aria-label={t('specs.generateAria', { defaultValue: 'Generate from model' })}
          className="btn-generate"
          onClick={() => onGenerate?.()}
        >
          {t('specs.generate')}
        </button>
        <button
          aria-label={t('specs.exportAria', { defaultValue: 'Export sheets' })}
          className="btn-export"
          onClick={() => onExport?.(sheets)}
          disabled={sheets.length === 0}
        >
          {t('specs.export', { defaultValue: 'Export' })}
        </button>
      </div>

      {sheets.length === 0 ? (
        <div className="spec-empty">
          {t('specs.emptyDetail', { defaultValue: 'No room data sheets. Click "Generate from Model" to create them from spaces in the model.' })}
        </div>
      ) : (
        <div className="sheets-list">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="room-data-sheet">
              <h4 className="sheet-room-name">{sheet.roomName}</h4>
              <div className="sheet-details">
                <div className="sheet-row">
                  <span className="sheet-label">{t('specs.areaLabel', { defaultValue: 'Area:' })}</span>
                  <span>{sheet.area} m²</span>
                </div>
                <div className="sheet-row">
                  <span className="sheet-label">{t('specs.heightLabel', { defaultValue: 'Height:' })}</span>
                  <span>{sheet.height} m</span>
                </div>
                <div className="sheet-finishes">
                  <span className="sheet-label">{t('specs.finishes', { defaultValue: 'Finishes:' })}</span>
                  <span>{t('specs.floor', { defaultValue: 'Floor' })}: {sheet.finishes.floor}</span>
                  <span>{t('specs.ceiling', { defaultValue: 'Ceiling' })}: {sheet.finishes.ceiling}</span>
                  <span>{t('specs.walls', { defaultValue: 'Walls' })}: {sheet.finishes.walls}</span>
                </div>
                <div className="sheet-services">
                  <span className="sheet-label">{t('specs.services', { defaultValue: 'Services:' })}</span>
                  <span>{sheet.services.join(', ')}</span>
                </div>
                {sheet.notes && (
                  <div className="sheet-notes">
                    <span className="sheet-label">{t('specs.notes', { defaultValue: 'Notes:' })}</span>
                    <span>{sheet.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
