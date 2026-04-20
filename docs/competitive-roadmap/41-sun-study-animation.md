# T-VIZ-041 — Sun study animation

**Priority:** P2 · **Phase:** phase-3 · **Area:** area:ui · **Complexity:** Small

## Why

Solar access / shadow impact studies are required deliverables for urban planning approvals and standard client presentations. The existing ShadowAnalysisPanel covers a single moment in time. Animating through a day or a year reveals overshadowing, daylight-factor changes, and seasonal behavior in ways a single frame can't.

## Scope

### In scope
- Animation controls: date range (start / end), time range, step size (5 min / hour / day / month).
- Playback: play / pause / scrub, playback speed.
- Sun position updates the 3D sun direction per frame.
- Optional MP4 or animated GIF export (evaluate `whammy`, `gif.js`).
- Overlay: annotation of current date/time on the animation.
- Works in any 3D view (iso / perspective / elevation).

### Out of scope
- Climate-data-driven (TMY) simulations — pure astronomical sun path in v1.
- Multi-site comparisons.

## Proposed approach

1. Extend existing `solarAnalysis.ts` with `sunDirectionAt(date)`.
2. Animation controller hook `useSunAnimation` with RAF loop.
3. GIF / MP4 encoder wrapped in a worker.

## Acceptance criteria

- [ ] Sun position updates for each date/time step.
- [ ] Playback at 1 s / hour steps through a day in 24 seconds.
- [ ] Scrubber repositions the sun instantly.
- [ ] Overlay shows "June 21, 14:30" in real time.
- [ ] MP4 export produces a playable file.
- [ ] Annual animation (365 frames at noon) completes without memory leaks.

## Test plan

New `packages/app/src/lib/sunAnimation.test.ts`:

- `T-VIZ-041-001` — `sunDirectionAt('2026-06-21T12:00:00', latLon)` returns expected vector to within 1°.
- `T-VIZ-041-002` — 24 h / 1 h step produces 24 frames.
- `T-VIZ-041-003` — equator at noon puts sun nearly overhead.

UI:

- `T-VIZ-041-004` — animation controls mount in the Shadow panel.
- `T-VIZ-041-005` — scrub event updates `sunDirection` prop.

## Dependencies

- Existing ShadowAnalysisPanel.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-3`, `area:ui`, `area:gis`, `p2`
