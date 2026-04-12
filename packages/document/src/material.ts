/**
 * Default Materials
 * Standard material library for BIM projects
 */

import { MaterialSchema } from './types';

const DEFAULT_MATERIALS: MaterialSchema[] = [
  {
    id: 'mat-concrete',
    name: 'Concrete',
    category: 'concrete',
    properties: {
      color: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
      roughness: 0.9,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-concrete-reinforced',
    name: 'Reinforced Concrete',
    category: 'concrete',
    properties: {
      color: { r: 0.65, g: 0.65, b: 0.65, a: 1 },
      roughness: 0.85,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-masonry-brick',
    name: 'Brick',
    category: 'masonry',
    properties: {
      color: { r: 0.6, g: 0.25, b: 0.2, a: 1 },
      roughness: 0.8,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-masonry-concrete-block',
    name: 'Concrete Block',
    category: 'masonry',
    properties: {
      color: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      roughness: 0.9,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-wood',
    name: 'Wood',
    category: 'wood',
    properties: {
      color: { r: 0.55, g: 0.35, b: 0.15, a: 1 },
      roughness: 0.7,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-wood-dark',
    name: 'Dark Wood',
    category: 'wood',
    properties: {
      color: { r: 0.3, g: 0.18, b: 0.08, a: 1 },
      roughness: 0.65,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-steel',
    name: 'Steel',
    category: 'metal',
    properties: {
      color: { r: 0.4, g: 0.4, b: 0.45, a: 1 },
      roughness: 0.3,
      metalness: 0.9,
    },
  },
  {
    id: 'mat-aluminum',
    name: 'Aluminum',
    category: 'metal',
    properties: {
      color: { r: 0.75, g: 0.77, b: 0.8, a: 1 },
      roughness: 0.25,
      metalness: 0.95,
    },
  },
  {
    id: 'mat-glass',
    name: 'Glass',
    category: 'glass',
    properties: {
      color: { r: 0.85, g: 0.9, b: 0.95, a: 0.3 },
      roughness: 0.05,
      metalness: 0.0,
      transparency: 0.7,
    },
  },
  {
    id: 'mat-gypsum',
    name: 'Gypsum Board',
    category: 'other',
    properties: {
      color: { r: 0.95, g: 0.95, b: 0.9, a: 1 },
      roughness: 0.95,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-insulation',
    name: 'Insulation',
    category: 'other',
    properties: {
      color: { r: 0.9, g: 0.7, b: 0.4, a: 1 },
      roughness: 1.0,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-floor-ceramic',
    name: 'Ceramic Tile',
    category: 'other',
    properties: {
      color: { r: 0.9, g: 0.9, b: 0.85, a: 1 },
      roughness: 0.4,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-floor-wood',
    name: 'Wood Flooring',
    category: 'wood',
    properties: {
      color: { r: 0.5, g: 0.32, b: 0.14, a: 1 },
      roughness: 0.5,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-carpet',
    name: 'Carpet',
    category: 'fabric',
    properties: {
      color: { r: 0.3, g: 0.3, b: 0.35, a: 1 },
      roughness: 1.0,
      metalness: 0.0,
    },
  },
  {
    id: 'mat-roofing',
    name: 'Roofing Membrane',
    category: 'other',
    properties: {
      color: { r: 0.35, g: 0.35, b: 0.4, a: 1 },
      roughness: 0.7,
      metalness: 0.1,
    },
  },
];

export function createDefaultMaterials(): Record<string, MaterialSchema> {
  const materials: Record<string, MaterialSchema> = {};

  for (const material of DEFAULT_MATERIALS) {
    materials[material.id] = material;
  }

  return materials;
}

export function getMaterialById(
  materials: Record<string, MaterialSchema>,
  id: string
): MaterialSchema | undefined {
  return materials[id];
}

export function getMaterialsByCategory(
  materials: Record<string, MaterialSchema>,
  category: string
): MaterialSchema[] {
  return Object.values(materials).filter((m) => m.category === category);
}

export const MATERIAL_CATEGORIES = [
  'concrete',
  'masonry',
  'metal',
  'wood',
  'glass',
  'fabric',
  'other',
] as const;
