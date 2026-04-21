import React, { useState, useEffect, useMemo } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { useDocumentStore } from '../stores/documentStore';
import {
  renderTitleBlock,
  DEFAULT_TITLE_BLOCK_SVG,
  ISO_SHEET_SIZES,
  type LayoutContext,
} from '../lib/titleBlock';

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
  const [sheetTitle, setSheetTitle] = useState('');
  const [selectedViewIds, setSelectedViewIds] = useState<string[]>([]);

  // Auto-populate project name from the active document
  useEffect(() => {
    if (doc?.name && !projectName) {
      setProjectName(doc.name);
    }
  }, [doc?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default sheet title to "Level 1 Plan" etc. when a doc is loaded
  useEffect(() => {
    if (!sheetTitle) setSheetTitle('Floor Plan');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const availableViews = useMemo(
    () => (doc ? Object.values(doc.presentation.views) : []),
    [doc],
  );

  const toggleView = (viewId: string) => {
    setSelectedViewIds((prev) =>
      prev.includes(viewId) ? prev.filter((v) => v !== viewId) : [...prev, viewId],
    );
  };

  const handleExport = () => {
    const config = { size, orientation, scale, projectName, drawnBy, sheetNumber };
    if (onExportPDF) {
      onExportPDF(config);
    } else {
      // Fallback: trigger browser print dialog
      window.print();
    }
  };

  // Compute pixel dimensions from ISO paper sizes, preserving aspect ratio.
  // `ISO_SHEET_SIZES` is in mm (landscape). For portrait we swap w/h.
  const iso = ISO_SHEET_SIZES[size as keyof typeof ISO_SHEET_SIZES] ?? ISO_SHEET_SIZES.A1;
  const isLandscape = orientation === 'Landscape';
  const paperMmW = isLandscape ? iso.w : iso.h;
  const paperMmH = isLandscape ? iso.h : iso.w;
  // Preview container: max 260 × 200 px, scale to paper aspect.
  const maxW = 260;
  const maxH = 200;
  const ratio = paperMmW / paperMmH;
  const previewW = ratio >= maxW / maxH ? maxW : Math.round(maxH * ratio);
  const previewH = ratio >= maxW / maxH ? Math.round(maxW / ratio) : maxH;

  // Resolve title-block tokens against the current panel state.
  const titleBlockSvg = useMemo(() => {
    const ctx: LayoutContext = {
      project: projectName || (doc?.name ?? ''),
      sheetTitle,
      sheetNumber,
      scale,
      drawnBy,
      date: new Date().toISOString().slice(0, 10),
    };
    return renderTitleBlock(DEFAULT_TITLE_BLOCK_SVG, ctx);
  }, [projectName, sheetTitle, sheetNumber, scale, drawnBy, doc?.name]);

  // Layout the view tiles: single = full area above title block; 2 side-by
  // -side; 3/4 as a 2×2 grid.
  const titleBlockH = 40; // matches DEFAULT_TITLE_BLOCK_SVG viewBox height
  const paperW = 200;     // arbitrary inner units for SVG layout
  const paperH = 150 * (paperMmH / paperMmW) + titleBlockH;
  const availH = paperH - titleBlockH - 6;
  const tiles = selectedViewIds.slice(0, 4);
  const cols = tiles.length <= 1 ? 1 : 2;
  const rows = tiles.length <= 2 ? 1 : 2;
  const tileW = (paperW - 8) / cols;
  const tileH = availH / rows;

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
          <label htmlFor="sheet-title">Sheet Title</label>
          <input
            id="sheet-title"
            type="text"
            value={sheetTitle}
            onChange={(e) => setSheetTitle(e.target.value)}
            className="sheet-input"
            placeholder="Level 1 Plan"
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

      <div className="sheet-views-picker">
        <div className="sheet-views-picker-title">Views on sheet (max 4)</div>
        {availableViews.length === 0 ? (
          <div className="sheet-views-empty">No saved views. Create views first.</div>
        ) : (
          <ul className="sheet-views-list">
            {availableViews.map((v) => (
              <li key={v.id} className="sheet-views-list-item">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedViewIds.includes(v.id)}
                    onChange={() => toggleView(v.id)}
                    disabled={
                      !selectedViewIds.includes(v.id) && selectedViewIds.length >= 4
                    }
                  />
                  <span>{v.name}</span>
                  <span className="sheet-views-list-type">{v.type}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sheet-preview-wrapper">
        <svg
          role="img"
          aria-label="Sheet preview"
          className="sheet-preview"
          width={previewW}
          height={previewH}
          viewBox={`0 0 ${paperW} ${paperH}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Paper */}
          <rect
            x={0}
            y={0}
            width={paperW}
            height={paperH}
            fill="white"
            stroke="#555"
            strokeWidth={0.8}
          />
          {/* View tiles */}
          {tiles.map((viewId, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = 4 + col * tileW;
            const y = 4 + row * tileH;
            const view = availableViews.find((v) => v.id === viewId);
            return (
              <g key={viewId}>
                <rect
                  x={x}
                  y={y}
                  width={tileW - 4}
                  height={tileH - 4}
                  fill="#f6f6f6"
                  stroke="#aaa"
                  strokeWidth={0.4}
                  strokeDasharray="2 2"
                />
                <text
                  x={x + (tileW - 4) / 2}
                  y={y + (tileH - 4) / 2}
                  fontSize={5}
                  textAnchor="middle"
                  fill="#666"
                >
                  {view?.name ?? '—'}
                </text>
              </g>
            );
          })}
          {/* Title block, bottom-right. DEFAULT template is 200×40; we
              translate it to the bottom edge of the paper. */}
          <g
            transform={`translate(0, ${paperH - titleBlockH})`}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: titleBlockSvg }}
          />
        </svg>
      </div>

      <div className="sheet-actions">
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
