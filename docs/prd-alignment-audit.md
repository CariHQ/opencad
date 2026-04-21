# PRD Alignment Audit — 2026-04-19

## Summary

The PRD describes a single, unified Phase-1 product: a CRDT-backed, offline-first, browser-native BIM tool with OpenCASCADE WASM geometry, WebGPU rendering, AI code compliance, real-time Yjs collaboration, and a tight feature set covering a credible demo. The code is not that product. It is instead a sprawling **compute-library archipelago** — ~66 carefully unit-tested lib modules (schedules, clash rules, shell, morph, terrain, layer combos, drawing manager, stories, curtain walls, seo, etc.) that were built in response to the 52-issue competitive-roadmap — layered on top of a much thinner UI shell that only wires ~20 of them. The PRD's backbone technologies (Yjs, OpenCASCADE WASM, WebGPU, `@opencad/geometry`, `@opencad/sync`) are either stubbed out, dead, or replaced by a custom Rust LWW CRDT (`@opencad/sync-rs`) that is smaller and different in kind from Yjs. The competitive-roadmap (waves 1–4) has shipped most of its *compute* layer but very little of its *UX* layer, while the PRD's Phase-1 UX flows (AI code compliance from the chat panel, IFC roundtrip, sheet export, collaborative editing with real presence) are mostly represented by panels that import the compute but do not connect the data flow. Net assessment: we are drifting toward a **kit of BIM algorithms in search of a product**, and the PRD is the thing pulling us back toward shipping one. The drift is not all bad — much of the underlying math is real and correct — but the map (PRD) and territory (app) need to be re-aligned urgently before the Phase-1 gate because several P0 flows in the PRD exist as unwired code paths.

## Shipped + matches the PRD

Limited, but real:

- **CRDT document model** (not in the form PRD specified, but the effect is achieved). Contract is Lamport-clock LWW + tombstones + property-level granularity in Rust/WASM, per `packages/sync-rs/src-rust/lib.rs`. PRD Section 10.2 assumed Yjs; what shipped solves the same problem in a different library.
- **Auto-save** (PRD §7.1.1 M1, P0). `useAutoSave` in `packages/app/src/hooks/useAutoSave.ts` primary-to-IndexedDB (via `idb` + `offlineStore`), fallback to localStorage, within the 2s target. Matches the PRD behavior.
- **PWA shell** (PRD §6.1, §9). `VitePWA` + `workbox-window` + `registerSW` in `packages/app/src/main.tsx` and `vite.config.ts`.
- **Zustand store** (PRD §15.1). `documentStore.ts`, `projectStore.ts`, `authStore.ts` — matches the "Zustand + Yjs" row minus the Yjs.
- **Tauri v2 desktop shell** (PRD §6.5, §15.8). Present at `packages/desktop/src-tauri/` with `tauri.conf.json`, capability gates, Rust IPC commands. Actual-vs-promised feature parity not separately audited here.
- **2D drafting primitives** (PRD §7.1.2). `useViewport.ts` with line/rect/circle/polyline/text/dimension/hatch paths, and `drawing2d` store. Test IDs T-2D-001..T-2D-005 are referenced in `docs/TDD_GUIDE.md` but the code paths exist under `useViewport.ts` (spline, coordbox, text) — see Test-ID spot check below.
- **IFC import/export** (PRD §11.2.2, P0). `packages/document/src/ifc.ts` + full `T-IFC-001..T-IFC-007` test coverage.
- **AI chat panel with BYO provider** (PRD §8.1, §8.2). `AIChatPanel.tsx` streams to OpenAI-compatible / Ollama endpoints with local config persistence — the multi-model-router idea from PRD §6.2 is there in spirit, user-configured instead of server-routed.
- **IBC compliance engine (rule set)** (PRD §8.2.3). `packages/ai/src/codeCompliance.ts` + `rules/ibc.ts` is sync, works offline, satisfies T-AI-024.
- **Subscription / grace-period logic** (PRD §6.6, T-SUB-*). Implemented and tested in `packages/sync/src/subscription.ts` *(caveat: this test lives in the dead `@opencad/sync` package — see below)*.

## Shipped but diverged

