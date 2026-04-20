# Competitive Roadmap — Issue Drafts

52 issue drafts covering the feature gap between OpenCAD today and the professional BIM applications we need to compete with. Each draft lives in its own file and is ready to be filed as a GitHub issue.

Each issue follows the same structure:

- **Why** — business motivation, not implementation
- **Scope (in / out)** — explicit boundaries to prevent scope creep
- **Proposed approach** — one suggested implementation path, not prescriptive
- **Acceptance criteria** — observable, user-facing outcomes that unambiguously define "done"
- **Test plan** — specific failing-test IDs the implementation must make pass (TDD)
- **Dependencies** — other issues that must land first
- **Suggested labels** — match existing repo labels

## Test-ID prefix convention

| Prefix | Area |
|---|---|
| `T-MOD-*` | Modeling primitives / editing |
| `T-GEO-*` | Geometry kernel / boolean ops |
| `T-DOC-*` | Documentation (sections, elevations, schedules, layouts, labels) |
| `T-PAR-*` | Parametric objects / library |
| `T-VIZ-*` | View management / rendering |
| `T-ANA-*` | Analysis (energy, structural, clash) |
| `T-IO-*`  | Import / export / interchange |
| `T-COL-*` | Collaboration (reserve/release, BCF) |

## All 52 issues by priority

### P0 — blocking any serious public demo (4)

| # | File | Title |
|---|---|---|
| 01 | [01-wall-junctions.md](01-wall-junctions.md) | Automatic wall junction cleanup (T/L/X intersections) |
| 02 | [02-seo-min.md](02-seo-min.md) | Solid Element Operations (SEO), minimal subset |
| 03 | [03-coord-box.md](03-coord-box.md) | Coordinate box + numeric input during any draw/edit |
| 04 | [04-composite-walls.md](04-composite-walls.md) | Composite wall structures (multi-layer) |

### P1 — needed before claiming production readiness (11)

| # | File | Title |
|---|---|---|
| 05 | [05-section-cuts.md](05-section-cuts.md) | Section views that cut live 3D geometry |
| 06 | [06-elevations.md](06-elevations.md) | Named orthographic elevations |
| 07 | [07-schedules.md](07-schedules.md) | Interactive schedules (door / window / room) |
| 08 | [08-layout-book.md](08-layout-book.md) | Layout book + title blocks + drawing numbering |
| 09 | [09-parametric-doors-windows.md](09-parametric-doors-windows.md) | Parametric doors and windows |
| 21 | [21-axis-lock-smart-guides.md](21-axis-lock-smart-guides.md) | Axis lock + smart guides (inference lines) |
| 31 | [31-details.md](31-details.md) | Detail drawings with source-view callouts |
| 33 | [33-dimensions-full.md](33-dimensions-full.md) | Full dimension suite (angular / radial / arc / chain / ordinate) |
| 34 | [34-labels-autotext.md](34-labels-autotext.md) | Labels with autotext tokens |
| 35 | [35-zones-room-stamps.md](35-zones-room-stamps.md) | Zones with room stamps |
| 37 | [37-stories-view-filters.md](37-stories-view-filters.md) | Stories with per-view story filters |
| 45 | [45-ifc-roundtrip.md](45-ifc-roundtrip.md) | IFC 2x3 / IFC4 round-trip fidelity |
| 46 | [46-dwg-hardening.md](46-dwg-hardening.md) | DWG / DXF adapter hardening |

### P2 — parity and polish (24)

