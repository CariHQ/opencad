/**
 * Local WebSocket Sync Server
 *
 * Runs on ws://127.0.0.1:47820 inside the Tauri process.
 * Bridges the Tauri desktop app and any browser tab open on the same machine.
 *
 * Protocol (all messages are JSON):
 *
 *   Client → Server
 *     { "type": "join",         "projectId": "<id>" }
 *     { "type": "update",       "projectId": "<id>", "data": "<json>", "senderId": "<uuid>" }
 *     { "type": "listProjects" }
 *
 *   Server → Client
 *     { "type": "welcome",     "data": "<json>" | null }
 *     { "type": "update",      "projectId": "<id>", "data": "<json>", "senderId": "<uuid>" }
 *     { "type": "ack",         "projectId": "<id>" }
 *     { "type": "projectList", "projects": [{ "id", "name", "updatedAt" }] }
 */

use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use rusqlite::Connection;
use serde::Deserialize;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, mpsc};
use tokio_tungstenite::tungstenite::Message;

const SYNC_PORT: u16 = 47820;
const BROADCAST_CAPACITY: usize = 32;

pub type DbRef = Arc<Mutex<Connection>>;

// One broadcast channel per project room.
type RoomMap = Arc<Mutex<HashMap<String, broadcast::Sender<String>>>>;

// ─── Wire protocol ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct ClientMsg {
    r#type: String,
    #[serde(rename = "projectId", default)]
    project_id: Option<String>,
    data: Option<String>,
    #[serde(rename = "senderId", default)]
    sender_id: Option<String>,
}

// ─── Entry point ─────────────────────────────────────────────────────────────

pub async fn run_sync_server(db: DbRef) {
    let addr: SocketAddr = format!("127.0.0.1:{}", SYNC_PORT)
        .parse()
        .expect("valid socket addr");

    let listener = match TcpListener::bind(addr).await {
        Ok(l) => {
            info!("Local sync server listening on ws://{}", addr);
            l
        }
        Err(e) => {
            error!("Sync server failed to bind port {}: {}", SYNC_PORT, e);
            return;
        }
    };

    let rooms: RoomMap = Arc::new(Mutex::new(HashMap::new()));

    loop {
        match listener.accept().await {
            Ok((stream, peer)) => {
                let db2 = Arc::clone(&db);
                let rooms2 = Arc::clone(&rooms);
                tokio::spawn(async move {
                    if let Err(e) = handle_client(stream, peer, db2, rooms2).await {
                        warn!("Sync client {} error: {}", peer, e);
                    }
                });
            }
            Err(e) => {
                error!("Sync server accept error: {}", e);
            }
        }
    }
}

// ─── Per-connection handler ───────────────────────────────────────────────────