- **CRDT library** (PRD §10.2, §15.3 — Yjs).
  - PRD says: Yjs (`Y.Map<CRDTElement>`, `Y.Map<CRDTLayer>`, etc.) with custom BIM extensions.
  - We built: bespoke Rust LWW CRDT (`@opencad/sync-rs`) exposed via `lib/syncAdapter.ts`. No Y.Map. No Y.Doc. Property-level granularity is re-implemented from scratch.
  - **Better / worse / neutral:** Neutral-to-better for the LWW semantics we actually need; worse for ecosystem (no y-websocket, no Yjs awareness API, no y-indexeddb persistence). Also means the Yjs-specific conflict-resolution UX promised in PRD §9.1 "user notified of semantic conflicts" has no library support.
  - **Recommendation:** Update PRD §10.2 and §15.3 to describe the Rust LWW approach, *or* rewrap it behind a Yjs-compatible adapter. Do not revert.

- **Geometry kernel** (PRD §6.3, §15.2 — OpenCASCADE WASM).
  - PRD says: OpenCASCADE compiled via Emscripten, BREP/NURBS, plus Rust custom extensions.
  - We built: `packages/geometry/src/wasm.ts` is a stub loader with a CPU fallback (`loadWasmKernel`) that the rest of the code never calls. Actual geometry for walls, slabs, roofs, stairs, curtains, shells, morphs, terrain runs in pure TypeScript inside `packages/app/src/lib/*`. Zero consumers of `@opencad/geometry` (contract audit confirms).
  - **Better / worse / neutral:** Worse for Phase-2 claims (boolean ops, fillet, NURBS, shell surfaces all need a real kernel). Acceptable for Phase-1 where we only need meshes.
  - **Recommendation:** Either downgrade PRD's kernel claims to "mesh-first, WASM kernel by Phase 2 M12" or actually wire an OCCT build. Do not leave the `@opencad/geometry` shell in the tree — it misleads new contributors.

- **WebGPU rendering** (PRD §6.1, §6.3, §15.1, §16.5 — "WebGPU primary, WebGL fallback").
  - PRD says: WebGPU is the primary path; WebGL 2.0 is fallback for Safari.
  - We built: `useThreeViewport.ts:168` — comment literally reads "WebGL only for now — WebGPU support is experimental and requires async init." There is no WebGPU renderer instantiated anywhere.
  - **Better / worse / neutral:** Neutral pragmatically (Three.js WebGPU backend is still a moving target in v0.183), but the PRD's "near-native browser performance via WebGPU" positioning is a promise we don't back.
  - **Recommendation:** Demote WebGPU from "primary" to "future" in PRD §6.1 until we ship it. Adjust browser-support matrix (§16.5) accordingly.

- **Code compliance UX wiring** (PRD §8.2.3, §13 M10, all of T-AI-020..T-AI-024).
  - PRD says: User clicks "Check Code Compliance", gets a report, can click a violation to see affected elements and apply suggested fixes. This is a P0 flow.
  - We built: `CompliancePanel.tsx` does exactly this logic — and **is not imported by AppLayout.tsx anywhere**. The only references are the file itself and its test. Users of the app have no path to this feature. Meanwhile, there are three parallel compliance engines in the tree (see contract audit) and two of them are dead.
  - **Better / worse / neutral:** Clearly worse — the PRD's most-hyped AI feature ships as orphaned code.
  - **Recommendation:** Wire `CompliancePanel` into the right-panel tab bar in `AppLayout.tsx`. This is the single highest-leverage re-alignment change in the whole audit. Also pick one compliance engine (the `@opencad/ai` IBC one — B per contract audit) and delete C (`lib/complianceEngine.ts`) + the unexported class in A.

