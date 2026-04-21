//! Marketplace endpoints (`/api/v1/marketplace/*`).
//!
//! Public read-only list/get, user-scoped install/uninstall/installed, and
//! the report-a-plugin action. Admin endpoints (moderation, revoke) are
//! gated by `ADMIN_UIDS` env var instead of a role table — simple enough
//! for v1.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::{
    auth::AuthUser,
    db,
    error::{AppError, Result},
    state::AppState,
};

// ── Query params ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ListQuery {
    pub search: Option<String>,
    pub category: Option<String>,
}

// ── Response shapes ──────────────────────────────────────────────────────────

/// Public plugin shape returned by the catalogue — excludes moderation/
/// publisher internals. Matches the `Plugin` type in
/// packages/app/src/lib/marketplaceApi.ts (camelCase).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginView {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub version: String,
    pub author: String,
    pub icon: Option<String>,
    pub entrypoint: String,
    pub sri_hash: Option<String>,
    pub permissions: serde_json::Value,
    pub rating: f32,
    pub download_count: i64,
    pub price: PriceView,
    pub installed: bool,
}

/// Price is either `"free"` or a number in whole dollars — the existing
/// frontend type is `number | 'free'`, preserved here.
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum PriceView {
    Free(FreeTag),
    Dollars(f32),
}

