# Function Contract Audit — 2026-04-19

## Summary
Scanned `packages/app`, `packages/document`, `packages/shared`, `packages/sync`, `packages/geometry`, `packages/ai` (source files only; test files excluded from dead-code analysis except where noted). The biggest findings: three of the six monorepo TS packages (`@opencad/sync`, `@opencad/geometry`, and most of `@opencad/shared`) have effectively zero non-test consumers — `@opencad/sync` has been wholly replaced by `packages/app/src/lib/syncAdapter.ts` + `@opencad/sync-rs` (WASM). Large swaths of `@opencad/document` (the `level.ts`, `versioning.ts`, `mep.ts`, `bcf.ts`, `structural.ts`, `storage.ts`, `io.ts` helpers, and most of `dwg.ts`'s export variants) exist only in their own tests. There are three independent "compliance engine" implementations, two separate PDF serializers, and a Viewport component that was replaced by SplitViewport but left in the tree. Contract-wise, the most dangerous issues are: the `updateElement(id, updates)` store method takes `Record<string, unknown>` and `Object.assign`s arbitrary keys onto `ElementSchema`, bypassing TS entirely (e.g. `AppLayout.tsx:662` attaches a free-form `material` property that conflicts with the `setElementMaterial` path that writes `properties.MaterialId`); `CompliancePanel.tsx` casts between two incompatible `DocumentSchema` declarations (`@opencad/document` vs `@opencad/ai`'s shadow types) whose `ElementType` unions actually differ; and the store's `updateLevel` / `deleteLevel` silently no-op on missing IDs while `DocumentModel.updateLayer` / `deleteLayer` throw — peers with divergent error contracts.

---

## 🔴 Contract mismatches (fix urgently)

- **`documentStore.updateElement` accepts arbitrary keys and mutates `ElementSchema`.**
  - Location: `packages/app/src/stores/documentStore.ts:377` (implementation), `packages/app/src/AppLayout.tsx:662` (offending caller)
  - Contract (apparent): caller passes fields belonging to `ElementSchema` (e.g. `visible`, `locked`, `properties`, `layerId`).
  - Reality: the method types `updates: Record<string, unknown>` and performs `Object.assign(element, updates)`, so any key is accepted. `AppLayout.tsx:662` attaches `{ material: mat.name }` — `material` is NOT a field on `ElementSchema`. Readers later have to do `(el as { material?: string })?.material` (see `AppLayout.tsx:658`).
  - Affected callsites: `AppLayout.tsx:662`, `useThreeViewport.ts:1359`, worker plugin bridge at `plugins/workerSandbox.ts:116`, and several tests.

- **Two mutually exclusive places where an element's material is stored.**
  - Location A: `documentStore.setElementMaterial` writes `element.properties['MaterialId'] = { type: 'string', value: materialId }` (`packages/app/src/stores/documentStore.ts:420`).
  - Location B: `AppLayout.tsx:662` does `updateElement(id, { material: mat.name })`, writing a top-level `material: string` field on the element object.
  - Readers at `AppLayout.tsx:658` look at `element.material`; other consumers (carbon / schedule utils) read `properties['MaterialId']`. Elements touched by A won't be detected by B's reader and vice-versa.
  - Recommendation: pick one canonical location. Probably `properties.MaterialId`.

- **`documentStore.updateLevel` / `deleteLevel` silently no-op on missing IDs; `updateLayer` / `deleteLayer` (which go through `DocumentModel`) throw.**
  - Location: `packages/app/src/stores/documentStore.ts:594`, `:611` (levels), vs. `packages/document/src/document.ts:474`, `:486` (layer methods that `throw new Error`).
  - Contract: callers of `updateLayer`/`deleteLayer` must handle throws; callers of `updateLevel`/`deleteLevel` assume silent success.
  - Level actions also bypass `DocumentModel` entirely (they mutate `document.organization.levels` directly), so they don't emit save events, don't update `metadata.updatedAt`, and don't enqueue CRDT ops. Adds / renames of layers go through `model.addLayer` / `model.updateLayer`; levels do not — inconsistent peer.

