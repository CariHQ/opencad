/**
 * Surfaces separated from Building Materials — T-MOD-028 (#321).
 *
 * Building Material: what the thing is made of. Drives cost, carbon,
 * thickness, thermal.
 * Surface: how it looks when rendered. Drives PBR properties.
 *
 * v1 adds the Surface catalogue + a resolver that picks the right
 * surface for an element face (exterior / interior / both), falling
 * back to the building material's default appearance when nothing is
 * assigned.
 */

export interface Surface {
  id: string;
  name: string;
  category: 'paint' | 'plaster' | 'wood' | 'stone' | 'metal' | 'glazing' | 'tile';
  color: string;          // hex
  roughness: number;      // 0..1
  metalness: number;      // 0..1
  textureUrl?: string;
  normalMapUrl?: string;
}

export const BUILT_IN_SURFACES: Surface[] = [
  // Paints
  { id: 'paint-white',  name: 'White Paint',       category: 'paint', color: '#f0f0f0', roughness: 0.9, metalness: 0 },
  { id: 'paint-grey',   name: 'Grey Paint',        category: 'paint', color: '#808080', roughness: 0.9, metalness: 0 },
  { id: 'paint-cream',  name: 'Cream Paint',       category: 'paint', color: '#e8dfc8', roughness: 0.9, metalness: 0 },
  // Plasters
  { id: 'plaster-lime', name: 'Lime Plaster',      category: 'plaster', color: '#d8ceb8', roughness: 0.95, metalness: 0 },
  // Woods
  { id: 'wood-oak',     name: 'Oak',               category: 'wood', color: '#a07858', roughness: 0.65, metalness: 0 },
  { id: 'wood-walnut',  name: 'Walnut',            category: 'wood', color: '#5c3a28', roughness: 0.6,  metalness: 0 },
  { id: 'wood-birch',   name: 'Birch',             category: 'wood', color: '#d8c08c', roughness: 0.7,  metalness: 0 },
  // Stones
  { id: 'stone-limestone',  name: 'Limestone',     category: 'stone', color: '#c8bea0', roughness: 0.85, metalness: 0 },
  { id: 'stone-granite',    name: 'Granite',       category: 'stone', color: '#606870', roughness: 0.6,  metalness: 0 },
  { id: 'stone-slate',      name: 'Slate',         category: 'stone', color: '#3a3f44', roughness: 0.7,  metalness: 0.1 },
  // Metals
  { id: 'metal-steel-brushed',      name: 'Brushed Steel',    category: 'metal', color: '#b0b4b8', roughness: 0.35, metalness: 0.9 },
  { id: 'metal-copper',             name: 'Copper',           category: 'metal', color: '#b87333', roughness: 0.3,  metalness: 0.95 },
  { id: 'metal-aluminium',          name: 'Aluminium',        category: 'metal', color: '#c8c8c8', roughness: 0.35, metalness: 0.9 },
  // Glazings
  { id: 'glazing-clear',  name: 'Clear Glazing',  category: 'glazing', color: '#d0e8f0', roughness: 0.05, metalness: 0 },
  { id: 'glazing-frosted', name: 'Frosted Glazing', category: 'glazing', color: '#e0f0f8', roughness: 0.8,  metalness: 0 },
  { id: 'glazing-tinted',  name: 'Tinted Glazing', category: 'glazing', color: '#88a8b0', roughness: 0.05, metalness: 0 },
  // Tiles
  { id: 'tile-terracotta', name: 'Terracotta Tile', category: 'tile', color: '#c06040', roughness: 0.85, metalness: 0 },
  { id: 'tile-ceramic-white', name: 'White Ceramic', category: 'tile', color: '#eeeeee', roughness: 0.25, metalness: 0 },
];

export interface SurfaceAssignment {
  exterior?: string;   // Surface id
  interior?: string;
  both?: string;
}

/** Per-face default fallback — a small map from building material
 *  name → best matching surface for a default render. */
const MATERIAL_DEFAULT_SURFACE: Record<string, string> = {
  Concrete:              'stone-limestone',
  Plasterboard:          'paint-white',
  Wood:                  'wood-oak',
  Oak:                   'wood-oak',
  Walnut:                'wood-walnut',
  Brick:                 'tile-terracotta',
  'Clear Glass':         'glazing-clear',
  'Clay Roof Tiles':     'tile-terracotta',
  Aluminium:             'metal-aluminium',
  Steel:                 'metal-steel-brushed',
  'Mild Steel':          'metal-steel-brushed',
  'Stainless Steel':     'metal-steel-brushed',
  Copper:                'metal-copper',
  'Mineral Wool':        'plaster-lime',
  'Pool Water':          'glazing-tinted',
};

/**
 * Resolve the surface for a given face of an element. Precedence:
 *   1. Explicit surfaces.<face> assignment
 *   2. surfaces.both (applies to all faces)
 *   3. Default lookup from building material name
 *   4. null → caller uses the element's fallback material
 */
export function resolveSurface(
  face: 'exterior' | 'interior',
  surfaces: SurfaceAssignment | undefined,
  buildingMaterialName: string | undefined,
): Surface | null {
  if (surfaces) {
    const id = surfaces[face] ?? surfaces.both;
    if (id) {
      const found = BUILT_IN_SURFACES.find((s) => s.id === id);
      if (found) return found;
    }
  }
  if (buildingMaterialName) {
    const defaultId = MATERIAL_DEFAULT_SURFACE[buildingMaterialName];
    if (defaultId) return BUILT_IN_SURFACES.find((s) => s.id === defaultId) ?? null;
  }
  return null;
}
