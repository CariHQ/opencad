use anyhow::Result;
use chrono::{DateTime, Utc};
use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    PgPool,
};
use std::str::FromStr;
use uuid::Uuid;

pub async fn connect(url: &str) -> Result<PgPool> {
    let opts = PgConnectOptions::from_str(url)?;

    // On Cloud Run, override the TCP host with the Cloud SQL Unix socket directory.
    // The socket file is at /cloudsql/<INSTANCE>/.s.PGSQL.5432 — sqlx appends the
    // filename automatically when a socket *directory* is given via .socket().
    let opts = match std::env::var("CLOUD_SQL_INSTANCE") {
        Ok(instance) if !instance.is_empty() => {
            opts.socket(format!("/cloudsql/{instance}"))
        }
        _ => opts,
    };

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect_with(opts)
        .await?;
    Ok(pool)
}

pub async fn migrate(pool: &PgPool) -> Result<()> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}

// ── Projects ──────────────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn create_project(
    pool: &PgPool,
    id: Option<Uuid>,
    name: &str,
) -> Result<Project, sqlx::Error> {
    let id = id.unwrap_or_else(Uuid::new_v4);
    sqlx::query_as::<_, Project>(
        "INSERT INTO projects (id, name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
         RETURNING id, name, created_at, updated_at",
    )
    .bind(id)
    .bind(name)
    .fetch_one(pool)
    .await
}

pub async fn list_projects(pool: &PgPool) -> Result<Vec<Project>, sqlx::Error> {
    sqlx::query_as::<_, Project>(
        "SELECT id, name, created_at, updated_at
         FROM projects ORDER BY updated_at DESC",
    )
    .fetch_all(pool)
    .await
}

