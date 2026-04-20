# T-IO-050 — Point cloud import

**Priority:** P3 · **Phase:** phase-3 · **Area:** area:compat · **Complexity:** Large

## Why

Renovation / restoration / retrofit projects start with a point cloud from a LiDAR scan. The architect models around the scan. No point cloud support = no retrofit workflow.

## Scope

### In scope
- Import LAS / LAZ / PLY / E57 point clouds.
- Progressive loading for large clouds (octree streaming).
- Point cloud renders as a non-editable element in the 3D viewport.
- Plan-view projection of the point cloud at the slice Z-level for tracing.
- Decimation slider (show 10 % / 1 % / 0.1 % of points for interactive work).
- Clipping box: limit point cloud display to a region.
- Classifications (ground, building, vegetation) as toggleable layers.

### Out of scope
- Automatic wall / plane detection from the point cloud (ML task).
- Exporting points back out.

## Proposed approach

1. Use `potree-core` or `three-point-cloud` or build on existing raw WebGL point sprite rendering.
2. Octree streaming: convert LAS to an octree on upload.
3. Viewport integration: point-cloud element type.

## Acceptance criteria

- [ ] LAS file with 10 M points imports and starts rendering within 5 s.
- [ ] Decimation slider adjusts visible points smoothly.
- [ ] Clipping box restricts visible points.
- [ ] Plan view shows a slice at the current slice-Z.
- [ ] Classification toggles filter categories.
- [ ] Tracing with the wall tool over the point cloud snaps to visible points.

## Test plan

New `packages/app/src/lib/pointCloud/import.test.ts`:

- `T-IO-050-001` — importing a 1M-point LAS produces an octree with the expected node depth.
- `T-IO-050-002` — classifications preserved.

UI:

- `T-IO-050-003` — decimation slider changes visible point count.
- `T-IO-050-004` — clipping box filters points.

## Dependencies

- None.

## Blocks

- Retrofit workflows.

## Suggested labels

`enhancement`, `phase-3`, `area:compat`, `area:gis`, `p3`
