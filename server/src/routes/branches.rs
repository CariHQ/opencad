//! Design branches (`/api/v1/projects/:id/branches`).
//!
//! Branches are named document snapshots, stored server-side so they
//! survive cache clears and follow the user across devices. The browser
//! keeps an OPFS cache as a fallback for offline reads, but the server
//! is authoritative.
//!
//! Only project members (or the unauthenticated dev mode) can read /
//! write branches. For v1 we don't gate writes by role — any member of
//! the project can create and delete branches. Per-element branch
//! permissions are a Sprint-4 concern.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    auth::AuthUser,
    error::{AppError, Result},
    state::AppState,
};

#[derive(Debug, FromRow, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub project_id: Uuid,
    pub id: String,
    pub name: String,
    pub message: Option<String>,
    pub snapshot: String,
    pub base_branch_id: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
pub struct CreateBranchBody {
    /// Optional client-supplied id — clients that create branches offline
    /// first pass their UUID through so reconciliation doesn't double-up.
    pub id: Option<String>,
    pub name: String,
    pub message: Option<String>,
    pub snapshot: String,
    pub base_branch_id: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateBranchBody {
    pub name: Option<String>,
    pub message: Option<String>,
    pub snapshot: Option<String>,
}

// ── Handlers ─────────────────────────────────────────────────────────────────

/// GET /api/v1/projects/:id/branches
pub async fn list(
    State(s): State<AppState>,
    _user: AuthUser,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<Branch>>> {
    let rows = sqlx::query_as::<_, Branch>(
        r#"SELECT project_id, id, name, message, snapshot, base_branch_id,
                  created_by, created_at, updated_at
           FROM project_branches
           WHERE project_id = $1
           ORDER BY updated_at DESC"#,
    )
    .bind(project_id)
    .fetch_all(&s.db)
    .await?;
    Ok(Json(rows))
}

/// POST /api/v1/projects/:id/branches
pub async fn create(
    State(s): State<AppState>,
    user: AuthUser,
    Path(project_id): Path<Uuid>,
    Json(body): Json<CreateBranchBody>,
) -> Result<(StatusCode, Json<Branch>)> {
    let name = body.name.trim();
    if name.is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    if body.snapshot.is_empty() {
        return Err(AppError::BadRequest("snapshot is required".into()));
    }
    if name == "main" || body.id.as_deref() == Some("main") {
        return Err(AppError::BadRequest("'main' is reserved".into()));
    }
    let id = body.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let branch = sqlx::query_as::<_, Branch>(
        r#"INSERT INTO project_branches
             (project_id, id, name, message, snapshot, base_branch_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (project_id, id) DO UPDATE
             SET name     = EXCLUDED.name,
                 message  = EXCLUDED.message,
                 snapshot = EXCLUDED.snapshot,
                 updated_at = now()
           RETURNING project_id, id, name, message, snapshot, base_branch_id,
                     created_by, created_at, updated_at"#,
    )
    .bind(project_id)
    .bind(&id)
    .bind(name)
    .bind(body.message.as_deref().map(str::trim).filter(|s| !s.is_empty()))
    .bind(&body.snapshot)
    .bind(body.base_branch_id.as_deref())
    .bind(user.uid())
    .fetch_one(&s.db)
    .await?;
    Ok((StatusCode::CREATED, Json(branch)))
}

/// PATCH /api/v1/projects/:id/branches/:bid
pub async fn update(
    State(s): State<AppState>,
    _user: AuthUser,
    Path((project_id, bid)): Path<(Uuid, String)>,
    Json(body): Json<UpdateBranchBody>,
) -> Result<Json<Branch>> {
    if bid == "main" {
        return Err(AppError::BadRequest("'main' is not directly editable".into()));
    }
    let name_trim = body.name.as_deref().map(str::trim).map(|s| s.to_string());
    let msg_trim = body.message.as_deref().map(str::trim).map(|s| s.to_string());
    let branch = sqlx::query_as::<_, Branch>(
        r#"UPDATE project_branches SET
             name     = COALESCE($1, name),
             message  = COALESCE($2, message),
             snapshot = COALESCE($3, snapshot),
             updated_at = now()
           WHERE project_id = $4 AND id = $5
           RETURNING project_id, id, name, message, snapshot, base_branch_id,
                     created_by, created_at, updated_at"#,
    )
    .bind(name_trim)
    .bind(msg_trim)
    .bind(body.snapshot.as_deref())
    .bind(project_id)
    .bind(&bid)
    .fetch_optional(&s.db)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(branch))
}

/// DELETE /api/v1/projects/:id/branches/:bid
pub async fn delete_one(
    State(s): State<AppState>,
    _user: AuthUser,
    Path((project_id, bid)): Path<(Uuid, String)>,
) -> Result<StatusCode> {
    if bid == "main" {
        return Err(AppError::BadRequest("'main' cannot be deleted".into()));
    }
    let deleted = sqlx::query(
        "DELETE FROM project_branches WHERE project_id = $1 AND id = $2",
    )
    .bind(project_id)
    .bind(&bid)
    .execute(&s.db)
    .await?
    .rows_affected() > 0;
    if deleted { Ok(StatusCode::NO_CONTENT) } else { Err(AppError::NotFound) }
}

#[cfg(test)]
mod tests {
    #[test]
    fn reserved_main_id() {
        for s in ["main", "  main  "] {
            assert_eq!(s.trim(), "main");
        }
    }
}
