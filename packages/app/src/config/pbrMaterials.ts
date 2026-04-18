/**
 * PBR (Physically Based Rendering) material configuration.
 *
 * Maps each material category to its representative PBR parameters:
 * - roughness  [0–1]: 0 = mirror-smooth, 1 = fully rough
 * - metalness  [0–1]: 0 = dielectric, 1 = fully metallic
 * - color      0xRRGGBB: representative fallback colour when no specific material
 *              is applied to an element
 *
 * These values are consumed by `useThreeViewport` to build MeshStandardMaterial
 * instances for BIM element meshes and by the MaterialLibrary panel to render
 * sphere previews. The keys MUST match the category strings exported from
 * `../lib/materials` (i.e. entries in MATERIAL_CATEGORIES).
 *
 * T-RENDER-001
 */

export interface PBRParams {
  roughness: number;
  metalness: number;
  /** Representative 24-bit RGB colour (0xRRGGBB) for the category. */
  color: number;
}

/**
 * PBR parameters keyed by material category name (matches MATERIAL_CATEGORIES).
 *
 * These are category-level defaults. Individual materials inside each category
 * use their own per-material roughness/metalness values from BUILT_IN_MATERIALS.
 */
export const MATERIAL_PBR_PARAMS: Record<string, PBRParams> = {
  Concrete:      { roughness: 0.9,  metalness: 0.0,  color: 0x9e9e9e },
  Masonry:       { roughness: 0.92, metalness: 0.0,  color: 0xb5673a },
  Metal:         { roughness: 0.3,  metalness: 0.85, color: 0x9e9e9e },
  Timber:        { roughness: 0.8,  metalness: 0.0,  color: 0x8b6914 },
  Glass:         { roughness: 0.05, metalness: 0.0,  color: 0xaaccff },
  Plaster:       { roughness: 0.88, metalness: 0.0,  color: 0xf0ede8 },
  Roofing:       { roughness: 0.9,  metalness: 0.05, color: 0x808080 },
  Flooring:      { roughness: 0.5,  metalness: 0.0,  color: 0xd0c8b8 },
  Insulation:    { roughness: 0.97, metalness: 0.0,  color: 0xf5e6c8 },
  Paint:         { roughness: 0.85, metalness: 0.0,  color: 0xf5f5f5 },
  Cladding:      { roughness: 0.7,  metalness: 0.1,  color: 0xa87840 },
  Waterproofing: { roughness: 0.9,  metalness: 0.0,  color: 0x303030 },
  Acoustic:      { roughness: 0.98, metalness: 0.0,  color: 0xd8c8b0 },
  Tile:          { roughness: 0.35, metalness: 0.0,  color: 0xd0c8b8 },
};

/**
 * Ordered list of all PBR-configured material category IDs.
 * Mirrors Object.keys(MATERIAL_PBR_PARAMS) but as a typed tuple for
 * exhaustive checking in tests and consumers.
 */
export const PBR_MATERIAL_IDS: ReadonlyArray<string> = Object.keys(MATERIAL_PBR_PARAMS);
