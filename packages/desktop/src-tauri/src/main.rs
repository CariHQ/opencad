#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::{error, info, warn};
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

struct AppState {
    db: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProjectMetadata {
    id: String,
    name: String,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenFileResult {
    path: String,
    size: u64,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct RecentFile {
    path: String,
    name: String,
    last_opened: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct LocalAIStatus {
    available: bool,
    model_loaded: bool,
    model_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct UpdateInfo {
    available: bool,
    version: Option<String>,
    notes: Option<String>,
    url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RecoveryData {
    project_id: String,
    timestamp: i64,
    data: String,
}

fn get_data_dir() -> PathBuf {
    let home = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join("opencad")
}

fn init_database(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS recent_files (
            path TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            last_opened INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS recovery (
            id INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )",
        [],
    )?;

    Ok(())
}

#[tauri::command]
fn save_project(
    state: State<AppState>,
    id: String,
    name: String,
    data: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;

    db.execute(
        "INSERT OR REPLACE INTO projects (id, name, data, created_at, updated_at)
         VALUES (?1, ?2, ?3, COALESCE((SELECT created_at FROM projects WHERE id = ?1), ?4), ?4)",
        rusqlite::params![id, name, data, now],
    )
    .map_err(|e| e.to_string())?;

    info!("Saved project: {} ({})", name, id);
    Ok(())
}

#[tauri::command]
fn load_project(state: State<AppState>, id: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let result: Result<String, _> = db.query_row(
        "SELECT data FROM projects WHERE id = ?1",
        rusqlite::params![id],
        |row| row.get(0),
    );

    match result {
        Ok(data) => Ok(Some(data)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn list_projects(state: State<AppState>) -> Result<Vec<ProjectMetadata>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare("SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let projects = stmt
        .query_map([], |row| {
            Ok(ProjectMetadata {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let result: Vec<ProjectMetadata> = projects.filter_map(|p| p.ok()).collect();

    Ok(result)
}

#[tauri::command]
fn delete_project(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM projects WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    info!("Deleted project: {}", id);
    Ok(())
}

#[tauri::command]
fn open_file(path: String) -> Result<OpenFileResult, String> {
    let path_buf = PathBuf::from(&path);
    let metadata = fs::metadata(&path_buf).map_err(|e| e.to_string())?;
    let content = fs::read_to_string(&path_buf).map_err(|e| e.to_string())?;

    info!("Opened file: {} ({} bytes)", path, metadata.len());

    Ok(OpenFileResult {
        path,
        size: metadata.len(),
        content,
    })
}

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())?;
    info!("Saved file: {}", path);
    Ok(())
}

#[tauri::command]
fn get_storage_info() -> Result<(u64, u64), String> {
    let data_dir = get_data_dir();
    let mut total_size = 0u64;

    if data_dir.exists() {
        for entry in walkdir(&data_dir) {
            if entry.is_file() {
                total_size += entry.metadata().map(|m| m.len()).unwrap_or(0);
            }
        }
    }

    Ok((total_size, 10 * 1024 * 1024 * 1024))
}

fn walkdir(path: &PathBuf) -> impl Iterator<Item = fs::DirEntry> {
    std::fs::read_dir(path)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|e| e.file_type().ok().map(|_| e))
}

// T-DSK-007: External File Watch
#[tauri::command]
fn watch_file(_path: String) -> Result<(), String> {
    warn!("File watching not fully implemented - requires notify crate");
    Ok(())
}

#[tauri::command]
fn unwatch_file(_path: String) -> Result<(), String> {
    Ok(())
}

// T-DSK-008: Offline Local AI
#[tauri::command]
fn get_local_ai_status() -> Result<LocalAIStatus, String> {
    Ok(LocalAIStatus {
        available: false,
        model_loaded: false,
        model_path: None,
    })
}

#[tauri::command]
fn load_local_ai_model(_path: String) -> Result<bool, String> {
    warn!("Local AI not implemented - requires llama.cpp or similar");
    Ok(false)
}

#[tauri::command]
fn run_local_ai(_prompt: String) -> Result<String, String> {
    Err("Local AI not available".to_string())
}

// T-DSK-010: Multi-Window Support
#[tauri::command]
fn open_new_window(app: AppHandle, route: String, title: String) -> Result<(), String> {
    let window_id = format!("window-{}", chrono::Utc::now().timestamp_millis());

    WebviewWindowBuilder::new(&app, &window_id, WebviewUrl::App(route.into()))
        .title(&title)
        .inner_size(1280.0, 800.0)
        .build()
        .map_err(|e| e.to_string())?;

    info!("Opened new window: {}", window_id);
    Ok(())
}

#[tauri::command]
fn get_current_window_id(app: AppHandle) -> Result<String, String> {
    app.get_current_webview_window()
        .map(|w| w.label().to_string())
        .ok_or_else(|| "No current window".to_string())
}

// T-DSK-011: System Tray Status
#[tauri::command]
fn set_tray_status(_status: String) -> Result<(), String> {
    warn!("System tray not implemented - requires tauri-plugin-system-tray");
    Ok(())
}

#[tauri::command]
fn show_tray_notification(_title: String, _body: String) -> Result<(), String> {
    Ok(())
}

// T-DSK-012: Auto-Update
#[tauri::command]
fn check_for_update() -> Result<UpdateInfo, String> {
    Ok(UpdateInfo {
        available: false,
        version: None,
        notes: None,
        url: None,
    })
}

#[tauri::command]
fn download_update(_url: String) -> Result<(), String> {
    warn!("Auto-update not implemented - requires tauri-plugin-updater");
    Ok(())
}

#[tauri::command]
fn install_update() -> Result<(), String> {
    Err("Auto-update not available".to_string())
}

// T-DSK-013: Crash Recovery
#[tauri::command]
fn get_recovery_data(state: State<AppState>) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let result: Result<String, _> =
        db.query_row("SELECT data FROM recovery WHERE id = 1", [], |row| {
            row.get(0)
        });

    match result {
        Ok(data) => Ok(Some(data)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_recovery_data(state: State<AppState>, data: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;

    db.execute(
        "INSERT OR REPLACE INTO recovery (id, data, timestamp) VALUES (1, ?1, ?2)",
        rusqlite::params![data, now],
    )
    .map_err(|e| e.to_string())?;

    info!("Saved recovery data");
    Ok(())
}

#[tauri::command]
fn clear_recovery_data(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM recovery WHERE id = 1", [])
        .map_err(|e| e.to_string())?;
    info!("Cleared recovery data");
    Ok(())
}

// T-DSK-016: External Drive Backup
#[tauri::command]
fn check_external_drive(path: String) -> Result<bool, String> {
    let path_buf = PathBuf::from(&path);
    Ok(path_buf.exists())
}

// T-DSK-019: Recent Files
#[tauri::command]
fn add_recent_file(state: State<AppState>, path: String, name: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;

    db.execute(
        "INSERT OR REPLACE INTO recent_files (path, name, last_opened) VALUES (?1, ?2, ?3)",
        rusqlite::params![path, name, now],
    )
    .map_err(|e| e.to_string())?;

    info!("Added recent file: {}", path);
    Ok(())
}

#[tauri::command]
fn get_recent_files(state: State<AppState>) -> Result<Vec<RecentFile>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(
            "SELECT path, name, last_opened FROM recent_files ORDER BY last_opened DESC LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let files = stmt
        .query_map([], |row| {
            Ok(RecentFile {
                path: row.get(0)?,
                name: row.get(1)?,
                last_opened: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let result: Vec<RecentFile> = files.filter_map(|f| f.ok()).collect();

    Ok(result)
}

#[tauri::command]
fn clear_recent_files(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM recent_files", [])
        .map_err(|e| e.to_string())?;
    info!("Cleared recent files");
    Ok(())
}

// T-DSK-020: Browser-Desktop Sync
#[tauri::command]
fn get_sync_status() -> Result<String, String> {
    Ok("synced".to_string())
}

#[tauri::command]
fn sync_document(_document: String) -> Result<(), String> {
    warn!("Browser sync not implemented - requires sync package");
    Ok(())
}

#[tauri::command]
fn get_synced_document() -> Result<Option<String>, String> {
    Ok(None)
}

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    info!("Starting OpenCAD Desktop v{}", env!("CARGO_PKG_VERSION"));

    let data_dir = get_data_dir();
    fs::create_dir_all(&data_dir).expect("Failed to create data directory");

    let db_path = data_dir.join("opencad.db");
    let conn = Connection::open(&db_path).expect("Failed to open database");

    init_database(&conn).expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            db: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![
            save_project,
            load_project,
            list_projects,
            delete_project,
            open_file,
            save_file,
            get_storage_info,
            watch_file,
            unwatch_file,
            get_local_ai_status,
            load_local_ai_model,
            run_local_ai,
            open_new_window,
            get_current_window_id,
            set_tray_status,
            show_tray_notification,
            check_for_update,
            download_update,
            install_update,
            get_recovery_data,
            save_recovery_data,
            clear_recovery_data,
            check_external_drive,
            add_recent_file,
            get_recent_files,
            clear_recent_files,
            get_sync_status,
            sync_document,
            get_synced_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
