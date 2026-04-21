/**
 * UnderlayPanel — PDF-as-trace control surface.
 *
 * Lets the user drop a PDF, rasterises the first page via pdfjs, and
 * stores it as an underlay the 2D viewport renders beneath all elements.
 * Exposes per-underlay controls: opacity, scale, rotation, position,
 * calibrate-from-two-points (via inline inputs, not canvas picking).
 */

import React, { useState, useCallback, useRef } from 'react';
import { FileText, Trash2, Eye, EyeOff } from 'lucide-react';
import { useUnderlayStore } from '../stores/underlayStore';
import { createUnderlay, calibrateScale } from '../lib/pdfUnderlay';
import { rasterisePDFPage } from '../lib/pdfRasterise';

export function UnderlayPanel(): React.ReactElement {
  const entries = useUnderlayStore((s) => Object.values(s.entries));
  const setUnderlay = useUnderlayStore((s) => s.setUnderlay);
  const updateUnderlay = useUnderlayStore((s) => s.updateUnderlay);
  const removeUnderlay = useUnderlayStore((s) => s.removeUnderlay);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLoad = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const raster = await rasterisePDFPage(file, 0, 2000);
      const u = createUnderlay(file.name, 0);
      setUnderlay(u, { dataUrl: raster.dataUrl, width: raster.width, height: raster.height });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rasterise PDF.');
    } finally {
      setBusy(false);
    }
  }, [setUnderlay]);

  return (
    <div className="underlay-panel">
      <div className="panel-header"><span className="panel-title">PDF Underlay</span></div>

      <button
        className="btn-primary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <FileText size={13} />
        {busy ? 'Rendering…' : 'Load PDF'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleLoad(file);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />

      {error && <div className="underlay-error" role="alert">{error}</div>}

      {entries.length === 0 ? (
        <p className="underlay-empty">No underlays. Load a PDF to trace over it.</p>
      ) : (
        <ul className="underlay-list">
          {entries.map(({ underlay: u, pixelWidth, pixelHeight }) => (
            <li key={u.id} className="underlay-item">
              <div className="underlay-meta">
                <span className="underlay-source">{u.source}</span>
                <button
                  className="btn-icon"
                  title={u.opacity > 0 ? 'Hide underlay' : 'Show underlay'}
                  onClick={() => updateUnderlay(u.id, { opacity: u.opacity > 0 ? 0 : 0.5 })}
                >
                  {u.opacity > 0 ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button className="btn-icon" title="Delete" onClick={() => removeUnderlay(u.id)}>
                  <Trash2 size={12} />
                </button>
              </div>

              <label className="underlay-row">
                <span>Opacity</span>
                <input
                  type="range" min="0" max="1" step="0.05" value={u.opacity}
                  onChange={(e) => updateUnderlay(u.id, { opacity: parseFloat(e.target.value) })}
                />
                <span>{Math.round(u.opacity * 100)}%</span>
              </label>

              <label className="underlay-row">
                <span>Scale</span>
                <input
                  type="number" step="0.01" value={u.scale}
                  onChange={(e) => updateUnderlay(u.id, { scale: parseFloat(e.target.value) || 1 })}
                />
                <span>mm/px</span>
              </label>

              <label className="underlay-row">
                <span>Rotation</span>
                <input
                  type="number" step="1" value={u.rotation}
                  onChange={(e) => updateUnderlay(u.id, { rotation: parseFloat(e.target.value) || 0 })}
                />
                <span>°</span>
              </label>

              <div className="underlay-row underlay-origin">
                <span>Origin</span>
                <input
                  type="number" step="1" value={u.origin.x}
                  onChange={(e) => updateUnderlay(u.id, { origin: { ...u.origin, x: parseFloat(e.target.value) || 0 } })}
                />
                <input
                  type="number" step="1" value={u.origin.y}
                  onChange={(e) => updateUnderlay(u.id, { origin: { ...u.origin, y: parseFloat(e.target.value) || 0 } })}
                />
              </div>

              <CalibrateRow
                onCalibrate={(pxDist, realMm) => {
                  const scale = calibrateScale({ x: 0, y: 0 }, { x: pxDist, y: 0 }, realMm);
                  updateUnderlay(u.id, { scale });
                }}
              />

              <div className="underlay-size">
                {pixelWidth}×{pixelHeight} px raster
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CalibrateRow({ onCalibrate }: { onCalibrate: (pxDistance: number, realMm: number) => void }) {
  const [pxDistance, setPxDistance] = useState('');
  const [realMm, setRealMm] = useState('');
  return (
    <div className="underlay-row underlay-calibrate">
      <span>Calibrate</span>
      <input
        type="number" placeholder="px" value={pxDistance}
        onChange={(e) => setPxDistance(e.target.value)}
      />
      <input
        type="number" placeholder="mm" value={realMm}
        onChange={(e) => setRealMm(e.target.value)}
      />
      <button
        className="btn-secondary"
        disabled={!pxDistance || !realMm}
        onClick={() => {
          const a = parseFloat(pxDistance);
          const b = parseFloat(realMm);
          if (!isNaN(a) && !isNaN(b) && a > 0) onCalibrate(a, b);
        }}
      >
        Apply
      </button>
    </div>
  );
}
