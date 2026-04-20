# T-VIZ-014 — Layer Combinations + Graphic Overrides

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:ui · **Complexity:** Medium

## Why

Real construction document workflows require swapping between "structural only", "MEP only", "finished presentation", "fire-egress" representations of the same model. Each requires a different set of layers visible and a different graphic treatment (e.g., grey out walls, highlight egress paths in red). Today we have layers but no way to save a visibility state or to apply conditional styling. Users rebuild it every time.

## Scope

### In scope
- **Layer Combinations**: named presets storing `{ layerId: { visible, locked } }`. A switcher shows the current combination; switching swaps the whole layer state.
- **Graphic Overrides**: named rule sets, each rule `{ condition: ElementFilter, style: { strokeColor, fillColor, strokeWidth, opacity, hatchPattern } }`. Conditions can filter by type, wallType, level, custom property.
- When a Graphic Override is active, element rendering uses the override style instead of the default material.
- Combinations and overrides can be combined: a view saves both.
- Combinations + overrides are first-class document elements, sync over CRDT, survive reloads.

### Out of scope (this issue)
- Per-view overrides (each view remembers its own set) — v1 is document-level.
- Animation / transition between combinations.

## Proposed approach

1. Schema: `doc.layerCombinations: LayerCombination[]`, `doc.graphicOverrides: GraphicOverride[]`.
2. New panel tab **Display**: two sections, one for combinations, one for overrides.
3. Rendering pipeline in both 2D and 3D consults the active overrides before applying default styles.
4. `ElementFilter` reuses a subset of the existing selection-filter syntax.

## Acceptance criteria

- [ ] A new project seeds three combinations: "All On", "Structural Only", "Architectural Only".
- [ ] Switching to "Structural Only" hides doors/windows/slabs and shows walls + columns + beams.
- [ ] Creating a graphic override with `type=egress_path → strokeColor=red` renders egress paths in red.
- [ ] Combinations and overrides survive reload.
- [ ] Applying a combination does not mutate the underlying layer records.
- [ ] Graphic overrides stack (multiple applied at once) with defined precedence.

## Test plan

New file `packages/app/src/lib/viz/layerCombinations.test.ts`:

- `T-VIZ-014-001` — applying a combination returns the expected `visibleLayerIds` set.
- `T-VIZ-014-002` — creating a new combination with the current state captures every layer's visible/locked flags.

New file `packages/app/src/lib/viz/graphicOverrides.test.ts`:

- `T-VIZ-014-003` — `resolveStyle(el, overrides)` returns the expected override style when a condition matches.
- `T-VIZ-014-004` — multiple applicable overrides merge in declared order.
- `T-VIZ-014-005` — an override with no matching elements returns the default style.

UI:

- `T-VIZ-014-006` — `DisplayPanel` lists all combinations and overrides.
- `T-VIZ-014-007` — switching combination updates the layer panel's visibility checkboxes.

## Dependencies

- None hard.

## Blocks

- Nothing critical.

## Suggested labels

`enhancement`, `phase-2`, `area:ui`, `p2`