pub async fn get_project(pool: &PgPool, id: Uuid) -> Result<Option<Project>, sqlx::Error> {
    sqlx::query_as::<_, Project>(
        "SELECT id, name, created_at, updated_at FROM projects WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn update_project(
    pool: &PgPool,
    id: Uuid,
    name: &str,
) -> Result<Option<Project>, sqlx::Error> {
    sqlx::query_as::<_, Project>(
        "UPDATE projects SET name = $1, updated_at = now() WHERE id = $2
         RETURNING id, name, created_at, updated_at",
    )
    .bind(name)
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn delete_project(pool: &PgPool, id: Uuid) -> Result<bool, sqlx::Error> {
    let r = sqlx::query("DELETE FROM projects WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(r.rows_affected() > 0)
}

// ── Documents ─────────────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Document {
    pub project_id: Uuid,
    pub data: String,
    pub version: i64,
    pub updated_at: DateTime<Utc>,
}

pub async fn get_document(
    pool: &PgPool,
    project_id: Uuid,
) -> Result<Option<Document>, sqlx::Error> {
    sqlx::query_as::<_, Document>(
        "SELECT project_id, data, version, updated_at
         FROM documents WHERE project_id = $1",
    )
    .bind(project_id)
    .fetch_optional(pool)
    .await
}

pub async fn save_document(
    pool: &PgPool,
    project_id: Uuid,
    data: &str,
) -> Result<Document, sqlx::Error> {
    let doc = sqlx::query_as::<_, Document>(
        r#"INSERT INTO documents (project_id, data, version, updated_at)
           VALUES ($1, $2, 1, now())
           ON CONFLICT (project_id) DO UPDATE
             SET data       = EXCLUDED.data,
                 version    = documents.version + 1,
                 updated_at = now()
           RETURNING project_id, data, version, updated_at"#,
    )
    .bind(project_id)
    .bind(data)
    .fetch_one(pool)
    .await?;

    // Keep the project's updated_at in sync
    let _ = sqlx::query("UPDATE projects SET updated_at = now() WHERE id = $1")
        .bind(project_id)
        .execute(pool)
        .await;

    Ok(doc)
}

// ── Version history ───────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct VersionInfo {
    pub id: Uuid,
    pub project_id: Uuid,
    pub version_number: i32,
    pub message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Version {
    pub id: Uuid,
    pub project_id: Uuid,
    pub version_number: i32,
    pub data: String,
    pub message: Option<String>,
    pub created_at: DateTime<Utc>,
}

pub async fn create_version(
    pool: &PgPool,
    project_id: Uuid,
    data: &str,
    message: Option<&str>,
) -> Result<Version, sqlx::Error> {
    // version_number = max existing + 1
    sqlx::query_as::<_, Version>(
        r#"INSERT INTO version_history (project_id, version_number, data, message)
           VALUES (
             $1,
             COALESCE((SELECT MAX(version_number) FROM version_history WHERE project_id = $1), 0) + 1,
             $2,
             $3
           )
           RETURNING id, project_id, version_number, data, message, created_at"#,
    )
    .bind(project_id)
    .bind(data)
    .bind(message)
    .fetch_one(pool)
    .await
}

pub async fn list_versions(
    pool: &PgPool,
    project_id: Uuid,
) -> Result<Vec<VersionInfo>, sqlx::Error> {
    sqlx::query_as::<_, VersionInfo>(
        "SELECT id, project_id, version_number, message, created_at
         FROM version_history WHERE project_id = $1
         ORDER BY version_number DESC",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
}

pub async fn get_version(
    pool: &PgPool,
    version_id: Uuid,
    project_id: Uuid,
) -> Result<Option<Version>, sqlx::Error> {
    sqlx::query_as::<_, Version>(
        "SELECT id, project_id, version_number, data, message, created_at
         FROM version_history WHERE id = $1 AND project_id = $2",
    )
    .bind(version_id)
    .bind(project_id)
    .fetch_optional(pool)
    .await
}

// ── Feedback ──────────────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Feedback {
    pub id: Uuid,
    pub firebase_uid: Option<String>,
    pub category: String,
    pub title: String,
    pub description: String,
    pub prd_label: Option<String>,
    pub feasibility: String,
    pub github_issue_url: Option<String>,
    pub github_issue_number: Option<i32>,
    pub created_at: DateTime<Utc>,
}

pub struct CreateFeedbackParams<'a> {
    pub firebase_uid: Option<&'a str>,
    pub category: &'a str,
    pub title: &'a str,
    pub description: &'a str,
    pub prd_label: Option<&'a str>,
    pub feasibility: &'a str,
    pub github_issue_url: Option<&'a str>,
    pub github_issue_number: Option<i32>,
}

pub async fn create_feedback(
    pool: &PgPool,
    p: CreateFeedbackParams<'_>,
) -> Result<Feedback, sqlx::Error> {
    sqlx::query_as::<_, Feedback>(
        r#"INSERT INTO feedback
             (firebase_uid, category, title, description, prd_label, feasibility,
              github_issue_url, github_issue_number)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, firebase_uid, category, title, description, prd_label,
                     feasibility, github_issue_url, github_issue_number, created_at"#,
    )
    .bind(p.firebase_uid)
    .bind(p.category)
    .bind(p.title)
    .bind(p.description)
    .bind(p.prd_label)
    .bind(p.feasibility)
    .bind(p.github_issue_url)
    .bind(p.github_issue_number)
    .fetch_one(pool)
    .await
}

pub async fn list_feedback_by_user(
    pool: &PgPool,
    firebase_uid: &str,
) -> Result<Vec<Feedback>, sqlx::Error> {
    sqlx::query_as::<_, Feedback>(
        r#"SELECT id, firebase_uid, category, title, description, prd_label,
                  feasibility, github_issue_url, github_issue_number, created_at
           FROM feedback WHERE firebase_uid = $1
           ORDER BY created_at DESC LIMIT 50"#,
    )
    .bind(firebase_uid)
    .fetch_all(pool)
    .await
}

// ── Marketplace ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: String,
    pub category: String,
    pub icon: Option<String>,
    pub entrypoint: String,
    pub sri_hash: Option<String>,
    pub permissions: serde_json::Value,
    pub price_cents: i32,
    pub rating: f32,
    pub download_count: i64,
    pub publisher_uid: Option<String>,
    pub moderation_status: String,
    pub moderation_notes: Option<String>,
    pub revoked: bool,
    pub revoked_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct UpsertPluginParams<'a> {
    pub id: &'a str,
    pub name: &'a str,
    pub description: &'a str,
    pub version: &'a str,
    pub author: &'a str,
    pub category: &'a str,
    pub icon: Option<&'a str>,
    pub entrypoint: &'a str,
    pub sri_hash: Option<&'a str>,
    pub permissions: &'a serde_json::Value,
    pub price_cents: i32,
    pub publisher_uid: Option<&'a str>,
    pub moderation_status: &'a str,
}

