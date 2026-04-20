# T-MOD-020 — Complex structural profiles (I-beam, custom sections)

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Beams and columns render as plain rectangular prisms today. Real structural members have standardised profiles (W-shapes, C-channels, HSS tubes, angle irons) and custom architectural profiles (decorative column caps, plaster mouldings). Without a profile system, structural drawings look wrong to engineers and architectural details look flat.

## Scope

### In scope
- `Profile` schema: a named 2D cross-section polygon (outer + inner loops), plus metadata (category, standard code like `W8×31`, `HSS4×4×1/4`, plus custom profiles).
- Starter library of standard profiles: ~30 US/metric steel sections (W, S, HSS, C, L), plus a few architectural classics (cove, ogee, square cap).
- Beam and Column schemas gain `ProfileId` (replacing flat `Width × Height`).
- 3D geometry: sweep the profile along the beam axis or extrude along the column axis.
- 2D plan: beams + columns show the profile footprint, not a generic rectangle.
- Properties panel: profile picker dropdown, live preview.
- User-authored custom profiles via a simple 2D polygon editor (reuse the slab-polygon draw tool).

### Out of scope
- Tapered sections (W-flange with varying depth).
- Global profile-library sync / publishing.

## Proposed approach

1. Schema: `doc.profiles: Record<string, Profile>` seeded from a bundled JSON of standard shapes.
2. Beam / Column render: fetch profile, sweep/extrude using Three's `ExtrudeGeometry` with a `THREE.Shape` from the profile outer + holes.
3. Properties panel: `ProfilePicker` sub-component with preview SVG of each profile.
4. Custom profile editor: open a small draw canvas, user sketches polygon, "Save as Profile".

## Acceptance criteria

- [ ] A beam assigned profile `W8×31` renders as an I-beam in 3D.
- [ ] A column assigned profile `HSS4×4×1/4` renders as a hollow square tube.
- [ ] Plan view shows the profile outline, not a rectangle.
- [ ] User can define a new profile by drawing a polygon and naming it.
- [ ] Swapping profile on an existing beam re-renders within 1 frame.
- [ ] Quantity takeoff uses the profile's cross-section area × length for volume (not bounding-box approximation).
- [ ] Compliance R009 (load-bearing beam must have a structural profile) fires when a beam has no profile.

## Test plan

New `packages/app/src/lib/profiles/profileGeometry.test.ts`:

- `T-MOD-020-001` — `buildProfileShape(W8x31)` returns a THREE.Shape with the correct outer polygon and one hole (web cutouts if any — W shapes typically have no holes).
- `T-MOD-020-002` — cross-section area of `W8×31` matches the tabulated standard value to within 1 %.
- `T-MOD-020-003` — `buildProfileShape` on a hollow square produces outer + inner loops.

UI:

- `T-MOD-020-004` — `ProfilePicker` renders SVG previews of each profile.
- `T-MOD-020-005` — selecting a profile updates the element's `ProfileId`.

Compliance:

- `T-MOD-020-006` — R009 fires on a beam with no ProfileId.

Harness:

- `T-MOD-020-007` — new template `steel-frame` draws 4 columns + 4 beams with W-profiles; 3D shows I-beam silhouettes.

## Dependencies

- None hard.

## Blocks

- Proper structural drawings, accurate volume-based takeoff for steel.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:geometry`, `p2`
