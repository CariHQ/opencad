use axum::{middleware, routing::{delete, get, patch, post}, Router};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::{auth, state::AppState};

mod auth_routes;
mod documents;
mod feedback;
mod files;
mod health;
mod llm;
mod plugins;
mod projects;
mod publishers;
mod subscriptions;
mod versions;
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
        // ── Versions ──────────────────────────────────────────────────────────
        .route(
            "/api/v1/projects/:id/versions",
            get(versions::list_versions).post(versions::create_version),
        )
        .route(
            "/api/v1/projects/:id/versions/:vid",
            get(versions::get_version),
        )
        // ── Feedback ──────────────────────────────────────────────────────────
        .route(
            "/api/v1/feedback",
            get(feedback::list).post(feedback::submit),
        )
        // ── LLM Router ────────────────────────────────────────────────────────
        .route("/api/v1/llm/chat", post(llm::chat))
        // ── Marketplace ───────────────────────────────────────────────────────
        .route(
            "/api/v1/marketplace/plugins",
            get(plugins::list).post(plugins::submit),
        )
        .route(
            "/api/v1/marketplace/plugins/installed",
            get(plugins::installed),
        )
        .route(
            "/api/v1/marketplace/plugins/:id",
            get(plugins::get_one),
        )
        .route(
            "/api/v1/marketplace/plugins/:id/install",
            post(plugins::install),
        )
        .route(
            "/api/v1/marketplace/plugins/:id/uninstall",
            delete(plugins::uninstall),
        )
        .route(
            "/api/v1/marketplace/plugins/:id/report",
            post(plugins::report),
        )
        .route(
            "/api/v1/marketplace/plugins/:id/bundle",
            post(plugins::upload_bundle),
        )
        .route(
            "/api/v1/marketplace/publishers",
            post(publishers::register),
        )
        .route(
            "/api/v1/marketplace/publishers/me",
            get(publishers::get_me),
        )
        .route(
            "/api/v1/marketplace/publishers/me/onboarding-url",
            get(publishers::onboarding_url),
        )
        .route(
            "/api/v1/marketplace/admin/queue",
            get(plugins::admin_queue),
        )
        .route(
            "/api/v1/marketplace/admin/plugins/:id/moderation",
            patch(plugins::admin_set_moderation),
        )
        .route(
            "/api/v1/marketplace/admin/plugins/:id/revoke",
            patch(plugins::admin_revoke),
        )
        // ── Subscriptions (authenticated) ────────────────────────────────────
        .route("/api/v1/subscription/status",   get(subscriptions::get_status))
        .route("/api/v1/subscription/checkout", post(subscriptions::create_checkout))
        .route("/api/v1/subscription/portal",   post(subscriptions::open_portal))
        .route("/api/v1/subscription/invoices", get(subscriptions::list_invoices))
        // ── WebSocket ─────────────────────────────────────────────────────────
        .route("/ws/:project_id", get(ws::handler))
        .layer(middleware::from_fn_with_state(
            verifier,
            auth::auth_middleware,
        ));

    Router::new()
        // ── Liveness (no auth) ────────────────────────────────────────────
        .route("/health", get(health::health))
        // ── Stripe webhook (no auth — HMAC-verified in the handler) ───────
        .route("/api/v1/stripe/webhook", post(subscriptions::stripe_webhook))
        .merge(protected)
        // ── Middleware ────────────────────────────────────────────────────
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state)
}
