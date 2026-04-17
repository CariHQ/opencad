use axum::{middleware, routing::{get, post}, Router};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::{auth, state::AppState};

mod auth_routes;
mod documents;
mod files;
mod health;
mod projects;
pub mod ws;

pub fn build(state: AppState) -> Router {
    let cors = CorsLayer::permissive();

    // The verifier (for the auth middleware) is cloned out of state.
    let verifier = state.verifier.clone();

    // Routes that require authentication
    let protected = Router::new()
        // ── Auth ────────────────────────────────────────────────────────────
        .route("/api/v1/auth/me", post(auth_routes::me))
        // ── Projects ────────────────────────────────────────────────────────
        .route(
            "/api/v1/projects",
            get(projects::list).post(projects::create),
        )
        .route(
            "/api/v1/projects/:id",
            get(projects::get_one)
                .patch(projects::update)
                .delete(projects::delete_one),
        )
        // ── Documents ────────────────────────────────────────────────────────
        .route(
            "/api/v1/projects/:id/document",
            get(documents::get_document).put(documents::save_document),
        )
        // ── Files ─────────────────────────────────────────────────────────────
        .route(
            "/api/v1/projects/:id/files",
            get(files::list_files).post(files::upload_file),
        )
        .route(
            "/api/v1/projects/:id/files/:name",
            get(files::download_file).delete(files::delete_file),
        )
        // ── WebSocket ─────────────────────────────────────────────────────────
        .route("/ws/:project_id", get(ws::handler))
        .layer(middleware::from_fn_with_state(
            verifier,
            auth::auth_middleware,
        ));

    Router::new()
        // ── Liveness (no auth) ────────────────────────────────────────────
        .route("/health", get(health::health))
        .merge(protected)
        // ── Middleware ────────────────────────────────────────────────────
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state)
}
