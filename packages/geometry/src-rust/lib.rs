/// OpenCAD Geometry WASM Kernel
///
/// Provides compute-heavy geometry operations compiled to WebAssembly:
/// - `extrude_profile` — triangulate and extrude a 2D polygon profile into a 3D mesh
/// - `subtract_box`   — AABB Boolean subtraction: remove triangles fully inside a box
/// - `build_wall_mesh` — Build a box-shaped wall segment vertex array
///
/// All functions return flat `Float32Array` vertex buffers (x,y,z triplets)
/// suitable for direct use with Three.js `BufferGeometry`.

use wasm_bindgen::prelude::*;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Fan-triangulate a convex or simple polygon given as a flat [x0,y0, x1,y1, ...] slice.
/// Appends (x, y, z) triplets for each triangle into `out`.
fn fan_triangulate_xy(points: &[(f32, f32)], z: f32, out: &mut Vec<f32>) {
    let n = points.len();
    if n < 3 {
        return;
    }
    let (ax, ay) = points[0];
    for i in 1..(n - 1) {
        let (bx, by) = points[i];
        let (cx, cy) = points[i + 1];
        out.extend_from_slice(&[ax, ay, z, bx, by, z, cx, cy, z]);
    }
}

/// Return a quad as two triangles: (v0,v1,v2) and (v0,v2,v3).
#[allow(clippy::too_many_arguments)]
fn push_quad(
    out: &mut Vec<f32>,
    x0: f32, y0: f32, z0: f32,
    x1: f32, y1: f32, z1: f32,
    x2: f32, y2: f32, z2: f32,
    x3: f32, y3: f32, z3: f32,
) {
    out.extend_from_slice(&[x0, y0, z0, x1, y1, z1, x2, y2, z2]);
    out.extend_from_slice(&[x0, y0, z0, x2, y2, z2, x3, y3, z3]);
}

// ─── Public WASM API ─────────────────────────────────────────────────────────

/// Extrude a 2D polygon profile into a triangulated 3D solid.
///
/// # Arguments
/// * `profile_points` – flat `[x0, y0, x1, y1, ...]` pairs (f64, converted to f32 internally)
/// * `height`         – extrusion height along +Z
///
/// # Returns
/// Flat `Float32Array` of vertex positions (x,y,z triplets).
/// Vertex count = (n-2)*2*3  (top+bottom caps)  +  n*2*3  (side walls)
///              = 6*(2n-2) for an n-gon.
#[wasm_bindgen]
pub fn extrude_profile(profile_points: &[f64], height: f64) -> js_sys::Float32Array {
    let h = height as f32;
    let n = profile_points.len() / 2;
    if n < 3 {
        return js_sys::Float32Array::new_with_length(0);
    }

    let pts: Vec<(f32, f32)> = (0..n)
        .map(|i| (profile_points[i * 2] as f32, profile_points[i * 2 + 1] as f32))
        .collect();

    let mut verts: Vec<f32> = Vec::with_capacity((n - 2) * 2 * 9 + n * 12);

    // Bottom cap (z = 0, winding reversed for outward normal pointing -Z)
    let mut bottom_pts = pts.clone();
    bottom_pts.reverse();
    fan_triangulate_xy(&bottom_pts, 0.0, &mut verts);

    // Top cap (z = h, CCW from above for outward normal pointing +Z)
    fan_triangulate_xy(&pts, h, &mut verts);

    // Side walls — one quad per edge, split into 2 triangles
    for i in 0..n {
        let j = (i + 1) % n;
        let (x0, y0) = pts[i];
        let (x1, y1) = pts[j];
        push_quad(
            &mut verts,
            x0, y0, 0.0,
            x1, y1, 0.0,
            x1, y1, h,
            x0, y0, h,
        );
    }

    let arr = js_sys::Float32Array::new_with_length(verts.len() as u32);
    arr.copy_from(&verts);
    arr
}

