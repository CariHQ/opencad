use anyhow::Context;
use std::{net::SocketAddr, sync::Arc};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod config;
mod db;
mod error;
mod routes;
mod state;
mod storage;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env if present (ignored in production where env vars are injected).
    dotenvy::dotenv().ok();

    // Structured logging — respects RUST_LOG env var.
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "opencad_server=debug,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = config::Config::from_env().context("invalid configuration")?;

    tracing::info!(
        port = cfg.port,
        storage = ?cfg.storage_backend,
        auth = cfg.auth_enabled,
        "starting opencad-server"
    );

    // ── Database ──────────────────────────────────────────────────────────────
    let db = db::connect(&cfg.database_url)
        .await
        .context("failed to connect to database")?;

    db::migrate(&db)
        .await
        .context("database migration failed")?;

    tracing::info!("database ready");

    // ── Storage ───────────────────────────────────────────────────────────────
    let storage = storage::init(&cfg).context("failed to initialise storage")?;

    tracing::info!(backend = ?cfg.storage_backend, "storage ready");

    // ── Auth (optional) ───────────────────────────────────────────────────────
    let verifier = if cfg.auth_enabled {
        let project_id = cfg.firebase_project_id.clone()
            .context("FIREBASE_PROJECT_ID must be set when AUTH_ENABLED=true")?;
        tracing::info!(project_id = %project_id, "firebase auth enabled");
        Some(Arc::new(auth::FirebaseVerifier::new(project_id)))
    } else {
        tracing::warn!("auth disabled — all requests are unauthenticated");
        None
    };

    // ── HTTP server ───────────────────────────────────────────────────────────
    let app_state = state::AppState::new(db, storage, verifier, &cfg);
    let app = routes::build(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], cfg.port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .with_context(|| format!("failed to bind to {addr}"))?;

    tracing::info!(addr = %addr, "listening");
    axum::serve(listener, app).await?;

    Ok(())
}
