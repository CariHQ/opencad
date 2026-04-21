//! Project members (`/api/v1/projects/:id/members`).
//!
//! Backs the AdminPanel. For v1 we keep the policy simple:
//!   - any authenticated user can list members of a project they can see
//!   - only an existing 'owner' or 'admin' member can add, change roles,
//!     or remove members
//!   - the user creating a project is auto-added as 'owner' (wired in
//!     routes/projects.rs)
//!
//! A future RBAC pass will tighten per-endpoint checks; for now we
//! enforce at the "can mutate" layer. Reads are open to any authenticated
//! user because the current frontend doesn't have a concept of "not a
//! member" yet — it just hides the AdminPanel behind panel:admin.

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

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMember {
    pub project_id: Uuid,
    pub firebase_uid: String,
    pub email: String,
    pub display_name: String,
    pub role: String,
    pub added_by: Option<String>,
    pub added_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Whether the given uid is allowed to mutate the member list of
/// `project_id`. True only for an existing 'owner' or 'admin' member.
async fn can_manage_members(s: &AppState, project_id: Uuid, uid: &str) -> Result<bool> {
    let role: Option<String> = sqlx::query_scalar(
        "SELECT role FROM project_members
         WHERE project_id = $1 AND firebase_uid = $2",
    )
    .bind(project_id)
    .bind(uid)
    .fetch_optional(&s.db)
    .await?;
    Ok(matches!(role.as_deref(), Some("owner") | Some("admin")))
}

/// GET /api/v1/projects/:id/members
pub async fn list(
    State(s): State<AppState>,
    _user: AuthUser,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<ProjectMember>>> {
    let rows = sqlx::query_as::<_, ProjectMember>(
        r#"SELECT project_id, firebase_uid, email, display_name, role,
                  added_by, added_at, updated_at
           FROM project_members
           WHERE project_id = $1
           ORDER BY
             CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
             added_at ASC"#,
    )
    .bind(project_id)
    .fetch_all(&s.db)
    .await?;
    Ok(Json(rows))
}

#[derive(Deserialize)]
pub struct AddMemberBody {
    pub firebase_uid: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: String,
}

/// POST /api/v1/projects/:id/members
pub async fn add(
    State(s): State<AppState>,
    user: AuthUser,
    Path(project_id): Path<Uuid>,
    Json(body): Json<AddMemberBody>,
) -> Result<(StatusCode, Json<ProjectMember>)> {
    let caller_uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    if !can_manage_members(&s, project_id, caller_uid).await? {
        return Err(AppError::NotFound);
    }
    let target_uid = body.firebase_uid.trim();
    let role = body.role.trim();
    if target_uid.is_empty() || role.is_empty() {
        return Err(AppError::BadRequest("firebase_uid and role are required".into()));
    }

    let row = sqlx::query_as::<_, ProjectMember>(
        r#"INSERT INTO project_members
             (project_id, firebase_uid, email, display_name, role, added_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (project_id, firebase_uid) DO UPDATE
             SET email        = EXCLUDED.email,
                 display_name = EXCLUDED.display_name,
                 role         = EXCLUDED.role,
                 updated_at   = now()
           RETURNING project_id, firebase_uid, email, display_name, role,
                     added_by, added_at, updated_at"#,
    )
    .bind(project_id)
    .bind(target_uid)
    .bind(body.email.as_deref().unwrap_or(""))
    .bind(body.display_name.as_deref().unwrap_or(""))
    .bind(role)
    .bind(caller_uid)
    .fetch_one(&s.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

#[derive(Deserialize)]
pub struct UpdateRoleBody {
    pub role: String,
}

/// PATCH /api/v1/projects/:id/members/:uid
pub async fn update_role(
    State(s): State<AppState>,
    user: AuthUser,
    Path((project_id, target_uid)): Path<(Uuid, String)>,
    Json(body): Json<UpdateRoleBody>,
) -> Result<Json<ProjectMember>> {
    let caller_uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    if !can_manage_members(&s, project_id, caller_uid).await? {
        return Err(AppError::NotFound);
    }
    let role = body.role.trim();
    if role.is_empty() {
        return Err(AppError::BadRequest("role is required".into()));
    }

    // Prevent the sole owner from demoting themselves — protects against
    // an accidental lockout.
    if caller_uid == target_uid {
        let owner_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM project_members WHERE project_id = $1 AND role = 'owner'",
        )
        .bind(project_id)
        .fetch_one(&s.db)
        .await?;
        if owner_count <= 1 && role != "owner" {
            return Err(AppError::BadRequest(
                "cannot demote the sole owner — promote someone else first".into(),
            ));
        }
    }

    let row = sqlx::query_as::<_, ProjectMember>(
        r#"UPDATE project_members
           SET role = $1, updated_at = now()
           WHERE project_id = $2 AND firebase_uid = $3
           RETURNING project_id, firebase_uid, email, display_name, role,
                     added_by, added_at, updated_at"#,
    )
    .bind(role)
    .bind(project_id)
    .bind(&target_uid)
    .fetch_optional(&s.db)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(row))
}

/// DELETE /api/v1/projects/:id/members/:uid
pub async fn remove(
    State(s): State<AppState>,
    user: AuthUser,
    Path((project_id, target_uid)): Path<(Uuid, String)>,
) -> Result<StatusCode> {
    let caller_uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    if !can_manage_members(&s, project_id, caller_uid).await? {
        return Err(AppError::NotFound);
    }
    // Can't remove the last owner.
    let is_owner: Option<String> = sqlx::query_scalar(
        "SELECT role FROM project_members WHERE project_id = $1 AND firebase_uid = $2",
    )
    .bind(project_id)
    .bind(&target_uid)
    .fetch_optional(&s.db)
    .await?;
    if is_owner.as_deref() == Some("owner") {
        let owner_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM project_members WHERE project_id = $1 AND role = 'owner'",
        )
        .bind(project_id)
        .fetch_one(&s.db)
        .await?;
        if owner_count <= 1 {
            return Err(AppError::BadRequest(
                "cannot remove the sole owner — promote another member first".into(),
            ));
        }
    }
    let deleted = sqlx::query(
        "DELETE FROM project_members WHERE project_id = $1 AND firebase_uid = $2",
    )
    .bind(project_id)
    .bind(&target_uid)
    .execute(&s.db)
    .await?
    .rows_affected() > 0;
    if deleted { Ok(StatusCode::NO_CONTENT) } else { Err(AppError::NotFound) }
}
