import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

const FRAME_TYPES = ['standard', 'aluminum', 'timber', 'steel'] as const;

export function DoorWindowPanel() {
  const { activeTool, toolParams, setToolParam } = useDocumentStore();
  const isDoor = activeTool === 'door';
  const toolKey = isDoor ? 'door' : 'window';

  const params = (toolParams?.[toolKey] ?? {}) as Record<string, unknown>;

  if (isDoor) {
    return (
      <div className="placement-panel">
        <div className="placement-header">
          <span className="placement-title">Door</span>
        </div>
        <div className="placement-params">
          <div className="placement-param">
            <label htmlFor="door-width">Width (mm)</label>
            <input
              id="door-width"
              type="number"
              value={(params['width'] as number) ?? 900}
              min={300} max={3000} step={50}
              onChange={(e) => setToolParam('door', 'width', Number(e.target.value))}
            />
          </div>
          <div className="placement-param">
            <label htmlFor="door-height">Height (mm)</label>
            <input
              id="door-height"
              type="number"
              value={(params['height'] as number) ?? 2100}
              min={1800} max={4000} step={100}
              onChange={(e) => setToolParam('door', 'height', Number(e.target.value))}
            />
          </div>
          <div className="placement-param">
            <label htmlFor="door-swing">Swing (°)</label>
            <input
              id="door-swing"
              type="number"
              value={(params['swing'] as number) ?? 90}
              min={0} max={180} step={15}
              onChange={(e) => setToolParam('door', 'swing', Number(e.target.value))}
            />
          </div>
          <div className="placement-param">
            <label htmlFor="door-frame">Frame Type</label>
            <select
              id="door-frame"
              value={(params['frameType'] as string) ?? 'standard'}
              onChange={(e) => setToolParam('door', 'frameType', e.target.value)}
            >
              {FRAME_TYPES.map((f) => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="placement-hint">Click on a wall to place door</div>
      </div>
    );
  }

  return (
    <div className="placement-panel">
      <div className="placement-header">
        <span className="placement-title">Window</span>
      </div>
      <div className="placement-params">
        <div className="placement-param">
          <label htmlFor="win-width">Width (mm)</label>
          <input
            id="win-width"
            type="number"
            value={(params['width'] as number) ?? 1200}
            min={300} max={3000} step={50}
            onChange={(e) => setToolParam('window', 'width', Number(e.target.value))}
          />
        </div>
        <div className="placement-param">
          <label htmlFor="win-height">Height (mm)</label>
          <input
            id="win-height"
            type="number"
            value={(params['height'] as number) ?? 1200}
            min={300} max={3000} step={100}
            onChange={(e) => setToolParam('window', 'height', Number(e.target.value))}
          />
        </div>
        <div className="placement-param">
          <label htmlFor="win-sill">Sill Height (mm)</label>
          <input
            id="win-sill"
            type="number"
            value={(params['sillHeight'] as number) ?? 900}
            min={0} max={2000} step={100}
            onChange={(e) => setToolParam('window', 'sillHeight', Number(e.target.value))}
          />
        </div>
        <div className="placement-param">
          <label htmlFor="win-frame">Frame Type</label>
          <select
            id="win-frame"
            value={(params['frameType'] as string) ?? 'standard'}
            onChange={(e) => setToolParam('window', 'frameType', e.target.value)}
          >
            {FRAME_TYPES.map((f) => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="placement-hint">Click on a wall to place window</div>
    </div>
  );
}
