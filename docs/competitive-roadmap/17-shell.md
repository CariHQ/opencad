# T-MOD-017 — Shell tool for freeform curved surfaces

**Priority:** P3 · **Phase:** phase-3 · **Area:** area:geometry · **Complexity:** Large

## Why

Any contemporary / experimental building design has curved surfaces — arched roofs, barrel vaults, double-curvature canopies, domed ceilings. The current geometry vocabulary is straight walls + polygon slabs + flat-or-pitched roofs. A shell tool lets users define a surface by sweeping, revolving, or lofting profiles and drives a NURBS-or-tessellated surface mesh.

## Scope

### In scope
- Shell schema: `method: 'revolve' | 'extrude' | 'loft' | 'sweep'`, `profile: Point[]`, `path?: Point[]`, `axis?: Vector3`, `rotations?: number`.
- **Revolve**: profile rotated around an axis (domes, barrel vaults).
- **Extrude**: profile lifted along a vector (sheds, canopies).
- **Loft**: two or more profiles blended (ramps).
- **Sweep**: profile swept along a path (arches).
- Thickness parameter offsets the surface to create a solid.
- Cost + carbon takeoff uses the surface area.
- 2D plan shows the shell's footprint projected.

### Out of scope
- NURBS surface editing with control points. Use tessellated output.
- Boolean ops with shells (goes through T-GEO-001 SEO infrastructure).
- Parametric joins between shells and walls.

## Proposed approach

1. New schema `Shell` element.
2. `lib/shellGeometry.ts`: pure constructors for the four methods, each returning a triangle soup with configurable segment count.
3. `buildShellMesh` consumes triangle soup → BufferGeometry.

## Acceptance criteria

- [ ] A revolve shell with a half-circle profile around the Y axis produces a hemispherical dome.
- [ ] An extrude shell with a rectangular profile + vertical vector produces a rectangular slab-like volume.
- [ ] A loft between two differently-sized rectangles produces a tapered volume.
- [ ] A sweep with an I-beam profile along an arc path produces a curved structural member.
- [ ] Thickness > 0 offsets the surface inward or outward; thickness = 0 is a single-sided surface.
- [ ] Shells are selectable, movable, rotatable, deletable.
- [ ] Cost takeoff reports the triangulated surface area to within 5 % of the analytical area.

## Test plan

New `packages/app/src/lib/shellGeometry.test.ts`:

- `T-MOD-017-001` — revolve of a unit half-circle around Y produces ≥ 2 × segments triangles.
- `T-MOD-017-002` — revolve produces a vertex at `(r, 0, 0)` when the profile starts at `(r, 0)`.
- `T-MOD-017-003` — extrude of a unit square produces a rectangular box of the expected volume.
- `T-MOD-017-004` — loft between two profiles of N vertices each produces `(N − 1) × 2` triangles per slice.
- `T-MOD-017-005` — sweep along a path with M segments produces profile × M slices.
- `T-MOD-017-006` — triangulated area of a revolved hemisphere converges to `2πr²` as segments → ∞.

Harness:

- `T-MOD-017-007` — new template `dome-pavilion` produces a hemispherical dome on a circular slab.

## Dependencies

- None hard.

## Blocks

- T-MOD-018 (morph) — shares the surface infrastructure.

## Suggested labels

`enhancement`, `phase-3`, `area:geometry`, `area:bim`, `p3`
