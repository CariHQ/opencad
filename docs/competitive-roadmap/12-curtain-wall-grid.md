# T-MOD-012 — Curtain wall grid editor (mullion + panel)

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

We already have a `curtain` wallType that produces a 60 mm-thick Clear Glass wall — effectively a single glass plank. Real curtain walls are a grid of mullions (vertical and horizontal framing members) enclosing glass panels; the grid is parametric. Without the grid, any commercial-building screenshot is instantly unconvincing.

## Scope

### In scope
- Curtain wall gains `gridH: number[]` (horizontal mullion positions, as fractions of wall height) and `gridV: number[]` (vertical mullion positions, as fractions of wall length).
- Mullions: vertical + horizontal members at each grid intersection, `mullionProfile: 50 × 120 mm` default.
- Panels: the cells between mullions, each filled with a glass material (default `Clear Glass`, can be overridden per panel to allow opaque spandrel panels or operable sashes).
- Editor: when a curtain wall is selected, the Properties panel shows a grid editor where the user adds / removes / drags horizontal and vertical mullion lines.
- Plan view shows mullion positions as short perpendicular ticks on the wall.

### Out of scope
- Inclined / cable-hung curtain walls.
- Structural silicone glazing vs. capped glazing detail — single generic mullion profile in v1.
- Operable vents / doors within the curtain wall grid.

## Proposed approach

1. Extend wall schema: if `wallType === 'curtain'`, optionally carry `gridH`, `gridV`, `panels: PanelOverride[]`.
2. `buildWallMesh` branches: curtain wall with grid → generate mullion boxes + panel rectangles.
3. Properties panel gains `CurtainWallGridEditor` sub-component with two number lines (H and V) users can click to add/remove grid points.
4. 2D plan view adds perpendicular tick marks at each vertical grid position.

## Acceptance criteria

- [ ] A 4800 mm-wide curtain wall with default `gridV: [0.25, 0.5, 0.75]` shows three vertical mullions dividing it into four 1200 mm panels.
- [ ] Adding `gridH: [0.5]` adds a horizontal mullion at the wall's vertical mid-height; 3D shows 8 panels.
- [ ] Dragging a vertical mullion updates within 1 frame.
- [ ] Setting a single panel's override to `spandrel` replaces its glass with an opaque material.
- [ ] Plan view shows perpendicular ticks at each `gridV` fraction.
- [ ] A curtain wall with no grid (`gridH: []`, `gridV: []`) renders as a single glass panel (unchanged from today).

## Test plan

New file `packages/app/src/lib/curtainWallGrid.test.ts`:

- `T-MOD-012-001` — `computeGridPanels({ len: 4800, height: 3000, gridV: [0.25, 0.5, 0.75], gridH: [] })` returns 4 panels each 1200 × 3000.
- `T-MOD-012-002` — adding `gridH: [0.5]` returns 8 panels.
- `T-MOD-012-003` — `gridV` values outside `[0, 1]` are ignored.
- `T-MOD-012-004` — duplicated `gridV` values collapse to one.

UI:

- `T-MOD-012-005` — `CurtainWallGridEditor` renders N number inputs for N grid points.
- `T-MOD-012-006` — clicking "Add H" increments `gridH.length` by 1.

Harness:

- `T-MOD-012-007` — new template `curtain-wall-demo` renders a 4-bay × 2-level curtain wall; iso image shows the expected mullion / panel grid.

## Dependencies

- T-MOD-001 (wall junctions) — mullion at the corner between two curtain walls must resolve cleanly.

## Blocks

- Nothing critical; unlocks commercial typologies.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:geometry`, `p2`
