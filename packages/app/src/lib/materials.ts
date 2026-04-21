export interface Material {
  id: string;
  name: string;
  category: string;
  roughness: number;
  metalness: number;
  costPerM2: number;
  unit: string;
  color: string; // hex fallback when texture unavailable
  density?: number;             // kg/m³ (optional; used for BIM quantity takeoff)
  embodiedCarbon?: number;      // kgCO2e/kg (optional; used for carbon analysis)
  thermalConductivity?: number; // W/(m·K) (optional; used for thermal analysis)
}

// ≥100 standard architectural materials
export const BUILT_IN_MATERIALS: Material[] = [
  // Concrete
  { id: 'concrete-standard', name: 'Concrete', category: 'Concrete', roughness: 0.9, metalness: 0.0, costPerM2: 45, unit: 'm²', color: '#9e9e9e', density: 2400, embodiedCarbon: 0.13 },
  { id: 'concrete-polished', name: 'Polished Concrete', category: 'Concrete', roughness: 0.2, metalness: 0.0, costPerM2: 95, unit: 'm²', color: '#bdbdbd', density: 2400, embodiedCarbon: 0.13 },
  { id: 'concrete-exposed', name: 'Exposed Concrete', category: 'Concrete', roughness: 0.85, metalness: 0.0, costPerM2: 55, unit: 'm²', color: '#9e9e9e', density: 2400, embodiedCarbon: 0.13 },
  { id: 'concrete-precast', name: 'Precast Concrete', category: 'Concrete', roughness: 0.8, metalness: 0.0, costPerM2: 80, unit: 'm²', color: '#aeaeae', density: 2400, embodiedCarbon: 0.15 },
  { id: 'concrete-reinforced', name: 'Reinforced Concrete', category: 'Concrete', roughness: 0.9, metalness: 0.1, costPerM2: 60, unit: 'm²', color: '#9e9e9e', density: 2500, embodiedCarbon: 0.17 },
  { id: 'concrete-white', name: 'White Concrete', category: 'Concrete', roughness: 0.75, metalness: 0.0, costPerM2: 70, unit: 'm²', color: '#e8e8e8', density: 2400, embodiedCarbon: 0.13 },
  { id: 'concrete-stamped', name: 'Stamped Concrete', category: 'Concrete', roughness: 0.8, metalness: 0.0, costPerM2: 110, unit: 'm²', color: '#b0a090', density: 2300, embodiedCarbon: 0.14 },
  { id: 'concrete-lightweight', name: 'Lightweight Concrete', category: 'Concrete', roughness: 0.9, metalness: 0.0, costPerM2: 65, unit: 'm²', color: '#c0c0c0', density: 1800, embodiedCarbon: 0.11 },

  // Brick
  { id: 'brick-red', name: 'Brick - Red', category: 'Masonry', roughness: 0.95, metalness: 0.0, costPerM2: 85, unit: 'm²', color: '#b55239' },
  { id: 'brick-facing', name: 'Facing Brick', category: 'Masonry', roughness: 0.9, metalness: 0.0, costPerM2: 120, unit: 'm²', color: '#c06040' },
  { id: 'brick-engineering', name: 'Engineering Brick', category: 'Masonry', roughness: 0.85, metalness: 0.0, costPerM2: 100, unit: 'm²', color: '#8b3a2a' },
  { id: 'brick-reclaimed', name: 'Reclaimed Brick', category: 'Masonry', roughness: 0.95, metalness: 0.0, costPerM2: 150, unit: 'm²', color: '#a0522d' },
  { id: 'blockwork-concrete', name: 'Concrete Blockwork', category: 'Masonry', roughness: 0.9, metalness: 0.0, costPerM2: 50, unit: 'm²', color: '#a0a0a0' },
  { id: 'stone-limestone', name: 'Limestone', category: 'Masonry', roughness: 0.85, metalness: 0.0, costPerM2: 200, unit: 'm²', color: '#d4c9a8' },
  { id: 'stone-sandstone', name: 'Sandstone', category: 'Masonry', roughness: 0.9, metalness: 0.0, costPerM2: 180, unit: 'm²', color: '#c8a87a' },
  { id: 'stone-granite', name: 'Granite', category: 'Masonry', roughness: 0.3, metalness: 0.0, costPerM2: 350, unit: 'm²', color: '#808080' },
  { id: 'stone-marble', name: 'Marble', category: 'Masonry', roughness: 0.1, metalness: 0.0, costPerM2: 500, unit: 'm²', color: '#f5f5f5' },
  { id: 'stone-slate', name: 'Slate', category: 'Masonry', roughness: 0.7, metalness: 0.0, costPerM2: 250, unit: 'm²', color: '#5a5a6a' },

  // Timber
  { id: 'timber-oak', name: 'Oak Timber', category: 'Timber', roughness: 0.8, metalness: 0.0, costPerM2: 120, unit: 'm²', color: '#8b6914' },
  { id: 'timber-pine', name: 'Pine Timber', category: 'Timber', roughness: 0.75, metalness: 0.0, costPerM2: 60, unit: 'm²', color: '#d4a855' },
  { id: 'timber-walnut', name: 'Walnut Timber', category: 'Timber', roughness: 0.7, metalness: 0.0, costPerM2: 200, unit: 'm²', color: '#5c3d1e' },
  { id: 'timber-maple', name: 'Maple Timber', category: 'Timber', roughness: 0.7, metalness: 0.0, costPerM2: 140, unit: 'm²', color: '#deb887' },
  { id: 'timber-cedar', name: 'Cedar Timber', category: 'Timber', roughness: 0.8, metalness: 0.0, costPerM2: 100, unit: 'm²', color: '#c17f3b' },
  { id: 'timber-ash', name: 'Ash Timber', category: 'Timber', roughness: 0.75, metalness: 0.0, costPerM2: 130, unit: 'm²', color: '#c8b898' },
  { id: 'timber-bamboo', name: 'Bamboo', category: 'Timber', roughness: 0.7, metalness: 0.0, costPerM2: 80, unit: 'm²', color: '#a8b830' },
  { id: 'plywood-standard', name: 'Plywood', category: 'Timber', roughness: 0.8, metalness: 0.0, costPerM2: 40, unit: 'm²', color: '#c8a878' },
  { id: 'mdf', name: 'MDF', category: 'Timber', roughness: 0.85, metalness: 0.0, costPerM2: 25, unit: 'm²', color: '#d8c8a8' },
  { id: 'osb', name: 'OSB', category: 'Timber', roughness: 0.9, metalness: 0.0, costPerM2: 20, unit: 'm²', color: '#c0a850' },
  { id: 'glulam', name: 'Glulam', category: 'Timber', roughness: 0.7, metalness: 0.0, costPerM2: 160, unit: 'm²', color: '#b8943c' },

  // Steel
  { id: 'steel-mild', name: 'Mild Steel', category: 'Metal', roughness: 0.4, metalness: 0.9, costPerM2: 150, unit: 'm²', color: '#808080' },
  { id: 'steel-stainless', name: 'Stainless Steel', category: 'Metal', roughness: 0.15, metalness: 0.95, costPerM2: 350, unit: 'm²', color: '#c8c8c8' },
  { id: 'steel-corten', name: 'Corten Steel', category: 'Metal', roughness: 0.85, metalness: 0.7, costPerM2: 250, unit: 'm²', color: '#8b4513' },
  { id: 'steel-galvanised', name: 'Galvanised Steel', category: 'Metal', roughness: 0.35, metalness: 0.85, costPerM2: 180, unit: 'm²', color: '#a0a8b0' },
  { id: 'aluminum-standard', name: 'Aluminium', category: 'Metal', roughness: 0.25, metalness: 0.9, costPerM2: 200, unit: 'm²', color: '#b8b8c0' },
  { id: 'aluminum-anodised', name: 'Anodised Aluminium', category: 'Metal', roughness: 0.2, metalness: 0.85, costPerM2: 280, unit: 'm²', color: '#90a0b0' },
  { id: 'copper', name: 'Copper', category: 'Metal', roughness: 0.3, metalness: 0.9, costPerM2: 400, unit: 'm²', color: '#b87333' },
  { id: 'brass', name: 'Brass', category: 'Metal', roughness: 0.3, metalness: 0.85, costPerM2: 300, unit: 'm²', color: '#b5a642' },
  { id: 'zinc', name: 'Zinc', category: 'Metal', roughness: 0.4, metalness: 0.8, costPerM2: 220, unit: 'm²', color: '#8090a0' },
  { id: 'cast-iron', name: 'Cast Iron', category: 'Metal', roughness: 0.7, metalness: 0.85, costPerM2: 180, unit: 'm²', color: '#404040' },

  // Glass
  { id: 'glass-clear', name: 'Clear Glass', category: 'Glass', roughness: 0.05, metalness: 0.0, costPerM2: 80, unit: 'm²', color: '#d0e8f0' },
  { id: 'glass-frosted', name: 'Frosted Glass', category: 'Glass', roughness: 0.8, metalness: 0.0, costPerM2: 120, unit: 'm²', color: '#e0f0f8' },
  { id: 'glass-tinted', name: 'Tinted Glass', category: 'Glass', roughness: 0.05, metalness: 0.0, costPerM2: 100, unit: 'm²', color: '#88a8b0' },
  { id: 'glass-tempered', name: 'Tempered Glass', category: 'Glass', roughness: 0.05, metalness: 0.0, costPerM2: 150, unit: 'm²', color: '#c8e8f0' },
  { id: 'glass-laminated', name: 'Laminated Glass', category: 'Glass', roughness: 0.05, metalness: 0.0, costPerM2: 200, unit: 'm²', color: '#c0e0f0' },
  { id: 'glass-double-glazed', name: 'Double Glazed', category: 'Glass', roughness: 0.05, metalness: 0.0, costPerM2: 180, unit: 'm²', color: '#d0e8f8' },
  { id: 'glass-low-e', name: 'Low-E Glass', category: 'Glass', roughness: 0.05, metalness: 0.1, costPerM2: 250, unit: 'm²', color: '#c8e0f0' },
  { id: 'glass-mirror', name: 'Mirror', category: 'Glass', roughness: 0.02, metalness: 0.9, costPerM2: 160, unit: 'm²', color: '#e8e8e8' },

  // Plasterboard / Drywall
  { id: 'plasterboard-standard', name: 'Plasterboard', category: 'Plaster', roughness: 0.9, metalness: 0.0, costPerM2: 15, unit: 'm²', color: '#f0f0e0' },
  { id: 'plasterboard-moisture', name: 'Moisture Resistant Board', category: 'Plaster', roughness: 0.9, metalness: 0.0, costPerM2: 25, unit: 'm²', color: '#d0f0d0' },
  { id: 'plasterboard-fire', name: 'Fire Rated Board', category: 'Plaster', roughness: 0.9, metalness: 0.0, costPerM2: 30, unit: 'm²', color: '#f0e0e0' },
  { id: 'render-sand-cement', name: 'Sand/Cement Render', category: 'Plaster', roughness: 0.85, metalness: 0.0, costPerM2: 35, unit: 'm²', color: '#d8d0c0' },
  { id: 'render-lime', name: 'Lime Render', category: 'Plaster', roughness: 0.8, metalness: 0.0, costPerM2: 45, unit: 'm²', color: '#e8e0d0' },
  { id: 'skim-coat', name: 'Skim Coat Plaster', category: 'Plaster', roughness: 0.6, metalness: 0.0, costPerM2: 20, unit: 'm²', color: '#f5f5f0' },

  // Roofing
  { id: 'roof-tiles-clay', name: 'Clay Roof Tiles', category: 'Roofing', roughness: 0.9, metalness: 0.0, costPerM2: 80, unit: 'm²', color: '#b05030' },
  { id: 'roof-tiles-concrete', name: 'Concrete Roof Tiles', category: 'Roofing', roughness: 0.85, metalness: 0.0, costPerM2: 55, unit: 'm²', color: '#808080' },
  { id: 'roof-slate', name: 'Roof Slate', category: 'Roofing', roughness: 0.75, metalness: 0.0, costPerM2: 180, unit: 'm²', color: '#505060' },
  { id: 'roof-felt', name: 'Felt Roofing', category: 'Roofing', roughness: 0.9, metalness: 0.0, costPerM2: 30, unit: 'm²', color: '#303030' },
  { id: 'roof-metal-standing-seam', name: 'Standing Seam Metal Roof', category: 'Roofing', roughness: 0.4, metalness: 0.8, costPerM2: 200, unit: 'm²', color: '#c0c8d0' },
  { id: 'roof-green', name: 'Green Roof', category: 'Roofing', roughness: 0.95, metalness: 0.0, costPerM2: 250, unit: 'm²', color: '#4a8a4a' },
  { id: 'roof-bitumen', name: 'Bitumen Roofing', category: 'Roofing', roughness: 0.9, metalness: 0.0, costPerM2: 45, unit: 'm²', color: '#202020' },

  // Flooring
  { id: 'floor-ceramic-tile', name: 'Ceramic Floor Tile', category: 'Flooring', roughness: 0.3, metalness: 0.0, costPerM2: 50, unit: 'm²', color: '#d0c8b8' },
  { id: 'floor-porcelain-tile', name: 'Porcelain Tile', category: 'Flooring', roughness: 0.2, metalness: 0.0, costPerM2: 80, unit: 'm²', color: '#e0d8c8' },
  { id: 'floor-vinyl', name: 'Vinyl Flooring', category: 'Flooring', roughness: 0.5, metalness: 0.0, costPerM2: 25, unit: 'm²', color: '#c8c0b0' },
  { id: 'floor-laminate', name: 'Laminate Flooring', category: 'Flooring', roughness: 0.5, metalness: 0.0, costPerM2: 30, unit: 'm²', color: '#b8a068' },
  { id: 'floor-engineered-wood', name: 'Engineered Wood', category: 'Flooring', roughness: 0.6, metalness: 0.0, costPerM2: 70, unit: 'm²', color: '#a87840' },
  { id: 'floor-solid-wood', name: 'Solid Wood Floor', category: 'Flooring', roughness: 0.65, metalness: 0.0, costPerM2: 120, unit: 'm²', color: '#9c6830' },
  { id: 'floor-carpet', name: 'Carpet', category: 'Flooring', roughness: 0.98, metalness: 0.0, costPerM2: 35, unit: 'm²', color: '#b0a890' },
  { id: 'floor-epoxy', name: 'Epoxy Floor', category: 'Flooring', roughness: 0.15, metalness: 0.0, costPerM2: 60, unit: 'm²', color: '#d0d8e0' },

  // Insulation
  { id: 'insulation-mineral-wool', name: 'Mineral Wool', category: 'Insulation', roughness: 0.98, metalness: 0.0, costPerM2: 15, unit: 'm²', color: '#f0e8b0' },
  { id: 'insulation-rigid-foam', name: 'Rigid Foam (PIR)', category: 'Insulation', roughness: 0.95, metalness: 0.0, costPerM2: 25, unit: 'm²', color: '#f0f050' },
  { id: 'insulation-eps', name: 'EPS Insulation', category: 'Insulation', roughness: 0.95, metalness: 0.0, costPerM2: 12, unit: 'm²', color: '#f8f8f8' },
  { id: 'insulation-spray-foam', name: 'Spray Foam Insulation', category: 'Insulation', roughness: 0.95, metalness: 0.0, costPerM2: 40, unit: 'm²', color: '#ffe880' },

  // Paint / Finish
  { id: 'paint-white-matte', name: 'White Matte Paint', category: 'Paint', roughness: 0.95, metalness: 0.0, costPerM2: 8, unit: 'm²', color: '#ffffff' },
  { id: 'paint-white-gloss', name: 'White Gloss Paint', category: 'Paint', roughness: 0.2, metalness: 0.0, costPerM2: 10, unit: 'm²', color: '#f8f8f8' },
  { id: 'paint-dark-matte', name: 'Dark Matte Paint', category: 'Paint', roughness: 0.95, metalness: 0.0, costPerM2: 8, unit: 'm²', color: '#303030' },
  { id: 'paint-satin', name: 'Satin Paint', category: 'Paint', roughness: 0.5, metalness: 0.0, costPerM2: 9, unit: 'm²', color: '#e8e8e8' },
  { id: 'wallpaper-plain', name: 'Plain Wallpaper', category: 'Paint', roughness: 0.85, metalness: 0.0, costPerM2: 20, unit: 'm²', color: '#f0e8d8' },
  { id: 'wallpaper-textured', name: 'Textured Wallpaper', category: 'Paint', roughness: 0.9, metalness: 0.0, costPerM2: 35, unit: 'm²', color: '#e8d8c0' },

  // Cladding
  { id: 'cladding-timber', name: 'Timber Cladding', category: 'Cladding', roughness: 0.85, metalness: 0.0, costPerM2: 90, unit: 'm²', color: '#a87840' },
  { id: 'cladding-fibre-cement', name: 'Fibre Cement Board', category: 'Cladding', roughness: 0.8, metalness: 0.0, costPerM2: 75, unit: 'm²', color: '#c8c0b0' },
  { id: 'cladding-metal-panel', name: 'Metal Panel Cladding', category: 'Cladding', roughness: 0.35, metalness: 0.8, costPerM2: 180, unit: 'm²', color: '#a8b0b8' },
  { id: 'cladding-rainscreen', name: 'Rainscreen Cladding', category: 'Cladding', roughness: 0.4, metalness: 0.7, costPerM2: 200, unit: 'm²', color: '#909098' },
  { id: 'cladding-terracotta', name: 'Terracotta Cladding', category: 'Cladding', roughness: 0.85, metalness: 0.0, costPerM2: 250, unit: 'm²', color: '#c06040' },
  { id: 'cladding-hpl', name: 'HPL Panel', category: 'Cladding', roughness: 0.4, metalness: 0.0, costPerM2: 160, unit: 'm²', color: '#d0c8b8' },

  // Waterproofing
  { id: 'waterproof-membrane', name: 'Waterproof Membrane', category: 'Waterproofing', roughness: 0.9, metalness: 0.0, costPerM2: 30, unit: 'm²', color: '#303030' },
  { id: 'tanking', name: 'Tanking Slurry', category: 'Waterproofing', roughness: 0.9, metalness: 0.0, costPerM2: 25, unit: 'm²', color: '#909090' },
  { id: 'pool-water', name: 'Pool Water', category: 'Waterproofing', roughness: 0.05, metalness: 0.0, costPerM2: 5, unit: 'm²', color: '#2a88c8' },

  // Acoustic
  { id: 'acoustic-panel', name: 'Acoustic Panel', category: 'Acoustic', roughness: 0.98, metalness: 0.0, costPerM2: 80, unit: 'm²', color: '#d8c8b0' },
  { id: 'acoustic-foam', name: 'Acoustic Foam', category: 'Acoustic', roughness: 0.98, metalness: 0.0, costPerM2: 40, unit: 'm²', color: '#a0b0a0' },
  { id: 'acoustic-plasterboard', name: 'Acoustic Plasterboard', category: 'Acoustic', roughness: 0.9, metalness: 0.0, costPerM2: 35, unit: 'm²', color: '#e8e0d8' },

  // Specialist
  { id: 'terracotta-tile', name: 'Terracotta Tile', category: 'Tile', roughness: 0.85, metalness: 0.0, costPerM2: 90, unit: 'm²', color: '#c06840' },
  { id: 'mosaic-tile', name: 'Mosaic Tile', category: 'Tile', roughness: 0.3, metalness: 0.0, costPerM2: 120, unit: 'm²', color: '#8090a8' },
  { id: 'travertine', name: 'Travertine', category: 'Masonry', roughness: 0.6, metalness: 0.0, costPerM2: 300, unit: 'm²', color: '#e0d0b0' },
  { id: 'onyx', name: 'Onyx', category: 'Masonry', roughness: 0.15, metalness: 0.0, costPerM2: 800, unit: 'm²', color: '#c8b890' },
  { id: 'polycarbonate', name: 'Polycarbonate Panel', category: 'Glass', roughness: 0.3, metalness: 0.0, costPerM2: 60, unit: 'm²', color: '#d0e8f8' },
  { id: 'etfe', name: 'ETFE Cushion', category: 'Glass', roughness: 0.1, metalness: 0.0, costPerM2: 350, unit: 'm²', color: '#e8f4fc' },
  { id: 'stone-basalt', name: 'Basalt', category: 'Masonry', roughness: 0.8, metalness: 0.0, costPerM2: 220, unit: 'm²', color: '#404040' },
  { id: 'steel-perforated', name: 'Perforated Steel', category: 'Metal', roughness: 0.45, metalness: 0.85, costPerM2: 200, unit: 'm²', color: '#909090' },
  { id: 'timber-larch', name: 'Larch Timber', category: 'Timber', roughness: 0.8, metalness: 0.0, costPerM2: 95, unit: 'm²', color: '#c09050' },
  { id: 'render-acrylic', name: 'Acrylic Render', category: 'Plaster', roughness: 0.7, metalness: 0.0, costPerM2: 55, unit: 'm²', color: '#e8e0d0' },
  { id: 'floor-resin', name: 'Resin Floor', category: 'Flooring', roughness: 0.1, metalness: 0.0, costPerM2: 75, unit: 'm²', color: '#d8e0e8' },

  // ── Extended catalog — appended to reach Archicad-scale coverage ─────────

  // Concrete variants
  { id: 'concrete-fair-faced', name: 'Fair-Faced Concrete', category: 'Concrete', roughness: 0.65, metalness: 0, costPerM2: 75, unit: 'm²', color: '#b4b4b4', density: 2400, embodiedCarbon: 0.13 },
  { id: 'concrete-board-formed', name: 'Board-Formed Concrete', category: 'Concrete', roughness: 0.85, metalness: 0, costPerM2: 95, unit: 'm²', color: '#aaa89a', density: 2400, embodiedCarbon: 0.13 },
  { id: 'concrete-high-strength', name: 'High-Strength Concrete', category: 'Concrete', roughness: 0.9, metalness: 0, costPerM2: 85, unit: 'm²', color: '#939393', density: 2500, embodiedCarbon: 0.18 },
  { id: 'concrete-self-compacting', name: 'Self-Compacting Concrete', category: 'Concrete', roughness: 0.85, metalness: 0, costPerM2: 90, unit: 'm²', color: '#9e9e9e', density: 2400, embodiedCarbon: 0.15 },
  { id: 'concrete-shotcrete', name: 'Shotcrete', category: 'Concrete', roughness: 0.95, metalness: 0, costPerM2: 65, unit: 'm²', color: '#888888', density: 2200, embodiedCarbon: 0.14 },
  { id: 'concrete-gfrc', name: 'GFRC Panel', category: 'Concrete', roughness: 0.6, metalness: 0, costPerM2: 180, unit: 'm²', color: '#cfcfcf', density: 1900, embodiedCarbon: 0.22 },
  { id: 'concrete-pervious', name: 'Pervious Concrete', category: 'Concrete', roughness: 0.98, metalness: 0, costPerM2: 80, unit: 'm²', color: '#a8a8a0', density: 1800, embodiedCarbon: 0.11 },
  { id: 'concrete-exposed-aggregate', name: 'Exposed Aggregate', category: 'Concrete', roughness: 0.95, metalness: 0, costPerM2: 95, unit: 'm²', color: '#a8a090', density: 2400, embodiedCarbon: 0.13 },
  { id: 'concrete-pigmented-black', name: 'Black Pigmented Concrete', category: 'Concrete', roughness: 0.85, metalness: 0, costPerM2: 110, unit: 'm²', color: '#2a2a2a', density: 2400, embodiedCarbon: 0.14 },
  { id: 'concrete-pigmented-red', name: 'Red Pigmented Concrete', category: 'Concrete', roughness: 0.85, metalness: 0, costPerM2: 105, unit: 'm²', color: '#8a3a2a', density: 2400, embodiedCarbon: 0.14 },
  { id: 'concrete-pigmented-ochre', name: 'Ochre Pigmented Concrete', category: 'Concrete', roughness: 0.85, metalness: 0, costPerM2: 105, unit: 'm²', color: '#b89a60', density: 2400, embodiedCarbon: 0.14 },
  { id: 'concrete-terrazzo-matrix', name: 'Terrazzo Matrix', category: 'Concrete', roughness: 0.2, metalness: 0, costPerM2: 160, unit: 'm²', color: '#d0cfc8', density: 2400, embodiedCarbon: 0.14 },

  // Brick bonds + colors
  { id: 'brick-buff', name: 'Buff Brick', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 110, unit: 'm²', color: '#c9ad70' },
  { id: 'brick-grey', name: 'Grey Brick', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 110, unit: 'm²', color: '#8a8a85' },
  { id: 'brick-black', name: 'Black Brick', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 130, unit: 'm²', color: '#2a2a2a' },
  { id: 'brick-white', name: 'White Brick', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 130, unit: 'm²', color: '#e8e5df' },
  { id: 'brick-glazed', name: 'Glazed Brick', category: 'Masonry', roughness: 0.2, metalness: 0, costPerM2: 190, unit: 'm²', color: '#d8d8e8' },
  { id: 'brick-thin', name: 'Thin Brick Veneer', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 90, unit: 'm²', color: '#b05538' },
  { id: 'brick-handmade', name: 'Handmade Brick', category: 'Masonry', roughness: 0.95, metalness: 0, costPerM2: 170, unit: 'm²', color: '#b24b34' },
  { id: 'brick-flemish', name: 'Flemish Bond Brick', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 135, unit: 'm²', color: '#a54130' },
  { id: 'brick-english', name: 'English Bond Brick', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 135, unit: 'm²', color: '#9c3d2a' },
  { id: 'brick-stacked', name: 'Stack Bond Brick', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 120, unit: 'm²', color: '#b55239' },

  // Stone species + finishes
  { id: 'stone-limestone-portland', name: 'Portland Limestone', category: 'Masonry', roughness: 0.85, metalness: 0, costPerM2: 280, unit: 'm²', color: '#e2d8b8' },
  { id: 'stone-limestone-indiana', name: 'Indiana Limestone', category: 'Masonry', roughness: 0.85, metalness: 0, costPerM2: 260, unit: 'm²', color: '#d9ce9e' },
  { id: 'stone-sandstone-york', name: 'York Sandstone', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 220, unit: 'm²', color: '#c8a67a' },
  { id: 'stone-sandstone-red', name: 'Red Sandstone', category: 'Masonry', roughness: 0.9, metalness: 0, costPerM2: 200, unit: 'm²', color: '#a05a3d' },
  { id: 'stone-granite-black', name: 'Black Granite', category: 'Masonry', roughness: 0.2, metalness: 0, costPerM2: 400, unit: 'm²', color: '#2a2a2a' },
  { id: 'stone-granite-white', name: 'White Granite', category: 'Masonry', roughness: 0.3, metalness: 0, costPerM2: 380, unit: 'm²', color: '#d8d8d2' },
  { id: 'stone-marble-calacatta', name: 'Calacatta Marble', category: 'Masonry', roughness: 0.08, metalness: 0, costPerM2: 780, unit: 'm²', color: '#f2eee6' },
  { id: 'stone-marble-carrara', name: 'Carrara Marble', category: 'Masonry', roughness: 0.1, metalness: 0, costPerM2: 560, unit: 'm²', color: '#ececec' },
  { id: 'stone-marble-nero', name: 'Nero Marquina Marble', category: 'Masonry', roughness: 0.08, metalness: 0, costPerM2: 640, unit: 'm²', color: '#1e1e1e' },
  { id: 'stone-marble-emperador', name: 'Emperador Marble', category: 'Masonry', roughness: 0.12, metalness: 0, costPerM2: 600, unit: 'm²', color: '#6d4a2d' },
  { id: 'stone-slate-welsh', name: 'Welsh Slate', category: 'Masonry', roughness: 0.7, metalness: 0, costPerM2: 280, unit: 'm²', color: '#3a3a44' },
  { id: 'stone-slate-brazilian', name: 'Brazilian Slate', category: 'Masonry', roughness: 0.7, metalness: 0, costPerM2: 240, unit: 'm²', color: '#484860' },
  { id: 'stone-travertine-silver', name: 'Silver Travertine', category: 'Masonry', roughness: 0.6, metalness: 0, costPerM2: 320, unit: 'm²', color: '#c9c2b5' },
  { id: 'stone-travertine-navona', name: 'Navona Travertine', category: 'Masonry', roughness: 0.65, metalness: 0, costPerM2: 340, unit: 'm²', color: '#d8c8a8' },
  { id: 'stone-quartzite', name: 'Quartzite', category: 'Masonry', roughness: 0.2, metalness: 0, costPerM2: 420, unit: 'm²', color: '#dcdad0' },
  { id: 'stone-bluestone', name: 'Bluestone', category: 'Masonry', roughness: 0.75, metalness: 0, costPerM2: 230, unit: 'm²', color: '#545862' },
  { id: 'stone-fieldstone', name: 'Fieldstone', category: 'Masonry', roughness: 0.95, metalness: 0, costPerM2: 260, unit: 'm²', color: '#9a8878' },
  { id: 'stone-ashlar', name: 'Ashlar Masonry', category: 'Masonry', roughness: 0.8, metalness: 0, costPerM2: 350, unit: 'm²', color: '#b0a090' },
  { id: 'stone-rubble', name: 'Rubble Masonry', category: 'Masonry', roughness: 0.97, metalness: 0, costPerM2: 220, unit: 'm²', color: '#8a7e70' },
  { id: 'stone-dressed-granite', name: 'Dressed Granite', category: 'Masonry', roughness: 0.4, metalness: 0, costPerM2: 380, unit: 'm²', color: '#808080' },

  // Timber species expansion
  { id: 'timber-beech', name: 'Beech Timber', category: 'Timber', roughness: 0.75, metalness: 0, costPerM2: 115, unit: 'm²', color: '#d4b186' },
  { id: 'timber-birch', name: 'Birch Timber', category: 'Timber', roughness: 0.75, metalness: 0, costPerM2: 100, unit: 'm²', color: '#e8d8b8' },
  { id: 'timber-cherry', name: 'Cherry Timber', category: 'Timber', roughness: 0.7, metalness: 0, costPerM2: 170, unit: 'm²', color: '#964b2b' },
  { id: 'timber-teak', name: 'Teak Timber', category: 'Timber', roughness: 0.7, metalness: 0, costPerM2: 290, unit: 'm²', color: '#b88748' },
  { id: 'timber-mahogany', name: 'Mahogany Timber', category: 'Timber', roughness: 0.7, metalness: 0, costPerM2: 240, unit: 'm²', color: '#6f3a20' },
  { id: 'timber-wenge', name: 'Wenge Timber', category: 'Timber', roughness: 0.75, metalness: 0, costPerM2: 260, unit: 'm²', color: '#3c2a1a' },
  { id: 'timber-iroko', name: 'Iroko Timber', category: 'Timber', roughness: 0.8, metalness: 0, costPerM2: 160, unit: 'm²', color: '#a88048' },
  { id: 'timber-sapele', name: 'Sapele Timber', category: 'Timber', roughness: 0.75, metalness: 0, costPerM2: 150, unit: 'm²', color: '#8a4a2d' },
  { id: 'timber-hickory', name: 'Hickory Timber', category: 'Timber', roughness: 0.8, metalness: 0, costPerM2: 140, unit: 'm²', color: '#b08060' },
  { id: 'timber-elm', name: 'Elm Timber', category: 'Timber', roughness: 0.8, metalness: 0, costPerM2: 125, unit: 'm²', color: '#a88858' },
  { id: 'timber-rosewood', name: 'Rosewood Timber', category: 'Timber', roughness: 0.7, metalness: 0, costPerM2: 340, unit: 'm²', color: '#5a2a1a' },
  { id: 'timber-ebony', name: 'Ebony Timber', category: 'Timber', roughness: 0.5, metalness: 0, costPerM2: 500, unit: 'm²', color: '#1a1a1a' },
  { id: 'timber-zebrawood', name: 'Zebrawood', category: 'Timber', roughness: 0.7, metalness: 0, costPerM2: 380, unit: 'm²', color: '#b08840' },
  { id: 'timber-alder', name: 'Alder Timber', category: 'Timber', roughness: 0.75, metalness: 0, costPerM2: 95, unit: 'm²', color: '#c8a078' },
  { id: 'timber-charred', name: 'Charred Timber (Shou Sugi Ban)', category: 'Timber', roughness: 0.95, metalness: 0, costPerM2: 180, unit: 'm²', color: '#2c2420' },
  { id: 'timber-white-washed', name: 'White-Washed Timber', category: 'Timber', roughness: 0.8, metalness: 0, costPerM2: 130, unit: 'm²', color: '#ded6c5' },
  { id: 'timber-oiled', name: 'Oiled Timber', category: 'Timber', roughness: 0.55, metalness: 0, costPerM2: 135, unit: 'm²', color: '#a06a30' },
  { id: 'timber-lacquered', name: 'Lacquered Timber', category: 'Timber', roughness: 0.15, metalness: 0, costPerM2: 150, unit: 'm²', color: '#b87838' },
  { id: 'timber-clt', name: 'CLT Panel', category: 'Timber', roughness: 0.8, metalness: 0, costPerM2: 220, unit: 'm²', color: '#c8a570' },
  { id: 'timber-lvl', name: 'LVL Beam', category: 'Timber', roughness: 0.75, metalness: 0, costPerM2: 180, unit: 'm²', color: '#b89050' },
  { id: 'timber-lsl', name: 'LSL', category: 'Timber', roughness: 0.8, metalness: 0, costPerM2: 110, unit: 'm²', color: '#b08030' },

  // Metal finishes
  { id: 'steel-blackened', name: 'Blackened Steel', category: 'Metal', roughness: 0.5, metalness: 0.85, costPerM2: 230, unit: 'm²', color: '#303030' },
  { id: 'steel-hot-rolled', name: 'Hot Rolled Steel', category: 'Metal', roughness: 0.7, metalness: 0.8, costPerM2: 160, unit: 'm²', color: '#6a6a70' },
  { id: 'steel-cold-rolled', name: 'Cold Rolled Steel', category: 'Metal', roughness: 0.3, metalness: 0.9, costPerM2: 180, unit: 'm²', color: '#a0a0a8' },
  { id: 'steel-powder-white', name: 'Powder-Coated Steel, White', category: 'Metal', roughness: 0.6, metalness: 0.3, costPerM2: 200, unit: 'm²', color: '#f5f5f5' },
  { id: 'steel-powder-black', name: 'Powder-Coated Steel, Black', category: 'Metal', roughness: 0.6, metalness: 0.3, costPerM2: 200, unit: 'm²', color: '#1a1a1a' },
  { id: 'steel-powder-anthracite', name: 'Powder-Coated Steel, Anthracite', category: 'Metal', roughness: 0.6, metalness: 0.3, costPerM2: 200, unit: 'm²', color: '#3a3a3c' },
  { id: 'aluminum-anodised-clear', name: 'Anodised Aluminium, Clear', category: 'Metal', roughness: 0.2, metalness: 0.9, costPerM2: 280, unit: 'm²', color: '#c0c2c8' },
  { id: 'aluminum-anodised-bronze', name: 'Anodised Aluminium, Bronze', category: 'Metal', roughness: 0.25, metalness: 0.85, costPerM2: 300, unit: 'm²', color: '#7a5a38' },
  { id: 'aluminum-anodised-black', name: 'Anodised Aluminium, Black', category: 'Metal', roughness: 0.25, metalness: 0.85, costPerM2: 300, unit: 'm²', color: '#1a1a1a' },
  { id: 'aluminum-powder-ral9010', name: 'Aluminium RAL 9010 White', category: 'Metal', roughness: 0.55, metalness: 0.4, costPerM2: 240, unit: 'm²', color: '#f5f5f5' },
  { id: 'aluminum-powder-ral7016', name: 'Aluminium RAL 7016 Anthracite', category: 'Metal', roughness: 0.55, metalness: 0.4, costPerM2: 240, unit: 'm²', color: '#293133' },
  { id: 'aluminum-powder-ral9005', name: 'Aluminium RAL 9005 Black', category: 'Metal', roughness: 0.55, metalness: 0.4, costPerM2: 240, unit: 'm²', color: '#0a0a0a' },
  { id: 'aluminum-powder-ral3020', name: 'Aluminium RAL 3020 Red', category: 'Metal', roughness: 0.55, metalness: 0.4, costPerM2: 240, unit: 'm²', color: '#cc0605' },
  { id: 'aluminum-powder-ral5002', name: 'Aluminium RAL 5002 Ultramarine', category: 'Metal', roughness: 0.55, metalness: 0.4, costPerM2: 240, unit: 'm²', color: '#20214f' },
  { id: 'aluminum-powder-ral6005', name: 'Aluminium RAL 6005 Moss Green', category: 'Metal', roughness: 0.55, metalness: 0.4, costPerM2: 240, unit: 'm²', color: '#114232' },
  { id: 'copper-patina', name: 'Patinated Copper', category: 'Metal', roughness: 0.7, metalness: 0.5, costPerM2: 450, unit: 'm²', color: '#6aa296' },
  { id: 'copper-polished', name: 'Polished Copper', category: 'Metal', roughness: 0.1, metalness: 0.95, costPerM2: 520, unit: 'm²', color: '#c87533' },
  { id: 'bronze-polished', name: 'Polished Bronze', category: 'Metal', roughness: 0.15, metalness: 0.92, costPerM2: 420, unit: 'm²', color: '#b5823b' },
  { id: 'bronze-satin', name: 'Satin Bronze', category: 'Metal', roughness: 0.4, metalness: 0.85, costPerM2: 380, unit: 'm²', color: '#8c6a35' },
  { id: 'titanium-matte', name: 'Matte Titanium', category: 'Metal', roughness: 0.4, metalness: 0.9, costPerM2: 550, unit: 'm²', color: '#8a8a90' },
  { id: 'lead-sheet', name: 'Lead Sheet', category: 'Metal', roughness: 0.6, metalness: 0.7, costPerM2: 280, unit: 'm²', color: '#5a5c65' },
  { id: 'metal-corrugated', name: 'Corrugated Metal', category: 'Metal', roughness: 0.5, metalness: 0.8, costPerM2: 90, unit: 'm²', color: '#a0a8b0' },

  // Glass expansion
  { id: 'glass-bronze', name: 'Bronze Tinted Glass', category: 'Glass', roughness: 0.05, metalness: 0, costPerM2: 130, unit: 'm²', color: '#886848' },
  { id: 'glass-green', name: 'Green Tinted Glass', category: 'Glass', roughness: 0.05, metalness: 0, costPerM2: 130, unit: 'm²', color: '#88a898' },
  { id: 'glass-grey', name: 'Grey Tinted Glass', category: 'Glass', roughness: 0.05, metalness: 0, costPerM2: 130, unit: 'm²', color: '#808890' },
  { id: 'glass-blue', name: 'Blue Tinted Glass', category: 'Glass', roughness: 0.05, metalness: 0, costPerM2: 130, unit: 'm²', color: '#7098b0' },
  { id: 'glass-low-iron', name: 'Low-Iron Glass', category: 'Glass', roughness: 0.05, metalness: 0, costPerM2: 180, unit: 'm²', color: '#e6f4f5' },
  { id: 'glass-fritted', name: 'Fritted Glass', category: 'Glass', roughness: 0.3, metalness: 0, costPerM2: 220, unit: 'm²', color: '#dce6ec' },
  { id: 'glass-channel', name: 'Channel Glass', category: 'Glass', roughness: 0.25, metalness: 0, costPerM2: 260, unit: 'm²', color: '#d5e4e8' },
  { id: 'glass-block', name: 'Glass Block', category: 'Glass', roughness: 0.3, metalness: 0, costPerM2: 150, unit: 'm²', color: '#c8dae4' },
  { id: 'glass-cast', name: 'Cast Glass', category: 'Glass', roughness: 0.35, metalness: 0, costPerM2: 320, unit: 'm²', color: '#d0e8f0' },
  { id: 'glass-switchable', name: 'Switchable Glass', category: 'Glass', roughness: 0.1, metalness: 0, costPerM2: 650, unit: 'm²', color: '#d8e8f2' },
  { id: 'glass-bullet-resistant', name: 'Bullet-Resistant Glass', category: 'Glass', roughness: 0.05, metalness: 0, costPerM2: 600, unit: 'm²', color: '#c8dce4' },

  // Plaster & render expansion
  { id: 'plaster-venetian', name: 'Venetian Plaster', category: 'Plaster', roughness: 0.25, metalness: 0, costPerM2: 150, unit: 'm²', color: '#e8d8c0' },
  { id: 'plaster-clay', name: 'Clay Plaster', category: 'Plaster', roughness: 0.8, metalness: 0, costPerM2: 70, unit: 'm²', color: '#d8b890' },
  { id: 'plaster-tadelakt', name: 'Tadelakt', category: 'Plaster', roughness: 0.2, metalness: 0, costPerM2: 210, unit: 'm²', color: '#d0c8b0' },
  { id: 'plaster-polished-white', name: 'Polished Plaster, White', category: 'Plaster', roughness: 0.15, metalness: 0, costPerM2: 130, unit: 'm²', color: '#f0efe8' },
  { id: 'plaster-polished-grey', name: 'Polished Plaster, Grey', category: 'Plaster', roughness: 0.15, metalness: 0, costPerM2: 130, unit: 'm²', color: '#b8b8b8' },
  { id: 'plaster-polished-taupe', name: 'Polished Plaster, Taupe', category: 'Plaster', roughness: 0.15, metalness: 0, costPerM2: 130, unit: 'm²', color: '#b89880' },
  { id: 'plaster-microcement', name: 'Microcement', category: 'Plaster', roughness: 0.3, metalness: 0, costPerM2: 180, unit: 'm²', color: '#c8c0b0' },
  { id: 'render-silicone', name: 'Silicone Render', category: 'Plaster', roughness: 0.7, metalness: 0, costPerM2: 60, unit: 'm²', color: '#e8e0d0' },
  { id: 'render-mineral', name: 'Mineral Render', category: 'Plaster', roughness: 0.85, metalness: 0, costPerM2: 50, unit: 'm²', color: '#dad0bf' },
  { id: 'render-monocouche', name: 'Monocouche Render', category: 'Plaster', roughness: 0.85, metalness: 0, costPerM2: 45, unit: 'm²', color: '#dcd3c0' },

  // Roofing expansion
  { id: 'roof-tiles-clay-red', name: 'Red Clay Tiles', category: 'Roofing', roughness: 0.9, metalness: 0, costPerM2: 85, unit: 'm²', color: '#a04030' },
  { id: 'roof-tiles-clay-brown', name: 'Brown Clay Tiles', category: 'Roofing', roughness: 0.9, metalness: 0, costPerM2: 85, unit: 'm²', color: '#6a3e26' },
  { id: 'roof-tiles-clay-black', name: 'Black Clay Tiles', category: 'Roofing', roughness: 0.9, metalness: 0, costPerM2: 95, unit: 'm²', color: '#1a1a1a' },
  { id: 'roof-tiles-clay-natural', name: 'Natural Clay Tiles', category: 'Roofing', roughness: 0.9, metalness: 0, costPerM2: 80, unit: 'm²', color: '#c97a4b' },
  { id: 'roof-slate-grey', name: 'Grey Roof Slate', category: 'Roofing', roughness: 0.7, metalness: 0, costPerM2: 160, unit: 'm²', color: '#606065' },
  { id: 'roof-slate-black', name: 'Black Roof Slate', category: 'Roofing', roughness: 0.7, metalness: 0, costPerM2: 190, unit: 'm²', color: '#202024' },
  { id: 'roof-wood-shingle', name: 'Wood Shingle', category: 'Roofing', roughness: 0.85, metalness: 0, costPerM2: 90, unit: 'm²', color: '#9e6d45' },
  { id: 'roof-cedar-shake', name: 'Cedar Shake', category: 'Roofing', roughness: 0.9, metalness: 0, costPerM2: 110, unit: 'm²', color: '#b07845' },
  { id: 'roof-standing-seam-black', name: 'Standing Seam, Black', category: 'Roofing', roughness: 0.4, metalness: 0.8, costPerM2: 210, unit: 'm²', color: '#181818' },
  { id: 'roof-standing-seam-grey', name: 'Standing Seam, Grey', category: 'Roofing', roughness: 0.4, metalness: 0.8, costPerM2: 210, unit: 'm²', color: '#858890' },
  { id: 'roof-zinc', name: 'Zinc Roofing', category: 'Roofing', roughness: 0.5, metalness: 0.75, costPerM2: 240, unit: 'm²', color: '#7a8088' },
  { id: 'roof-copper', name: 'Copper Roofing', category: 'Roofing', roughness: 0.35, metalness: 0.9, costPerM2: 380, unit: 'm²', color: '#b77333' },
  { id: 'roof-patinated-copper', name: 'Patinated Copper Roofing', category: 'Roofing', roughness: 0.7, metalness: 0.4, costPerM2: 400, unit: 'm²', color: '#6aa296' },
  { id: 'roof-sedum', name: 'Sedum Green Roof', category: 'Roofing', roughness: 0.95, metalness: 0, costPerM2: 260, unit: 'm²', color: '#68824a' },
  { id: 'roof-intensive-green', name: 'Intensive Green Roof', category: 'Roofing', roughness: 0.98, metalness: 0, costPerM2: 380, unit: 'm²', color: '#4a7040' },
  { id: 'roof-thatch', name: 'Thatch', category: 'Roofing', roughness: 0.98, metalness: 0, costPerM2: 220, unit: 'm²', color: '#c8a060' },

  // Flooring expansion
  { id: 'floor-terrazzo', name: 'Terrazzo', category: 'Flooring', roughness: 0.15, metalness: 0, costPerM2: 160, unit: 'm²', color: '#d8d5ce' },
  { id: 'floor-terrazzo-black', name: 'Black Terrazzo', category: 'Flooring', roughness: 0.15, metalness: 0, costPerM2: 180, unit: 'm²', color: '#2a2a2a' },
  { id: 'floor-linoleum', name: 'Linoleum', category: 'Flooring', roughness: 0.5, metalness: 0, costPerM2: 40, unit: 'm²', color: '#c8b890' },
  { id: 'floor-rubber', name: 'Rubber Floor', category: 'Flooring', roughness: 0.9, metalness: 0, costPerM2: 55, unit: 'm²', color: '#3a3a3c' },
  { id: 'floor-cork', name: 'Cork Floor', category: 'Flooring', roughness: 0.85, metalness: 0, costPerM2: 70, unit: 'm²', color: '#b08850' },
  { id: 'floor-marmoleum', name: 'Marmoleum', category: 'Flooring', roughness: 0.55, metalness: 0, costPerM2: 60, unit: 'm²', color: '#a89868' },
  { id: 'floor-bamboo', name: 'Bamboo Floor', category: 'Flooring', roughness: 0.6, metalness: 0, costPerM2: 85, unit: 'm²', color: '#b89655' },
  { id: 'floor-polished-concrete', name: 'Polished Concrete Floor', category: 'Flooring', roughness: 0.15, metalness: 0, costPerM2: 110, unit: 'm²', color: '#bdbdbd' },
  { id: 'floor-micro-topping', name: 'Microtopping Floor', category: 'Flooring', roughness: 0.25, metalness: 0, costPerM2: 140, unit: 'm²', color: '#b8b0a0' },
  { id: 'floor-mosaic-penny', name: 'Penny Round Mosaic', category: 'Flooring', roughness: 0.2, metalness: 0, costPerM2: 180, unit: 'm²', color: '#d8d0c0' },
  { id: 'floor-mosaic-hex', name: 'Hexagon Mosaic', category: 'Flooring', roughness: 0.2, metalness: 0, costPerM2: 170, unit: 'm²', color: '#c0c8d0' },
  { id: 'floor-encaustic', name: 'Encaustic Tile', category: 'Flooring', roughness: 0.3, metalness: 0, costPerM2: 220, unit: 'm²', color: '#dcd4c4' },

  // Paint / finishes expansion
  { id: 'paint-off-white', name: 'Off-White Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#f0ece4' },
  { id: 'paint-cream', name: 'Cream Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#f5ead2' },
  { id: 'paint-beige', name: 'Beige Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#d4c5a0' },
  { id: 'paint-light-grey', name: 'Light Grey Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#c8c8c8' },
  { id: 'paint-mid-grey', name: 'Mid Grey Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#808080' },
  { id: 'paint-charcoal', name: 'Charcoal Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#3a3a3a' },
  { id: 'paint-black', name: 'Black Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#0a0a0a' },
  { id: 'paint-navy', name: 'Navy Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#1a2548' },
  { id: 'paint-sage-green', name: 'Sage Green Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#9eae8a' },
  { id: 'paint-forest-green', name: 'Forest Green Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#2d4a2a' },
  { id: 'paint-terracotta', name: 'Terracotta Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#b5603f' },
  { id: 'paint-mustard', name: 'Mustard Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#c99235' },
  { id: 'paint-dusky-pink', name: 'Dusky Pink Paint', category: 'Paint', roughness: 0.9, metalness: 0, costPerM2: 9, unit: 'm²', color: '#c8a0a0' },
  { id: 'paint-lime-wash', name: 'Lime Wash', category: 'Paint', roughness: 0.95, metalness: 0, costPerM2: 20, unit: 'm²', color: '#ece3d0' },
  { id: 'paint-chalkboard', name: 'Chalkboard Paint', category: 'Paint', roughness: 0.95, metalness: 0, costPerM2: 25, unit: 'm²', color: '#1a1a1a' },

  // Cladding expansion
  { id: 'cladding-larch', name: 'Larch Cladding', category: 'Cladding', roughness: 0.85, metalness: 0, costPerM2: 100, unit: 'm²', color: '#c2904d' },
  { id: 'cladding-cedar', name: 'Cedar Cladding', category: 'Cladding', roughness: 0.85, metalness: 0, costPerM2: 115, unit: 'm²', color: '#b67a3b' },
  { id: 'cladding-oak', name: 'Oak Cladding', category: 'Cladding', roughness: 0.85, metalness: 0, costPerM2: 130, unit: 'm²', color: '#8a6420' },
  { id: 'cladding-accoya', name: 'Accoya Cladding', category: 'Cladding', roughness: 0.85, metalness: 0, costPerM2: 150, unit: 'm²', color: '#c9a06c' },
  { id: 'cladding-thermo-ash', name: 'Thermo-Ash Cladding', category: 'Cladding', roughness: 0.85, metalness: 0, costPerM2: 140, unit: 'm²', color: '#8a6040' },
  { id: 'cladding-zinc-standing', name: 'Zinc Standing Seam', category: 'Cladding', roughness: 0.45, metalness: 0.75, costPerM2: 260, unit: 'm²', color: '#7a8088' },
  { id: 'cladding-copper-seam', name: 'Copper Standing Seam', category: 'Cladding', roughness: 0.35, metalness: 0.9, costPerM2: 420, unit: 'm²', color: '#b77333' },
  { id: 'cladding-fibre-cement-smooth', name: 'Fibre Cement, Smooth', category: 'Cladding', roughness: 0.5, metalness: 0, costPerM2: 90, unit: 'm²', color: '#d5d0c4' },
  { id: 'cladding-fibre-cement-wood', name: 'Fibre Cement, Woodgrain', category: 'Cladding', roughness: 0.75, metalness: 0, costPerM2: 95, unit: 'm²', color: '#b89862' },
  { id: 'cladding-grc', name: 'GRC Panel', category: 'Cladding', roughness: 0.6, metalness: 0, costPerM2: 220, unit: 'm²', color: '#d2d2ca' },
  { id: 'cladding-composite', name: 'ACM Composite', category: 'Cladding', roughness: 0.3, metalness: 0.7, costPerM2: 160, unit: 'm²', color: '#a0a8b0' },
  { id: 'cladding-natural-slate', name: 'Natural Slate Cladding', category: 'Cladding', roughness: 0.75, metalness: 0, costPerM2: 280, unit: 'm²', color: '#484850' },
  { id: 'cladding-brick-slip', name: 'Brick Slip', category: 'Cladding', roughness: 0.9, metalness: 0, costPerM2: 120, unit: 'm²', color: '#9a4030' },
  { id: 'cladding-terracotta-extruded', name: 'Extruded Terracotta', category: 'Cladding', roughness: 0.85, metalness: 0, costPerM2: 260, unit: 'm²', color: '#c06040' },

  // Tile expansion
  { id: 'tile-subway-white', name: 'White Subway Tile', category: 'Tile', roughness: 0.15, metalness: 0, costPerM2: 100, unit: 'm²', color: '#f4f4f4' },
  { id: 'tile-subway-black', name: 'Black Subway Tile', category: 'Tile', roughness: 0.15, metalness: 0, costPerM2: 110, unit: 'm²', color: '#1a1a1a' },
  { id: 'tile-zellige', name: 'Zellige Tile', category: 'Tile', roughness: 0.2, metalness: 0, costPerM2: 220, unit: 'm²', color: '#d8d0c0' },
  { id: 'tile-concrete-patterned', name: 'Patterned Concrete Tile', category: 'Tile', roughness: 0.5, metalness: 0, costPerM2: 150, unit: 'm²', color: '#b8b0a0' },
  { id: 'tile-porcelain-large', name: 'Large Format Porcelain', category: 'Tile', roughness: 0.2, metalness: 0, costPerM2: 140, unit: 'm²', color: '#e4dccc' },
  { id: 'tile-metro-grey', name: 'Grey Metro Tile', category: 'Tile', roughness: 0.15, metalness: 0, costPerM2: 110, unit: 'm²', color: '#8a8a8c' },

  // Acoustic expansion
  { id: 'acoustic-wood-slat', name: 'Wood Slat Acoustic', category: 'Acoustic', roughness: 0.8, metalness: 0, costPerM2: 150, unit: 'm²', color: '#a88050' },
  { id: 'acoustic-pet-felt', name: 'PET Felt Panel', category: 'Acoustic', roughness: 0.98, metalness: 0, costPerM2: 110, unit: 'm²', color: '#606070' },
  { id: 'acoustic-fabric-wrapped', name: 'Fabric Wrapped Panel', category: 'Acoustic', roughness: 0.95, metalness: 0, costPerM2: 140, unit: 'm²', color: '#808090' },
  { id: 'acoustic-perforated-wood', name: 'Perforated Wood Panel', category: 'Acoustic', roughness: 0.8, metalness: 0, costPerM2: 160, unit: 'm²', color: '#b08850' },
  { id: 'acoustic-micro-perforated', name: 'Micro-Perforated Metal', category: 'Acoustic', roughness: 0.5, metalness: 0.6, costPerM2: 210, unit: 'm²', color: '#a0a8b0' },

  // Specialty
  { id: 'etfe-printed', name: 'Printed ETFE Cushion', category: 'Glass', roughness: 0.2, metalness: 0, costPerM2: 420, unit: 'm²', color: '#dae8f0' },
  { id: 'polycarbonate-triple', name: 'Triple-Wall Polycarbonate', category: 'Glass', roughness: 0.35, metalness: 0, costPerM2: 120, unit: 'm²', color: '#d4e6f0' },
  { id: 'hpl-black', name: 'HPL Black', category: 'Cladding', roughness: 0.35, metalness: 0, costPerM2: 180, unit: 'm²', color: '#101010' },
  { id: 'hpl-white', name: 'HPL White', category: 'Cladding', roughness: 0.35, metalness: 0, costPerM2: 180, unit: 'm²', color: '#f5f5f5' },
  { id: 'hpl-woodgrain', name: 'HPL Woodgrain', category: 'Cladding', roughness: 0.55, metalness: 0, costPerM2: 190, unit: 'm²', color: '#9e7545' },
  { id: 'insulation-pir-board', name: 'PIR Insulation Board', category: 'Insulation', roughness: 0.95, metalness: 0, costPerM2: 30, unit: 'm²', color: '#f0f050' },
  { id: 'insulation-sheep-wool', name: 'Sheep Wool Insulation', category: 'Insulation', roughness: 0.98, metalness: 0, costPerM2: 40, unit: 'm²', color: '#dccdb0' },
  { id: 'insulation-hemp', name: 'Hemp Insulation', category: 'Insulation', roughness: 0.98, metalness: 0, costPerM2: 35, unit: 'm²', color: '#b8a070' },
  { id: 'insulation-cellulose', name: 'Cellulose Insulation', category: 'Insulation', roughness: 0.98, metalness: 0, costPerM2: 25, unit: 'm²', color: '#c0a880' },
  { id: 'insulation-xps', name: 'XPS Insulation', category: 'Insulation', roughness: 0.95, metalness: 0, costPerM2: 20, unit: 'm²', color: '#f0cce0' },

  // Water / decorative
  { id: 'pool-water-turquoise', name: 'Pool Water, Turquoise', category: 'Waterproofing', roughness: 0.03, metalness: 0, costPerM2: 5, unit: 'm²', color: '#47c8c8' },
  { id: 'pool-water-navy', name: 'Pool Water, Navy', category: 'Waterproofing', roughness: 0.03, metalness: 0, costPerM2: 5, unit: 'm²', color: '#1a4872' },
  { id: 'epdm-membrane', name: 'EPDM Roof Membrane', category: 'Waterproofing', roughness: 0.7, metalness: 0, costPerM2: 45, unit: 'm²', color: '#1a1a1a' },
  { id: 'tpo-membrane', name: 'TPO Roof Membrane', category: 'Waterproofing', roughness: 0.7, metalness: 0, costPerM2: 50, unit: 'm²', color: '#e8e8e8' },
  { id: 'liquid-waterproofing', name: 'Liquid Waterproofing', category: 'Waterproofing', roughness: 0.8, metalness: 0, costPerM2: 35, unit: 'm²', color: '#808080' },
];

