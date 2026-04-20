# T-IO-048 — SketchUp (SKP) adapter hardening

**Priority:** P2 · **Phase:** phase-3 · **Area:** area:compat · **Complexity:** Medium

## Why

SketchUp is the most-used tool in early design and the default asset format for 3D warehouse entourage (trees, people, furniture). We already have an `sketchup.ts` adapter stub; hardening it lets users bring SKP context models and component libraries into OpenCAD.

## Scope

### In scope
- Import: faces, edges, groups, components, materials, layers (`Tags` in SketchUp).
- Mapping: face → polygon / morph, group → Group, component → parametric object instance.
- Test corpus of 15 SKP files (various versions + 3D warehouse samples).
- Export: OpenCAD → SKP with best-effort mapping.

### Out of scope
- SketchUp dynamic components (their own parametric system).
- Scene / animation tabs.
- Ruby plugin round-trip.

## Proposed approach

1. Use `sketchup-sdk` WASM build or Speckle bridge.
2. Map materials to OpenCAD Surfaces (T-MOD-028).
3. Map Groups / Components appropriately.

## Acceptance criteria

- [ ] 15 corpus SKP files import.
- [ ] Face geometry preserved within 1 mm.
- [ ] Groups import as OpenCAD Groups.
- [ ] Components import as parametric-object instances when a matching definition exists; otherwise as static morphs.
- [ ] Materials map to Surfaces.
- [ ] Export produces a valid SKP that reopens in SketchUp.

## Test plan

New `packages/app/src/lib/sketchup/import.test.ts`:

- `T-IO-048-001` — each corpus SKP imports.
- `T-IO-048-002` — face count preserved.
- `T-IO-048-003` — component instance count preserved.
- `T-IO-048-004` — materials roundtrip.

Harness:

- `T-IO-048-005` — `skp-smoke` imports one SKP; screenshot shows geometry.

## Dependencies

- T-MOD-028 (surfaces).
- T-PAR-013 (parametric objects).

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-3`, `area:compat`, `p2`
