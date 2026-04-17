use axum::{
    body::Body,
    extract::{Multipart, Path, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    state::AppState,
};

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub key: String,
}

fn file_key(project_id: Uuid, filename: &str) -> String {
    format!("projects/{}/{}", project_id, filename)
}

/// T-API-011: GET /api/v1/projects/:id/files
pub async fn list_files(
    State(s): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<FileEntry>>> {
    let prefix = format!("projects/{}", id);
    let keys = s
        .storage
        .list(&prefix)
        .await
        .map_err(|e| AppError::Internal(e))?;

    let entries = keys
        .into_iter()
        .map(|key| {
            let name = key
                .rsplit('/')
                .next()
                .unwrap_or(&key)
                .to_string();
            FileEntry { name, key }
        })
        .collect();

    Ok(Json(entries))
}

/// T-API-009: POST /api/v1/projects/:id/files  (multipart/form-data)
pub async fn upload_file(
    State(s): State<AppState>,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<FileEntry>)> {
    let field = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
        .ok_or_else(|| AppError::BadRequest("no file field in request".into()))?;

    let raw_name = field
        .file_name()
        .map(|s| s.to_string())
        .or_else(|| field.name().map(|s| s.to_string()))
        .ok_or_else(|| AppError::BadRequest("file must have a name".into()))?;

    let filename = sanitize_filename(&raw_name);
    if filename.is_empty() {
        return Err(AppError::BadRequest("invalid filename".into()));
    }

    let data = field
        .bytes()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let key = file_key(id, &filename);
    s.storage
        .put(&key, data)
        .await
        .map_err(|e| AppError::Internal(e))?;

    Ok((StatusCode::CREATED, Json(FileEntry { name: filename, key })))
}

/// T-API-010: GET /api/v1/projects/:id/files/:name
pub async fn download_file(
    State(s): State<AppState>,
    Path((id, name)): Path<(Uuid, String)>,
) -> Result<Response> {
    let key = file_key(id, &name);
    let data = s
        .storage
        .get(&key)
        .await
        .map_err(|_| AppError::NotFound)?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime_for(&name))
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", name),
        )
        .body(Body::from(data))
        .unwrap())
}

/// T-API-012: DELETE /api/v1/projects/:id/files/:name
pub async fn delete_file(
    State(s): State<AppState>,
    Path((id, name)): Path<(Uuid, String)>,
) -> Result<StatusCode> {
    let key = file_key(id, &name);
    if !s
        .storage
        .exists(&key)
        .await
        .map_err(|e| AppError::Internal(e))?
    {
        return Err(AppError::NotFound);
    }
    s.storage
        .delete(&key)
        .await
        .map_err(|e| AppError::Internal(e))?;
    Ok(StatusCode::NO_CONTENT)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Allow alphanumeric, dots, dashes, and underscores; strip leading dots.
pub fn sanitize_filename(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, '.' | '-' | '_'))
        .collect::<String>()
        .trim_start_matches('.')
        .to_string()
}

pub fn mime_for(filename: &str) -> &'static str {
    match filename.rsplit('.').next() {
        Some("ifc") => "application/x-step",
        Some("dwg") => "application/acad",
        Some("dxf") => "application/dxf",
        Some("rvt") => "application/octet-stream",
        Some("skp") => "application/octet-stream",
        Some("pdf") => "application/pdf",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("json") => "application/json",
        Some("svg") => "image/svg+xml",
        _ => "application/octet-stream",
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // T-API-009a: filename sanitizer strips dangerous characters
    #[test]
    fn sanitize_strips_path_traversal() {
        assert_eq!(sanitize_filename("../../etc/passwd"), "etcpasswd");
        assert_eq!(sanitize_filename("../secret.ifc"), "secret.ifc");
    }

    #[test]
    fn sanitize_allows_valid_names() {
        assert_eq!(sanitize_filename("model_v2.ifc"), "model_v2.ifc");
        assert_eq!(sanitize_filename("Tower-A.dwg"), "Tower-A.dwg");
    }

    #[test]
    fn sanitize_strips_leading_dot() {
        assert_eq!(sanitize_filename(".hidden"), "hidden");
    }

    #[test]
    fn sanitize_empty_input() {
        assert_eq!(sanitize_filename(""), "");
    }

    #[test]
    fn mime_for_known_types() {
        assert_eq!(mime_for("model.ifc"), "application/x-step");
        assert_eq!(mime_for("plan.pdf"), "application/pdf");
        assert_eq!(mime_for("photo.png"), "image/png");
    }

    #[test]
    fn mime_for_unknown_falls_back() {
        assert_eq!(mime_for("data.xyz"), "application/octet-stream");
    }
}
