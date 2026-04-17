use anyhow::Result;
use chrono::{DateTime, Utc};
use sqlx::{postgres::PgPoolOptions, PgPool};
use uuid::Uuid;

pub async fn connect(url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(url)
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
