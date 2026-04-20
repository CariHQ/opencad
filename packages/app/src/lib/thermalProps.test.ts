/**
 * T-MOD-029 / T-ANA-042 thermal + energy tests (GitHub issues #322, #335).
 *
 *   T-MOD-029-001 — uValue of a single-layer concrete wall
 *   T-MOD-029-002 — insulation drops U-value
 *   T-MOD-029-003 — mass-law STC for concrete wall
 *   T-MOD-029-004 — fire rating = min across layers
 *   T-ANA-042-003 — no insulation → higher heating demand
 */
import { describe, it, expect } from 'vitest';
import {
  uValue, stcRating, fireRating, computeEnergyDemand, THERMAL_TABLE,
} from './thermalProps';

describe('T-MOD-029 / T-ANA-042: thermalProps', () => {
  it('T-MOD-029-001: 200 mm concrete wall U-value ≈ 3.4 W/m²·K', () => {
    const u = uValue({ layers: [{ material: 'Concrete', thickness: 200 }] });
    // Hand calc: R = 1/7.69 + 0.2/1.7 + 1/25 = 0.13 + 0.118 + 0.04 = 0.288 → U ≈ 3.47
    expect(u).toBeCloseTo(3.47, 1);
  });

  it('T-MOD-029-002: adding 100 mm mineral wool drops U-value significantly', () => {
    const base = uValue({ layers: [{ material: 'Concrete', thickness: 200 }] });
    const insul = uValue({ layers: [
      { material: 'Concrete', thickness: 200 },
      { material: 'Mineral Wool', thickness: 100 },
    ]});
    expect(insul).toBeLessThan(base);
    expect(insul).toBeLessThan(0.4); // Passive-House-territory
  });

  it('T-MOD-029-003: mass-law STC of 300 mm concrete is ≥ 50', () => {
    expect(stcRating({ layers: [{ material: 'Concrete', thickness: 300 }] })).toBeGreaterThanOrEqual(50);
  });

  it('T-MOD-029-004: fire rating is the minimum across layers', () => {
    const r = fireRating({ layers: [
      { material: 'Concrete', thickness: 200 },    // 4h
      { material: 'Timber', thickness: 50 },       // 0.5h
    ]});
    expect(r).toBe(0.5);
  });

  it('THERMAL_TABLE includes all core materials', () => {
    for (const name of ['Concrete', 'Mineral Wool', 'Plasterboard', 'Brick', 'Timber', 'Clear Glass']) {
      expect(THERMAL_TABLE[name]).toBeDefined();
    }
  });

  it('T-ANA-042-003: removing insulation increases heating demand', () => {
    const uInsulated = uValue({ layers: [
      { material: 'Concrete', thickness: 200 },
      { material: 'Mineral Wool', thickness: 150 },
    ]});
    const uBare = uValue({ layers: [{ material: 'Concrete', thickness: 200 }] });
    const envelope = (u: number) => [{ areaM2: 200, uValue: u }];

    const eInsul = computeEnergyDemand({
      heatingDegreeDays: 2500, coolingDegreeDays: 500,
      envelope: envelope(uInsulated), floorArea: 150, volume: 450, airChangesPerHour: 0.5,
    });
    const eBare = computeEnergyDemand({
      heatingDegreeDays: 2500, coolingDegreeDays: 500,
      envelope: envelope(uBare), floorArea: 150, volume: 450, airChangesPerHour: 0.5,
    });
    expect(eBare.heatingDemandKWhPerM2Year).toBeGreaterThan(eInsul.heatingDemandKWhPerM2Year);
  });

  it('computeEnergyDemand passes Passive House threshold when heating ≤ 15 kWh/m²·yr', () => {
    // Very insulated envelope
    const u = 0.15;
    const r = computeEnergyDemand({
      heatingDegreeDays: 2000, coolingDegreeDays: 300,
      envelope: [{ areaM2: 200, uValue: u }],
      floorArea: 150, volume: 450, airChangesPerHour: 0.3,
      annualSolarGainKWh: 1500, internalGainsKWh: 3000,
    });
    expect(r.passesPassiveHouse).toBe(r.heatingDemandKWhPerM2Year <= 15);
  });
});
