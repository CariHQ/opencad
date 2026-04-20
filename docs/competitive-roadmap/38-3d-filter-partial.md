# T-VIZ-038 — 3D filter / partial structure display

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:ui · **Complexity:** Small

## Why

When debugging a stair clash, you need to hide everything except stairs, slabs, and walls on one level. When presenting a roof, you want to hide the walls. When checking MEP routing, you want only MEP + structure. A "3D filter" is a temporary display filter layered on top of layer combinations: by element type, by material, by property, by selection.

## Scope

### In scope
- 3D filter UI overlay: checkboxes per element type, per material, per property.
- Saved filter presets ("Structural", "MEP", "Envelope").
- Solo / hide toolbar: select N elements → `Solo` shows only them; `Hide` hides them.
- Reset button restores full visibility.
- Does not persist (filter is view-state, not document state), but saved presets live on the user account.

### Out of scope
- Query-language filters ("all walls with Height > 3000").
- Boolean-composited filter predicates.

## Proposed approach

1. `useDisplayFilter` hook with `{ types, materials, props, soloIds, hideIds }`.
2. 3D viewport consults the filter on each mesh before adding to the scene.
3. Toolbar dropdown + saved preset picker.

## Acceptance criteria

- [ ] Enabling "types: wall" hides every non-wall element.
- [ ] "Material = Concrete" leaves only concrete elements.
- [ ] Selecting 3 walls and clicking Solo shows only those 3.
- [ ] Hide on a selection hides those elements without affecting saved layer combinations.
- [ ] Reset brings back everything.
- [ ] Saved filter preset survives session restart (user-scoped).

## Test plan

New `packages/app/src/hooks/useDisplayFilter.test.ts`:

- `T-VIZ-038-001` — default filter returns all elements.
- `T-VIZ-038-002` — filter `{types: ['wall']}` returns only walls.
- `T-VIZ-038-003` — `hideIds: [a, b]` removes a and b from the set.
- `T-VIZ-038-004` — `soloIds: [c]` returns only c.

UI:

- `T-VIZ-038-005` — toolbar checkbox updates the filter.
- `T-VIZ-038-006` — solo/hide toolbar buttons behave as expected.

Harness:

- `T-VIZ-038-007` — `display-filter-demo` — solo walls; only walls visible in iso.

## Dependencies

- None.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:ui`, `p2`
