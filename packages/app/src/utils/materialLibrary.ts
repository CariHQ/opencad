/**
 * T-MAT-001: Material library — built-in materials, lookup, and custom material creation
 */

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  color: string;
  opacity: number;
  texture?: string;
  properties: MaterialProperties;
}

export type MaterialCategory =
  | 'concrete'
  | 'masonry'
  | 'metal'
  | 'wood'
  | 'glass'
  | 'insulation'
  | 'finish'
  | 'membrane';

export interface MaterialProperties {
  density?: number;        // kg/m³
  thermalConductivity?: number; // W/m·K
  fireRating?: string;
  acousticRating?: number; // dB
}

export const BUILT_IN_MATERIALS: Material[] = [
  {
    id: 'concrete-normal',
    name: 'Normal Concrete',
    category: 'concrete',
    color: '#c8c8c8',
    opacity: 1,
    properties: { density: 2400, thermalConductivity: 1.7, fireRating: 'A1' },
  },
  {
    id: 'concrete-lightweight',
    name: 'Lightweight Concrete',
    category: 'concrete',
    color: '#d8d8d8',
    opacity: 1,
    properties: { density: 1200, thermalConductivity: 0.6, fireRating: 'A1' },
  },
  {
    id: 'brick-common',
    name: 'Common Brick',
    category: 'masonry',
    color: '#c1440e',
    opacity: 1,
    properties: { density: 1900, thermalConductivity: 0.7, fireRating: 'A1' },
  },
  {
    id: 'brick-face',
    name: 'Face Brick',
    category: 'masonry',
    color: '#b5390a',
    opacity: 1,
    properties: { density: 2000, thermalConductivity: 0.8, fireRating: 'A1' },
  },
  {
    id: 'steel-structural',
    name: 'Structural Steel',
    category: 'metal',
    color: '#8a9ba8',
    opacity: 1,
    properties: { density: 7850, thermalConductivity: 50, fireRating: 'A1' },
  },
  {
    id: 'aluminum-sheet',
    name: 'Aluminium Sheet',
    category: 'metal',
    color: '#b0c0c8',
    opacity: 1,
    properties: { density: 2700, thermalConductivity: 205, fireRating: 'A1' },
  },
  {
    id: 'timber-softwood',
    name: 'Softwood Timber',
    category: 'wood',
    color: '#d2a679',
    opacity: 1,
    properties: { density: 500, thermalConductivity: 0.13, fireRating: 'D' },
  },
  {
    id: 'timber-hardwood',
    name: 'Hardwood Timber',
    category: 'wood',
    color: '#8b5e3c',
    opacity: 1,
    properties: { density: 750, thermalConductivity: 0.17, fireRating: 'D' },
  },
  {
    id: 'glass-clear',
    name: 'Clear Glass',
    category: 'glass',
    color: '#a8d8ea',
    opacity: 0.3,
    properties: { density: 2500, thermalConductivity: 1.0 },
  },
  {
    id: 'glass-double-glazed',
    name: 'Double Glazed',
    category: 'glass',
    color: '#a8d8ea',
    opacity: 0.25,
    properties: { density: 2500, thermalConductivity: 0.3 },
  },
  {
    id: 'insulation-mineral-wool',
    name: 'Mineral Wool',
    category: 'insulation',
    color: '#f5e6c8',
    opacity: 1,
    properties: { density: 40, thermalConductivity: 0.035, fireRating: 'A1', acousticRating: 45 },
  },
  {
    id: 'plaster-gypsum',
    name: 'Gypsum Plaster',
    category: 'finish',
    color: '#f0ede8',
    opacity: 1,
    properties: { density: 1200, thermalConductivity: 0.4, fireRating: 'A2' },
  },
];

export function getMaterialById(id: string): Material | undefined {
  return BUILT_IN_MATERIALS.find((m) => m.id === id);
}

export function getMaterialsByCategory(category: MaterialCategory): Material[] {
  return BUILT_IN_MATERIALS.filter((m) => m.category === category);
}

export interface CustomMaterialOptions {
  name: string;
  category: MaterialCategory;
  color: string;
  opacity?: number;
  properties?: MaterialProperties;
}

export function createCustomMaterial(options: CustomMaterialOptions): Material {
  const id = `custom-${options.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  return {
    id,
    name: options.name,
    category: options.category,
    color: options.color,
    opacity: options.opacity ?? 1,
    properties: options.properties ?? {},
  };
}
