use axum::{extract::State, http::StatusCode, response::Json};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

use crate::{auth::AuthUser, state::AppState};

#[derive(Debug, FromRow)]
struct UserRow {
    email: String,
    name: String,
    plan: String,
    trial_expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    uid: String,
    email: String,
    name: String,
    plan: String,
    trial_expires_at: Option<DateTime<Utc>>,
    trial_days_left: Option<i64>,
}

/// `POST /api/v1/auth/me`
///
/// Exchanges a verified Firebase ID token for the user's profile and trial
/// status. Creates the user row on first call (upsert).
///
/// When `auth_enabled = false` (local dev), the middleware passes every
/// request through as `AuthUser::Unauthenticated`. Rather than blanket-401
/// here (which would make every feature that depends on `/auth/me` broken
/// in local dev), we synthesise a deterministic "dev-local" profile.
pub async fn me(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<MeResponse>, (StatusCode, &'static str)> {
    let (uid_owned, email_owned, name_owned) = match user {
        AuthUser::Authenticated(claims) => (
            claims.sub.clone(),
            claims.email.clone().unwrap_or_default(),
            claims.name.clone().unwrap_or_else(|| claims.email.clone().unwrap_or_default()),
        ),
        AuthUser::Unauthenticated => (
            "dev-local".to_string(),
            "dev@localhost".to_string(),
            "Dev User".to_string(),
        ),
    };
    let uid   = uid_owned.as_str();
    let email = email_owned.as_str();
    let name  = name_owned.as_str();

    // Upsert user row using the non-macro query builder (no live DB at compile time).
    let row: UserRow = sqlx::query_as(
        r#"
        INSERT INTO users (firebase_uid, email, name, trial_expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '14 days')
        ON CONFLICT (firebase_uid) DO UPDATE
          SET email = EXCLUDED.email,
              name  = EXCLUDED.name
        RETURNING email, name, plan, trial_expires_at
        "#,
    )
    .bind(uid)
    .bind(email)
    .bind(name)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("db error in /auth/me: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
    })?;

    let trial_days_left = row.trial_expires_at.map(|exp| {
        let remaining = exp - Utc::now();
        remaining.num_days().max(0)
    });

    Ok(Json(MeResponse {
        uid: uid.to_string(),
        email: row.email,
        name: row.name,
        plan: row.plan,
        trial_expires_at: row.trial_expires_at,
        trial_days_left,
    }))
}
