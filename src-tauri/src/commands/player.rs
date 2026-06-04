// Cadence — Player state commands
// Manages playback state persistence between sessions

use serde::{Deserialize, Serialize};
use tauri::command;

/// Serializable player state for persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerStateData {
    pub current_song_id: Option<String>,
    pub volume: f64,
    pub is_muted: bool,
    pub shuffle: bool,
    pub repeat_mode: String,
    pub crossfade_duration: f64,
}

/// Get the persisted player state from SQLite settings table
#[command]
pub async fn get_player_state() -> Result<Option<PlayerStateData>, String> {
    // TODO: Read player state from settings table
    Ok(None)
}

/// Persist the current player state to SQLite settings table
#[command]
pub async fn update_player_state(_state: PlayerStateData) -> Result<(), String> {
    // TODO: Write player state to settings table
    log::info!("Updating player state");
    Ok(())
}
