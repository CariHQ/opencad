# T-IO-049 — 3D export (OBJ / FBX / glTF)

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:compat · **Complexity:** Small

## Why

Renderers, game engines, 3D-print services, and web viewers consume OBJ / FBX / glTF. The current export set is BIM-centric (IFC, DWG, PDF, SVG) but not mesh-centric. Exporting to these formats opens OpenCAD to a huge adjacent market — 3D-print shops, game developers, VR/AR authoring, animation studios.

## Scope

### In scope
- Export the 3D scene as:
  - **OBJ + MTL**: triangle mesh + per-material file.
  - **FBX**: binary and ASCII; include materials, basic lighting, scene hierarchy.
  - **glTF 2.0 + GLB**: PBR materials, textures embedded in GLB.
- Export options: coordinate system (Y-up / Z-up), unit scale, triangulate / quad-preserving, merge by material.
- Supports full project or current selection.

### Out of scope
- Animation export.
- Morph targets.
- Skeletal rigs.

## Proposed approach

1. Use `three`'s built-in `OBJExporter`, `FBXExporter` (via `three/addons`), `GLTFExporter`.
2. Export pipeline: build the full 3D scene as we do for rendering, then invoke the exporter.
3. Options dialog.

## Acceptance criteria

- [ ] Exporting a `three-bedroom` model to OBJ produces a valid .obj + .mtl that opens in Blender with visible walls, roof, doors.
- [ ] Exporting to glTF 2.0 produces a .gltf + .bin that opens in `https://gltf.report/` with correct materials.
- [ ] Exporting to FBX opens in Unity / Blender with correct hierarchy.
- [ ] Coordinate system conversion flags work: Y-up or Z-up.
- [ ] Unit-scale converts mm → m when requested.

## Test plan

New `packages/app/src/lib/export/obj.test.ts`:

- `T-IO-049-001` — exporting a single box returns a .obj with 1 group, 8 vertices, 6 faces.
- `T-IO-049-002` — materials present in MTL file.
- `T-IO-049-003` — coordinate conversion Y-up vs Z-up swaps Y and Z values.

Similar for gltf and fbx:

- `T-IO-049-004` — glTF has correct PBR material properties.
- `T-IO-049-005` — FBX ASCII text contains expected node hierarchy.

Harness:

- `T-IO-049-006` — `export-3d-demo` exports each format; file non-zero sized.

## Dependencies

- None.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:compat`, `p2`
