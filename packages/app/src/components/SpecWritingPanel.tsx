import React from 'react';

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
  return (
    <div className="spec-writing-panel">
      <div className="panel-header">
        <span className="panel-title">Spec Writing — Room Data Sheets</span>
        <div className="spec-actions">
          <button
            aria-label="Generate from model"
            className="btn-generate"
            onClick={() => onGenerate?.()}
          >
            Generate from Model
          </button>
          <button
            aria-label="Export sheets"
            className="btn-export"
            onClick={() => onExport?.(sheets)}
            disabled={sheets.length === 0}
          >
            Export
          </button>
        </div>
      </div>

      {sheets.length === 0 ? (
        <div className="spec-empty">
          No room data sheets. Click &quot;Generate from Model&quot; to create them from spaces in the model.
        </div>
      ) : (
        <div className="sheets-list">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="room-data-sheet">
              <h4 className="sheet-room-name">{sheet.roomName}</h4>
              <div className="sheet-details">
                <div className="sheet-row">
                  <span className="sheet-label">Area:</span>
                  <span>{sheet.area} m²</span>
                </div>
                <div className="sheet-row">
                  <span className="sheet-label">Height:</span>
                  <span>{sheet.height} m</span>
                </div>
                <div className="sheet-finishes">
                  <span className="sheet-label">Finishes:</span>
                  <span>Floor: {sheet.finishes.floor}</span>
                  <span>Ceiling: {sheet.finishes.ceiling}</span>
                  <span>Walls: {sheet.finishes.walls}</span>
                </div>
                <div className="sheet-services">
                  <span className="sheet-label">Services:</span>
                  <span>{sheet.services.join(', ')}</span>
                </div>
                {sheet.notes && (
                  <div className="sheet-notes">
                    <span className="sheet-label">Notes:</span>
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
