# T-IO-047 — Revit (RVT) adapter hardening

**Priority:** P2 · **Phase:** phase-3 · **Area:** area:compat · **Complexity:** Large

## Why

RVT is a proprietary, closed format. Many consultants deliver RVT files. The current `revit.ts` adapter is a stub. A well-tested RVT importer (via `Speckle` / `Autodesk Forge` / reverse-engineered `ODA Platform`) lets architects open consultant files directly instead of waiting on IFC re-exports.

## Scope

### In scope
- Import path via ODA (Open Design Alliance) or Speckle bridge. Export probably infeasible — target import-only v1.
- Supported entities: walls, floors, roofs, structural members, doors, windows, levels, grids, families (limited).
- Import families as parametric objects (best effort; fall back to flat geometry).
- Test corpus of 10 Revit projects (various versions 2022-2026).
- Import + preview in OpenCAD in under 10 s on typical mid-size residential.

### Out of scope
- RVT export — proprietary.
- Full family-editor support.
- Interoperability with Revit's worksharing.

## Proposed approach

1. Evaluate: ODA Viewer SDK vs. Speckle server-side conversion vs. IfcOpenShell-via-Forge-export.
2. Integrate chosen path; document trade-offs in ADR.
3. Map RVT entities to OpenCAD schema per IFC mapping already in T-IO-045.
4. Test harness against corpus.

## Acceptance criteria

- [ ] 10 corpus RVTs import.
- [ ] Walls / floors / roofs / columns / doors / windows visible after import.
- [ ] Levels roundtrip into Stories.
- [ ] Grids appear as annotation lines.
- [ ] Families import as parametric instances where possible.
- [ ] Import time under 10 s for a 50 MB RVT.

## Test plan

New `packages/app/src/lib/revit/import.test.ts`:

- `T-IO-047-001` — each corpus RVT imports with no exception.
- `T-IO-047-002` — wall count after import equals the known ground truth per file.
- `T-IO-047-003` — level count preserved.
- `T-IO-047-004` — family instances carry parameter values.

Harness:

- `T-IO-047-005` — `rvt-smoke` imports one RVT, screenshots show geometry.

## Dependencies

- T-IO-045 (IFC — shared entity mapping).

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-3`, `area:compat`, `p2`
