# T-PAR-013 — Parametric object library with user-authored definitions

**Priority:** P2 · **Phase:** phase-3 · **Area:** area:bim · **Complexity:** Large

## Why

The real productivity win of BIM comes from dropping a pre-parameterised object (a kitchen sink, a bathtub, a specific manufacturer's window) into a model with correct 3D geometry, correct 2D symbol, correct material, correct properties — and then editing those parameters. We have no library. Furniture, fixtures, and equipment (FF&E) are absent from every screenshot. Architects evaluating the tool notice immediately.

This issue introduces a minimal parametric-object system and a small starter library.

## Scope

### In scope
- A **ParametricObject** schema: declarative JSON manifest that describes parameters (name, type, default, min, max), 2D symbol (SVG path per zoom level), 3D geometry (a short list of primitives — box, cylinder, revolve, sweep — each referencing parameters), metadata (category, vendor, tags).
- A library of ~30 starter objects across categories: Plumbing (sink, toilet, bathtub, shower), Kitchen (sink, range, fridge, dishwasher, cabinet), Furniture (chair, sofa, bed, table), Lighting (pendant, sconce), Fixtures (door-hardware placeholders).
- A dedicated **Object Library** panel listing objects by category, with search and filter.
- Drag from library onto floor plan inserts an instance with all parameters at default; Properties panel shows the parameter set; edits update the 3D and 2D geometry live.
- Objects are rendered, selectable, snappable, moveable, rotatable.
- Cost + carbon takeoff picks up the object's material assignments.

### Out of scope (this issue)
- A scripting language (GDL equivalent) for authoring — v1 uses declarative JSON + a small number of primitive operators.
- Asset upload / marketplace / community library — local bundled library only in v1.
- IFC export of parametric objects as IFC proxies — nice-to-have follow-up.

## Proposed approach

1. Define schema `ParametricObjectManifest` and `ParametricObjectInstance` in `@opencad/document`.
2. Primitives: `{ kind: 'box', size: [x,y,z], material: string }`, `{ kind: 'cylinder', radius, height, material }`, `{ kind: 'revolve', profile: Point[], axis: 'Y' }`, `{ kind: 'sweep', profile, path }`.
3. A small runtime `resolvePrimitives(manifest, params)` evaluates any parameter references (`"{{width}}"`) and returns concrete primitives.
4. `buildObjectMesh` iterates resolved primitives.
5. Starter library ships as JSON files under `packages/app/src/lib/objects/` loaded at app boot.
6. New `ObjectLibraryPanel.tsx` with search + categorised list + drag-to-canvas behaviour.

## Acceptance criteria

- [ ] Opening the Object Library panel shows the 30+ starter objects categorised.
- [ ] Dragging a "Toilet" onto the plan creates an instance at the cursor position.
- [ ] The instance renders in 3D with correct geometry and materials.
- [ ] Selecting it in Properties shows parameters (e.g., `tankWidth`, `bowlLength`, `seatColour`).
- [ ] Editing a parameter updates geometry live.
- [ ] The instance contributes to cost + quantity takeoff.
- [ ] Search filters the library list.
- [ ] The library loads in ≤ 200 ms on first open.

## Test plan

New file `packages/document/src/parametricObject.test.ts`:

- `T-PAR-013-001` — schema validator rejects a manifest with no primitives.
- `T-PAR-013-002` — a manifest declaring parameter `width` with default 800 parses.
- `T-PAR-013-003` — `resolvePrimitives(manifest, { width: 1000 })` returns a primitive list with `width → 1000`.
- `T-PAR-013-004` — missing parameter falls back to default.

New file `packages/app/src/components/ObjectLibraryPanel.test.tsx`:

- `T-PAR-013-005` — panel renders with no filter; lists all loaded objects.
- `T-PAR-013-006` — typing a search string filters to matching names.
- `T-PAR-013-007` — dragging from the list emits `dragStart` with the manifest id.

Harness:

- `T-PAR-013-008` — new template `furnished-studio` places a bed, desk, and chair; iso screenshot shows distinct geometries for each.

## Dependencies

- T-PAR-009 (parametric door/window) — same pattern, prove it there first.

## Blocks

- Community content — a library format is a prerequisite for any future marketplace.

## Suggested labels

`enhancement`, `phase-3`, `area:bim`, `area:ui`, `p2`