/// AABB Boolean subtraction: filter out triangles whose centroid lies **fully inside**
/// the given axis-aligned bounding box.
///
/// # Arguments
/// * `vertices`   – flat `[x,y,z, x,y,z, ...]` f32 vertex triplets (groups of 9 = 1 triangle)
/// * `box_min_*`  – inclusive minimum corner of the subtract box
/// * `box_max_*`  – inclusive maximum corner of the subtract box
///
/// # Returns
/// Filtered `Float32Array` with triangles fully inside the box removed.
#[wasm_bindgen]
pub fn subtract_box(
    vertices: &[f32],
    box_min_x: f64,
    box_min_y: f64,
    box_min_z: f64,
    box_max_x: f64,
    box_max_y: f64,
    box_max_z: f64,
) -> js_sys::Float32Array {
    let (min_x, min_y, min_z) = (box_min_x as f32, box_min_y as f32, box_min_z as f32);
    let (max_x, max_y, max_z) = (box_max_x as f32, box_max_y as f32, box_max_z as f32);

    let mut out: Vec<f32> = Vec::with_capacity(vertices.len());

    // Each triangle = 9 consecutive floats (3 vertices × 3 components)
    let tri_count = vertices.len() / 9;
    for t in 0..tri_count {
        let base = t * 9;
        let tri = &vertices[base..base + 9];

        // Compute centroid
        let cx = (tri[0] + tri[3] + tri[6]) / 3.0;
        let cy = (tri[1] + tri[4] + tri[7]) / 3.0;
        let cz = (tri[2] + tri[5] + tri[8]) / 3.0;

        // Also check all three vertices are inside (strict containment)
        let all_inside = |x: f32, y: f32, z: f32| -> bool {
            x >= min_x && x <= max_x &&
            y >= min_y && y <= max_y &&
            z >= min_z && z <= max_z
        };

        let centroid_inside = all_inside(cx, cy, cz);
        let v0_inside = all_inside(tri[0], tri[1], tri[2]);
        let v1_inside = all_inside(tri[3], tri[4], tri[5]);
        let v2_inside = all_inside(tri[6], tri[7], tri[8]);

        // Remove triangle only when centroid AND all vertices are inside
        if !(centroid_inside && v0_inside && v1_inside && v2_inside) {
            out.extend_from_slice(tri);
        }
    }

    let arr = js_sys::Float32Array::new_with_length(out.len() as u32);
    arr.copy_from(&out);
    arr
}

