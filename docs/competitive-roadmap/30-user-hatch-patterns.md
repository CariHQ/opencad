# T-MOD-030 — User-authorable hatch patterns

**Priority:** P3 · **Phase:** phase-3 · **Area:** area:bim · **Complexity:** Medium

## Why

Drawings communicate material with hatches. Concrete is a dotted pattern; insulation is a zig-zag; earth is an X pattern. Ten built-in hatches cover the common 80 % but firms need their own (flooring planks, custom stone coursing, wallpaper motifs). Without user-authorable hatches, firms can't match their drawing standards.

## Scope

### In scope
- Hatch schema: `{ id, name, lines: HatchLine[], scale, rotation }` where each line has angle, offset, dash pattern.
- Built-in starter set of 10–15 standard patterns (concrete, insulation rigid + batt, sand, gravel, brick, earth, plaster, steel, timber, glass).
- Hatches referenced from materials: `Material.hatchId`.
- 2D renderer: fills hatched polygons with repeated pattern lines at the given scale / rotation.
- User-authored hatches via a panel: define lines numerically or via a small canvas-based editor.
- Hatches export correctly to SVG.

### Out of scope
- Bitmap / image hatches (lines only in v1).
- Solid-fill ramps or gradients.

## Proposed approach

1. Schema: `doc.hatches: Hatch[]` + starter set.
2. `lib/hatchRenderer.ts`: given polygon + hatch, clip-tile the pattern lines.
3. 2D renderer calls `hatchRenderer` for any element whose material references a hatch.
4. Editor UI: list existing hatches, add/edit/delete lines table.

## Acceptance criteria

- [ ] A slab whose material is "Concrete" fills with a dotted concrete hatch in plan view.
- [ ] Scale / rotation of the hatch updates the visible pattern frequency.
- [ ] User creates a new hatch named "Custom Brick" with two crossing line sets — new hatch is assignable.
- [ ] Hatch exports correctly as SVG `<pattern>` definitions.

## Test plan

New `packages/app/src/lib/hatchRenderer.test.ts`:

- `T-MOD-030-001` — a 1000 × 1000 rectangle hatched with 45° lines at 100 mm spacing produces ~14 line segments (roughly √2 × 10).
- `T-MOD-030-002` — rotation of 90° produces orthogonal lines.
- `T-MOD-030-003` — clip-tile respects the polygon boundary: no lines cross outside.

UI:

- `T-MOD-030-004` — hatch editor adds/removes lines in the schema.

Harness:

- `T-MOD-030-005` — `hatch-demo` shows three material-hatched slabs side by side with distinguishable patterns.

## Dependencies

- None.

## Blocks

- Nothing critical.

## Suggested labels

`enhancement`, `phase-3`, `area:bim`, `area:ui`, `p3`
