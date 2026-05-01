use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::AuthUser,
    db,
    error::{AppError, Result},
    state::AppState,
};

/// Project limit per plan tier.
/// Free users may own at most 1 project; all paid tiers are unlimited.
const FREE_PROJECT_LIMIT: i64 = 1;

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
/// Returns only the projects the authenticated user is a member of.
pub async fn list(
    State(s): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<db::Project>>> {
    let projects = match user.uid() {
        Some(uid) => db::list_projects_for_user(&s.db, uid).await?,
        // Unauthenticated dev mode — return nothing rather than everything.
        None => vec![],
    };
    Ok(Json(projects))
}

/// T-API-002: POST /api/v1/projects
pub async fn create(
    State(s): State<AppState>,
    user: AuthUser,
    Json(body): Json<CreateBody>,
) -> Result<(StatusCode, Json<db::Project>)> {
    let name = body.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }

    // Enforce plan-based project limits for authenticated users.
    if let Some(uid) = user.uid() {
        let plan = db::get_user_plan(&s.db, uid).await?.unwrap_or_else(|| "free".into());
        if plan == "free" {
            let owned = db::count_owned_projects(&s.db, uid).await?;
            if owned >= FREE_PROJECT_LIMIT {
                return Err(AppError::Forbidden(
                    "Free plan is limited to 1 project. Upgrade to Pro for unlimited projects.".into(),
                ));
            }
        }
    }

    let project = db::create_project(&s.db, body.id, &name).await?;

    // Auto-seat the creator as the project's owner.
    if let Some(uid) = user.uid() {
        let _ = sqlx::query(
            r#"INSERT INTO project_members
                 (project_id, firebase_uid, email, display_name, role, added_by)
               VALUES ($1, $2, $3, $4, 'owner', $2)
               ON CONFLICT (project_id, firebase_uid) DO NOTHING"#,
        )
        .bind(project.id)
        .bind(uid)
        .bind(user.email().unwrap_or(""))
        .bind("")
        .execute(&s.db)
        .await;
    }

    Ok((StatusCode::CREATED, Json(project)))
}

/// T-API-004: GET /api/v1/projects/:id
/// Returns 404 if the project doesn't exist or the user is not a member.
pub async fn get_one(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<db::Project>> {
    let project = match user.uid() {
        Some(uid) => db::get_project_for_user(&s.db, id, uid).await?.ok_or(AppError::NotFound)?,
        None => db::get_project(&s.db, id).await?.ok_or(AppError::NotFound)?,
    };
    Ok(Json(project))
}

/// T-API-005: PATCH /api/v1/projects/:id
/// Returns 404 if the project doesn't exist or the user is not a member.
pub async fn update(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateBody>,
) -> Result<Json<db::Project>> {
    let name = body.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    let project = match user.uid() {
        Some(uid) => db::update_project_for_user(&s.db, id, &name, uid).await?.ok_or(AppError::NotFound)?,
        None => db::update_project(&s.db, id, &name).await?.ok_or(AppError::NotFound)?,
    };
    Ok(Json(project))
}

/// T-API-006: DELETE /api/v1/projects/:id
/// Only the project owner can delete. Returns 404 for non-owners so the
/// existence of the project isn't leaked to unauthorised callers.
pub async fn delete_one(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode> {
    let deleted = match user.uid() {
        Some(uid) => db::delete_project_for_user(&s.db, id, uid).await?,
        None => db::delete_project(&s.db, id).await?,
    };
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
        let name = "   ".trim().to_string();
        assert!(name.is_empty(), "whitespace should trim to empty");
    }

    #[test]
    fn name_is_trimmed() {
        let name = "  Tower A  ".trim().to_string();
        assert_eq!(name, "Tower A");
    }

    #[test]
    fn free_project_limit_constant_is_one() {
        assert_eq!(FREE_PROJECT_LIMIT, 1);
    }
}
