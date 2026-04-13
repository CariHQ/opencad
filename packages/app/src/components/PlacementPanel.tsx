import React, { useState } from 'react';
import { X, DoorOpen, AppWindow } from 'lucide-react';

interface PlacementPanelProps {
  elementType: 'door' | 'window';
  onClose: () => void;
}

export function PlacementPanel({ elementType, onClose }: PlacementPanelProps) {
  const [doorWidth, setDoorWidth] = useState(900);
  const [doorHeight, setDoorHeight] = useState(2100);
  const [doorSwing, setDoorSwing] = useState(90);

  const [windowWidth, setWindowWidth] = useState(1200);
  const [windowHeight, setWindowHeight] = useState(1200);
  const [windowSillHeight, setWindowSillHeight] = useState(900);

  return (
    <div className="placement-panel">
      <div className="placement-header">
        <span className="placement-title">
          {elementType === 'door' ? 'Door' : 'Window'} Properties
        </span>
        <button className="placement-close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="placement-preview">
        {elementType === 'door' ? <DoorOpen size={48} /> : <AppWindow size={48} />}
      </div>

      <div className="placement-params">
        <div className="placement-param">
          <label>Width (mm)</label>
          <input
            type="number"
            value={elementType === 'door' ? doorWidth : windowWidth}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (elementType === 'door') setDoorWidth(val);
              else setWindowWidth(val);
            }}
            min={300}
            max={3000}
            step={100}
          />
        </div>

        <div className="placement-param">
          <label>Height (mm)</label>
          <input
            type="number"
            value={elementType === 'door' ? doorHeight : windowHeight}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (elementType === 'door') setDoorHeight(val);
              else setWindowHeight(val);
            }}
            min={500}
            max={4000}
            step={100}
          />
        </div>

        {elementType === 'window' && (
          <div className="placement-param">
            <label>Sill Height (mm)</label>
            <input
              type="number"
              value={windowSillHeight}
              onChange={(e) => setWindowSillHeight(Number(e.target.value))}
              min={0}
              max={2000}
              step={100}
            />
          </div>
        )}

        {elementType === 'door' && (
          <div className="placement-param">
            <label>Swing (°)</label>
            <input
              type="number"
              value={doorSwing}
              onChange={(e) => setDoorSwing(Number(e.target.value))}
              min={0}
              max={180}
              step={15}
            />
          </div>
        )}
      </div>

      <div className="placement-hint">Click in the viewport to place the {elementType}</div>
    </div>
  );
}
