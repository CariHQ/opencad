# T-ANA-043 — Structural model export

**Priority:** P3 · **Phase:** phase-3 · **Area:** area:compat · **Complexity:** Medium

## Why

Structural engineers run finite-element analysis in specialist software (SAP2000, Robot, ETABS, RAM). They need the architectural model translated into a simplified analytical model: columns as lines, beams as lines, slabs as surfaces, walls as shear-wall surfaces. Exporting this correctly saves the engineer a day of re-entry per project.

## Scope

### In scope
- **Analytical model generation**: walk the architectural elements, emit a simplified graph:
  - Columns → line elements at their axis.
  - Beams → line elements at their axis.
  - Slabs → area elements.
  - Walls tagged `Structural` → area elements with their centerline.
  - Joints at connection points.
  - Load patterns (dead, live, wind, seismic) — user-editable list, values default from code zones.
- **Export formats**: CIS/2 (ASCII), SAF (Structural Analysis Format, Excel-like), IFC-structural view, JSON-native.
- Validation report: lists unsupported elements, dangling members.
- Preview in 3D viewport: toggle "Structural model" overlay.

### Out of scope
- Live bi-directional sync with structural software.
- Actual FE analysis in-app.

## Proposed approach

1. `lib/structural/analyticalModel.ts`: pure function `(doc) → AnalyticalModel`.
2. Each structural-type element defines its own `toAnalytical()`.
3. Exporters: `toCIS2`, `toSAF`, `toIFCStructural`.
4. UI: Analysis panel new tab "Structural Export".

## Acceptance criteria

- [ ] A 4-column + 4-beam + slab project produces 4 column lines + 4 beam lines + 1 slab area + 4 joints.
- [ ] Exporting to SAF produces a valid .xlsx.
- [ ] Exporting to IFC-structural produces a validatable IFC.
- [ ] Validation report flags unsupported elements (e.g., Morph).
- [ ] Preview toggles an analytical overlay in 3D.

## Test plan

New `packages/app/src/lib/structural/analyticalModel.test.ts`:

- `T-ANA-043-001` — column at `(x, y)` with height 3000 produces a line from `(x, y, 0)` to `(x, y, 3000)`.
- `T-ANA-043-002` — beam connects two columns → beam has both column joints as endpoints.
- `T-ANA-043-003` — slab polygon becomes an area element with the same vertices.
- `T-ANA-043-004` — wall without `Structural` tag is excluded from analytical model.

Exporters:

- `T-ANA-043-005` — SAF export roundtrips through the spec's sheet validator.
- `T-ANA-043-006` — IFC-structural export passes the buildingSMART IFC validator CLI.

## Dependencies

- None hard.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-3`, `area:bim`, `area:compat`, `p3`