| # | File | Title |
|---|---|---|
| 10 | [10-rule-based-stairs.md](10-rule-based-stairs.md) | Rule-based stair geometry |
| 11 | [11-multi-plane-roof.md](11-multi-plane-roof.md) | Multi-plane roof (hip / valley / ridge) |
| 12 | [12-curtain-wall-grid.md](12-curtain-wall-grid.md) | Curtain wall grid editor |
| 13 | [13-parametric-object-library.md](13-parametric-object-library.md) | Parametric object library |
| 14 | [14-layer-combos-overrides.md](14-layer-combos-overrides.md) | Layer Combinations + Graphic Overrides |
| 15 | [15-trim-extend-split.md](15-trim-extend-split.md) | Trim / extend / split / merge editing |
| 16 | [16-railing.md](16-railing.md) | Railing with baluster pattern |
| 19 | [19-mesh-terrain.md](19-mesh-terrain.md) | Mesh terrain / site topography |
| 20 | [20-complex-profiles.md](20-complex-profiles.md) | Complex structural profiles (I-beam, HSS, custom) |
| 22 | [22-magic-wand.md](22-magic-wand.md) | Magic wand polygon-from-boundary |
| 23 | [23-group-ungroup.md](23-group-ungroup.md) | Group / ungroup / suspend groups |
| 24 | [24-mirror-rotate-array.md](24-mirror-rotate-array.md) | Mirror / rotate / array multi-copy |
| 25 | [25-pickup-inject.md](25-pickup-inject.md) | Pick up / inject parameters (eyedropper) |
| 26 | [26-favorites.md](26-favorites.md) | Favorites (saved parameter presets) |
| 27 | [27-smart-hotspots.md](27-smart-hotspots.md) | Smart hotspots on element edges |
| 28 | [28-surfaces-vs-materials.md](28-surfaces-vs-materials.md) | Surfaces separated from Building Materials |
| 29 | [29-physical-properties.md](29-physical-properties.md) | Thermal / acoustic / structural property fields |
| 32 | [32-worksheets.md](32-worksheets.md) | Worksheets (non-scale drawings) |
| 36 | [36-drawing-manager.md](36-drawing-manager.md) | Drawing Manager with auto-numbering cross-refs |
| 38 | [38-3d-filter-partial.md](38-3d-filter-partial.md) | 3D display filter / partial structure |
| 39 | [39-view-map-templates.md](39-view-map-templates.md) | Named View Map + view templates |
| 41 | [41-sun-study-animation.md](41-sun-study-animation.md) | Sun study animation |
| 42 | [42-energy-analysis.md](42-energy-analysis.md) | Energy analysis (envelope + HVAC) |
| 44 | [44-clash-rules.md](44-clash-rules.md) | Clash detection expansion (named rules) |
| 47 | [47-rvt-hardening.md](47-rvt-hardening.md) | Revit (RVT) adapter hardening |
| 48 | [48-skp-hardening.md](48-skp-hardening.md) | SketchUp (SKP) adapter hardening |
| 49 | [49-3d-export.md](49-3d-export.md) | 3D export (OBJ / FBX / glTF) |
| 51 | [51-pdf-trace.md](51-pdf-trace.md) | PDF import as trace / background |
| 52 | [52-reserve-release.md](52-reserve-release.md) | Element reserve / release (CRDT collaboration) |

### P3 — longer-horizon / optional (5)

| # | File | Title |
|---|---|---|
| 17 | [17-shell.md](17-shell.md) | Shell (freeform curved surfaces) |
| 18 | [18-morph.md](18-morph.md) | Morph (free-form modeling) |
| 30 | [30-user-hatch-patterns.md](30-user-hatch-patterns.md) | User-authorable hatch patterns |
| 40 | [40-photoreal-render.md](40-photoreal-render.md) | Photoreal rendering |
| 43 | [43-structural-export.md](43-structural-export.md) | Structural model export |
| 50 | [50-point-cloud.md](50-point-cloud.md) | Point cloud import |

## Dependency graph (simplified)

