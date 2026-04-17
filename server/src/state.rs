use std::sync::Arc;

use dashmap::DashMap;
use sqlx::PgPool;
use tokio::sync::broadcast;

use crate::{auth::FirebaseVerifier, storage::Storage};

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
}

impl AppState {
    pub fn new(db: PgPool, storage: Arc<dyn Storage>, verifier: Option<Arc<FirebaseVerifier>>) -> Self {
        Self {
            db,
            storage,
            rooms: Arc::new(DashMap::new()),
            verifier,
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
