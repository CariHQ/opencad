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
