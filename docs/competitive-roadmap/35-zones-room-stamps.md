# T-DOC-035 — Zones with room stamps (number + name + area + occupancy)

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Every plan drawing labels its rooms: a stamp in each room shows the room's number, name, area, and sometimes occupancy / occupant load / finish schedule. Currently we have `space` elements with properties but no visible stamp. Architects hand-label; the drawings drift out of sync with the model.

## Scope

### In scope
- **Zone**: already present as `space` element; rename/expand schema: `number`, `name`, `Area`, `occupancyType`, `occupantLoad`, `finishFloor`, `finishWalls`, `finishCeiling`.
- **Room stamp**: a composable stamp rendered inside each zone in plan view, showing a configurable subset of zone fields. User picks which fields from the Display panel.
- Auto-computed area: polygon area of the zone's boundary in m².
- Auto-detect zones from closed wall regions (uses T-MOD-022 magic wand internally).
- Numbering: zones auto-numbered per level (`101`, `102`, …, `201`, `202`, …); user editable.
- Feeds Room Schedule (T-DOC-007).
- Colour-coding by occupancy or floor finish for quick plan-at-a-glance.

### Out of scope
- Parametric zone relationships (e.g., "Bedroom must be adjacent to Bathroom").
- Egress path analysis (that's a larger compliance topic; T-ANA-044).

## Proposed approach

1. Expand `space` schema with the above fields.
2. `lib/zoneDetection.ts` already exists partly (`roomDetection.ts`); extend for auto-detection and area calc.
3. `RoomStamp` render component in 2D viewport.
4. Display panel section for stamp content config.
5. Integrate with Room Schedule.

## Acceptance criteria

- [ ] Drawing 4 walls then "Auto-detect zones" creates one zone covering the room.
- [ ] Zone's computed area matches the polygon-area formula.
- [ ] Room stamp renders at the zone's centroid showing number / name / area.
- [ ] Changing a wall position recomputes the zone's polygon + area live.
- [ ] Zones auto-number per level and are user-editable.
- [ ] Deleting a zone removes its stamp.
- [ ] Colour-coding by `occupancyType` shows categorical colours in plan.

## Test plan

New `packages/app/src/lib/zoneDetection.test.ts`:

- `T-DOC-035-001` — 4 walls forming a 5 × 4 m rectangle produce a zone with area = 20 m².
- `T-DOC-035-002` — L-shape with 6 walls produces a zone with correct L polygon area.
- `T-DOC-035-003` — auto-numbering produces sequential ids per level.
- `T-DOC-035-004` — deleting a wall removes the zone when the region opens up.

UI:

- `T-DOC-035-005` — `RoomStamp` renders at the zone's centroid.
- `T-DOC-035-006` — changing displayed fields updates the stamp.

Harness:

- `T-DOC-035-007` — `three-bedroom` now shows 5 room stamps (bed1, bed2, bed3, living, kitchen) in the plan screenshot.

## Dependencies

- T-MOD-022 (magic wand) for auto-detection.

## Blocks

- T-DOC-007 (schedules — Room Schedule).
- T-ANA-044 (egress compliance).

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p1`
