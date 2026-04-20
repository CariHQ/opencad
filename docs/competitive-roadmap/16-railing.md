# T-MOD-016 — Railing with baluster pattern + rule-based geometry

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

The Railing element exists in the schema but renders as a bounding-box placeholder. Real railings need top/bottom rails, posts at intervals, a baluster pattern (square / turned / cable / glass-panel), and automatic height adjustment to the element they follow (stair, balcony, roof edge). Without real railings, every 3D view of a stair or balcony looks unfinished.

## Scope

### In scope
- Railing schema: `path: Point[]` (polyline), `topRailHeight`, `postSpacing`, `balusterSpacing`, `balusterProfile: 'square' | 'turned' | 'cable' | 'glass'`, `followsElement?: elementId`.
- 3D geometry: top rail as a swept profile along the path; posts at `postSpacing` intervals; balusters at `balusterSpacing` intervals; glass panels (if `balusterProfile === 'glass'`) as quads between posts.
- 2D plan: draw the path with short perpendicular tick marks at post positions.
- Height rule: if `followsElement` is a stair, the railing's path auto-offsets along the stair's treads. If it's a slab edge, horizontal.
- Compliance: integrate with R008 (minimum railing height — new rule at 900 mm residential, 1100 mm commercial, IBC 1015.3).

### Out of scope
- Handrail brackets, returns at ends.
- Curved railings with non-linear paths (v1: polyline only).

## Proposed approach

1. Replace existing railing schema with the new fields.
2. `lib/railingGeometry.ts`: pure `buildRailing(path, params)` returns mesh primitives.
3. `buildRailingMesh` in `useThreeViewport` iterates primitives.
4. Add R008 to `complianceEngine.ts`.

## Acceptance criteria

- [ ] A railing along a 4000 mm balcony edge with default `postSpacing = 1200` produces 4 posts and 3–4 balusters between each pair of posts.
- [ ] Setting `balusterProfile = 'glass'` replaces balusters with transparent glass panels.
- [ ] Railing following a stair tilts with the tread slope; each post sits on a tread.
- [ ] Plan view shows posts as perpendicular ticks.
- [ ] Compliance R008 fires when `topRailHeight < 900`.
- [ ] Old railing documents without a `path` field migrate to use the element's boundingBox as a single-segment path.

## Test plan

New file `packages/app/src/lib/railingGeometry.test.ts`:

- `T-MOD-016-001` — 4000 mm path, postSpacing 1200 → 4 posts at [0, 1200, 2400, 3600 + endpoint].
- `T-MOD-016-002` — balusters between posts at 150 mm spacing produces 8 balusters between each pair.
- `T-MOD-016-003` — glass panel mode produces one quad per inter-post segment, zero balusters.
- `T-MOD-016-004` — railing following a stair with 16 treads has 16 or fewer top-rail segments, stepping up with the tread elevation.

Compliance:

- `T-MOD-016-005` — R008 fires when height = 800; does not fire at 900.

Harness:

- `T-MOD-016-006` — template `balcony-railing` draws a slab + perimeter railing; iso shows distinct posts + balusters.

## Dependencies

- T-MOD-010 (stairs) for stair-following behaviour.

## Blocks

- Nothing critical.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:geometry`, `p2`
