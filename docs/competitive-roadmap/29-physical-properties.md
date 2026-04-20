# T-MOD-029 — Thermal / acoustic / structural material property fields + calculations

**Priority:** P2 · **Phase:** phase-3 · **Area:** area:bim · **Complexity:** Medium

## Why

Building materials already have `density` and `embodiedCarbon` on some entries but nothing else. Real BIM materials need thermal conductivity (W/m·K), specific heat (J/kg·K), acoustic transmission (STC or Rw), fire rating (hours), thermal mass — and the composite wall / roof / slab assemblies need summed / averaged values for energy analysis. This is foundational for T-ANA-042 (energy) and T-ANA-044 (clash / code compliance).

## Scope

### In scope
- Expand BuildingMaterial schema: `density (kg/m³)`, `thermalConductivity (W/m·K)`, `specificHeat (J/kg·K)`, `embodiedCarbon (kgCO₂/kg)`, `soundTransmissionClass (STC)`, `fireResistance (hours)`.
- Bulk-populate built-in materials with realistic values from published tables (ASHRAE, ISO 10456 for thermal).
- Composite-level computed values: `uValue (W/m²·K)`, `stcRating`, `thermalMass` — derived from layers.
- UI: Properties panel shows computed composite values (readonly).
- Compliance rule R010: exterior wall U-value must be ≤ climate-zone code limit (varies; default IECC climate 4 = 0.315 W/m²·K).

### Out of scope
- Dynamic thermal analysis over time (that's energy simulation — T-ANA-042).
- Per-material fire test assembly ratings beyond simple hours.

## Proposed approach

1. Extend `BUILT_IN_MATERIALS` entries with the new fields; source values from ISO 10456 / ASHRAE handbook.
2. `lib/thermalProps.ts`: compute `uValue(composite)` using resistance summation, surface heat transfer coefficients per ISO.
3. Properties panel component `CompositePropertiesReadout`.
4. Add R010 to compliance engine.

## Acceptance criteria

- [ ] Every built-in material now has non-null thermal / acoustic / fire values.
- [ ] A composite built from concrete + insulation + plasterboard reports U-value close to published tables (within 10 %).
- [ ] STC rating for an interior wall composite is computed from layer mass law.
- [ ] R010 fires when an exterior wall's U-value exceeds 0.315 (IECC 4).
- [ ] Changing a material's `thermalConductivity` re-computes every dependent composite's U-value.

## Test plan

New `packages/app/src/lib/thermalProps.test.ts`:

- `T-MOD-029-001` — U-value of a single-layer 200 mm concrete wall is `1/((1/h_o) + d/k + (1/h_i))`, computed correctly.
- `T-MOD-029-002` — adding a 100 mm insulation layer drops U-value to the expected new value.
- `T-MOD-029-003` — STC rating from mass law for a 300 mm concrete wall returns the expected ~55.
- `T-MOD-029-004` — fire rating of a composite = minimum of the layer ratings.

Compliance:

- `T-MOD-029-005` — R010 fires on a wall with U=0.5 in zone 4; does not fire at 0.3.

Harness:

- `T-MOD-029-006` — `thermal-demo` shows computed U-values in the iso-3d screenshot's properties panel pinout.

## Dependencies

- T-MOD-004 (composite walls).

## Blocks

- T-ANA-042 (energy).

## Suggested labels

`enhancement`, `phase-3`, `area:bim`, `p2`
