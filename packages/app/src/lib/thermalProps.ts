/**
 * Thermal / acoustic / fire property tables + U-value math —
 * T-MOD-029 (#322) + T-ANA-042 (#335).
 *
 * Extends material data with published values (ISO 10456 for thermal,
 * mass-law approximation for STC). Derives composite U-value by the
 * sum-of-resistances rule and runs a simplified degree-day energy
 * demand calculation.
 */

import type { Composite } from '@opencad/document';

export interface ThermalProperties {
  name: string;
  density: number;              // kg/m³
  thermalConductivity: number;  // λ (W/m·K)
  specificHeat: number;         // c (J/kg·K)
  embodiedCarbon: number;       // kgCO₂e/kg
  /** Sound Transmission Class contribution at this density. */
  stc?: number;
  /** Fire resistance rating in hours. */
  fireRating?: number;
}

/** Published ISO-10456 + ASHRAE-handbook values (approximate). */
export const THERMAL_TABLE: Record<string, ThermalProperties> = {
  Concrete: {
    name: 'Concrete',
    density: 2400, thermalConductivity: 1.7, specificHeat: 880,
    embodiedCarbon: 0.13, stc: 55, fireRating: 4,
  },
  Brick: {
    name: 'Brick',
    density: 1800, thermalConductivity: 0.77, specificHeat: 850,
    embodiedCarbon: 0.24, stc: 50, fireRating: 4,
  },
  'Mineral Wool': {
    name: 'Mineral Wool',
    density: 80, thermalConductivity: 0.038, specificHeat: 1030,
    embodiedCarbon: 1.28, stc: 40, fireRating: 2,
  },
  Plasterboard: {
    name: 'Plasterboard',
    density: 900, thermalConductivity: 0.21, specificHeat: 1090,
    embodiedCarbon: 0.39, stc: 35, fireRating: 1,
  },
  Timber: {
    name: 'Timber',
    density: 500, thermalConductivity: 0.13, specificHeat: 1600,
    embodiedCarbon: 0.41, stc: 30, fireRating: 0.5,
  },
  'Air Cavity': {
    name: 'Air Cavity',
    density: 1.2, thermalConductivity: 0.17, specificHeat: 1005,
    embodiedCarbon: 0, stc: 5, fireRating: 0,
  },
  'Clear Glass': {
    name: 'Clear Glass',
    density: 2500, thermalConductivity: 1.0, specificHeat: 840,
    embodiedCarbon: 0.91, stc: 28, fireRating: 0.5,
  },
  'Clay Roof Tiles': {
    name: 'Clay Roof Tiles',
    density: 2000, thermalConductivity: 0.96, specificHeat: 900,
    embodiedCarbon: 0.22, stc: 45, fireRating: 3,
  },
};

/** Surface heat-transfer coefficients (W/m²·K) per ISO 6946. */
const H_IN = 7.69;   // interior
const H_OUT = 25;    // exterior

/**
 * Compute the U-value of a composite (W/m²·K) using sum of thermal
 * resistances: U = 1 / (1/h_in + Σ(d_i/λ_i) + 1/h_out). Thicknesses in
 * mm are converted to m.
 */
export function uValue(composite: Pick<Composite, 'layers'>): number {
  let rTotal = 1 / H_IN + 1 / H_OUT;
  for (const layer of composite.layers) {
    const mat = THERMAL_TABLE[layer.material];
    if (!mat) continue;
    const d = layer.thickness / 1000; // mm → m
    rTotal += d / mat.thermalConductivity;
  }
  return 1 / rTotal;
}

/** STC rating of a composite — use the maximum layer STC weighted by
 *  mass fraction. Simplified model. */
export function stcRating(composite: Pick<Composite, 'layers'>): number {
  let totalMass = 0, weightedStc = 0;
  for (const layer of composite.layers) {
    const mat = THERMAL_TABLE[layer.material];
    if (!mat) continue;
    const mass = mat.density * (layer.thickness / 1000);
    totalMass += mass;
    weightedStc += (mat.stc ?? 0) * mass;
  }
  return totalMass > 0 ? Math.round(weightedStc / totalMass) : 0;
}

/** Fire rating of a composite = minimum of layer ratings. */
export function fireRating(composite: Pick<Composite, 'layers'>): number {
  let min = Infinity;
  for (const layer of composite.layers) {
    const mat = THERMAL_TABLE[layer.material];
    if (!mat) continue;
    min = Math.min(min, mat.fireRating ?? 0);
  }
  return isFinite(min) ? min : 0;
}

// ─── Simplified degree-day energy analysis (T-ANA-042) ─────────────────

export interface EnergyInputs {
  /** Heating degree days for the climate (base 18 °C, K·day/year). */
  heatingDegreeDays: number;
  /** Cooling degree days. */
  coolingDegreeDays: number;
  /** Envelope spec — an array of { area_m2, uValue } tuples. */
  envelope: Array<{ areaM2: number; uValue: number }>;
  /** Conditioned floor area (m²). */
  floorArea: number;
  /** Air-changes per hour (ventilation rate). */
  airChangesPerHour: number;
  /** Internal volume (m³). */
  volume: number;
  /** Solar heat gain (W/m² × window area × solar factor) annualised. */
  annualSolarGainKWh?: number;
  /** Internal gains (people + equipment), kWh/year. */
  internalGainsKWh?: number;
}

export interface EnergyResult {
  heatingDemandKWhPerM2Year: number;
  coolingDemandKWhPerM2Year: number;
  annualCO2Kg: number;
  peakHeatingLoadKW: number;
  passesPassiveHouse: boolean;
}

/**
 * Degree-day calc loosely tracking EN 13790 simplified method.
 */
export function computeEnergyDemand(inputs: EnergyInputs): EnergyResult {
  // Envelope conduction loss per degree-day:
  //   Σ(U·A) * 24h * (1 kWh / 1000 Wh) = kWh per degree-day
  const uaW = inputs.envelope.reduce((acc, e) => acc + e.uValue * e.areaM2, 0);
  const conductionKWhPerDD = uaW * 24 / 1000;

  // Infiltration: c_p * ρ * V * ACH per degree-day
  const rho = 1.2, cp = 1005; // J/m³·K
  const infiltrationW_K = (inputs.volume * inputs.airChangesPerHour / 3600) * rho * cp;
  const infiltrationKWhPerDD = infiltrationW_K * 24 / 1000;

  const totalPerDD = conductionKWhPerDD + infiltrationKWhPerDD;

  const grossHeating = totalPerDD * inputs.heatingDegreeDays;
  const solar   = inputs.annualSolarGainKWh   ?? 0;
  const internal = inputs.internalGainsKWh    ?? 0;
  const heating = Math.max(0, grossHeating - solar - internal * 0.7);
  const cooling = totalPerDD * inputs.coolingDegreeDays + solar * 0.8;

  // Peak heating at -10 °C outdoors / 20 °C indoors = 30 K ΔT
  const peakKW = (uaW + infiltrationW_K) * 30 / 1000;

  // Grid-average emission factor 0.23 kgCO2/kWh (a rough Western average)
  const annualCO2 = (heating + cooling) * 0.23;

  const demandPerM2 = inputs.floorArea > 0 ? heating / inputs.floorArea : 0;
  return {
    heatingDemandKWhPerM2Year: demandPerM2,
    coolingDemandKWhPerM2Year: inputs.floorArea > 0 ? cooling / inputs.floorArea : 0,
    annualCO2Kg: annualCO2,
    peakHeatingLoadKW: peakKW,
    passesPassiveHouse: demandPerM2 <= 15,
  };
}
