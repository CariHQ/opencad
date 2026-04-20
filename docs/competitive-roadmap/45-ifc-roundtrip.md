# T-IO-045 — IFC 2x3 / IFC4 round-trip fidelity tests

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:compat · **Complexity:** Large

## Why

IFC is *the* open BIM interchange format. Every stakeholder (consultants, contractors, regulators) exchanges IFC files. Our existing `ifc.ts` adapter imports and exports but has never been rigorously verified for round-trip fidelity. Sending a model through OpenCAD → IFC → OpenCAD should return an equivalent model, and the same applies to competitor tools → IFC → OpenCAD.

## Scope

### In scope
- Establish a test corpus of ~20 IFC files covering the major entities: walls (single + composite), slabs, roofs, columns, beams, doors, windows, spaces, stories, site context, structural members.
- Golden-image round-trip tests: import → re-export → byte-compare (or entity-equivalence).
- Fix gaps revealed by the tests:
  - Missing entity mapping (IfcSlab → slab with `PredefinedType` preserved).
  - Geometry precision loss (extruded vs swept-solid roundtrip).
  - Property sets (Psets) preserved.
  - Classifications (OmniClass / UniClass) preserved.
  - Georeferencing (map conversion) preserved.
- Validate exports against `buildingSMART` IFC validator CLI.
- Support both IFC 2x3 and IFC 4 exports.

### Out of scope
- IFC 4.3 (newer schema; defer).
- IFC-SG extensions.

## Proposed approach

1. Add corpus files under `e2e/ifc-corpus/`.
2. `lib/ifc/roundtrip.test.ts`: each file goes through import → export → parse → entity diff.
3. Fix failing mappings iteratively until the corpus passes.
4. CI job runs the corpus against the `buildingSMART` validator via docker.

## Acceptance criteria

- [ ] All 20 corpus files pass round-trip equivalence.
- [ ] Exported files pass `buildingSMART` validator.
- [ ] `PropertySets` on any element roundtrip.
- [ ] `Pset_WallCommon`, `Pset_DoorCommon`, etc., populated on export.
- [ ] IfcRelConnectsPathElements, IfcRelVoidsElement (openings), IfcRelContainedInSpatialStructure preserved.
- [ ] Project georeferencing via `IfcProjectedCRS` preserved.

## Test plan

New `packages/app/src/lib/ifc/roundtrip.test.ts`:

- `T-IO-045-001` — import corpus file 1 → export → re-import → element counts match.
- `T-IO-045-002` — for each corpus file, wall thicknesses preserved within 0.1 mm.
- `T-IO-045-003` — stories preserved with correct elevations.
- `T-IO-045-004` — property sets preserved exactly.
- `T-IO-045-005` — classifications preserved.
- `T-IO-045-006` — exported IFC validates cleanly against `buildingSMART` CLI.

CI:

- `T-IO-045-007` — Docker-based IFC validator runs in CI on every PR touching `lib/ifc/`.

## Dependencies

- None.

## Blocks

- Credible claim of "BIM-capable" — without clean IFC, the claim collapses.

## Suggested labels

`enhancement`, `phase-2`, `area:compat`, `p1`