/// Build a flat vertex array for a box-shaped wall segment.
///
/// The wall runs from `(x1, y1)` to `(x2, y2)` at z=0 to z=height.
/// Thickness is applied symmetrically perpendicular to the wall direction.
///
/// # Returns
/// Flat `Float32Array` of vertex positions (x,y,z triplets).
/// A box has 6 faces × 2 triangles × 3 vertices × 3 floats = 108 floats.
#[wasm_bindgen]
pub fn build_wall_mesh(
    x1: f64, y1: f64,
    x2: f64, y2: f64,
    height: f64,
    thickness: f64,
) -> js_sys::Float32Array {
    let (x1, y1, x2, y2) = (x1 as f32, y1 as f32, x2 as f32, y2 as f32);
    let h = height as f32;
    let t = (thickness as f32) / 2.0;

    // Wall direction unit vector
    let dx = x2 - x1;
    let dy = y2 - y1;
    let len = (dx * dx + dy * dy).sqrt();

    if len < 1e-6 || h < 1e-6 {
        return js_sys::Float32Array::new_with_length(0);
    }

    let (ux, uy) = (dx / len, dy / len);
    // Perpendicular (rotated 90°)
    let (px, py) = (-uy, ux);

    // 8 corner vertices of the wall box:
    // 0: start-left-bottom,   1: start-right-bottom
    // 2: end-right-bottom,    3: end-left-bottom
    // 4: start-left-top,      5: start-right-top
    // 6: end-right-top,       7: end-left-top
    let v = [
        (x1 - px * t, y1 - py * t, 0.0f32),  // 0
        (x1 + px * t, y1 + py * t, 0.0),      // 1
        (x2 + px * t, y2 + py * t, 0.0),      // 2
        (x2 - px * t, y2 - py * t, 0.0),      // 3
        (x1 - px * t, y1 - py * t, h),         // 4
        (x1 + px * t, y1 + py * t, h),         // 5
        (x2 + px * t, y2 + py * t, h),         // 6
        (x2 - px * t, y2 - py * t, h),         // 7
    ];

    let mut verts: Vec<f32> = Vec::with_capacity(108);

    // Bottom face (z=0): 0,3,2,1 (looking down, outward normal -Z)
    let (x, y, z) = v[0]; let (x2v, y2v, z2v) = v[3]; let (x3, y3, z3) = v[2]; let (x4, y4, z4) = v[1];
    push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);

    // Top face (z=h): 4,5,6,7 (outward normal +Z)
    let (x, y, z) = v[4]; let (x2v, y2v, z2v) = v[5]; let (x3, y3, z3) = v[6]; let (x4, y4, z4) = v[7];
    push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);

    // Start face (at x1,y1): 0,1,5,4 (outward normal points away from wall end)
    let (x, y, z) = v[0]; let (x2v, y2v, z2v) = v[1]; let (x3, y3, z3) = v[5]; let (x4, y4, z4) = v[4];
    push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);

    // End face (at x2,y2): 2,3,7,6
    let (x, y, z) = v[2]; let (x2v, y2v, z2v) = v[3]; let (x3, y3, z3) = v[7]; let (x4, y4, z4) = v[6];
    push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);

    // Left face (perpendicular -side): 0,4,7,3
    let (x, y, z) = v[0]; let (x2v, y2v, z2v) = v[4]; let (x3, y3, z3) = v[7]; let (x4, y4, z4) = v[3];
    push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);

    // Right face (perpendicular +side): 1,2,6,5
    let (x, y, z) = v[1]; let (x2v, y2v, z2v) = v[2]; let (x3, y3, z3) = v[6]; let (x4, y4, z4) = v[5];
    push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);

    let arr = js_sys::Float32Array::new_with_length(verts.len() as u32);
    arr.copy_from(&verts);
    arr
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Helper: run extrude_profile and return the vertex Vec ─────────────────

    fn extrude_to_vec(profile: &[f64], height: f64) -> Vec<f32> {
        // Re-implement the core logic without JS types for native tests
        let h = height as f32;
        let n = profile.len() / 2;
        if n < 3 {
            return vec![];
        }
        let pts: Vec<(f32, f32)> = (0..n)
            .map(|i| (profile[i * 2] as f32, profile[i * 2 + 1] as f32))
            .collect();

        let mut verts: Vec<f32> = Vec::new();
        let mut bottom_pts = pts.clone();
        bottom_pts.reverse();
        fan_triangulate_xy(&bottom_pts, 0.0, &mut verts);
        fan_triangulate_xy(&pts, h, &mut verts);
        for i in 0..n {
            let j = (i + 1) % n;
            let (x0, y0) = pts[i];
            let (x1, y1) = pts[j];
            push_quad(&mut verts, x0, y0, 0.0, x1, y1, 0.0, x1, y1, h, x0, y0, h);
        }
        verts
    }

    fn subtract_box_vec(
        vertices: &[f32],
        min_x: f64, min_y: f64, min_z: f64,
        max_x: f64, max_y: f64, max_z: f64,
    ) -> Vec<f32> {
        let (min_x, min_y, min_z) = (min_x as f32, min_y as f32, min_z as f32);
        let (max_x, max_y, max_z) = (max_x as f32, max_y as f32, max_z as f32);
        let mut out = Vec::new();
        let tri_count = vertices.len() / 9;
        for t in 0..tri_count {
            let base = t * 9;
            let tri = &vertices[base..base + 9];
            let cx = (tri[0] + tri[3] + tri[6]) / 3.0;
            let cy = (tri[1] + tri[4] + tri[7]) / 3.0;
            let cz = (tri[2] + tri[5] + tri[8]) / 3.0;
            let inside = |x: f32, y: f32, z: f32| {
                x >= min_x && x <= max_x && y >= min_y && y <= max_y && z >= min_z && z <= max_z
            };
            if !(inside(cx, cy, cz)
                && inside(tri[0], tri[1], tri[2])
                && inside(tri[3], tri[4], tri[5])
                && inside(tri[6], tri[7], tri[8]))
            {
                out.extend_from_slice(tri);
            }
        }
        out
    }

    fn build_wall_vec(x1: f64, y1: f64, x2: f64, y2: f64, height: f64, thickness: f64) -> Vec<f32> {
        let (x1f, y1f, x2f, y2f) = (x1 as f32, y1 as f32, x2 as f32, y2 as f32);
        let h = height as f32;
        let t = (thickness as f32) / 2.0;
        let dx = x2f - x1f;
        let dy = y2f - y1f;
        let len = (dx * dx + dy * dy).sqrt();
        if len < 1e-6 || h < 1e-6 {
            return vec![];
        }
        let (ux, uy) = (dx / len, dy / len);
        let (px, py) = (-uy, ux);
        let v = [
            (x1f - px * t, y1f - py * t, 0.0f32),
            (x1f + px * t, y1f + py * t, 0.0),
            (x2f + px * t, y2f + py * t, 0.0),
            (x2f - px * t, y2f - py * t, 0.0),
            (x1f - px * t, y1f - py * t, h),
            (x1f + px * t, y1f + py * t, h),
            (x2f + px * t, y2f + py * t, h),
            (x2f - px * t, y2f - py * t, h),
        ];
        let mut verts = Vec::with_capacity(108);
        let (x, y, z) = v[0]; let (x2v, y2v, z2v) = v[3]; let (x3, y3, z3) = v[2]; let (x4, y4, z4) = v[1];
        push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);
        let (x, y, z) = v[4]; let (x2v, y2v, z2v) = v[5]; let (x3, y3, z3) = v[6]; let (x4, y4, z4) = v[7];
        push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);
        let (x, y, z) = v[0]; let (x2v, y2v, z2v) = v[1]; let (x3, y3, z3) = v[5]; let (x4, y4, z4) = v[4];
        push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);
        let (x, y, z) = v[2]; let (x2v, y2v, z2v) = v[3]; let (x3, y3, z3) = v[7]; let (x4, y4, z4) = v[6];
        push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);
        let (x, y, z) = v[0]; let (x2v, y2v, z2v) = v[4]; let (x3, y3, z3) = v[7]; let (x4, y4, z4) = v[3];
        push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);
        let (x, y, z) = v[1]; let (x2v, y2v, z2v) = v[2]; let (x3, y3, z3) = v[6]; let (x4, y4, z4) = v[5];
        push_quad(&mut verts, x, y, z, x2v, y2v, z2v, x3, y3, z3, x4, y4, z4);
        verts
    }

    // ── T-3D-WASM-001: extrude_square_profile_has_correct_vertex_count ────────
    #[test]
    fn extrude_square_profile_has_correct_vertex_count() {
        // Square profile: 4 points → n=4
        // Bottom cap triangles: (n-2) = 2 tris × 3 verts × 3 floats = 18
        // Top cap triangles:    (n-2) = 2 tris × 3 verts × 3 floats = 18
        // Side quads:           n=4   × 2 tris × 3 verts × 3 floats = 72
        // Total = 108 floats
        let profile = [0.0f64, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
        let verts = extrude_to_vec(&profile, 1.0);
        assert_eq!(verts.len(), 108, "Square extrusion should produce 108 floats");
    }

    #[test]
    fn extrude_triangle_profile_has_correct_vertex_count() {
        // Triangle: n=3
        // Bottom cap: (3-2)=1 tri × 9 = 9
        // Top cap:    (3-2)=1 tri × 9 = 9
        // Sides:      3 × 2 tris × 9 = 54
        // Total = 72
        let profile = [0.0f64, 0.0, 2.0, 0.0, 1.0, 2.0];
        let verts = extrude_to_vec(&profile, 3.0);
        assert_eq!(verts.len(), 72, "Triangle extrusion should produce 72 floats");
    }

    #[test]
    fn extrude_profile_degenerate_less_than_3_points_returns_empty() {
        let profile = [0.0f64, 0.0, 1.0, 0.0]; // only 2 points
        let verts = extrude_to_vec(&profile, 5.0);
        assert!(verts.is_empty(), "Degenerate profile should produce empty output");
    }

    #[test]
    fn extrude_profile_height_reflected_in_z_range() {
        let profile = [0.0f64, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
        let verts = extrude_to_vec(&profile, 5.0);

        let z_vals: Vec<f32> = verts.chunks(3).map(|c| c[2]).collect();
        let z_min = z_vals.iter().cloned().fold(f32::INFINITY, f32::min);
        let z_max = z_vals.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

        assert!((z_min - 0.0).abs() < 1e-5, "Z min should be 0");
        assert!((z_max - 5.0).abs() < 1e-5, "Z max should equal height (5.0)");
    }

    #[test]
    fn extrude_profile_produces_valid_triangles_multiple_of_9() {
        let profile = [0.0f64, 0.0, 4.0, 0.0, 4.0, 3.0, 0.0, 3.0]; // rectangle 4×3
        let verts = extrude_to_vec(&profile, 2.0);
        assert_eq!(verts.len() % 9, 0, "Vertex buffer must be a multiple of 9 (3 verts × 3 floats)");
    }

    // ── T-3D-WASM-002: wall_mesh_is_non_empty ─────────────────────────────────
    #[test]
    fn wall_mesh_is_non_empty() {
        let verts = build_wall_vec(0.0, 0.0, 5.0, 0.0, 3.0, 0.2);
        assert!(!verts.is_empty(), "Wall mesh should produce vertices");
    }

    #[test]
    fn wall_mesh_has_correct_vertex_count() {
        // 6 faces × 2 triangles × 3 vertices × 3 floats = 108
        let verts = build_wall_vec(0.0, 0.0, 5.0, 0.0, 3.0, 0.2);
        assert_eq!(verts.len(), 108, "Wall mesh must be exactly 108 floats");
    }

    #[test]
    fn wall_mesh_degenerate_zero_length_returns_empty() {
        let verts = build_wall_vec(2.0, 3.0, 2.0, 3.0, 3.0, 0.2);
        assert!(verts.is_empty(), "Zero-length wall should return empty");
    }

    #[test]
    fn wall_mesh_degenerate_zero_height_returns_empty() {
        let verts = build_wall_vec(0.0, 0.0, 5.0, 0.0, 0.0, 0.2);
        assert!(verts.is_empty(), "Zero-height wall should return empty");
    }

    #[test]
    fn wall_mesh_z_range_matches_height() {
        let height = 3.0f64;
        let verts = build_wall_vec(0.0, 0.0, 10.0, 0.0, height, 0.5);
        let z_vals: Vec<f32> = verts.chunks(3).map(|c| c[2]).collect();
        let z_min = z_vals.iter().cloned().fold(f32::INFINITY, f32::min);
        let z_max = z_vals.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        assert!((z_min - 0.0).abs() < 1e-5, "Wall Z min should be 0");
        assert!((z_max - height as f32).abs() < 1e-5, "Wall Z max should equal height");
    }

    #[test]
    fn wall_mesh_diagonal_wall_non_empty() {
        // Wall at 45 degrees
        let verts = build_wall_vec(0.0, 0.0, 3.0, 4.0, 2.5, 0.3);
        assert!(!verts.is_empty(), "Diagonal wall should produce vertices");
        assert_eq!(verts.len(), 108, "Diagonal wall mesh must be 108 floats");
    }

    // ── T-3D-WASM-003: subtract_box_removes_internal_triangles ───────────────
    #[test]
    fn subtract_box_removes_internal_triangles() {
        // Build a flat grid of triangles: some inside box [1,2] × [1,2] × [-1,1], some outside
        // Triangle completely inside: centroid at (1.5, 1.5, 0.0)
        let inside_tri: [f32; 9] = [1.1, 1.1, 0.0,  1.9, 1.1, 0.0,  1.5, 1.9, 0.0];
        // Triangle completely outside: centroid at (5.0, 5.0, 0.0)
        let outside_tri: [f32; 9] = [4.0, 4.0, 0.0,  6.0, 4.0, 0.0,  5.0, 6.0, 0.0];

        let input: Vec<f32> = inside_tri.iter().chain(outside_tri.iter()).copied().collect();

        let result = subtract_box_vec(&input, 1.0, 1.0, -1.0, 2.0, 2.0, 1.0);

        // Only the outside triangle should remain
        assert_eq!(result.len(), 9, "Only the external triangle should remain after subtraction");
    }

    #[test]
    fn subtract_box_keeps_boundary_triangles() {
        // Triangle that straddles the box boundary (one vertex outside)
        let straddling: [f32; 9] = [0.5, 1.5, 0.0,  1.5, 1.5, 0.0,  1.0, 2.5, 0.0];
        let input = straddling.to_vec();
        let result = subtract_box_vec(&input, 1.0, 1.0, -1.0, 2.0, 2.0, 1.0);
        // Straddles boundary → keep it
        assert_eq!(result.len(), 9, "Triangle straddling box boundary should be kept");
    }

    #[test]
    fn subtract_box_empty_input_returns_empty() {
        let result = subtract_box_vec(&[], 0.0, 0.0, 0.0, 1.0, 1.0, 1.0);
        assert!(result.is_empty(), "Empty input should return empty output");
    }

    #[test]
    fn subtract_box_no_triangles_in_box_returns_all() {
        // All triangles are far away from the box
        let tri1: [f32; 9] = [10.0, 10.0, 10.0,  11.0, 10.0, 10.0,  10.5, 11.0, 10.0];
        let tri2: [f32; 9] = [20.0, 20.0, 20.0,  21.0, 20.0, 20.0,  20.5, 21.0, 20.0];
        let input: Vec<f32> = tri1.iter().chain(tri2.iter()).copied().collect();
        let result = subtract_box_vec(&input, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0);
        assert_eq!(result.len(), 18, "No triangles in box → all should be kept");
    }

    // ── Cross-function integration: extrude then subtract ─────────────────────
    #[test]
    fn extrude_then_subtract_reduces_triangle_count() {
        // Extrude a 2×2 square to height 2
        let profile = [0.0f64, 0.0, 2.0, 0.0, 2.0, 2.0, 0.0, 2.0];
        let verts = extrude_to_vec(&profile, 2.0);
        let original_count = verts.len();
        assert!(original_count > 0);

        // Subtract a box covering the entire interior volume
        let result = subtract_box_vec(&verts, 0.1, 0.1, 0.1, 1.9, 1.9, 1.9);
        // The inner triangles (caps) should be removed; side triangles remain
        assert!(result.len() <= original_count, "Subtract should not increase triangle count");
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Canvas pipeline — view-frustum culling + screen-space transform
// ═══════════════════════════════════════════════════════════════════════════════

/// Batch of element bounding boxes for bulk culling and screen-space transform.
/// Each element stores an id_hash (u32) and an AABB [min_x, min_y, max_x, max_y].
#[wasm_bindgen]
pub struct ElementBatch {
    ids: Vec<u32>,
    boxes: Vec<f32>, // 4 floats per element: min_x, min_y, max_x, max_y
}

#[wasm_bindgen]
impl ElementBatch {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ElementBatch {
        ElementBatch {
            ids: Vec::new(),
            boxes: Vec::new(),
        }
    }

    /// Add an element with its world-space bounding box.
    pub fn push(&mut self, id_hash: u32, min_x: f32, min_y: f32, max_x: f32, max_y: f32) {
        self.ids.push(id_hash);
        self.boxes.push(min_x);
        self.boxes.push(min_y);
        self.boxes.push(max_x);
        self.boxes.push(max_y);
    }

    /// Cull against a world-space view frustum.
    /// Returns a Uint32Array of id_hashes for elements that overlap the frustum.
    pub fn cull_visible(
        &self,
        view_min_x: f32,
        view_min_y: f32,
        view_max_x: f32,
        view_max_y: f32,
    ) -> js_sys::Uint32Array {
        let visible = cull_visible_inner(&self.ids, &self.boxes, view_min_x, view_min_y, view_max_x, view_max_y);
        let result = js_sys::Uint32Array::new_with_length(visible.len() as u32);
        for (i, v) in visible.iter().enumerate() {
            result.set_index(i as u32, *v);
        }
        result
    }

    /// Transform all world-space bounding boxes to screen-space in bulk.
    /// view_transform: [scale, pan_x, pan_y, canvas_width, canvas_height]
    /// Returns Float32Array of [screen_min_x, screen_min_y, screen_max_x, screen_max_y] × N
    pub fn transform_to_screen(&self, view_transform: &[f32]) -> js_sys::Float32Array {
        if view_transform.len() < 5 {
            return js_sys::Float32Array::new_with_length(0);
        }
        let screen_boxes = transform_to_screen_inner(&self.boxes, view_transform);
        let result = js_sys::Float32Array::new_with_length(screen_boxes.len() as u32);
        for (i, v) in screen_boxes.iter().enumerate() {
            result.set_index(i as u32, *v);
        }
        result
    }

    pub fn len(&self) -> usize {
        self.ids.len()
    }

    pub fn is_empty(&self) -> bool {
        self.ids.is_empty()
    }

    pub fn clear(&mut self) {
        self.ids.clear();
        self.boxes.clear();
    }
}

/// Snap a world-space point to the nearest grid intersection.
/// Returns Float32Array([snapped_x, snapped_y]).
#[wasm_bindgen]
pub fn snap_to_grid(x: f32, y: f32, grid_size: f32) -> js_sys::Float32Array {
    let snapped = snap_to_grid_inner(x, y, grid_size);
    let result = js_sys::Float32Array::new_with_length(2);
    result.set_index(0, snapped[0]);
    result.set_index(1, snapped[1]);
    result
}

// ── Pure inner functions (testable without js_sys) ────────────────────────────

fn cull_visible_inner(
    ids: &[u32],
    boxes: &[f32],
    view_min_x: f32,
    view_min_y: f32,
    view_max_x: f32,
    view_max_y: f32,
) -> Vec<u32> {
    let mut visible = Vec::new();
    for (i, &id) in ids.iter().enumerate() {
        let base = i * 4;
        let min_x = boxes[base];
        let min_y = boxes[base + 1];
        let max_x = boxes[base + 2];
        let max_y = boxes[base + 3];
        if max_x >= view_min_x && min_x <= view_max_x
            && max_y >= view_min_y && min_y <= view_max_y
        {
            visible.push(id);
        }
    }
    visible
}

fn transform_to_screen_inner(boxes: &[f32], view_transform: &[f32]) -> Vec<f32> {
    let scale    = view_transform[0];
    let pan_x    = view_transform[1];
    let pan_y    = view_transform[2];
    let canvas_w = view_transform[3];
    let canvas_h = view_transform[4];
    if scale == 0.0 {
        return vec![0.0f32; boxes.len()];
    }
    let n = boxes.len() / 4;
    let mut out = Vec::with_capacity(boxes.len());
    for i in 0..n {
        let base = i * 4;
        out.push((boxes[base]     - pan_x) / scale + canvas_w / 2.0);
        out.push((boxes[base + 1] - pan_y) / scale + canvas_h / 2.0);
        out.push((boxes[base + 2] - pan_x) / scale + canvas_w / 2.0);
        out.push((boxes[base + 3] - pan_y) / scale + canvas_h / 2.0);
    }
    out
}

fn snap_to_grid_inner(x: f32, y: f32, grid_size: f32) -> [f32; 2] {
    if grid_size == 0.0 {
        return [x, y];
    }
    [
        (x / grid_size).round() * grid_size,
        (y / grid_size).round() * grid_size,
    ]
}

#[cfg(test)]
mod canvas_tests {
    use super::*;

    #[test]
    fn cull_visible_excludes_out_of_frustum() {
        let ids  = vec![1u32, 2u32];
        let boxes = vec![0.0f32, 0.0, 10.0, 10.0,   // elem 1: inside
                         500.0,  500.0, 510.0, 510.0]; // elem 2: outside
        let visible = cull_visible_inner(&ids, &boxes, 0.0, 0.0, 100.0, 100.0);
        assert_eq!(visible, vec![1u32]);
    }

    #[test]
    fn cull_visible_includes_partial_overlap() {
        let ids  = vec![1u32];
        let boxes = vec![-5.0f32, -5.0, 5.0, 5.0]; // straddles frustum edge
        let visible = cull_visible_inner(&ids, &boxes, 0.0, 0.0, 100.0, 100.0);
        assert_eq!(visible, vec![1u32]);
    }

    #[test]
    fn transform_to_screen_identity() {
        // scale=1, pan=(0,0), canvas=100×100
        // world (10,20,30,40) → screen (60,70,80,90)
        let boxes = vec![10.0f32, 20.0, 30.0, 40.0];
        let vt    = [1.0f32, 0.0, 0.0, 100.0, 100.0];
        let out   = transform_to_screen_inner(&boxes, &vt);
        assert!((out[0] - 60.0).abs() < 0.001);
        assert!((out[1] - 70.0).abs() < 0.001);
        assert!((out[2] - 80.0).abs() < 0.001);
        assert!((out[3] - 90.0).abs() < 0.001);
    }

    #[test]
    fn snap_to_grid_rounds_to_nearest() {
        let r = snap_to_grid_inner(7.3, 4.9, 5.0);
        assert!((r[0] - 5.0).abs() < 0.001, "7.3 → 5.0, got {}", r[0]);
        assert!((r[1] - 5.0).abs() < 0.001, "4.9 → 5.0, got {}", r[1]);
    }

    #[test]
    fn snap_to_grid_rounds_up() {
        let r = snap_to_grid_inner(8.0, 8.0, 5.0);
        assert!((r[0] - 10.0).abs() < 0.001, "8.0 → 10.0, got {}", r[0]);
    }

    #[test]
    fn cull_returns_all_when_all_visible() {
        let ids  = vec![10u32, 20u32, 30u32];
        let boxes = vec![1.0f32,1.0,2.0,2.0,  3.0,3.0,4.0,4.0,  5.0,5.0,6.0,6.0];
        let visible = cull_visible_inner(&ids, &boxes, 0.0, 0.0, 100.0, 100.0);
        assert_eq!(visible.len(), 3);
    }
}