pub async fn upsert_plugin(
    pool: &PgPool,
    p: UpsertPluginParams<'_>,
) -> Result<Plugin, sqlx::Error> {
    sqlx::query_as::<_, Plugin>(
        r#"INSERT INTO plugins (id, name, description, version, author, category, icon,
                                entrypoint, sri_hash, permissions, price_cents,
                                publisher_uid, moderation_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO UPDATE SET
             name              = EXCLUDED.name,
             description       = EXCLUDED.description,
             version           = EXCLUDED.version,
             author            = EXCLUDED.author,
             category          = EXCLUDED.category,
             icon              = EXCLUDED.icon,
             entrypoint        = EXCLUDED.entrypoint,
             sri_hash          = EXCLUDED.sri_hash,
             permissions       = EXCLUDED.permissions,
             price_cents       = EXCLUDED.price_cents,
             moderation_status = EXCLUDED.moderation_status,
             updated_at        = now()
           RETURNING id, name, description, version, author, category, icon, entrypoint,
                     sri_hash, permissions, price_cents, rating, download_count,
                     publisher_uid, moderation_status, moderation_notes,
                     revoked, revoked_reason, created_at, updated_at"#,
    )
    .bind(p.id)
    .bind(p.name)
    .bind(p.description)
    .bind(p.version)
    .bind(p.author)
    .bind(p.category)
    .bind(p.icon)
    .bind(p.entrypoint)
    .bind(p.sri_hash)
    .bind(p.permissions)
    .bind(p.price_cents)
    .bind(p.publisher_uid)
    .bind(p.moderation_status)
    .fetch_one(pool)
    .await
}

pub async fn list_plugins(
    pool: &PgPool,
    search: Option<&str>,
    category: Option<&str>,
) -> Result<Vec<Plugin>, sqlx::Error> {
    // Only approved + non-revoked plugins are visible in the public catalogue.
    // Search is a simple ILIKE across name/description — good enough until
    // the catalogue is large enough to justify full-text search.
    let pattern = search.map(|s| format!("%{}%", s));
    sqlx::query_as::<_, Plugin>(
        r#"SELECT id, name, description, version, author, category, icon, entrypoint,
                  sri_hash, permissions, price_cents, rating, download_count,
                  publisher_uid, moderation_status, moderation_notes,
                  revoked, revoked_reason, created_at, updated_at
           FROM plugins
           WHERE moderation_status = 'approved' AND revoked = FALSE
             AND ($1::text IS NULL OR name ILIKE $1 OR description ILIKE $1)
             AND ($2::text IS NULL OR category = $2)
           ORDER BY download_count DESC, name ASC"#,
    )
    .bind(pattern)
    .bind(category)
    .fetch_all(pool)
    .await
}

