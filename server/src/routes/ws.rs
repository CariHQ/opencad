use axum::{
    extract::{
        ws::{Message, WebSocket},
        Path, State, WebSocketUpgrade,
    },
    response::Response,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::state::AppState;

/// T-API-013: WS /ws/:project_id
///
/// On connect:
///   1. The current saved document is sent as a `{"type":"sync", ...}` message.
///   2. All subsequent messages received from this client are broadcast to every
///      other client in the same project room.
///   3. Messages broadcast by the room (including REST saves) are forwarded to
///      this client.
pub async fn handler(
    ws: WebSocketUpgrade,
    Path(project_id): Path<String>,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, project_id, state))
}

async fn handle_socket(socket: WebSocket, project_id: String, state: AppState) {
    // Validate project_id is a UUID so we can query the DB.
    let Ok(project_uuid) = project_id.parse::<Uuid>() else {
        tracing::warn!("ws: invalid project_id={project_id}");
        return;
    };

    let tx = state.get_or_create_room(&project_id);
    let mut rx = tx.subscribe();

    let (mut ws_tx, mut ws_rx) = socket.split();

    // Send the current document state immediately on connect (initial sync).
    if let Ok(Some(doc)) = crate::db::get_document(&state.db, project_uuid).await {
        let msg = serde_json::json!({
            "type": "sync",
            "data": doc.data,
            "version": doc.version,
        });
        let _ = ws_tx.send(Message::Text(msg.to_string())).await;
    }

    // Task A: forward room broadcasts → this WebSocket client.
    let mut send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(text) => {
                    if ws_tx.send(Message::Text(text)).await.is_err() {
                        break;
                    }
                }
                Err(broadcast::error::RecvError::Closed) => break,
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    tracing::warn!("ws room lagged by {n} messages");
                    continue;
                }
            }
        }
    });

    // Task B: receive from this client → broadcast to room.
    let tx_fwd = tx.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_rx.next().await {
            match msg {
                Message::Text(text) => {
                    // T-API-014: message is broadcast to every other client.
                    let _ = tx_fwd.send(text.to_string());
                }
                Message::Close(_) => break,
                _ => {} // ignore ping/pong/binary
            }
        }
    });

    // When either task exits (client disconnects or error), cancel the other.
    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    }

    tracing::debug!("ws: client disconnected from project {project_id}");
}
