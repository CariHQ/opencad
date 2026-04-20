# T-VIZ-040 — Photoreal rendering

**Priority:** P3 · **Phase:** phase-3 · **Area:** area:ui · **Complexity:** Large

## Why

Every design presentation ends in a client-facing rendering. The Three.js real-time view is adequate for design but visibly "CAD" — flat lighting, shadowless materials, white sky. To ship real presentations users export to external renderers (Enscape, Twinmotion, Lumion, V-Ray). A built-in photoreal path shortcuts that loop and keeps the render in-app.

## Scope

### In scope
- A new **Rendering** view type produced from any 3D / elevation / section view.
- Uses a path-traced or high-quality rasterized renderer (evaluate: three-gpu-pathtracer, Filament, Babylon.js PBR pipeline).
- Quality presets: Draft (1 sample / pixel), Preview (16 spp), Final (256+ spp).
- Environment: HDRI sky with user-selectable time-of-day, optional ground plane.
- Sun lighting driven by the project's geolocation + date + time (reuses Solar panel data).
- Output resolutions: 720p / 1080p / 2K / 4K / custom.
- PNG export.
- Renderings appear in the View Map and can be dropped on layout sheets.

### Out of scope
- Animation / walk-throughs.
- Interactive material painting during render.
- Custom light fixtures with IES profiles.

## Proposed approach

1. Integrate `three-gpu-pathtracer` (or evaluate alternatives) as an optional render path.
2. A `RenderingView` React component owns the render lifecycle: start, progress callback, cancel, save PNG.
3. Rendering settings panel: quality, HDRI picker, time-of-day, resolution.
4. On completion, the PNG is stored in the doc (data URI or IndexedDB blob) and referenced by the Rendering view entry.

## Acceptance criteria

- [ ] Creating a Rendering from a 3D view spawns a progress-bar panel.
- [ ] Draft quality completes in ≤ 2 s on a 720p output on the baseline machine.
- [ ] Final quality at 1080p produces a PNG with visible soft shadows, glass transparency, PBR roughness.
- [ ] Sun angle matches the project's date/time.
- [ ] Switching HDRI updates the environment.
- [ ] Rendering appears in View Map as a new view with a thumbnail.
- [ ] Dragging it onto a layout sheet embeds the PNG at its native resolution.

## Test plan

Smoke tests only (rendering is heavy for CI):

- `T-VIZ-040-001` — rendering module loads without throwing in headless mode.
- `T-VIZ-040-002` — settings panel mounts with the 5 quality presets.
- `T-VIZ-040-003` — cancelling a render stops within 500 ms.

Harness (opt-in, not required for CI gate):

- `T-VIZ-040-004` — `render-demo` kicks off a Draft render of the modern-villa; PNG output has non-zero content, dimensions match requested resolution.

## Dependencies

- T-MOD-028 (surfaces separated from materials) — photoreal needs rich surfaces.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-3`, `area:ui`, `area:geometry`, `p3`