```
T-MOD-001 (wall junctions) ─┬─► T-MOD-004 (composite walls) ─► T-MOD-029 (thermal/acoustic) ─► T-ANA-042 (energy)
                            ├─► T-GEO-001 (SEO) ─┬─► T-MOD-010 (stairs)
                            │                   ├─► T-MOD-011 (multi-plane roof)
                            │                   └─► T-MOD-012 (curtain wall grid)
                            └─► T-MOD-022 (magic wand) ─► T-DOC-035 (zones / room stamps) ─► T-DOC-007 (schedules)

T-MOD-003 (coord box) ─────► T-MOD-021 (axis lock / smart guides)
                        └─► T-MOD-027 (smart hotspots)

T-MOD-023 (groups) ────► T-MOD-024 (mirror/rotate/array)
                   └───► T-IO-046 (DWG hardening — blocks as groups)

T-DOC-005 (sections) ──► T-DOC-006 (elevations) ──► T-DOC-008 (layouts) ──► T-DOC-036 (drawing manager)
                                                                        └─► T-DOC-031 (details)
                   └─────────────► T-DOC-037 (stories + view filters)
                                           └─► T-VIZ-039 (view map templates)

T-PAR-009 (parametric doors/windows) ──► T-PAR-013 (parametric object library) ──► T-IO-048 (SKP hardening)

T-MOD-028 (surfaces / materials split) ─► T-VIZ-040 (photoreal render)
                                       └► T-IO-048 (SKP hardening)

T-VIZ-014 (layer combinations / overrides) ─► T-VIZ-039 (view map)
                                           └► T-VIZ-038 (3D filter)

T-IO-045 (IFC roundtrip) ──► T-IO-047 (RVT via IFC)
                         └─► T-ANA-043 (structural export — reuses mapping)

T-MOD-019 (mesh terrain) — independent — enables site analysis, retrofit prep
T-IO-050 (point cloud) — independent — enables retrofit
T-IO-051 (PDF underlay) — independent — enables tracing
T-COL-052 (reserve/release) — independent — enables multi-user production
T-MOD-017 (shell), T-MOD-018 (morph), T-MOD-030 (hatches) — independent long-horizon
```

## Rollout sequence (recommended)

**Wave 1 — fix the obvious (P0 blocking the credibility of any demo)**

1. T-MOD-001 Wall junctions
2. T-MOD-003 Coord box
3. T-MOD-004 Composite walls
4. T-GEO-001 SEO minimal

**Wave 2 — ship a real production deliverable (P1)**

5. T-DOC-037 Stories + view filters
6. T-DOC-035 Zones + room stamps
7. T-MOD-022 Magic wand
8. T-DOC-007 Schedules
9. T-DOC-033 Full dimension suite
10. T-DOC-034 Labels + autotext
11. T-DOC-005 Section cuts
12. T-DOC-006 Elevations
13. T-DOC-008 Layout book
14. T-DOC-031 Detail drawings
15. T-DOC-036 Drawing manager
16. T-PAR-009 Parametric doors / windows
17. T-MOD-021 Axis lock + smart guides
18. T-IO-045 IFC roundtrip
19. T-IO-046 DWG hardening

**Wave 3 — parity and polish (P2)**

20. T-MOD-027 Smart hotspots
21. T-MOD-015 Trim/extend/split/merge
22. T-MOD-023 Groups
23. T-MOD-024 Mirror/rotate/array
24. T-MOD-025 Pickup/inject
25. T-MOD-026 Favorites
26. T-MOD-028 Surfaces vs Building Materials
27. T-MOD-029 Thermal/acoustic properties
28. T-MOD-010 Rule-based stairs
29. T-MOD-011 Multi-plane roofs
30. T-MOD-012 Curtain wall grid
31. T-MOD-016 Railings
32. T-MOD-020 Complex profiles
33. T-VIZ-014 Layer combos + overrides
34. T-VIZ-038 3D filter
35. T-VIZ-039 View map
36. T-PAR-013 Parametric object library
37. T-DOC-032 Worksheets
38. T-IO-049 3D export (OBJ / FBX / glTF)
39. T-IO-051 PDF underlay
40. T-ANA-044 Clash rules
41. T-MOD-019 Mesh terrain
42. T-VIZ-041 Sun study animation
43. T-ANA-042 Energy analysis
44. T-COL-052 Reserve/release
45. T-IO-047 RVT hardening
46. T-IO-048 SKP hardening

**Wave 4 — long horizon (P3)**

47. T-MOD-030 User hatch patterns
48. T-ANA-043 Structural export
49. T-VIZ-040 Photoreal render
50. T-IO-050 Point cloud
51. T-MOD-017 Shells
52. T-MOD-018 Morph
