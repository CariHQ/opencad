#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sync_server;

use log::{info, warn};
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, FilePath};

struct AppState {
    db: Arc<Mutex<Connection>>,
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
#[allow(dead_code)]
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

/// T-DSK-006: Show a native open-file dialog filtered to .opencad, .ifc, and .dwg files.
/// Returns the selected file path or None if the user cancels.
#[tauri::command]
async fn open_file_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let response = app
        .dialog()
        .file()
        .add_filter("OpenCAD files", &["opencad", "ifc", "dwg"])
        .blocking_pick_file();

    match response {
        Some(FilePath::Path(p)) => Ok(Some(p.to_string_lossy().into_owned())),
        _ => Ok(None),
    }
}

/// T-DSK-006: Show a native save-file dialog with a suggested filename.
/// Returns the chosen path or None if the user cancels.
#[tauri::command]
async fn save_file_dialog(app: AppHandle, default_name: String) -> Result<Option<String>, String> {
    let response = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("OpenCAD Project", &["opencad"])
        .blocking_save_file();

    match response {
        Some(FilePath::Path(p)) => Ok(Some(p.to_string_lossy().into_owned())),
        _ => Ok(None),
    }
}

#[tauri::command]
fn get_storage_info() -> Result<(u64, u64), String> {
    let data_dir = get_data_dir();
    let mut total_size = 0u64;

    if data_dir.exists() {
        for entry in walkdir(&data_dir) {
            if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
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
        .filter_map(|e| e.file_type().ok().filter(|t| t.is_file()).map(|_| e))
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
    app.webview_windows()
        .into_keys()
        .next()
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

/// T-DSK-007: Build the native OS menu bar.
/// Uses Tauri v2 `tauri::menu` API.  All menu item IDs are lowercase-hyphen
/// strings that the frontend listens for via the Tauri window global.
fn build_menu(handle: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    // ── File menu ─────────────────────────────────────────────────────────────
    let file_menu = Submenu::with_items(
        handle,
        "File",
        true,
        &[
            &MenuItem::with_id(handle, "file-new", "New Project", true, Some("CmdOrCtrl+N"))?,
            &MenuItem::with_id(
                handle,
                "file-open",
                "Open\u{2026}",
                true,
                Some("CmdOrCtrl+O"),
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "file-save", "Save", true, Some("CmdOrCtrl+S"))?,
            &MenuItem::with_id(
                handle,
                "file-save-as",
                "Save As\u{2026}",
                true,
                Some("CmdOrCtrl+Shift+S"),
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &Submenu::with_items(
                handle,
                "Import",
                true,
                &[
                    &MenuItem::with_id(handle, "import-ifc", "IFC\u{2026}", true, None::<&str>)?,
                    &MenuItem::with_id(handle, "import-dwg", "DWG\u{2026}", true, None::<&str>)?,
                    &MenuItem::with_id(handle, "import-pdf", "PDF\u{2026}", true, None::<&str>)?,
                    &MenuItem::with_id(
                        handle,
                        "import-revit",
                        "Revit (RVT)\u{2026}",
                        true,
                        None::<&str>,
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "import-sketchup",
                        "SketchUp (SKP)\u{2026}",
                        true,
                        None::<&str>,
                    )?,
                ],
            )?,
            &MenuItem::with_id(handle, "file-export", "Export\u{2026}", true, None::<&str>)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "file-recent", "Recent Files", false, None::<&str>)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "file-close", "Close", true, Some("CmdOrCtrl+W"))?,
        ],
    )?;

    // ── Edit menu ─────────────────────────────────────────────────────────────
    let edit_menu = Submenu::with_items(
        handle,
        "Edit",
        true,
        &[
            &MenuItem::with_id(handle, "edit-undo", "Undo", true, Some("CmdOrCtrl+Z"))?,
            &MenuItem::with_id(handle, "edit-redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::cut(handle, None)?,
            &PredefinedMenuItem::copy(handle, None)?,
            &PredefinedMenuItem::paste(handle, None)?,
            &MenuItem::with_id(handle, "edit-delete", "Delete", true, None::<&str>)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::select_all(handle, None)?,
        ],
    )?;

    // ── View menu ─────────────────────────────────────────────────────────────
    let view_menu = Submenu::with_items(
        handle,
        "View",
        true,
        &[
            &MenuItem::with_id(
                handle,
                "view-zoom-in",
                "Zoom In",
                true,
                Some("CmdOrCtrl+Plus"),
            )?,
            &MenuItem::with_id(
                handle,
                "view-zoom-out",
                "Zoom Out",
                true,
                Some("CmdOrCtrl+Minus"),
            )?,
            &MenuItem::with_id(
                handle,
                "view-zoom-fit",
                "Zoom to Fit",
                true,
                Some("CmdOrCtrl+0"),
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(
                handle,
                "view-toggle-2d-3d",
                "Toggle 2D / 3D",
                true,
                Some("CmdOrCtrl+Shift+3"),
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(
                handle,
                "view-panel-layers",
                "Show/Hide Layers",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                handle,
                "view-panel-properties",
                "Show/Hide Properties",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                handle,
                "view-panel-ai-chat",
                "Show/Hide AI Chat",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "view-dark-mode", "Dark Mode", true, None::<&str>)?,
            &MenuItem::with_id(handle, "view-light-mode", "Light Mode", true, None::<&str>)?,
        ],
    )?;

    // ── Tools menu ────────────────────────────────────────────────────────────
    let tools_menu = Submenu::with_items(
        handle,
        "Tools",
        true,
        &[
            &MenuItem::with_id(handle, "tool-select", "Select", true, Some("V"))?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "tool-line", "Line", true, Some("L"))?,
            &MenuItem::with_id(handle, "tool-rectangle", "Rectangle", true, Some("R"))?,
            &MenuItem::with_id(handle, "tool-circle", "Circle", true, Some("C"))?,
            &MenuItem::with_id(handle, "tool-arc", "Arc", true, Some("A"))?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "tool-wall", "Wall", true, Some("W"))?,
            &MenuItem::with_id(handle, "tool-door", "Door", true, Some("D"))?,
            &MenuItem::with_id(handle, "tool-window", "Window", true, None::<&str>)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "tool-dimension", "Dimension", true, None::<&str>)?,
            &MenuItem::with_id(handle, "tool-text", "Text", true, Some("T"))?,
        ],
    )?;

    // ── Help menu ─────────────────────────────────────────────────────────────
    let help_menu = Submenu::with_items(
        handle,
        "Help",
        true,
        &[
            &MenuItem::with_id(handle, "help-about", "About OpenCAD", true, None::<&str>)?,
            &MenuItem::with_id(
                handle,
                "help-check-updates",
                "Check for Updates\u{2026}",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(handle, "help-docs", "Documentation", true, None::<&str>)?,
        ],
    )?;

    Menu::with_items(
        handle,
        &[&file_menu, &edit_menu, &view_menu, &tools_menu, &help_menu],
    )
}

/// T-DSK-007: Route menu events to the frontend via Tauri events.
/// The frontend listens for `"menu"` events with a string payload (the menu item ID).
fn handle_menu_event(app: &AppHandle, id: &str) {
    info!("Menu event: {}", id);
    if let Err(e) = app.emit("menu", id) {
        warn!("Failed to emit menu event '{}': {}", id, e);
    }
}

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    info!("Starting OpenCAD Desktop v{}", env!("CARGO_PKG_VERSION"));

    let data_dir = get_data_dir();
    fs::create_dir_all(&data_dir).expect("Failed to create data directory");

    let db_path = data_dir.join("opencad.db");
    let conn = Connection::open(&db_path).expect("Failed to open database");

    init_database(&conn).expect("Failed to initialize database");

    let db = Arc::new(Mutex::new(conn));
    let db_for_state = Arc::clone(&db);
    let db_for_sync = Arc::clone(&db);

    tauri::Builder::default()
        .setup(move |app| {
            // ── T-DSK-007: Native OS Menu Bar ─────────────────────────────────
            let menu = build_menu(app.handle())?;
            app.set_menu(menu)?;

            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                handle_menu_event(&app_handle, event.id().as_ref());
            });

            // Spawn the local WebSocket sync server so both the Tauri webview
            // and any browser tabs on the same machine can sync document data.
            tauri::async_runtime::spawn(sync_server::run_sync_server(db_for_sync));
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState { db: db_for_state })
        .invoke_handler(tauri::generate_handler![
            save_project,
            load_project,
            list_projects,
            delete_project,
            open_file,
            open_file_dialog,
            save_file,
            save_file_dialog,
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
