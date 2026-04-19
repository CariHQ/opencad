import React, { useState, useEffect } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { useDocumentStore } from '../stores/documentStore';

// ---------------------------------------------------------------------------
// T-DOC-020: Sheet Layout Manager
// ---------------------------------------------------------------------------

export interface Sheet {
  id: string;
  title: string;
  size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
  scale: string;
  views: string[];
}

const MANAGER_SIZES: Sheet['size'][] = ['A0', 'A1', 'A2', 'A3', 'A4'];
const MANAGER_SCALES = ['1:1', '1:50', '1:100', '1:200', '1:500'];

function makeSheet(): Sheet {
  return {
    id: crypto.randomUUID(),
    title: 'New Sheet',
    size: 'A1',
    scale: '1:100',
    views: [],
  };
}

export function SheetManager(): React.ReactElement {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const selectedSheet = sheets.find((s) => s.id === selectedId) ?? null;

  function addSheet(): void {
    const sheet = makeSheet();
    setSheets((prev) => [...prev, sheet]);
  }

  function updateSheet(id: string, patch: Partial<Sheet>): void {
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function deleteSheet(id: string): void {
    setPendingDeleteId(id);
  }

  function confirmDelete(): void {
    if (!pendingDeleteId) return;
    setSheets((prev) => prev.filter((s) => s.id !== pendingDeleteId));
    if (selectedId === pendingDeleteId) setSelectedId(null);
    setPendingDeleteId(null);
  }

  return (
    <>
    {pendingDeleteId && (
      <ConfirmModal
        message="Delete this sheet? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    )}
    <div className="sheet-manager">
      <div className="sheet-manager-header">
        <span className="panel-title">Sheets</span>
        <button
          className="btn-primary"
          aria-label="Add Sheet"
          onClick={addSheet}
        >
          Add Sheet
        </button>
      </div>

      <ul className="sheet-list" aria-label="Sheet list">
        {sheets.map((sheet) => (
          <li
            key={sheet.id}
            className={`sheet-list-item${selectedId === sheet.id ? ' selected' : ''}`}
            onClick={() => setSelectedId(sheet.id)}
            aria-selected={selectedId === sheet.id}
          >
            <span className="sheet-list-title">{sheet.title}</span>
            <span className="sheet-list-meta">{sheet.size} · {sheet.scale}</span>
          </li>
        ))}
      </ul>

      {selectedSheet && (
        <div className="sheet-properties" aria-label="Sheet Properties">
          <div className="sheet-prop-row">
            <label htmlFor="sheet-mgr-title">Title</label>
            <input
              id="sheet-mgr-title"
              type="text"
              value={selectedSheet.title}
              onChange={(e) => updateSheet(selectedSheet.id, { title: e.target.value })}
              aria-label="Title"
            />
          </div>

          <div className="sheet-prop-row">
            <label htmlFor="sheet-mgr-size">Size</label>
            <select
              id="sheet-mgr-size"
              aria-label="Size"
              value={selectedSheet.size}
              onChange={(e) =>
                updateSheet(selectedSheet.id, { size: e.target.value as Sheet['size'] })
              }
            >
              {MANAGER_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="sheet-prop-row">
            <label htmlFor="sheet-mgr-scale">Scale</label>
            <select
              id="sheet-mgr-scale"
              aria-label="Scale"
              value={selectedSheet.scale}
              onChange={(e) => updateSheet(selectedSheet.id, { scale: e.target.value })}
            >
              {MANAGER_SCALES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            className="btn-danger"
            aria-label="Delete Sheet"
            onClick={() => deleteSheet(selectedSheet.id)}
          >
            Delete Sheet
          </button>
        </div>
      )}
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------

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
  onExportPDF?: (config: SheetConfig) => void;
}

export function SheetPanel({ onExportPDF }: SheetPanelProps = {}) {
  const { document: doc } = useDocumentStore();
  const [size, setSize] = useState('A1');
  const [orientation, setOrientation] = useState('Landscape');
  const [scale, setScale] = useState('1:100');
  const [projectName, setProjectName] = useState('');
  const [drawnBy, setDrawnBy] = useState('');
  const [sheetNumber, setSheetNumber] = useState('A1-01');

  // Auto-populate project name from the active document
  useEffect(() => {
    if (doc?.name && !projectName) {
      setProjectName(doc.name);
    }
  }, [doc?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => {
    const config = { size, orientation, scale, projectName, drawnBy, sheetNumber };
    if (onExportPDF) {
      onExportPDF(config);
    } else {
      // Fallback: trigger browser print dialog
      window.print();
    }
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
