import React, { useState } from 'react';

const SHEET_SIZES = ['A0', 'A1', 'A2', 'A3', 'A4'];
const ORIENTATIONS = ['Portrait', 'Landscape'];
const SCALES = ['1:1', '1:5', '1:10', '1:20', '1:50', '1:100', '1:200', '1:500'];

export interface SheetConfig {
  size: string;
  orientation: string;
  scale: string;
  projectName: string;
  drawnBy: string;
  sheetNumber: string;
}

interface SheetPanelProps {
  onExportPDF: (config: SheetConfig) => void;
}

export function SheetPanel({ onExportPDF }: SheetPanelProps) {
  const [size, setSize] = useState('A1');
  const [orientation, setOrientation] = useState('Landscape');
  const [scale, setScale] = useState('1:100');
  const [projectName, setProjectName] = useState('');
  const [drawnBy, setDrawnBy] = useState('');
  const [sheetNumber, setSheetNumber] = useState('A1-01');

  const handleExport = () => {
    onExportPDF({ size, orientation, scale, projectName, drawnBy, sheetNumber });
  };

  // Approximate sheet ratio for preview
  const isLandscape = orientation === 'Landscape';
  const previewW = isLandscape ? 160 : 110;
  const previewH = isLandscape ? 110 : 160;

  return (
    <div className="sheet-panel">
      <div className="panel-header">
        <span className="panel-title">Sheet Layout</span>
      </div>

      <div className="sheet-controls">
        <div className="sheet-row">
          <label htmlFor="sheet-size">Sheet Size</label>
          <select
            id="sheet-size"
            aria-label="Sheet Size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="sheet-select"
          >
            {SHEET_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="sheet-row">
          <label htmlFor="sheet-orientation">Orientation</label>
          <select
            id="sheet-orientation"
            aria-label="Orientation"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            className="sheet-select"
          >
            {ORIENTATIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="sheet-row">
          <label htmlFor="sheet-scale">Scale</label>
          <select
            id="sheet-scale"
            aria-label="Scale"
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            className="sheet-select"
          >
            {SCALES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sheet-title-block">
        <div className="sheet-row">
          <label htmlFor="sheet-project-name">Project Name</label>
          <input
            id="sheet-project-name"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="sheet-input"
            placeholder="Project name"
          />
        </div>
        <div className="sheet-row">
          <label htmlFor="sheet-drawn-by">Drawn By</label>
          <input
            id="sheet-drawn-by"
            type="text"
            value={drawnBy}
            onChange={(e) => setDrawnBy(e.target.value)}
            className="sheet-input"
            placeholder="Initials"
          />
        </div>
        <div className="sheet-row">
          <label htmlFor="sheet-number">Sheet Number</label>
          <input
            id="sheet-number"
            type="text"
            value={sheetNumber}
            onChange={(e) => setSheetNumber(e.target.value)}
            className="sheet-input"
          />
        </div>
      </div>

      <div className="sheet-preview-wrapper">
        <div
          role="img"
          aria-label="Sheet preview"
          className="sheet-preview"
          style={{ width: previewW, height: previewH }}
        >
          <div className="sheet-preview-title-block">
            <span className="sheet-preview-project">{projectName || 'Project'}</span>
            <span className="sheet-preview-number">{sheetNumber}</span>
          </div>
        </div>
      </div>

      <div className="sheet-actions">
        <button
          className="btn-secondary"
          onClick={() => {}}
          aria-label="Add View"
        >
          Add View
        </button>
        <button
          className="btn-primary"
          onClick={handleExport}
          aria-label="Export PDF"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