export const MATERIAL_CATEGORIES = Array.from(
  new Set(BUILT_IN_MATERIALS.map((m) => m.category))
).sort();

// ── T-BIM-001: BIM Material Library ──────────────────────────────────────────

/**
 * BIM-specific material with required physical properties used for structural
 * analysis, thermal modeling, and lifecycle carbon accounting.
 */
export interface BIMMaterial {
  id: string;
  name: string;
  category: 'structural' | 'envelope' | 'finish' | 'mep';
  density: number;             // kg/m³
  thermalConductivity: number; // W/(m·K)
  embodiedCarbon: number;      // kgCO₂e/kg
  color: string;               // CSS hex (#rrggbb)
}

/**
 * Predefined BIM material library — 10 core materials spanning all four
 * BIM categories (structural, envelope, finish, mep).
 */
export const MATERIAL_LIBRARY: BIMMaterial[] = [
  // Structural
  { id: 'bim-concrete',   name: 'Concrete',    category: 'structural', density: 2400, thermalConductivity: 1.7,   embodiedCarbon: 0.13, color: '#9e9e9e' },
  { id: 'bim-steel',      name: 'Steel',        category: 'structural', density: 7850, thermalConductivity: 50.0,  embodiedCarbon: 1.55, color: '#607d8b' },
  { id: 'bim-timber',     name: 'Timber',       category: 'structural', density: 500,  thermalConductivity: 0.13,  embodiedCarbon: 0.42, color: '#d7a86e' },
  { id: 'bim-aluminum',   name: 'Aluminum',     category: 'structural', density: 2700, thermalConductivity: 237.0, embodiedCarbon: 8.24, color: '#b8b8c0' },
  // Envelope
  { id: 'bim-brick',      name: 'Brick',        category: 'envelope',   density: 1800, thermalConductivity: 0.72,  embodiedCarbon: 0.24, color: '#c1440e' },
  { id: 'bim-glass',      name: 'Glass',        category: 'envelope',   density: 2500, thermalConductivity: 1.0,   embodiedCarbon: 0.91, color: '#b3e5fc' },
  { id: 'bim-insulation', name: 'Insulation',   category: 'envelope',   density: 50,   thermalConductivity: 0.04,  embodiedCarbon: 1.28, color: '#ffe082' },
  // Finish
  { id: 'bim-gypsum',     name: 'Gypsum Board', category: 'finish',     density: 800,  thermalConductivity: 0.25,  embodiedCarbon: 0.38, color: '#f0f0e0' },
  { id: 'bim-rubber',     name: 'Rubber',       category: 'finish',     density: 1200, thermalConductivity: 0.16,  embodiedCarbon: 2.1,  color: '#424242' },
  // MEP
  { id: 'bim-copper',     name: 'Copper',       category: 'mep',        density: 8960, thermalConductivity: 385.0, embodiedCarbon: 3.19, color: '#b87333' },
];

/** Look up a BIM material by its id. Returns undefined when not found. */
export function getMaterial(id: string): BIMMaterial | undefined {
  return MATERIAL_LIBRARY.find((m) => m.id === id);
}

/** Return all BIM materials belonging to the given category. */
export function getMaterialsByCategory(category: BIMMaterial['category']): BIMMaterial[] {
  return MATERIAL_LIBRARY.filter((m) => m.category === category);
}
