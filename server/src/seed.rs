//! Startup seeding for the curated marketplace catalogue.
//!
//! Reads `server/data/plugins-catalogue.json` and upserts each entry into
//! the plugins table with `publisher_uid = NULL` (denoting an OpenCAD-owned
//! row). Third-party submissions with a different `publisher_uid` are left
//! alone — the seeder never overwrites a row it doesn't own.
//!
//! Failures are logged but do not abort startup: if the catalogue file is
//! missing or malformed, the server still comes up so existing DB rows
//! remain reachable.

use anyhow::{Context, Result};
use serde::Deserialize;
use sqlx::PgPool;

use crate::db;

const CATALOGUE_PATH: &str = "data/plugins-catalogue.json";

#[derive(Debug, Deserialize)]
struct Catalogue {
    plugins: Vec<CatalogueEntry>,
}

#[derive(Debug, Deserialize)]
struct CatalogueEntry {
    id: String,
    name: String,
    #[serde(default)]
    description: String,
    version: String,
    #[serde(default)]
    author: String,
    #[serde(default = "default_category")]
    category: String,
    #[serde(default)]
    icon: Option<String>,
    entrypoint: String,
    #[serde(default)]
    sri_hash: Option<String>,
    #[serde(default)]
    permissions: Vec<String>,
    #[serde(default)]
    price_cents: i32,
}

fn default_category() -> String { "misc".into() }

/// Upsert every curated plugin from the catalogue file. Safe to call on
/// every boot — each entry is an `ON CONFLICT DO UPDATE`.
pub async fn seed_marketplace(pool: &PgPool) -> Result<()> {
    let raw = match std::fs::read_to_string(CATALOGUE_PATH) {
        Ok(s) => s,
        Err(err) => {
            tracing::warn!(
                path = CATALOGUE_PATH,
                error = %err,
                "marketplace catalogue file missing — skipping seed"
            );
            return Ok(());
        }
    };

    let cat: Catalogue = serde_json::from_str(&raw)
        .context("malformed plugins-catalogue.json")?;

    let mut inserted = 0usize;
    for entry in &cat.plugins {
        let perms = serde_json::Value::Array(
            entry.permissions.iter()
                .map(|p| serde_json::Value::String(p.clone()))
                .collect(),
        );
        let res = db::upsert_plugin(
            pool,
            db::UpsertPluginParams {
                id: &entry.id,
                name: &entry.name,
                description: &entry.description,
                version: &entry.version,
                author: &entry.author,
                category: &entry.category,
                icon: entry.icon.as_deref(),
                entrypoint: &entry.entrypoint,
                sri_hash: entry.sri_hash.as_deref(),
                permissions: &perms,
                price_cents: entry.price_cents,
                publisher_uid: None,
                moderation_status: "approved",
            },
        )
        .await;

        match res {
            Ok(_) => inserted += 1,
            Err(err) => tracing::warn!(
                plugin_id = %entry.id,
                error = %err,
                "failed to seed plugin"
            ),
        }
    }
    tracing::info!(seeded = inserted, "marketplace catalogue ready");
    Ok(())
}