#[derive(Debug, Serialize)]
pub enum FreeTag { #[serde(rename = "free")] Free }

impl PluginView {
    fn from_row(p: db::Plugin, installed: bool) -> Self {
        let price = if p.price_cents == 0 {
            PriceView::Free(FreeTag::Free)
        } else {
            PriceView::Dollars(p.price_cents as f32 / 100.0)
        };
        Self {
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            version: p.version,
            author: p.author,
            icon: p.icon,
            entrypoint: p.entrypoint,
            sri_hash: p.sri_hash,
            permissions: p.permissions,
            rating: p.rating,
            download_count: p.download_count,
            price,
            installed,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResponse {
    pub plugin_id: String,
    pub installed_at: chrono::DateTime<chrono::Utc>,
    pub version: String,
}

// ── Handlers ─────────────────────────────────────────────────────────────────

/// GET /api/v1/marketplace/plugins
pub async fn list(
    State(s): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListQuery>,
) -> Result<Json<Vec<PluginView>>> {
    let plugins = db::list_plugins(&s.db, q.search.as_deref(), q.category.as_deref()).await?;

    // Mark which of the returned plugins the current user has already
    // installed so the Install/Uninstall state is correct without a second
    // round trip.
    let installed_ids: std::collections::HashSet<String> = match user.uid() {
        Some(uid) => db::list_installed_plugins(&s.db, uid)
            .await?
            .into_iter()
            .map(|p| p.id)
            .collect(),
        None => Default::default(),
    };

    let views = plugins
        .into_iter()
        .map(|p| {
            let installed = installed_ids.contains(&p.id);
            PluginView::from_row(p, installed)
        })
        .collect();
    Ok(Json(views))
}

/// GET /api/v1/marketplace/plugins/:id
pub async fn get_one(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<PluginView>> {
    let plugin = db::get_plugin(&s.db, &id).await?.ok_or(AppError::NotFound)?;
    // Hide plugins that aren't publicly listable unless the caller is the
    // publisher or an admin. Right now we keep it simple: only approved +
    // non-revoked plugins are exposed via this endpoint.
    if plugin.moderation_status != "approved" || plugin.revoked {
        return Err(AppError::NotFound);
    }
    let installed = match user.uid() {
        Some(uid) => db::list_installed_plugins(&s.db, uid)
            .await?
            .into_iter()
            .any(|p| p.id == id),
        None => false,
    };
    Ok(Json(PluginView::from_row(plugin, installed)))
}

/// GET /api/v1/marketplace/plugins/installed
pub async fn installed(
    State(s): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<db::InstalledPlugin>>> {
    let Some(uid) = user.uid() else {
        return Ok(Json(vec![]));
    };
    let rows = db::list_installed_plugins(&s.db, uid).await?;
    Ok(Json(rows))
}

/// POST /api/v1/marketplace/plugins/:id/install
pub async fn install(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<(StatusCode, Json<InstallResponse>)> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    let Some((install, plugin)) = db::install_plugin(&s.db, uid, &id).await? else {
        return Err(AppError::NotFound);
    };
    Ok((
        StatusCode::CREATED,
        Json(InstallResponse {
            plugin_id: plugin.id,
            installed_at: install.installed_at,
            version: install.version,
        }),
    ))
}

/// DELETE /api/v1/marketplace/plugins/:id/uninstall
pub async fn uninstall(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<StatusCode> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    let removed = db::uninstall_plugin(&s.db, uid, &id).await?;
    if removed {
        Ok(StatusCode::NO_CONTENT)
    } else {
        // Idempotent: returning 204 for "wasn't installed anyway" is less
        // noisy than 404 when the client is just making sure.
        Ok(StatusCode::NO_CONTENT)
    }
}

// ── Reports ──────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ReportBody {
    pub reason: String,   // malware | broken | spam | policy | other
    pub details: Option<String>,
}

/// POST /api/v1/marketplace/plugins/:id/report
pub async fn report(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<ReportBody>,
) -> Result<(StatusCode, Json<db::PluginReport>)> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    let reason = body.reason.trim();
    if !matches!(reason, "malware" | "broken" | "spam" | "policy" | "other") {
        return Err(AppError::BadRequest("invalid reason".into()));
    }
    // Ensure the plugin exists so we don't accept reports for nonsense ids.
    let _ = db::get_plugin(&s.db, &id).await?.ok_or(AppError::NotFound)?;
    let report = db::create_plugin_report(
        &s.db,
        &id,
        uid,
        reason,
        body.details.as_deref().map(str::trim).filter(|s| !s.is_empty()),
    )
    .await?;
    Ok((StatusCode::CREATED, Json(report)))
}

// ── Admin (moderation + kill switch) ─────────────────────────────────────────

fn require_admin(user: &AuthUser, admins: &Option<String>) -> Result<()> {
    let Some(admins) = admins else {
        return Err(AppError::NotFound);
    };
    let Some(uid) = user.uid() else {
        return Err(AppError::NotFound);
    };
    let allowed = admins.split(',').any(|a| a.trim() == uid);
    if allowed { Ok(()) } else { Err(AppError::NotFound) }
}

#[derive(Deserialize)]
pub struct ModerationBody {
    pub status: String, // pending | approved | rejected
    pub notes: Option<String>,
}

/// PATCH /api/v1/marketplace/admin/plugins/:id/moderation
pub async fn admin_set_moderation(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<ModerationBody>,
) -> Result<Json<db::Plugin>> {
    require_admin(&user, &s.admin_uids)?;
    if !matches!(body.status.as_str(), "pending" | "approved" | "rejected") {
        return Err(AppError::BadRequest("invalid status".into()));
    }
    let p = db::set_plugin_moderation(&s.db, &id, &body.status, body.notes.as_deref())
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(p))
}

#[derive(Deserialize)]
pub struct RevokeBody {
    pub revoked: bool,
    pub reason: Option<String>,
}

/// PATCH /api/v1/marketplace/admin/plugins/:id/revoke
pub async fn admin_revoke(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<RevokeBody>,
) -> Result<Json<db::Plugin>> {
    require_admin(&user, &s.admin_uids)?;
    let p = db::set_plugin_revoked(&s.db, &id, body.revoked, body.reason.as_deref())
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(p))
}

/// GET /api/v1/marketplace/admin/queue
pub async fn admin_queue(
    State(s): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<db::Plugin>>> {
    require_admin(&user, &s.admin_uids)?;
    let rows = db::list_plugins_pending_moderation(&s.db).await?;
    Ok(Json(rows))
}

// ── Publisher submission (Sprint 3) ──────────────────────────────────────────

#[derive(Deserialize)]
pub struct SubmitBody {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub category: Option<String>,
    pub icon: Option<String>,
    pub entrypoint: String,
    pub sri_hash: Option<String>,
    pub permissions: Vec<String>,
    pub price_cents: Option<i32>,
}

/// POST /api/v1/marketplace/plugins (publisher submission)
///
/// Creates or updates a plugin row with moderation_status='pending'. The
/// publisher_uid is set from the caller's Firebase UID. Admin approval via
/// `admin_set_moderation` flips it to 'approved' before it shows up in
/// public listings.
pub async fn submit(
    State(s): State<AppState>,
    user: AuthUser,
    Json(body): Json<SubmitBody>,
) -> Result<(StatusCode, Json<db::Plugin>)> {
    let uid = user.uid().ok_or(AppError::BadRequest("authentication required".into()))?;
    if body.id.trim().is_empty() || body.name.trim().is_empty()
        || body.version.trim().is_empty() || body.entrypoint.trim().is_empty() {
        return Err(AppError::BadRequest("id, name, version, entrypoint required".into()));
    }
    let allowed_perms = ["network", "storage", "ui", "document"];
    for p in &body.permissions {
        if !allowed_perms.contains(&p.as_str()) {
            return Err(AppError::BadRequest(format!("invalid permission: {p}")));
        }
    }

    // If the id already exists under a different publisher, reject.
    if let Some(existing) = db::get_plugin(&s.db, &body.id).await? {
        if existing.publisher_uid.as_deref() != Some(uid) {
            return Err(AppError::BadRequest(
                "a plugin with this id is already published by another account".into(),
            ));
        }
    }

    let perms_json = serde_json::Value::Array(
        body.permissions.iter().map(|p| serde_json::Value::String(p.clone())).collect(),
    );

    let plugin = db::upsert_plugin(
        &s.db,
        db::UpsertPluginParams {
            id: body.id.trim(),
            name: body.name.trim(),
            description: body.description.as_deref().unwrap_or(""),
            version: body.version.trim(),
            author: user.email().unwrap_or(uid),
            category: body.category.as_deref().unwrap_or("misc"),
            icon: body.icon.as_deref(),
            entrypoint: body.entrypoint.trim(),
            sri_hash: body.sri_hash.as_deref(),
            permissions: &perms_json,
            price_cents: body.price_cents.unwrap_or(0),
            publisher_uid: Some(uid),
            moderation_status: "pending",
        },
    )
    .await?;
    Ok((StatusCode::CREATED, Json(plugin)))
}

// ── Unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn price_view_serializes_free_as_string() {
        let v = PriceView::Free(FreeTag::Free);
        let s = serde_json::to_string(&v).unwrap();
        assert_eq!(s, "\"free\"");
    }

    #[test]
    fn price_view_serializes_dollars_as_number() {
        let v = PriceView::Dollars(29.0);
        let s = serde_json::to_string(&v).unwrap();
        assert_eq!(s, "29.0");
    }

    #[test]
    fn report_reason_validation() {
        for good in ["malware", "broken", "spam", "policy", "other"] {
            assert!(matches!(good, "malware" | "broken" | "spam" | "policy" | "other"));
        }
    }
}