async fn handle_client(
    stream: TcpStream,
    peer: SocketAddr,
    db: DbRef,
    rooms: RoomMap,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ws = tokio_tungstenite::accept_async(stream).await?;
    let (mut ws_tx, mut ws_rx) = ws.split();

    info!("Sync client connected: {}", peer);

    // Outbound queue: all messages sent to this client flow through here.
    // This decouples the write path from the room-broadcast subscription.
    let (out_tx, mut out_rx) = mpsc::unbounded_channel::<String>();

    // Active broadcast subscription for this client's current project.
    // When None the "broadcast" arm of the select never fires.
    let mut broadcast_rx: Option<broadcast::Receiver<String>> = None;

    loop {
        tokio::select! {
            // ── Incoming WebSocket message ─────────────────────────────────
            maybe_msg = ws_rx.next() => {
                match maybe_msg {
                    Some(Ok(Message::Text(text))) => {
                        match serde_json::from_str::<ClientMsg>(&text) {
                            Ok(msg) => {
                                handle_message(
                                    msg, peer, &db, &rooms, &out_tx, &mut broadcast_rx,
                                );
                            }
                            Err(e) => {
                                warn!("Malformed message from {}: {} ({})", peer, text, e);
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Err(e)) => {
                        warn!("WS error from {}: {}", peer, e);
                        break;
                    }
                    _ => {} // ping / pong / binary — ignore
                }
            }

            // ── Outbound reply (welcome / ack / projectList) ──────────────
            Some(msg) = out_rx.recv() => {
                if ws_tx.send(Message::Text(msg)).await.is_err() {
                    break;
                }
            }

            // ── Broadcast from the project room ───────────────────────────
            // This arm is "always pending" when broadcast_rx is None, so it
            // never fires until the client joins a room.
            Some(msg) = recv_broadcast(&mut broadcast_rx) => {
                if ws_tx.send(Message::Text(msg)).await.is_err() {
                    break;
                }
            }
        }
    }

    info!("Sync client disconnected: {}", peer);
    Ok(())
    // Dropping out_rx here means any pending out_tx.send() returns an error.
}

// ─── Message dispatch ─────────────────────────────────────────────────────────

fn handle_message(
    msg: ClientMsg,
    peer: SocketAddr,
    db: &DbRef,
    rooms: &RoomMap,
    out_tx: &mpsc::UnboundedSender<String>,
    broadcast_rx: &mut Option<broadcast::Receiver<String>>,
) {
    match msg.r#type.as_str() {
        "join" => {
            let project_id = match msg.project_id {
                Some(id) => id,
                None => {
                    warn!("join from {} missing projectId", peer);
                    return;
                }
            };

            // Subscribe to the project room's broadcast channel.
            let rx = {
                let mut rooms_guard = rooms.lock().unwrap();
                let sender = rooms_guard
                    .entry(project_id.clone())
                    .or_insert_with(|| broadcast::channel::<String>(BROADCAST_CAPACITY).0);
                sender.subscribe()
            };
            *broadcast_rx = Some(rx);

            // Send welcome with the latest saved document (may be null).
            let data = load_project(db, &project_id);
            let welcome = serde_json::json!({ "type": "welcome", "data": data });
            let _ = out_tx.send(welcome.to_string());

            info!("Client {} joined project {}", peer, project_id);
        }

        "update" => {
            let project_id = match msg.project_id {
                Some(id) => id,
                None => {
                    warn!("update from {} missing projectId", peer);
                    return;
                }
            };
            let data = match msg.data {
                Some(d) => d,
                None => {
                    warn!("update from {} missing data", peer);
                    return;
                }
            };

            // Persist to SQLite.
            if let Err(e) = save_project(db, &project_id, &data) {
                error!("Failed to persist project {}: {}", project_id, e);
            }

            // Broadcast to ALL clients in the room.
            // The TypeScript client uses senderId to filter its own echo.
            let broadcast_msg = serde_json::json!({
                "type": "update",
                "projectId": project_id,
                "data": data,
                "senderId": msg.sender_id.unwrap_or_default()
            });
            {
                let rooms_guard = rooms.lock().unwrap();
                if let Some(sender) = rooms_guard.get(&project_id) {
                    let _ = sender.send(broadcast_msg.to_string());
                }
            }

            // Ack back to the sender.
            let ack = serde_json::json!({ "type": "ack", "projectId": project_id });
            let _ = out_tx.send(ack.to_string());
        }

        "listProjects" => {
            let projects = list_projects(db);
            let response = serde_json::json!({ "type": "projectList", "projects": projects });
            let _ = out_tx.send(response.to_string());
        }

        other => {
            warn!("Unknown message type '{}' from {}", other, peer);
        }
    }
}

// ─── Broadcast receive helper ─────────────────────────────────────────────────

/// Await the next message from an optional broadcast receiver.
/// Returns `None` (i.e., the future never resolves) when the receiver is absent,
/// which causes the `select!` arm to stay permanently pending.
async fn recv_broadcast(rx: &mut Option<broadcast::Receiver<String>>) -> Option<String> {
    match rx {
        None => {
            // Never resolves — keeps the select arm disabled.
            std::future::pending::<Option<String>>().await
        }
        Some(r) => loop {
            match r.recv().await {
                Ok(msg) => return Some(msg),
                Err(broadcast::error::RecvError::Lagged(_)) => continue, // skip missed msgs
                Err(broadcast::error::RecvError::Closed) => return None,
            }
        },
    }
}

// ─── Database helpers ─────────────────────────────────────────────────────────

fn load_project(db: &DbRef, project_id: &str) -> Option<String> {
    db.lock().ok()?.query_row(
        "SELECT data FROM projects WHERE id = ?1",
        rusqlite::params![project_id],
        |row| row.get(0),
    ).ok()
}

fn save_project(db: &DbRef, project_id: &str, data: &str) -> rusqlite::Result<()> {
    let conn = db.lock().map_err(|e| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
            Some(e.to_string()),
        )
    })?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    // Preserve existing name if the project already exists; otherwise use project_id as name.
    conn.execute(
        "INSERT OR REPLACE INTO projects (id, name, data, created_at, updated_at)
         VALUES (
             ?1,
             COALESCE((SELECT name FROM projects WHERE id = ?1), ?1),
             ?2,
             COALESCE((SELECT created_at FROM projects WHERE id = ?1), ?3),
             ?3
         )",
        rusqlite::params![project_id, data, now],
    )?;
    Ok(())
}

#[derive(serde::Serialize)]
struct ProjectItem {
    id: String,
    name: String,
    #[serde(rename = "updatedAt")]
    updated_at: i64,
}

fn list_projects(db: &DbRef) -> Vec<ProjectItem> {
    let conn = match db.lock() {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let mut stmt = match conn.prepare(
        "SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC",
    ) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    stmt.query_map([], |row| {
        Ok(ProjectItem {
            id: row.get(0)?,
            name: row.get(1)?,
            updated_at: row.get(2)?,
        })
    })
    .map(|rows| rows.filter_map(|r| r.ok()).collect())
    .unwrap_or_default()
}
