use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    db,
    error::{AppError, Result},
    state::AppState,
};

#[derive(Deserialize)]
pub struct CreateVersionBody {
    pub data: String,
    pub message: Option<String>,
}

/// GET /api/v1/projects/:id/versions
pub async fn list_versions(
    State(s): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<db::VersionInfo>>> {
    // Ensure the project exists.
    db::get_project(&s.db, id)
        .await?
        .ok_or(AppError::NotFound)?;

    let versions = db::list_versions(&s.db, id).await?;
    Ok(Json(versions))
}

/// POST /api/v1/projects/:id/versions
pub async fn create_version(
    State(s): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<CreateVersionBody>,
) -> Result<(StatusCode, Json<db::Version>)> {
    if body.data.is_empty() {
        return Err(AppError::BadRequest("data is required".into()));
    }

    // Ensure the project exists.
    db::get_project(&s.db, id)
        .await?
        .ok_or(AppError::NotFound)?;

    let version = db::create_version(&s.db, id, &body.data, body.message.as_deref()).await?;
    Ok((StatusCode::CREATED, Json(version)))
}

/// GET /api/v1/projects/:id/versions/:vid
pub async fn get_version(
    State(s): State<AppState>,
    Path((id, vid)): Path<(Uuid, Uuid)>,
) -> Result<Json<db::Version>> {
    let version = db::get_version(&s.db, vid, id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(version))
}
