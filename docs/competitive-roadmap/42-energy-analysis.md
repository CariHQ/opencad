# T-ANA-042 — Energy analysis (building envelope + HVAC)

**Priority:** P2 · **Phase:** phase-3 · **Area:** area:gis · **Complexity:** Large

## Why

Energy performance is a legal requirement in much of the world (Part L UK, Passive House, LEED / BREEAM credits). Currently we compute nothing — users export to external tools. An integrated quick-check energy panel that produces a reasonable heating / cooling demand estimate from the envelope is a massive workflow accelerator and differentiator.

## Scope

### In scope
- A new **Energy** right-panel tab.
- Inputs:
  - Climate zone / location (auto from project geolocation).
  - Composite U-values (T-MOD-029 dependency).
  - Window U-value + SHGC.
  - Ventilation rate (ACH).
  - Internal gains (occupants, equipment).
  - Setpoints (heating / cooling).
- Outputs:
  - Heating demand (kWh/m²·year).
  - Cooling demand (kWh/m²·year).
  - Annual CO₂ emissions.
  - Peak heating load (kW).
  - Passive House test: Is `Heating demand ≤ 15`? "Yes/No".
- Monthly breakdown bar chart.
- One simple climate model (degree-day method) for v1 — not full TMY hour-by-hour.

### Out of scope
- Hour-by-hour TMY simulation (defer to plugin integration with EnergyPlus).
- HVAC equipment sizing.
- Photovoltaic / solar thermal.

## Proposed approach

1. `lib/energy/degreeDayModel.ts`: implements the simplified European EN 13790 method.
2. Climate data: bundle 50 world cities with heating/cooling degree days + monthly solar radiation.
3. `EnergyPanel.tsx` assembles inputs, calls model, renders results.
4. Compliance rule R011: Passive House threshold failure → warning.

## Acceptance criteria

- [ ] Panel shows all outputs for any project with an exterior envelope.
- [ ] A reference 150 m² house with good insulation in a temperate climate reports heating ≤ 50 kWh/m²·year (sanity check).
- [ ] Increasing insulation thickness reduces heating demand.
- [ ] Adding windows increases cooling demand on a sunny climate.
- [ ] Monthly chart sums correctly to annual total.
- [ ] R011 warns when Passive House threshold exceeded.

## Test plan

New `packages/app/src/lib/energy/degreeDayModel.test.ts`:

- `T-ANA-042-001` — known-good test case (EN 13790 reference building) returns within 5 % of published values.
- `T-ANA-042-002` — removing all insulation increases heating demand by the expected ratio.
- `T-ANA-042-003` — zero windows + zero ventilation reduces heating to conduction-only component.
- `T-ANA-042-004` — monthly sum equals annual total exactly.

UI:

- `T-ANA-042-005` — panel renders with all inputs pre-filled from the doc.
- `T-ANA-042-006` — edits trigger re-computation within 50 ms.

## Dependencies

- T-MOD-029 (thermal properties).
- T-MOD-004 (composites).

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-3`, `area:gis`, `area:bim`, `p2`
