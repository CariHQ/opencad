import type { ElementSchema, DocumentSchema } from '@opencad/document';

export interface MaterialCarbonData {
  materialId: string;
  name: string;
  // Embodied carbon in kgCO2e per kg of material
  gwp: number; // Global Warming Potential
  density: number; // kg/m³ (to convert volume → mass)
  source: string; // 'ICE v3.0' | 'EPD' | 'estimate'
}

// Based on Inventory of Carbon and Energy (ICE) v3.0
export const CARBON_DATABASE: MaterialCarbonData[] = [
  { materialId: 'Concrete', name: 'Concrete (general mix)', gwp: 0.159, density: 2400, source: 'ICE v3.0' },
  { materialId: 'Steel', name: 'Structural steel', gwp: 1.74, density: 7850, source: 'ICE v3.0' },
  { materialId: 'Wood', name: 'Softwood timber (sawn)', gwp: 0.263, density: 460, source: 'ICE v3.0' },
  { materialId: 'Brick', name: 'Fired clay brick', gwp: 0.213, density: 1900, source: 'ICE v3.0' },
  { materialId: 'Glass', name: 'Float glass', gwp: 1.35, density: 2500, source: 'ICE v3.0' },
  { materialId: 'Aluminum', name: 'Aluminum (general)', gwp: 9.16, density: 2700, source: 'ICE v3.0' },
  { materialId: 'Insulation', name: 'Mineral wool', gwp: 1.28, density: 25, source: 'ICE v3.0' },
];

export interface CarbonResult {
  elementId: string;
  elementType: string;
  materialId: string;
  volume: number; // m³
  mass: number; // kg
  embodiedCarbon: number; // kgCO2e
  gwp: number; // kgCO2e/kg used
}

export interface ProjectCarbonSummary {
  totalEmbodiedCarbon: number; // kgCO2e
  byMaterial: Record<string, number>;
  byElementType: Record<string, number>;
  elements: CarbonResult[];
  benchmark?: { name: string; kgCO2ePerM2: number };
}

// RIBA 2030 Climate Challenge benchmarks
export const CARBON_BENCHMARKS = {
  passiveHouse: { name: 'Passive House', kgCO2ePerM2: 350 },
  netZero: { name: 'Net Zero Carbon', kgCO2ePerM2: 500 },
  currentPractice: { name: 'Current UK practice', kgCO2ePerM2: 800 },
};

/**
 * Resolve the material ID from an element's properties.
 * Looks for a 'material' property (string PropertyValue) on the element.
 */
function resolveMaterialId(element: ElementSchema): string | null {
  const matProp = element.properties['material'];
  if (matProp && matProp.type === 'string' && typeof matProp.value === 'string') {
    return matProp.value;
  }
  return null;
}

/**
 * Resolve the volume (m³) from an element's bounding box.
 * Returns null when no meaningful geometry is present.
 */
function resolveVolume(element: ElementSchema): number | null {
  const bb = element.boundingBox;
  if (!bb) return null;

  const dx = bb.max.x - bb.min.x;
  const dy = bb.max.y - bb.min.y;
  const dz = bb.max.z - bb.min.z;

  // Guard against degenerate/zero bounding boxes
  if (dx <= 0 || dy <= 0 || dz <= 0) return null;

  return dx * dy * dz;
}

/**
 * Look up the carbon data for a given material ID (case-insensitive prefix match).
 */
function lookupCarbonData(materialId: string): MaterialCarbonData | null {
  const id = materialId.toLowerCase();
  return (
    CARBON_DATABASE.find((d) => id.startsWith(d.materialId.toLowerCase())) ?? null
  );
}

/**
 * Calculate embodied carbon for a single element.
 * Returns null when the element lacks geometry or a recognised material.
 */
export function calculateElementCarbon(element: ElementSchema): CarbonResult | null {
  const materialId = resolveMaterialId(element);
  if (!materialId) return null;

  const carbonData = lookupCarbonData(materialId);
  if (!carbonData) return null;

  const volume = resolveVolume(element);
  if (volume === null) return null;

  const mass = volume * carbonData.density;
  const embodiedCarbon = mass * carbonData.gwp;

  return {
    elementId: element.id,
    elementType: element.type,
    materialId: carbonData.materialId,
    volume,
    mass,
    embodiedCarbon,
    gwp: carbonData.gwp,
  };
}

/**
 * Calculate the full project carbon summary from a DocumentSchema.
 */
export function calculateProjectCarbon(doc: DocumentSchema): ProjectCarbonSummary {
  const elements = Object.values(doc.content.elements);
  const results: CarbonResult[] = [];

  for (const element of elements) {
    const result = calculateElementCarbon(element);
    if (result !== null) {
      results.push(result);
    }
  }

  const totalEmbodiedCarbon = results.reduce((sum, r) => sum + r.embodiedCarbon, 0);

  const byMaterial: Record<string, number> = {};
  const byElementType: Record<string, number> = {};

  for (const r of results) {
    byMaterial[r.materialId] = (byMaterial[r.materialId] ?? 0) + r.embodiedCarbon;
    byElementType[r.elementType] = (byElementType[r.elementType] ?? 0) + r.embodiedCarbon;
  }

  return {
    totalEmbodiedCarbon,
    byMaterial,
    byElementType,
    elements: results,
  };
}
