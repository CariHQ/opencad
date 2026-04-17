use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    db,
    error::{AppError, Result},
    state::AppState,
};

#[derive(Serialize)]
pub struct DocumentResponse {
    pub project_id: Uuid,
    pub data: String,
    pub version: i64,
}

#[derive(Deserialize)]
pub struct SaveBody {
    pub data: String,
}

/// T-API-008: GET /api/v1/projects/:id/document
pub async fn get_document(
    State(s): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<DocumentResponse>> {
    let doc = db::get_document(&s.db, id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(DocumentResponse {
        project_id: doc.project_id,
        data: doc.data,
        version: doc.version,
    }))
}

/// T-API-007: PUT /api/v1/projects/:id/document
///
/// Saves the document and broadcasts the new data to any open WebSocket
/// connections in this project's room so other clients update instantly.
pub async fn save_document(
    State(s): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<SaveBody>,
) -> Result<Json<DocumentResponse>> {
    if body.data.is_empty() {
        return Err(AppError::BadRequest("data is required".into()));
    }

    // Ensure the project exists before accepting the document.
    db::get_project(&s.db, id)
        .await?
        .ok_or(AppError::NotFound)?;

    let doc = db::save_document(&s.db, id, &body.data).await?;

    // Push the raw document string to any open WebSocket clients in this room.
    if let Some(room) = s.rooms.get(&id.to_string()) {
        let _ = room.send(body.data.clone());
    }

    Ok(Json(DocumentResponse {
        project_id: doc.project_id,
        data: doc.data,
        version: doc.version,
    }))
}
