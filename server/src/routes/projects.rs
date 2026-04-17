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
pub struct CreateBody {
    /// Client may supply its own UUID to preserve IDs during reconciliation.
    pub id: Option<Uuid>,
    pub name: String,
}

#[derive(Deserialize)]
pub struct UpdateBody {
    pub name: String,
}

/// T-API-003: GET /api/v1/projects
pub async fn list(State(s): State<AppState>) -> Result<Json<Vec<db::Project>>> {
    let projects = db::list_projects(&s.db).await?;
    Ok(Json(projects))
}

/// T-API-002: POST /api/v1/projects
pub async fn create(
    State(s): State<AppState>,
    Json(body): Json<CreateBody>,
) -> Result<(StatusCode, Json<db::Project>)> {
    let name = body.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    let project = db::create_project(&s.db, body.id, &name).await?;
    Ok((StatusCode::CREATED, Json(project)))
}

/// T-API-004: GET /api/v1/projects/:id
pub async fn get_one(
    State(s): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<db::Project>> {
    let project = db::get_project(&s.db, id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(project))
}

/// T-API-005: PATCH /api/v1/projects/:id
pub async fn update(
    State(s): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateBody>,
) -> Result<Json<db::Project>> {
    let name = body.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    let project = db::update_project(&s.db, id, &name)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(project))
}

/// T-API-006: DELETE /api/v1/projects/:id
pub async fn delete_one(
    State(s): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode> {
    let deleted = db::delete_project(&s.db, id).await?;
    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}

// ── Unit tests (logic only, no DB) ────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_name_is_rejected() {
        // Simulate what the handler does with whitespace-only input.
        let name = "   ".trim().to_string();
        assert!(name.is_empty(), "whitespace should trim to empty");
    }

    #[test]
    fn name_is_trimmed() {
        let name = "  Tower A  ".trim().to_string();
        assert_eq!(name, "Tower A");
    }
}
