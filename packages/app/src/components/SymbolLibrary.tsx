import React, { useState, useMemo } from 'react';

export interface Symbol2D { id: string; name: string; category: string; description: string; }

const SYMBOLS: Symbol2D[] = [
  { id: 'north-arrow', name: 'North Arrow', category: 'Annotation', description: 'True north indicator' },
  { id: 'north-arrow-magnetic', name: 'North Arrow (Magnetic)', category: 'Annotation', description: 'Magnetic north' },
  { id: 'scale-bar', name: 'Scale Bar', category: 'Annotation', description: 'Graphical scale bar' },
  { id: 'revision-cloud', name: 'Revision Cloud', category: 'Annotation', description: 'Cloud markup for revisions' },
  { id: 'break-line', name: 'Break Line', category: 'Annotation', description: 'Zigzag break line' },
  { id: 'section-marker', name: 'Section Marker', category: 'Drawing', description: 'Section cut indicator' },
  { id: 'elevation-marker', name: 'Elevation Marker', category: 'Drawing', description: 'Elevation view indicator' },
  { id: 'detail-bubble', name: 'Detail Bubble', category: 'Drawing', description: 'Detail reference circle' },
  { id: 'grid-bubble', name: 'Grid Bubble', category: 'Drawing', description: 'Structural grid marker' },
  { id: 'level-indicator', name: 'Level Indicator', category: 'Drawing', description: 'Floor level symbol' },
  { id: 'slope-arrow', name: 'Slope Arrow', category: 'Annotation', description: 'Slope/gradient arrow' },
  { id: 'spot-elevation', name: 'Spot Elevation', category: 'Annotation', description: 'Point elevation marker' },
  { id: 'datum', name: 'Datum Triangle', category: 'Annotation', description: 'Elevation datum symbol' },
  { id: 'door-swing', name: 'Door Swing Arc', category: 'Drawing', description: '90° door swing arc' },
  { id: 'stair-arrow', name: 'Stair Direction Arrow', category: 'Drawing', description: 'Up/down stair indicator' },
  { id: 'insulation-symbol', name: 'Insulation Symbol', category: 'Drawing', description: 'Batts insulation symbol' },
  { id: 'cloud-note', name: 'Revision Note', category: 'Annotation', description: 'Revision delta triangle' },
  { id: 'match-line', name: 'Match Line', category: 'Drawing', description: 'Sheet continuation line' },
];

interface SymbolLibraryProps { onInsert: (symbol: Symbol2D) => void; }

export function SymbolLibrary({ onInsert }: SymbolLibraryProps) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() =>
    SYMBOLS.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  return (
    <div className="symbol-library">
      <div className="panel-header"><span className="panel-title">Symbol Library</span></div>
      <input type="text" placeholder="Search symbols…" value={search}
        onChange={(e) => setSearch(e.target.value)} className="symbol-search" />
      <div className="symbol-list">
        {filtered.map((sym) => (
          <div key={sym.id} className="symbol-item">
            <div className="symbol-info">
              <span className="symbol-name">{sym.name}</span>
              <span className="symbol-desc">{sym.description}</span>
            </div>
            <button aria-label={`Insert ${sym.name}`} onClick={() => onInsert(sym)} className="btn-insert">
              Insert
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
