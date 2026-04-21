use std::sync::Arc;

use dashmap::DashMap;
use sqlx::PgPool;
use tokio::sync::broadcast;

use crate::{auth::FirebaseVerifier, storage::Storage, config::Config};

/// Capacity of each per-project broadcast channel (in-flight messages).
const ROOM_CAPACITY: usize = 256;

/// Broadcast sender keyed by project ID string.
pub type RoomSender = broadcast::Sender<String>;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub storage: Arc<dyn Storage>,
    /// Active WebSocket rooms keyed by project ID.
    pub rooms: Arc<DashMap<String, RoomSender>>,
    /// Firebase ID-token verifier. `None` when `AUTH_ENABLED=false`.
    pub verifier: Option<Arc<FirebaseVerifier>>,
    /// GitHub personal access token for creating issues (optional).
    pub github_token: Option<String>,
    /// GitHub repo in owner/repo format (e.g. "opencad/opencad").
    pub github_repo: Option<String>,
    /// Comma-separated Firebase UIDs granted marketplace admin rights.
    pub admin_uids: Option<String>,
    /// Public base URL for plugin bundles.
    pub plugin_bundle_base_url: Option<String>,
    /// Stripe secret key (paid plugins).
    pub stripe_secret_key: Option<String>,
}

impl AppState {
    pub fn new(db: PgPool, storage: Arc<dyn Storage>, verifier: Option<Arc<FirebaseVerifier>>, cfg: &Config) -> Self {
        Self {
            db,
            storage,
            rooms: Arc::new(DashMap::new()),
            verifier,
            github_token: cfg.github_token.clone(),
            github_repo: cfg.github_repo.clone(),
            admin_uids: cfg.admin_uids.clone(),
            plugin_bundle_base_url: cfg.plugin_bundle_base_url.clone(),
            stripe_secret_key: cfg.stripe_secret_key.clone(),
        }
    }

    /// Returns the broadcast sender for a project room, creating it if needed.
    pub fn get_or_create_room(&self, project_id: &str) -> RoomSender {
        if let Some(tx) = self.rooms.get(project_id) {
            return tx.clone();
        }
        let (tx, _) = broadcast::channel(ROOM_CAPACITY);
        self.rooms.insert(project_id.to_string(), tx.clone());
        tx
    }
}
