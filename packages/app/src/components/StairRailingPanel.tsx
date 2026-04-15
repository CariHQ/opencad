import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

// Standard stair compliance: 2R + G must be between 550–700mm (typical building code rule)
// Riser height typical 150–180mm, tread depth (going) min 250mm
const MIN_TREAD = 250;
const MAX_RISER = 190;
const MIN_RISER = 140;
const RISER_HEIGHT = 175; // default riser height for calculation

function calcRisers(totalRise: number): number {
  return Math.round(totalRise / RISER_HEIGHT);
}

function calcRiserHeight(totalRise: number): number {
  const n = calcRisers(totalRise);
  return n > 0 ? totalRise / n : RISER_HEIGHT;
}

function isCompliant(totalRise: number, treadDepth: number): boolean {
  const riserH = calcRiserHeight(totalRise);
  // Check riser height range
  if (riserH < MIN_RISER || riserH > MAX_RISER) return false;
  // Check tread depth minimum
  if (treadDepth < MIN_TREAD) return false;
  // Check 2R + G comfort rule
  const twoRG = 2 * riserH + treadDepth;
  if (twoRG < 550 || twoRG > 700) return false;
  return true;
}

export function StairRailingPanel() {
  const { activeTool, toolParams, setToolParam } = useDocumentStore();

  if (activeTool === 'stair') {
    const p = (toolParams?.['stair'] ?? {}) as Record<string, unknown>;
    const totalRise = (p.totalRise as number | undefined) ?? 3000;
    const treadDepth = (p.treadDepth as number | undefined) ?? 250;
    const width = (p.width as number | undefined) ?? 1200;
    const material = (p.material as string | undefined) ?? 'Concrete';
    const railingHeight = (p.railingHeight as number | undefined) ?? 1000;

    const numRisers = calcRisers(totalRise);
    const riserHeight = calcRiserHeight(totalRise);
    const compliant = isCompliant(totalRise, treadDepth);

    return (
      <div className="tool-panel">
        <div className="tool-panel-header">Stair</div>

        {!compliant && (
          <div className="compliance-warning" role="alert">
            ⚠ Riser/tread ratio violates building code (2R+G = {Math.round(2 * riserHeight + treadDepth)}mm, must be 550–700mm)
          </div>
        )}

        <div className="tool-panel-group">
          <div className="tool-panel-row">
            <label htmlFor="stair-rise">Total Rise (mm)</label>
            <input
              id="stair-rise"
              type="number"
              className="tool-panel-input"
              defaultValue={totalRise}
              onBlur={(e) => setToolParam('stair', 'totalRise', parseFloat(e.target.value))}
            />
          </div>

          <div className="tool-panel-row computed-row">
            <span className="computed-label">Riser count</span>
            <span className="computed-value">{numRisers} × {Math.round(riserHeight)}mm</span>
          </div>

          <div className="tool-panel-row">
            <label htmlFor="stair-tread">Tread Depth (mm)</label>
            <input
              id="stair-tread"
              type="number"
              className="tool-panel-input"
              defaultValue={treadDepth}
              onBlur={(e) => setToolParam('stair', 'treadDepth', parseFloat(e.target.value))}
            />
          </div>

          <div className="tool-panel-row">
            <label htmlFor="stair-width">Width (mm)</label>
            <input
              id="stair-width"
              type="number"
              className="tool-panel-input"
              defaultValue={width}
              onBlur={(e) => setToolParam('stair', 'width', parseFloat(e.target.value))}
            />
          </div>

          <div className="tool-panel-row">
            <label htmlFor="stair-material">Material</label>
            <input
              id="stair-material"
              type="text"
              className="tool-panel-input"
              defaultValue={material}
              onBlur={(e) => setToolParam('stair', 'material', e.target.value)}
            />
          </div>

          <div className="tool-panel-row">
            <label htmlFor="stair-railing-height">Railing Height (mm)</label>
            <input
              id="stair-railing-height"
              type="number"
              className="tool-panel-input"
              defaultValue={railingHeight}
              onBlur={(e) => setToolParam('stair', 'railingHeight', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="placement-hint">Drag to place stair bounding box</div>
      </div>
    );
  }

  // Railing
  const p = (toolParams?.['railing'] ?? {}) as Record<string, unknown>;
  const height = (p.height as number | undefined) ?? 1000;
  const material = (p.material as string | undefined) ?? 'Steel';
  const balusterSpacing = (p.balusterSpacing as number | undefined) ?? 150;

  return (
    <div className="tool-panel">
      <div className="tool-panel-header">Railing</div>

      <div className="tool-panel-group">
        <div className="tool-panel-row">
          <label htmlFor="rail-height">Height (mm)</label>
          <input
            id="rail-height"
            type="number"
            className="tool-panel-input"
            defaultValue={height}
            onBlur={(e) => setToolParam('railing', 'height', parseFloat(e.target.value))}
          />
        </div>

        <div className="tool-panel-row">
          <label htmlFor="rail-material">Material</label>
          <input
            id="rail-material"
            type="text"
            className="tool-panel-input"
            defaultValue={material}
            onBlur={(e) => setToolParam('railing', 'material', e.target.value)}
          />
        </div>

        <div className="tool-panel-row">
          <label htmlFor="rail-baluster-spacing">Baluster Spacing (mm)</label>
          <input
            id="rail-baluster-spacing"
            type="number"
            className="tool-panel-input"
            defaultValue={balusterSpacing}
            onBlur={(e) => setToolParam('railing', 'balusterSpacing', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="placement-hint">Draw path to place railing</div>
    </div>
  );
}