- **Layer panel** (PRD §7.1.2 — "Create, rename, reorder, show/hide, lock layers", P0).
  - PRD says: a dedicated layer panel.
  - We built: `LayerPanel.tsx` exists and has tests — not imported by AppLayout. Navigator (`Navigator.tsx`) rolls a minimal layer tree inline and implements add/rename/show/hide via `useDocumentStore`. Reordering and locking are absent from Navigator.
  - **Better / worse / neutral:** Neutral-to-worse. The Navigator tree is a reasonable UX choice (echoes Archicad's navigator) but loses `locked` and `reorder` which PRD lists as P0.
  - **Recommendation:** Either (a) delete `LayerPanel.tsx` and add reorder + lock to Navigator, or (b) mount `LayerPanel` somewhere. Pick one.

- **Material routing** (PRD §7.2.1, BIM property sets).
  - PRD implies one canonical way to attach a material to an element.
  - We built two: `setElementMaterial` (writes `properties.MaterialId`) and `updateElement(id, { material: name })` (writes a free-form top-level field). Contract audit flagged this — noting it here as a PRD-level issue too because the PRD's Psets story assumes a single canonical property name.
  - **Recommendation:** Already covered by contract audit; mentioning here for PRD traceability only.

- **Real-time presence** (PRD §10.3 "Live Cursors", P0 for Phase 1).
  - PRD says: multiple users see each other's cursors in real time.
  - We built: `PresenceOverlay` + a `presence` module in `sync-rs` with per-peer monotonic sequence numbers. This is last-observed-write-wins, not a CRDT. Functional, but ephemeral only — the PRD's "presence/activity feed" (§10.3) persistence is not present.
  - **Recommendation:** Neutral; update PRD to reflect "ephemeral only" and add an Activity-Feed ticket if we still want it.

- **Ollama integration** (PRD §6.2 — "LLM Router" with Ollama for offline).
  - PRD says: server-side LLM Router does OpenAI/Claude/Ollama routing.
  - We built: client-side provider selection in `AIChatPanel.tsx` via `useAIStream`. User picks provider in settings; no server routing. Ollama runs directly from the browser hitting `http://localhost:11434`.
  - **Better / worse / neutral:** Better for privacy/cost; worse for enterprise deployment where the backend was supposed to hold credentials.
  - **Recommendation:** Fold into PRD as "client-direct provider; server routing is a Phase 3 enterprise feature."

- **Two PDF exporters + two DXF pipelines + two BCF type systems.** (Contract audit already flagged all three; they land on PRD §7.3.1 Plot/Print and §11.2 interop. The PRD promises ONE clean export path per format. Recommendation: collapse as per contract audit.)

## PRD promises with no implementation

These are features the PRD lists as P0 / MVP / Phase-1 gate criteria where the code path to the user is empty or stubbed. Severity judgments assume the Phase-1 gate ("An architect can draft a simple house plan (2D + 3D) and export IFC," §14 Phase-1 Success Criteria).

- **Real WASM geometry kernel booleans / BREP / NURBS** (PRD §6.3, §7.1.3 "Boolean Operations P0", §16.1 "< 50ms for boolean on typical geometry").
  - Missing: The kernel loader returns a stub; none of `union`/`subtract`/`intersect`/`fillet` are bound to anything real. `packages/geometry/src/boolean.ts` exists but has zero callers.
  - **Severity:** Blocks Phase-1 gate for the stated boolean-ops P0 feature. Users cannot actually boolean two meshes today through the UI.

- **WebGPU path** (PRD §6.1, §6.3, §16.5).
  - Missing: only WebGL in `useThreeViewport.ts`.
  - **Severity:** Nice-to-have for Phase-1; blocks the "near-native" positioning claim.

- **Section box interactive 3D sectioning** (PRD §7.1.4 "Section Box P0").
  - Partial: `SectionBoxPanel.tsx` exists and is wired; `useSectionBox` hook exists; `sectionBox.ts` exists. `sectionSlice.ts` (the actual slice computation at boundary) exists with tests but has no UI consumer — the section panel appears to only visualize a bounding box, not cut live geometry.
  - **Severity:** Already superseded by the competitive-roadmap issue #05; but PRD promises it now.

- **Sheet layout + multi-page PDF export** (PRD §7.3.1 "Sheet Layout P0", T-PDF-003 multi-page).
  - Partial: `SheetPanel.tsx` exists and is wired. `titleBlock.ts`, `drawingManager.ts`, `labelRenderer.ts` exist as lib modules with no UI consumers. Export path goes through `ImportExportModal.tsx`'s conflated dual PDF pipeline (see contract audit). Multi-page sheet-set export has no evidence.
  - **Severity:** Blocks Phase-2 gate ("Construction document set exportable as PDF").

- **Auto-tags / dimension auto-update** (PRD §7.1.2 "Dimension Tool P0", T-2D-003 "dimension updates dynamically when geometry changes"; §7.3.1 "Tagging P0").
  - Missing: `dimensions.ts` lib module has rich compute for chain/ordinate/radial/diameter dimensions but no UI consumer. `labelRenderer.ts` (autotext) same story. No evidence the existing dimension tool in `useViewport.ts` updates when the underlying element moves.
  - **Severity:** T-2D-003 is P0; likely blocks Phase-1 gate.

- **Schedule / quantity takeoff UI actually driven by schedule module** (PRD §7.2.1 "Schedule / Quantities P0").
  - Partial: `SchedulePanel.tsx` is wired and imports `computeTakeoff` from `lib/quantityTakeoff.ts`. `lib/schedules.ts` (the richer door/window/room schedules per competitive-roadmap #07) has tests but **no UI consumer**. The wired path is the minimal one.
  - **Severity:** P0 for Phase-2; mostly solvable with ~1 day of wiring.

- **AI prompt-to-project (design generation)** (PRD §8.2.1, T-AI-001..T-AI-005).
  - Partial: `@opencad/ai` exports `generateProject`, `FloorPlanGenerator`, and `designCommands`. **Zero consumers in `packages/app`.** AIChatPanel streams text — it never calls `generateProject` or injects elements into the document. So T-AI-001..T-AI-005 pass the unit tests, but the user flow ("prompt → JSON → elements in my document") does not exist.
  - **Severity:** Blocks Phase-2 gate; this is the PRD's flagship AI feature.

- **AI design modification applied as BIM operations** (PRD §8.2.2, T-AI-010..T-AI-012).
  - Missing: `designCommands.ts` exists, is exported from `@opencad/ai`, has no consumer.
  - **Severity:** Blocks Phase-2 gate.

- **Background sync queue via service worker** (PRD §9.4 "Service Worker (background) / Poll sync queue every 5s").
  - Partial: Service worker is registered (PWA), but the "poll sync queue every 5s → batch → POST to server → mark synced" loop is not present. Sync happens in-process via `syncAdapter.ts` through a WebSocket in `localSyncClient.ts`. Persistence goes to IndexedDB directly, not via a background SW.
  - **Severity:** Medium; the net effect is similar ("local edits persist, get pushed when online") but the SW-queue architecture is not what ships.

- **Clash detection between MEP systems** (PRD §7.2.2 "Clash Detection P0").
  - Partial: `lib/clashDetection.ts` + `lib/clashRules.ts` exist with tests. `ClashDetectionPanel` is wired in AppLayout. `ClashPanel` (separate, older?) also exists and is NOT wired. Unclear if the wired panel uses the rules engine or only the basic detector; contract audit notes two panels with likely overlap.
  - **Severity:** Medium; may already work but needs verification.

- **Version history UI** (PRD §7.1.1 "Version History P1", T-DOC-006).
  - Partial: `VersionHistoryPanel.tsx` is imported in AppLayout but `@opencad/document`'s version path (`DocumentModel.createVersion` / `restoreVersion` / `getVersionList`) is auto-triggered by... nothing the contract audit could find. `scheduleSave` debounce fires every 2s but no listener. Contract audit flagged this.
  - **Severity:** P1; acceptable to slip.

- **Plugin marketplace + installable plugins** (PRD §12, T-PLG-001..T-PLG-005).
  - Partial: `MarketplacePanel.tsx` wired, `pluginRegistry.ts` + `sandbox.ts` + `workerSandbox.ts` exist. Contract audit found `createPluginAPI` only consumed by its own test — the registry and sandbox are not hooked to the real document store. Plugins cannot actually create walls (T-PLG-002) in the running app.
  - **Severity:** Blocks Phase-2 gate.

- **OPFS usage for large binary assets** (PRD §9.2, §15.3).
  - Missing: Only one grep hit and it's in PRD.md itself. No runtime code references `navigator.storage.getDirectory()` or OPFS anywhere.
  - **Severity:** Nice-to-have for Phase-1; required for Phase-2 local-AI-model storage.

- **BCF roundtrip connected to the BCF panel** (PRD §11.2.2 "BCF P0").
  - Partial: `packages/document/src/bcf.ts` is whole-module dead (contract audit). `BCFPanel.tsx` is wired but has its own parallel type system (lowercase enums) that doesn't match the document-package types (Title Case). No interop.
  - **Severity:** P0 for OpenBIM positioning; blocks BCF certification (PRD §11.8).

- **Archicad .pln / .pla import** (PRD §11.2.3 P0, T-AC-001..T-AC-007).
  - Missing / stub: `packages/document/src/archicad.ts` exists; checking import path yields no real binary parse. Tests likely only hit the stub.
  - **Severity:** The PRD makes this a P0. Realistically it's Phase-3+ work. Should be de-scoped from P0.

- **Revit .rvt server-side conversion** (PRD §11.2.3 P0, T-RVT-001..T-RVT-007).
  - Missing / stub: `revit.ts` contains `importFile` that returns a synthetic document with `levelId: ''` (contract audit finding #6). No server conversion flow.
  - **Severity:** Same as PLN — de-scope.

- **buildingSMART IFC certification** (PRD §11.8, targeted Month 9 / Phase 3).
  - Missing: Not yet attempted; tests exist but not the cert pipeline.
  - **Severity:** Phase-3 gate; acceptable to not be there now.

## Scope creep we added

The code tree contains substantial work that the PRD does not name. Most of it corresponds to the 52-issue competitive roadmap and is therefore intentional scope-creep — but the PRD has not been updated to reflect it.

- **Competitive-roadmap compute libraries** (most of `packages/app/src/lib/`). Not in PRD; filed as issues in `docs/competitive-roadmap/`. Concrete list:
  - Wall junctions — `wallGraph.ts` (#01 PRD-absent)
  - SEO — `seoResolver.ts` (#02; the one lib used by `useThreeViewport.ts`)
  - Composite walls — `composite.ts` in `@opencad/document` (#04)
  - Sections live-cut — `sectionSlice.ts` (#05, unwired)
  - Elevations — `elevations.ts` (#06, unwired)
  - Schedules richer — `schedules.ts` (#07, unwired)
  - Layout book — `titleBlock.ts`, `drawingManager.ts` (#08, unwired)
  - Parametric doors/windows — `parametricOpenings.ts` (#09, unwired)
  - Rule-based stairs — `stairGeometry.ts` (#10, unwired)
  - Multi-plane roof — `roofGeometry.ts` (#11, unwired)
  - Curtain wall grid — `curtainWallGrid.ts` (#12; `CurtainWallPanel` is wired but may not consume this)
  - Parametric object library — `parametricObjects.ts` (#13; `ObjectLibraryPanel` wired separately)
  - Layer combos + overrides — `layerCombinations.ts` (#14, unwired)
  - Trim/extend/split — `editOps.ts` (#15, unwired)
  - Railing pattern — `railingGeometry.ts` (#16, partial)
  - Shell — `shellGeometry.ts` (#17, unwired)
  - Morph — `morphOps.ts` (#18, unwired)
  - Terrain mesh — `terrainMesh.ts` (#19, unwired)
  - Complex profiles — `structuralProfiles.ts` (#20, unwired)
  - Axis lock / smart guides — `inference.ts` (#21, partially wired in `useViewport`)
  - Magic wand — `boundaryTracer.ts` (#22, unwired)
  - Groups — `groups.ts` (#23, unwired)
  - Mirror/rotate/array — `transforms.ts` (#24, unwired)
  - Pickup/inject — `pickupInject.ts` (#25, unwired)
  - Favorites — `favorites.ts` (#26, unwired)
  - Smart hotspots — `elementHotspots.ts` (#27, unwired)
  - Surfaces vs materials — `surfaces.ts` (#28, unwired)
  - Physical properties — `thermalProps.ts` (#29, unwired)
  - User hatch patterns — `hatchPatterns.ts` (#30, unwired beyond basic hatch)
  - Details — `details.ts` (#31, unwired)
  - Worksheets — `worksheets.ts` (#32, unwired)
  - Full dimension suite — `dimensions.ts` (#33, unwired)
  - Labels + autotext — `labelRenderer.ts` (#34, unwired)
  - Zones / room stamps — `zoneStamp.ts` (#35, unwired)
  - Drawing manager — `drawingManager.ts` (#36, unwired)
  - Stories + view filters — `storyFilter.ts` (#37, unwired)
  - 3D display filter — `displayFilter.ts` (#38, unwired)
  - View map templates — `viewMap.ts` (#39, unwired)
  - Sun study animation — `sunAnimation.ts` (#41, unwired)
  - Clash rules — `clashRules.ts` (#44, unwired)
  - Structural export — `structuralExport.ts` (#43, unwired)
  - 3D export OBJ — `objExport.ts` (#49, unwired)
  - PDF trace — `pdfUnderlay.ts` (#51, unwired)
  - Reserve/release CRDT — `reservations.ts` (#52, unwired)
  - Carbon — `carbonDatabase.ts` (PRD has cost estimation §8.2.5 but not carbon)
  - CSI specs — `csiSpecs.ts` (not in PRD)
  - OSM import — `osmApi.ts` (not in PRD, probably supports site import)
  - **Recommendation:** These are all well-tested. The right move is to **integrate** them into the PRD as Phase-1.5 / Phase-2 deliverables (the 52 issues already categorize them), and to **prioritise wiring** them into the UI panels rather than adding more.

- **Non-roadmap scope creep** (not in PRD, not in 52 issues):
  - `CarbonPanel` / `carbonDatabase.ts` — embodied-carbon tracking. Real, tested, wired. PRD only mentions cost estimation.
    - **Recommendation:** Add to PRD §8.2.5 (Analysis & Optimization) as new feature. Keep.
  - `PhotoToModelPanel` / photo-to-model. Not in PRD. Wired.
    - **Recommendation:** Phase-4 experiment. Keep but flag.
  - `CostPanel` — cost estimation. PRD has this in §8.2.5 but it's a UI panel, not just AI.
  - `Spec writing` / `SpecWritingPanel` + `csiSpecs.ts` — construction-spec writing. Not in PRD.
    - **Recommendation:** Fold into PRD §7.3 Construction Documents.
  - `WindAnalysisPanel` — not in PRD. Wired.
    - **Recommendation:** Phase-4 experiment, or scope into energy analysis.
  - `ShadowAnalysisPanel` + `solarAnalysis.ts` — daylight/solar analysis. PRD §8.2.5 "Solar Analysis" kind-of covers it. OK.
  - `SiteImportPanel` + `osmApi.ts` — OSM site import. Not in PRD but supports §7.2.1 site context; fold into PRD.
  - `FeedbackWidget` — product telemetry / user feedback form. Not in PRD but appropriate for a pre-launch app.
  - `PermissionsPanel` + role switcher — roles/permissions not in PRD detail (§16.3 Security mentions RBAC generically). Fold in.
  - `SubscriptionModal` + `BillingPanel` + Stripe integration — PRD §6.6 hosted subscription model is there but the actual Firebase-Auth + Stripe + trial-tracking pipeline is richer than PRD describes. Update PRD §6.6.
  - `MFASettingsPanel`, `SSOSettingsPanel`, `APIKeyPanel` — auth features. PRD §15.4 mentions "Firebase Auth (OAuth2 + OIDC)". SSO is Phase-3 per PRD §14; it's already here. Accelerates the timeline.

Net scope-creep assessment: **most of it is defensible** (either already-planned roadmap issues or plausible adjacencies), but **the PRD has not been updated in ~3 months of shipping.** That is the actual divergence.

## PRD-level contracts now broken

- **"CRDT-backed offline-first via Yjs"** (PRD §10.2, §15.3) — shipped as bespoke Rust LWW. Whole section is now wrong.
- **"WASM geometry kernel via OpenCASCADE"** (PRD §6.3, §15.2) — kernel is a stub; geometry runs in pure TS.
- **"WebGPU primary rendering"** (PRD §6.1, §15.1, §16.5) — WebGL only.
- **"Service-worker background sync"** (PRD §9.4) — not implemented; sync is in-process WebSocket.
- **"Plugin API against the real document model"** (PRD §12.2) — plugin sandbox exists but is not wired to the real store (contract audit).
- **"AI code compliance from a button in the app"** (PRD §8.2.3) — compliance panel is not rendered in AppLayout.
- **"Prompt-to-project generates BIM objects in the document"** (PRD §8.2.1) — `generateProject` has zero app consumers.

## Test-ID coverage spot check

Sampled 12 load-bearing PRD test IDs. "Exists" means a test file references the ID; "Passes today" is best-effort based on the contract audit's inventory of what is live vs. dead.

| Test ID | Exists in tests | Passes today | Notes |
|---|---|---|---|
| T-DOC-001 | Yes | Yes | `e2e/document.spec.ts:13` — Playwright E2E |
| T-DOC-002 | Yes | Yes | Playwright + unit (`useAutoSaveV2.test.ts`) |
| T-DOC-003 | Yes | Unknown | `useIndexedDB.test.ts:29` + `document.spec.ts`. Sync-reconnect flow is through `syncAdapter`. Likely passes unit; e2e may or may not exercise real server. |
| T-2D-001 | Yes | Yes | Referenced in PRD and `docs/TDD_GUIDE.md`; concrete tests exist under `hooks/useViewport.test.ts` |
| T-3D-001 | Yes | **Yes-but-dead** | `packages/geometry/src/primitives.test.ts:10` — tests `createBox`, but `@opencad/geometry` has zero non-test consumers (contract audit). Passes in isolation; not exercised end-to-end. |
| T-3D-002 | Yes | **Yes-but-dead** | Same story — tests pass for `createSphere` but rendering doesn't go through this module. |
| T-AI-001 | Yes | **Yes-but-dead** | `packages/ai/src/features.test.ts:25`, `generate.test.ts`. Passes unit. `generateProject` has zero callers in `packages/app`. |
| T-AI-020 | Yes | Yes | `packages/ai/src/validation.test.ts:357`, `codeCompliance.ts`. Unit passes. Panel is not wired to UI — so passing unit but not usable. |
| T-AI-024 | Yes | Yes | Sync / no-network. Good. |
| T-OFF-001 | Yes (dead package) | **Dead-code pass** | `packages/sync/src/offline.test.ts:42` — this package is dead (contract audit). The test passes but it does not test the live offline path (which is `syncAdapter` + `offlineStore`). |
| T-COL-001 | Yes (dead package) | **Dead-code pass** | `packages/sync/src/index.test.ts:19`, `crdt.test.ts`. Same — tests the dead Yjs-era code. The live CRDT is `@opencad/sync-rs` which has its own Rust-level tests. |
| T-COL-003 | Yes | Unknown | Offline + concurrent merge — tested in `packages/sync` (dead) and has an e2e at `e2e/collaboration.spec.ts:113`. E2E likely exercises live adapter. |
| T-PLG-001 | Yes | Yes-but-dead | `pluginRegistry.test.ts`, `sandbox.test.ts`. Sandbox is not wired to real store. |
| T-IFC-001 | Yes | Yes | `packages/document/src/ifc.test.ts:94`. Live package. |
| T-IFC-005 | Yes | Yes | Round-trip. Live package. |
| T-SUB-001 | Yes (dead package) | **Dead-code pass** | `packages/sync/src/sync-client.test.ts:111`. Test is good; but it tests a sync client that the app does not use. |

**Headline numbers the PRD may be publishing wrong.** The PRD does not itself state a "% complete" number; however the memory index notes "Phase 1 ~35% done." Given the above, a more honest framing is:

- Phase-1 compute layer: ~80% done (most algorithms exist and are tested).
- Phase-1 UX wiring: ~45% done (half the promised panels are either unwired, wired to wrong engine, or rely on dead tests).
- Phase-1 infra claims (Yjs, WebGPU, OpenCASCADE, OPFS, SW sync): ~15% done (mostly either stubbed or replaced).

So "35% done" is in the right ballpark if you weight toward end-to-end user value, and optimistic if you weight toward PRD-as-written.

## Recommendations for the wiring phase

Ordered by "maximum PRD alignment per hour of work."

1. **Wire `CompliancePanel` into `AppLayout.tsx`** as a right-panel tab. The component works; the IBC engine works; only the mount is missing. Single-biggest PRD promise reclaimed.
2. **Wire `generateProject` / `designCommands` into `AIChatPanel`.** When the assistant message contains a structured "design brief" (per PRD §8.2.1 step 3), call `generateProject(brief)` and inject returned elements through `useDocumentStore.addElement`. Adds the prompt-to-project flow the PRD's AI section is built around.
3. **Wire `sectionSlice.ts` into `SectionBoxPanel`**: the panel currently shows a bounding box but does not actually slice geometry. Wiring the slice computation turns Section Box from a visualizer into the PRD's "Interactive 3D sectioning (P0)."
4. **Delete `@opencad/sync` and `@opencad/geometry` from the tree** (or at least stop exporting them). Their dead tests are creating false positives in T-COL / T-3D / T-SUB and obscuring the fact that the live CRDT is `@opencad/sync-rs` and the live geometry is in `packages/app/src/lib` + Three.js. This also collapses the compliance-engine duplication.
5. **Canonicalise the material path.** Pick `properties.MaterialId`, rewrite the three callsites, delete the `element.material` accesses. Unblocks carbon, schedules, and IFC export agreeing on a single value.
6. **Collapse to ONE PDF exporter and ONE DXF pipeline** (contract audit's recommendation). Restores PRD §7.3.1 and §11.2.4 single-format-per-export promise.
7. **Wire `schedules.ts` into `SchedulePanel`** alongside `quantityTakeoff` — this moves us from "quantities only" to "door/window/room schedules" which is what PRD §7.2.1 actually lists.
8. **Update PRD §10.2 + §15.3** to describe the Rust LWW CRDT instead of Yjs. (Don't rewrite the code; rewrite the spec.)
9. **Update PRD §6.3 + §15.2** to mark OpenCASCADE as "Phase-2 / deferred" and describe the mesh-first approach we actually ship.
10. **Wire the plugin sandbox to the real document store.** Small code change (`plugins/sandbox.ts:108-113` — replace the `as any` cast with a real adapter onto `useDocumentStore.getState().addElement`). Unlocks T-PLG-002 end-to-end.

## Notes

- The contract audit's "three compliance engines" finding is echoed here at PRD level — PRD §8.2.3 describes ONE engine; we built three and wired zero of them to the UI.
- The `@opencad/sync` tests (T-SUB-*, T-COL-001 in sync package, T-OFF-001 in sync package) all pass and are green in CI, which hides the fact that they test a package that is no longer integrated. Whoever reads the green bar assumes T-COL-001 is live — it is not, in the sense that the code-path the user hits goes through `syncAdapter` + `sync-rs` and does *not* execute those tests' code. Suggest either (a) deleting the dead package, or (b) renaming the tests so the ID reuse in `sync-rs` is explicit.
- The contract audit noted `Viewport.tsx` is dead (replaced by `SplitViewport`). That's consistent with the PRD §7.1.4 "Multi-Viewport" promise — the multi-viewport path is the live one.
- PRD appendix A lists T-E2E-001 and various T-PLN-*, T-RVT-*, T-SKP-* tests; these were not spot-checked but based on the file-format-adapter stubs in `document/src/archicad.ts`, `revit.ts`, `sketchup.ts` they are likely all in the "exists + passes unit but does not actually parse real files" category.
- The memory note "Phase 1 ~35% done" and "P0 blockers: serverApi.ts missing auth token, /auth/me never called" is consistent with this audit — though neither of those specific P0 blockers was re-verified here.
- The uncommitted diff on `HatchPanel`, `MarketplacePanel`, `Navigator`, `ProjectBrowser`, `ProjectDashboard`, `SheetPanel`, `Viewport`, `useViewport`, `useThreeViewport`, `bim.test.ts`, `document.ts`, `app.css` is active work that may resolve some of the above findings. This audit reflects HEAD + staged/unstaged state as of 2026-04-19.
