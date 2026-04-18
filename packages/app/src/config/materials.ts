/**
 * T-BIM-001: Material library catalog
 *
 * Predefined architectural materials with physical and cost properties.
 */

export interface MaterialDef {
  id: string;
  name: string;
  category: 'concrete' | 'masonry' | 'steel' | 'wood' | 'glass' | 'insulation' | 'finish';
  color: string;               // CSS hex
  density: number;             // kg/m³
  thermalConductivity: number; // W/(m·K)
  embodiedCarbon: number;      // kgCO2e/kg
  cost: number;                // USD/m²
  texture?: string;            // optional CSS gradient for preview swatch
}

export const MATERIALS: MaterialDef[] = [
  // Concrete
  { id: 'concrete-normal', name: 'Normal Concrete', category: 'concrete', color: '#9e9e9e', density: 2400, thermalConductivity: 1.7, embodiedCarbon: 0.13, cost: 85 },
  { id: 'concrete-lightweight', name: 'Lightweight Concrete', category: 'concrete', color: '#bdbdbd', density: 1800, thermalConductivity: 0.8, embodiedCarbon: 0.11, cost: 95 },
  { id: 'concrete-reinf', name: 'Reinforced Concrete', category: 'concrete', color: '#757575', density: 2500, thermalConductivity: 2.0, embodiedCarbon: 0.17, cost: 120 },
  // Masonry
  { id: 'brick-clay', name: 'Clay Brick', category: 'masonry', color: '#c1440e', density: 1800, thermalConductivity: 0.7, embodiedCarbon: 0.24, cost: 65 },
  { id: 'cmu-standard', name: 'CMU Block', category: 'masonry', color: '#a0a0a0', density: 2000, thermalConductivity: 1.1, embodiedCarbon: 0.19, cost: 55 },
  // Steel
  { id: 'steel-structural', name: 'Structural Steel', category: 'steel', color: '#607d8b', density: 7850, thermalConductivity: 50, embodiedCarbon: 1.55, cost: 180 },
  { id: 'steel-stainless', name: 'Stainless Steel', category: 'steel', color: '#90a4ae', density: 7900, thermalConductivity: 17, embodiedCarbon: 6.15, cost: 420 },
  // Wood
  { id: 'timber-glulam', name: 'Glulam Timber', category: 'wood', color: '#d7a86e', density: 500, thermalConductivity: 0.13, embodiedCarbon: 0.42, cost: 95 },
  { id: 'timber-clt', name: 'Cross-Laminated Timber', category: 'wood', color: '#c49a6c', density: 480, thermalConductivity: 0.12, embodiedCarbon: 0.51, cost: 135 },
  { id: 'plywood', name: 'Plywood', category: 'wood', color: '#e8c99a', density: 550, thermalConductivity: 0.14, embodiedCarbon: 0.76, cost: 45 },
  // Glass
  { id: 'glass-clear', name: 'Clear Float Glass', category: 'glass', color: '#b3e5fc', density: 2500, thermalConductivity: 1.0, embodiedCarbon: 0.91, cost: 85 },
  { id: 'glass-double', name: 'Double Glazing', category: 'glass', color: '#81d4fa', density: 2400, thermalConductivity: 0.3, embodiedCarbon: 1.05, cost: 160 },
  // Insulation
  { id: 'insul-mineral', name: 'Mineral Wool', category: 'insulation', color: '#ffe082', density: 50, thermalConductivity: 0.04, embodiedCarbon: 1.28, cost: 25 },
  { id: 'insul-xps', name: 'XPS Foam', category: 'insulation', color: '#e1f5fe', density: 35, thermalConductivity: 0.033, embodiedCarbon: 3.2, cost: 30 },
  // Finish
  { id: 'paint-white', name: 'White Paint', category: 'finish', color: '#f5f5f5', density: 1400, thermalConductivity: 0.5, embodiedCarbon: 0.07, cost: 8 },
  { id: 'ceramic-tile', name: 'Ceramic Tile', category: 'finish', color: '#e0e0e0', density: 2100, thermalConductivity: 1.3, embodiedCarbon: 0.78, cost: 55 },
];

export const MATERIAL_CATEGORIES = ['all', 'concrete', 'masonry', 'steel', 'wood', 'glass', 'insulation', 'finish'] as const;

export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];
