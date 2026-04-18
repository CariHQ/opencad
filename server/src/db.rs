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