- **`DocumentModel.addElement` and the standalone `addElement(document, params)` share a name but have different required-field contracts.**
  - Locations: `packages/document/src/document.ts:99` (standalone: `levelId: string` **required**) and `packages/document/src/document.ts:518` (method: `levelId?: string` **optional**).
  - Both are exported from `@opencad/document`. `documentStore.ts:337` calls `model.addElement({ type, layerId, geometry, properties })` — no `levelId`. Safe today because it's the method, but if any code imports the standalone `addElement` by name (auto-import, agent refactor) the TS error will point to a missing required field that seemed optional one line above.
  - Standalone version is used by `packages/document/src/dwg.ts` parseDXF. Recommendation: rename one.

- **`@opencad/ai`'s `DocumentSchema` is not structurally identical to `@opencad/document`'s, despite the comment in `CompliancePanel.tsx:17` claiming they are.**
  - Location: `packages/ai/src/types/document.ts:65-101` vs `packages/document/src/types.ts:77-111`.
  - `@opencad/ai`'s `ElementType` includes `spline`, `duct`, `pipe`, `cable_tray`, `conduit`, `structural_member` (not in `@opencad/document`). `@opencad/document`'s includes `curtain_wall` (twice — see next finding) and `duct`/`pipe` with different spelling, but lacks `spline`. A real document containing a `curtain_wall` element will not satisfy `@opencad/ai`'s `ElementType` union at runtime-cast time.
  - Callsites: `CompliancePanel.tsx:18`, `:25`, `:31` all do `doc as Parameters<typeof checkCompliance>[0]`. The casts hide the drift. If either union grows, the compliance rules will silently miss elements.

- **`packages/document/src/types.ts:77` `ElementType` union lists `curtain_wall` twice.**
  - Location: `packages/document/src/types.ts:105` and `:111`.
  - Harmless at type level (TS unions dedupe) but a strong smell of merge drift. `@opencad/shared`'s `ElementType` (`packages/shared/src/document.ts:16`) and `@opencad/ai`'s `ElementType` each define their own narrower / different unions — three divergent sources of truth for the same concept.

- **`revit.ts`'s stub `importFile` creates elements with `levelId: ''` (empty string) instead of `null`.**
  - Location: `packages/document/src/revit.ts:250`.
  - Contract: `ElementSchema.levelId: string | null`. Empty string is legal to the type but semantically means "attached to a level called ''". Downstream `?? 'n/a'` guards in `bcf.ts:291` and `schedules.ts:101/117/134` fire only on null/undefined, so empty-string levelIds leak through as literal `''` in schedules and BCF.
  - `importFile` is only exported from `revit.ts` (not from `index.ts`), so no external caller today; flagging before someone hooks it up.

- **`Viewport` component uses `drawingState?.isDrawing` but `useViewport()` returns a non-nullable `drawingState`.**
  - Location: `packages/app/src/components/Viewport.tsx:37`, `:41`, `:52`, `:87`. The hook seeds `drawingState` via `useState<DrawingState>({...})` at `packages/app/src/hooks/useViewport.ts:125`.
  - Harmless (optional chaining on a non-null is just noisy), but the `?.` is a signal that the caller once expected an optional value. Check whether the hook's return shape used to be `DrawingState | null`.

- **`updateElement` in the plugin worker bridge casts with `as`, silencing any mismatch.**
  - Location: `packages/app/src/plugins/workerSandbox.ts:114-118` and `packages/app/src/plugins/sandbox.ts:111-113`.
  - Plugin API's `DocStore.addElement(el: Record<string, unknown>): Record<string, unknown>` doesn't match the real store's `addElement({type, layerId, ...}) => string`. If ever wired to the real store, the plugin contract will silently pass through unvalidated props. Today `createPluginAPI` is only used from its own test, so it's latent.

- **`ImportExportModal.tsx` mixes two PDF exporters in a single fallback chain.**
  - Location: `packages/app/src/components/ImportExportModal.tsx:74-80`.
  - `exportToPDFDataURL(doc)` returns a data URL string that already embeds a full PDF; `serializePDF(doc)` returns a raw textual PDF stream. Calling `dataUrl || serializePDF(doc)` conflates two different output shapes. Almost certainly a bug where the chain was meant to be "try canvas-rich export, fall back to text", but both branches feed into the same variable consumed as one format.

---

## 🟡 Likely-dead code (candidates for removal after verification)

### Whole packages with zero consumers