pub async fn get_plugin(pool: &PgPool, id: &str) -> Result<Option<Plugin>, sqlx::Error> {
    sqlx::query_as::<_, Plugin>(
        r#"SELECT id, name, description, version, author, category, icon, entrypoint,
                  sri_hash, permissions, price_cents, rating, download_count,
                  publisher_uid, moderation_status, moderation_notes,
                  revoked, revoked_reason, created_at, updated_at
           FROM plugins WHERE id = $1"#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn set_plugin_revoked(
    pool: &PgPool,
    id: &str,
    revoked: bool,
    reason: Option<&str>,
) -> Result<Option<Plugin>, sqlx::Error> {
    sqlx::query_as::<_, Plugin>(
        r#"UPDATE plugins SET revoked = $1, revoked_reason = $2, updated_at = now()
           WHERE id = $3
           RETURNING id, name, description, version, author, category, icon, entrypoint,
                     sri_hash, permissions, price_cents, rating, download_count,
                     publisher_uid, moderation_status, moderation_notes,
                     revoked, revoked_reason, created_at, updated_at"#,
    )
    .bind(revoked)
    .bind(reason)
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn set_plugin_moderation(
    pool: &PgPool,
    id: &str,
    status: &str,
    notes: Option<&str>,
) -> Result<Option<Plugin>, sqlx::Error> {
    sqlx::query_as::<_, Plugin>(
        r#"UPDATE plugins SET moderation_status = $1, moderation_notes = $2, updated_at = now()
           WHERE id = $3
           RETURNING id, name, description, version, author, category, icon, entrypoint,
                     sri_hash, permissions, price_cents, rating, download_count,
                     publisher_uid, moderation_status, moderation_notes,
                     revoked, revoked_reason, created_at, updated_at"#,
    )
    .bind(status)
    .bind(notes)
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn list_plugins_pending_moderation(
    pool: &PgPool,
) -> Result<Vec<Plugin>, sqlx::Error> {
    sqlx::query_as::<_, Plugin>(
        r#"SELECT id, name, description, version, author, category, icon, entrypoint,
                  sri_hash, permissions, price_cents, rating, download_count,
                  publisher_uid, moderation_status, moderation_notes,
                  revoked, revoked_reason, created_at, updated_at
           FROM plugins WHERE moderation_status = 'pending'
           ORDER BY created_at ASC"#,
    )
    .fetch_all(pool)
    .await
}

// ── Plugin installs (per-user) ───────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PluginInstall {
    pub firebase_uid: String,
    pub plugin_id: String,
    pub version: String,
    pub installed_at: DateTime<Utc>,
}

pub async fn install_plugin(
    pool: &PgPool,
    firebase_uid: &str,
    plugin_id: &str,
) -> Result<Option<(PluginInstall, Plugin)>, sqlx::Error> {
    // Transactional: look up the plugin's current version, insert the install
    // record (or update if already present), and bump download_count.
    // Returns None if the plugin doesn't exist, is not approved, or is
    // revoked — callers expect that to map to a 404.
    let mut tx = pool.begin().await?;

    let plugin = sqlx::query_as::<_, Plugin>(
        r#"SELECT id, name, description, version, author, category, icon, entrypoint,
                  sri_hash, permissions, price_cents, rating, download_count,
                  publisher_uid, moderation_status, moderation_notes,
                  revoked, revoked_reason, created_at, updated_at
           FROM plugins
           WHERE id = $1 AND moderation_status = 'approved' AND revoked = FALSE"#,
    )
    .bind(plugin_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some(plugin) = plugin else {
        tx.rollback().await?;
        return Ok(None);
    };

    let install = sqlx::query_as::<_, PluginInstall>(
        r#"INSERT INTO plugin_installs (firebase_uid, plugin_id, version)
           VALUES ($1, $2, $3)
           ON CONFLICT (firebase_uid, plugin_id) DO UPDATE
             SET version      = EXCLUDED.version,
                 installed_at = now()
           RETURNING firebase_uid, plugin_id, version, installed_at"#,
    )
    .bind(firebase_uid)
    .bind(&plugin.id)
    .bind(&plugin.version)
    .fetch_one(&mut *tx)
    .await?;

    // Best-effort counter bump — not load-bearing for the response.
    let _ = sqlx::query("UPDATE plugins SET download_count = download_count + 1 WHERE id = $1")
        .bind(&plugin.id)
        .execute(&mut *tx)
        .await;

    tx.commit().await?;
    Ok(Some((install, plugin)))
}

pub async fn uninstall_plugin(
    pool: &PgPool,
    firebase_uid: &str,
    plugin_id: &str,
) -> Result<bool, sqlx::Error> {
    let r = sqlx::query(
        "DELETE FROM plugin_installs WHERE firebase_uid = $1 AND plugin_id = $2",
    )
    .bind(firebase_uid)
    .bind(plugin_id)
    .execute(pool)
    .await?;
    Ok(r.rows_affected() > 0)
}

/// Flat row for the installed-plugins join — plugin catalogue fields plus
/// the per-user install metadata (installed version + timestamp).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPlugin {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,                // current catalogue version
    pub installed_version: String,      // what the user has locally
    pub author: String,
    pub category: String,
    pub icon: Option<String>,
    pub entrypoint: String,
    pub sri_hash: Option<String>,
    pub permissions: serde_json::Value,
    pub price_cents: i32,
    pub rating: f32,
    pub revoked: bool,
    pub revoked_reason: Option<String>,
    pub installed_at: DateTime<Utc>,
}

pub async fn list_installed_plugins(
    pool: &PgPool,
    firebase_uid: &str,
) -> Result<Vec<InstalledPlugin>, sqlx::Error> {
    // Join installs → plugins so callers get catalogue metadata plus the
    // user-specific installed version in one round trip.
    sqlx::query_as::<_, InstalledPlugin>(
        r#"SELECT
             p.id, p.name, p.description, p.version,
             i.version AS installed_version,
             p.author, p.category, p.icon, p.entrypoint, p.sri_hash,
             p.permissions, p.price_cents, p.rating,
             p.revoked, p.revoked_reason,
             i.installed_at
           FROM plugin_installs i
           JOIN plugins p ON p.id = i.plugin_id
           WHERE i.firebase_uid = $1
           ORDER BY i.installed_at DESC"#,
    )
    .bind(firebase_uid)
    .fetch_all(pool)
    .await
}

// ── Plugin reports ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PluginReport {
    pub id: Uuid,
    pub plugin_id: String,
    pub reporter_uid: String,
    pub reason: String,
    pub details: Option<String>,
    pub resolved: bool,
    pub created_at: DateTime<Utc>,
}

pub async fn create_plugin_report(
    pool: &PgPool,
    plugin_id: &str,
    reporter_uid: &str,
    reason: &str,
    details: Option<&str>,
) -> Result<PluginReport, sqlx::Error> {
    sqlx::query_as::<_, PluginReport>(
        r#"INSERT INTO plugin_reports (plugin_id, reporter_uid, reason, details)
           VALUES ($1, $2, $3, $4)
           RETURNING id, plugin_id, reporter_uid, reason, details, resolved, created_at"#,
    )
    .bind(plugin_id)
    .bind(reporter_uid)
    .bind(reason)
    .bind(details)
    .fetch_one(pool)
    .await
}

pub async fn list_plugin_reports(
    pool: &PgPool,
    only_open: bool,
) -> Result<Vec<PluginReport>, sqlx::Error> {
    let sql = if only_open {
        r#"SELECT id, plugin_id, reporter_uid, reason, details, resolved, created_at
           FROM plugin_reports WHERE resolved = FALSE ORDER BY created_at DESC"#
    } else {
        r#"SELECT id, plugin_id, reporter_uid, reason, details, resolved, created_at
           FROM plugin_reports ORDER BY created_at DESC LIMIT 500"#
    };
    sqlx::query_as::<_, PluginReport>(sql).fetch_all(pool).await
}
