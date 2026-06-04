// Cadence — Database module
// Manages SQLite database initialization and migrations

pub mod migrations;

use tauri::Manager;

/// Initialize the SQLite database at the app data directory.
/// Creates the directory and database file if they don't exist,
/// then runs all migration statements.
pub async fn initialize_database(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    // Ensure the app data directory exists
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    }

    let db_path = app_dir.join("cadence.db");
    log::info!("Initializing database at: {:?}", db_path);

    // Open (or create) the database file
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Enable WAL mode for better concurrent read/write performance
    conn.execute_batch("PRAGMA journal_mode=WAL;")
        .map_err(|e| format!("Failed to set WAL mode: {}", e))?;

    // Enable foreign keys
    conn.execute_batch("PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    // Run all migration statements
    let statements: Vec<&str> = migrations::SCHEMA_SQL
        .split(';')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    let mut success_count = 0;
    for (i, sql) in statements.iter().enumerate() {
        match conn.execute_batch(sql) {
            Ok(_) => success_count += 1,
            Err(e) => log::error!("Migration {} failed: {} - SQL: {}", i + 1, e, sql),
        }
    }

    log::info!("Database initialized successfully with {}/{} migrations", success_count, statements.len());
    Ok(())
}