- **`packages/sync` (`@opencad/sync`)** — no files outside the package import it. `ripgrep "from ['\"]@opencad/sync['\"]"` returns zero hits. The live sync layer is `packages/app/src/lib/syncAdapter.ts` backed by `@opencad/sync-rs` (Rust/WASM). All exports (`SyncClient`, CRDT helpers, presence, offline, replay, close-guard, subscription, comments, latency) have no non-test callers.
  - Safe to remove? Needs-review — the package exists on `pnpm-lock.yaml` and may be referenced by CI or docs, but it ships no code. Most likely: delete and simplify turborepo graph.

- **`packages/geometry` (`@opencad/geometry`)** — `ripgrep "from ['\"]@opencad/geometry['\"]"` returns zero hits. Nothing in `packages/app` imports `ElementBatch`, `pickElement`, `fitViewport`, `triangulateCircle`, `triangulateArc`, `computeFaceNormals`, `computeSmoothNormals`, or `IElementBatch`. Rendering goes through Three.js directly in `useThreeViewport.ts`.
  - Safe to remove? Needs-review — matches the PRD's "WASM geometry kernel" ambition but no runtime wiring exists yet.

### Dead exports from `@opencad/shared`

Only `parseLength` is consumed externally (`packages/app/src/components/CoordBox.tsx:16`, one test). Everything else in `@opencad/shared` is dead:

- `packages/shared/src/bim.ts` — entire file: `IFCEntityType`, `IFCProperty`, `IFCData`, `BIMCategory`, `BIMElement`, `BIM_ELEMENT_CATEGORIES`, `IFC_MAPPING`, `BIM_MATERIAL_CATEGORIES`, `MaterialCategory`, `BIMMaterial`. The app's `BIMMaterial` type (`packages/app/src/lib/materials.ts:157`) is a local redeclaration, not the shared one.
- `packages/shared/src/events.ts` — entire file: `EventType`, `AppEvent`, `ElementEvent`, `SelectionEvent`, `SyncEvent`, `CameraEvent`, `EventHandler`, `EventBus`, `createEvent`. Grepped: only `packages/sync/src/sync-client.ts` (itself dead) references `EventBus`.
- `packages/shared/src/document.ts` — entire file: `UUID`, `VectorClock`, `PropertyValue`, `PropertyDefinition`, `PropertySet`, `ElementGeometry`, `CRDTMetadata`, `CRDTElement`, `CRDTLayer`, `CRDTLevel`, `CRDTView`, `CRDTMaterial`, `CRDTSpace`, `CRDTAnnotation`, `CRDTDocument`, `createUUID`, `createVectorClock`, `incrementVectorClock`, `mergeVectorClocks`. Only internal to `@opencad/shared` and `@opencad/sync` (also dead). `@opencad/document` has its own `DocumentSchema` that is the live one.
- `packages/shared/src/geometry.ts` — all types (`Vector2D`, `Point2D`, `Line2D`, `Circle`, `Arc`, `Polyline2D`, `BezierCurve`, `NurbsCurve`, `Polygon2D`, `Surface`, `BrepSolid`, `Mesh`, `Geometry`, `createPoint2D/3D`, `createLine2D/3D`, `distance2D/3D`, `midpoint2D/3D`, `crossProduct`, `dotProduct`, `normalize`). Only internally re-exported.
- `packages/shared/src/project.ts` — entire file: `ProjectStatus`, `ProjectTemplate`, `ProjectMetadata`, `Project`, `SyncStatus`, `SyncOperation`, `ConflictResolution`, `ProjectVersion`, `ProjectListItem`, `ImportResult`, `ExportResult`, `FileFormat`, `ExportOptions`. No external consumers. Safe to remove? Needs-review — could be intended public API for plugins.

### Dead modules inside `@opencad/document`

Each of these is exported from `index.ts` via `export * from './…'` but grepping the monorepo shows only the module's own test file uses them:

- `packages/document/src/level.ts`: `createLevel`, `updateLevelElevation`, `updateLevelHeight`, `updateLevelName`, `reorderLevels`, `getLevelAtElevation`. Callers found: 0 (tests only — `level.test.ts`). `DocumentModel.addLevel` is the path actually used.
- `packages/document/src/versioning.ts`: `Version`, `VersionList`, `createVersion` (standalone), `createVersionFromState`, `listVersions`, `getVersion`, `deleteVersion`, `pruneOldVersions`, `compareVersions`, `VersionDiff`. Callers found: 0. `DocumentModel.createVersion / getVersion / restoreVersion / getVersionList` are the live path.
- `packages/document/src/structural.ts`: `FoundationSchema`, `FootingSchema`, `RebarSchema`, `TrussSchema`, `BraceSchema`, `createFoundation`, `foundationVolume`, `foundationBearingCapacity`, `createFooting`, `footingVolume`, `createRebar`, `rebarWeight`, `createTruss`, `trussRidgeHeight`, `createBrace`, plus all the `*Type` unions. Callers found: 0 (self-test + `properties.test.ts`'s property enumeration).
- `packages/document/src/mep.ts`: `createDuct`, `ductCrossSection`, `ductVolume`, `createDuctFitting`, `createPipe`, `pipeInnerDiameter`, `pipeFlowArea`, `createPipeFitting`, `createConduit`, `createCableTray`, `createMechanicalEquipment`, `createMEPSystem`, `addElementToSystem`, plus all schema interfaces. Callers found: 0.
- `packages/document/src/bcf.ts`: `createBCFTopic`, `addBCFComment`, `serializeBCF`, `parseBCF`, `documentToBCF`, `documentToCOBie`, `serializeCOBieCSV` + all BCF/COBie interfaces. Callers found: 0. The app's `BCFPanel.tsx:1-30` defines its own parallel `BCFStatus` / `BCFPriority` / `BCFTopic` with *lowercase* enum values that don't match document-package's Title Case.
- `packages/document/src/composite.ts`: `compositeThickness`, `validateComposite`, `migrateLegacyWallToComposite`. Only `BUILT_IN_COMPOSITES` is used (by `document.ts:22`). The three helpers are test-only.
- `packages/document/src/io.ts`: `FileSizeLimitError`, `CorruptedFileError`, `UnsupportedFormatError`, `ImportParseError`, `ImportProgress`, `ProgressCallback`, `ImportOptions`, `ImportResult<T>`, `ImportError`, `SUPPORTED_IMPORT_FORMATS`, `SUPPORTED_EXPORT_FORMATS`, `SupportedImportFormat`, `SupportedExportFormat`, `getFileExtension`, `isFormatSupported`, `detectFormat`, `createUnsupportedFormatError`, `createCorruptedFileError`, `importWithProgress`, `BatchImportResult`, `batchImportFiles`, `ExportOptions`, `validateDocumentStructure`. Callers found: 0 outside `io.test.ts`.

### Dead / overlapping exports from `@opencad/document/dwg.ts`

Live: `parseDXF`, `serializeDXF`, `parseDWG`, `exportToDXF` (used by `ImportExportModal.tsx`).
Dead outside tests: `parseDxf` (lowercase), `dxfToDocument`, `documentToDxf`, `importDXF`, `exportDXF`, `serializeDWG`, `DXFResult<T>`. These are alternative spellings of the same pipeline.

### Dead functions inside `@opencad/document/element.ts`, `layer.ts`, `diff.ts`, `material.ts`

- `element.ts`: `createElement`, `updateElementTransform`, `updateElementProperty`, `updateElementBoundingBox`, `setElementVisibility`, `setElementLocked`, `moveElementToLayer`, `moveElementToLevel`, `getElementVolume`, `getElementCenter` — all test-only. (The live path is `DocumentModel.addElement` + direct mutation.)
- `layer.ts`: `createLayer`, `updateLayerColor`, `updateLayerVisibility`, `updateLayerLock`, `reorderLayers` — all test-only.
- `diff.ts`: `diffDocuments`, `ElementChange`, `DocumentDiff` — test-only.
- `material.ts`: `getMaterialById`, `getMaterialsByCategory`, `MATERIAL_CATEGORIES` — test-only. `createDefaultMaterials` is live (used by `document.ts:79`).

### Dead exports inside `@opencad/ai`

- `packages/ai/src/code-compliance.ts` — entire file: `CodeComplianceEngine`, `CodeViolation`, `ComplianceRule`, `ComplianceContext`, `ElementInfo`, `RoomInfo`, `DoorInfo`, `StairInfo`, `ComplianceResult`, etc. NOT re-exported from `index.ts`. Only consumer is `code-compliance.test.ts`. See "Duplicated implementations" below.
- `packages/ai/src/aiRouter.ts` — `AIRouter`, `AIBackend`, `createAIRouter`. NOT exported from `index.ts`. Only `aiRouter.test.ts` uses it.
- `packages/ai/src/ollamaClient.ts` — `OllamaClient`. Only used by `aiRouter.ts` (which is dead) and its own test.

### Dead UI components in `packages/app`

- `packages/app/src/components/Viewport.tsx` — `export function Viewport(...)`. Only its own test (`Viewport.test.tsx`) references it; `AppLayout.tsx:594` renders `SplitViewport` instead. ~160 lines of dead UI.
- `packages/app/src/components/ThreeViewportLoader.tsx` and `ThreeViewportInner.tsx` — lazy 3D viewport. Neither is rendered from `AppLayout` or any other live parent — only each other's tests. The code-splitting they enable is not actually in the app bundle path.
- `packages/app/src/components/index.ts` — barrel re-export. Zero importers in the monorepo. Note it also re-exports from non-existent path conventions (e.g. `export { Viewport }` which is dead).
- `packages/app/src/plugins/sandbox.ts::createPluginAPI` and `plugins/workerSandbox.ts` — not wired to the real store, only used from their own tests.

### Other viewport helpers with no production callers

- `useThreeViewport.ts#getLodLevel` (`packages/app/src/hooks/useThreeViewport.ts:29`) — only used by its own test file.
- `useThreeViewport.ts#_publishFrameStats` / `_publishSelectedCoords` are exported but only called internally within `useThreeViewport.ts`; no external publisher. The `get*` counterparts have exactly one consumer each (`StatusBar.tsx:7`, `PropertiesPanel.tsx:4`).

---

## 🟢 Duplicated / overlapping implementations

- **Three separate compliance engines.**
  - A: `packages/ai/src/codeCompliance.ts` — sync, takes `DocumentSchema` directly, IBC-rules-based. Exported from `@opencad/ai`. Used by `CompliancePanel.tsx`.
  - B: `packages/ai/src/code-compliance.ts` — `CodeComplianceEngine` class, takes a `ComplianceContext`, supports multiple jurisdictions. NOT exported from `@opencad/ai/index.ts`, only self-tested.
  - C: `packages/app/src/lib/complianceEngine.ts` — a third `ComplianceRule` interface with its own R001..R007 rule set.
  - Plus `packages/ai/src/features.ts:162` defines an async `checkCompliance(document, code)` method.
  - Recommendation: delete B (the unexported class file). Decide whether C (the app-local one) and A (the `@opencad/ai` one) should be merged; they do not share rule definitions.

- **Three PDF export paths in `packages/document/src/pdf.ts`.**
  - `renderDocumentToPDF(doc, canvas, options)` → `Blob` (canvas-image-embedded). Zero callers in src.
  - `exportToPDFDataURL(doc)` → `data:application/pdf;base64,...` string with vector line/circle output. Called at `ImportExportModal.tsx:74`.
  - `serializePDF(doc)` → plain textual PDF. Called at `ImportExportModal.tsx:80` as a fallback.
  - Recommendation: unify to one function that returns a `Blob | string` based on an options flag; delete the two unused spellings.

- **Two DXF pipelines.**
  - A: `parseDXF` → `DocumentSchema`, `serializeDXF` → string (used by the app).
  - B: `parseDxf` → `DxfEntity[]`, `dxfToDocument(entities, projectId)` → `DocumentSchema`, `documentToDxf(doc)` → string (only tested).
  - Plus `importDXF` / `exportDXF` / `exportToDXF` aliases.
  - Recommendation: keep A + `exportToDXF`, delete the others.

- **Two parallel BCF type systems.**
  - `packages/document/src/bcf.ts` — Title-case enums (`'Open' | 'In Progress' | 'Resolved' | 'Closed'`).
  - `packages/app/src/components/BCFPanel.tsx:3-15` — kebab-case/lowercase (`'open' | 'in-progress' | 'resolved' | 'closed'`).
  - No interop. The panel never imports from `@opencad/document`'s BCF module.
  - Recommendation: if BCF panel is product surface, consume the doc-package types and delete the local duplicate.

- **Two sync engines / document mutation stacks.**
  - Active: `packages/app/src/lib/syncAdapter.ts` + `@opencad/sync-rs` (WASM CRDT).
  - Inert: entire `@opencad/sync` TS package + `@opencad/document/src/document.ts`'s private `pendingOperations` / `SyncOperation` queue inside `DocumentModel`. The `queueOperation`, `setOnlineStatus`, `getPendingOperations`, `onSyncComplete` members on `DocumentModel` are called by the store only to be immediately ignored — `pendingOperations.synced` gets set to true without ever touching the network. Recommendation: delete the legacy queue or wire it to the real adapter.

- **Two `VectorClock` type definitions.**
  - `packages/shared/src/document.ts:12` (`readonly clock: Record<string, number>`)
  - `packages/document/src/types.ts:5` (`clock: Record<string, number>`)
  - Plus a third in `packages/ai/src/types/document.ts:8`. The three are *structurally* compatible but can diverge silently.

- **Two `ElementType` unions (four if you count `ai/types` and `shared`).**
  - `packages/document/src/types.ts:77` (authoritative, listed `curtain_wall` twice)
  - `packages/shared/src/document.ts:16` (narrow subset, no drafting primitives, no MEP)
  - `packages/ai/src/types/document.ts:65` (adds `spline`, `structural_member`, `cable_tray`, `conduit`; drops `curtain_wall`)
  - `packages/app/src/components/SchedulePanel.tsx:3` imports `ElementType` from `@opencad/document` — the live source of truth.
  - Recommendation: make `@opencad/document`'s union canonical; have `@opencad/shared` and `@opencad/ai` re-export it rather than redeclare.

- **Two `BIMMaterial` types.**
  - `packages/shared/src/bim.ts:117` — abstract BIM material with `density`, `thermalConductivity`, etc.
  - `packages/app/src/lib/materials.ts:157` — app's render-oriented material.
  - `MaterialsPanel.tsx:7` uses the app-local one; nothing uses the shared one.

---

## Notes

- Once `@opencad/sync`, `@opencad/geometry`, and most of `@opencad/shared` are deleted, `packages/shared` can collapse to a single-file `parseLength` module (or move that helper into `@opencad/document` directly).
- `DocumentModel` still has a large public surface for lifecycle events (`onSave`, `onSyncComplete`, `onVersion`, `getPendingOperations`) that are not subscribed to anywhere in `packages/app`. The `scheduleSave` debounce fires every 2 s but no listener is attached; nothing writes to IndexedDB as a result of that path (persistence goes through `localStorage.setItem` in the store and `offlineSaveDocument` separately). The event machinery is effectively dormant — not strictly dead (it is a class-level API) but worth a review.
- `packages/app/src/components/Viewport.tsx:14` has `const toggleView = () => {}; // TODO: wire up to parent state` — a silent-failure TODO on a non-rendered component. Double-dead.
- The `documentStore.addElement` implementation (`packages/app/src/stores/documentStore.ts:338`) casts `params.type as 'wall' | 'door' | 'window' | 'slab'` even though the downstream `model.addElement` accepts the full `ElementType`. The cast narrows the actual runtime set — a symptom of partial refactor rather than intent. Every other ElementType passed in will still work at runtime because TS types are erased, but the cast is misleading documentation.
- `documentStore.ts:336` does `const props = (params.properties || {}) as Record<string, PropertyValue>`. Incoming `params.properties` is typed `Record<string, unknown>` (from the store's interface). The cast is load-bearing: callers in `useViewport.ts` pass `{ StartX: { type: 'number', value: 0 } }` — correct `PropertyValue` shape — but nothing enforces it. A caller passing `{ StartX: 0 }` would compile (because `unknown` accepts anything) and blow up inside `computeBoundingBox` which does `properties[key]?.value`.
- `packages/app/src/components/HatchPanel.tsx`, `MarketplacePanel.tsx`, `Navigator.tsx`, `ProjectBrowser.tsx`, `ProjectDashboard.tsx`, `SheetPanel.tsx`, `Viewport.tsx`, `useViewport.ts`, `useThreeViewport.ts`, `bim.test.ts`, `document.ts`, and `app.css` are modified in the current working tree (per `git status`) but I did not audit the uncommitted diffs — this audit reflects HEAD + staged/unstaged content as it is on disk.
