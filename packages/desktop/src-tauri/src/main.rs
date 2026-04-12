#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::{error, info};
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

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

    Ok((total_size, 10 * 1024 * 1024 * 1024)) // Assume 10GB quota
}

fn walkdir(path: &PathBuf) -> impl Iterator<Item = fs::DirEntry> {
    std::fs::read_dir(path)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|e| e.file_type().ok().map(|_| e))
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
