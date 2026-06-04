// Cadence — System and window management commands
// Handles custom title bar actions, tray icon, and window state

use tauri::{command, AppHandle, Manager};

/// Minimize the main application window
#[command]
pub async fn minimize_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window.minimize().map_err(|e| e.to_string())
}

/// Toggle maximize/restore for the main application window
#[command]
pub async fn maximize_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

/// Close the main application window
#[command]
pub async fn close_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window.close().map_err(|e| e.to_string())
}

/// Update the window title dynamically (e.g., show current song)
#[command]
pub async fn set_window_title(app: AppHandle, title: String) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window.set_title(&title).map_err(|e| e.to_string())
}

/// Open a native system dialog for selecting a folder
#[command]
pub async fn open_folder_dialog(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    // Wrap the blocking picker in spawn_blocking to avoid blocking the async executor thread
    let folder_path = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .blocking_pick_folder()
    })
    .await
    .map_err(|e| e.to_string())?;

    match folder_path {
        Some(file_path) => {
            let path_buf = file_path
                .into_path()
                .map_err(|_| "Failed to convert FilePath to PathBuf".to_string())?;
            Ok(Some(path_buf.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

pub fn setup_media_keys(app: &AppHandle) {
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};
    use tauri::Emitter;
    
    let play_pause = Shortcut::new(None, Code::MediaPlayPause);
    let next = Shortcut::new(None, Code::MediaTrackNext);
    let prev = Shortcut::new(None, Code::MediaTrackPrevious);
    let stop = Shortcut::new(None, Code::MediaStop);

    let _ = app.global_shortcut().on_shortcut(play_pause, |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let _ = app.emit("media-play-pause", ());
        }
    });

    let _ = app.global_shortcut().on_shortcut(next, |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let _ = app.emit("media-next", ());
        }
    });

    let _ = app.global_shortcut().on_shortcut(prev, |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let _ = app.emit("media-previous", ());
        }
    });

    let _ = app.global_shortcut().on_shortcut(stop, |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let _ = app.emit("media-stop", ());
        }
    });
}

#[tauri::command]
pub async fn enter_mini_player(
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let window = app_handle.get_webview_window("main")
        .ok_or("Window not found")?;
    window.set_size(tauri::Size::Physical(
        tauri::PhysicalSize { width: 340, height: 340 }
    )).map_err(|e| e.to_string())?;
    window.set_resizable(false)
        .map_err(|e| e.to_string())?;
    window.set_always_on_top(true)
        .map_err(|e| e.to_string())?;
        
    if let Some(monitor) = window.current_monitor().map_err(|e| e.to_string())? {
        let screen_size = monitor.size();
        let x = (screen_size.width as i32) - 360;
        let y = (screen_size.height as i32) - 400;
        window.set_position(tauri::Position::Physical(
            tauri::PhysicalPosition { x, y }
        )).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn exit_mini_player(
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let window = app_handle.get_webview_window("main")
        .ok_or("Window not found")?;
    window.set_size(tauri::Size::Physical(
        tauri::PhysicalSize { width: 1280, height: 800}
    )).map_err(|e| e.to_string())?;
    window.set_resizable(true)
        .map_err(|e| e.to_string())?;
    window.set_always_on_top(false)
        .map_err(|e| e.to_string())?;
    
    window.center().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_tray_title(
    app_handle: tauri::AppHandle,
    title: String,
) -> Result<(), String> {
    // Update tray tooltip with now playing info
    if let Some(tray) = app_handle.tray_by_id("main"){
        tray.set_tooltip(Some(&title))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

use discord_rich_presence::{
    activity::{Activity, Assets, Timestamps},
    DiscordIpc, DiscordIpcClient,
};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const DISCORD_CLIENT_ID: &str = "1234567890";

pub struct DiscordState(pub Mutex<Option<DiscordIpcClient>>);

#[tauri::command]
pub async fn discord_connect(
    state: tauri::State<'_, DiscordState>,
) -> Result<bool, String> {
    let mut client_lock = state.0.lock().map_err(|_| "Failed to lock Discord state".to_string())?;
    
    match DiscordIpcClient::new(DISCORD_CLIENT_ID) {
        Ok(mut client) => {
            if client.connect().is_ok() {
                *client_lock = Some(client);
                Ok(true)
            } else {
                Ok(false)
            }
        }
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn discord_update_presence(
    state: tauri::State<'_, DiscordState>,
    title: String,
    artist: String,
    album: String,
    _duration: f64,
    is_playing: bool,
) -> Result<(), String> {
    let mut client_lock = state.0.lock().map_err(|_| "Failed to lock Discord state".to_string())?;
    
    if let Some(client) = client_lock.as_mut() {
        let title_truncated = if title.chars().count() > 128 {
            title.chars().take(125).collect::<String>() + "..."
        } else {
            title.clone()
        };
        
        let artist_state = format!("by {}", artist);
        let artist_truncated = if artist_state.chars().count() > 128 {
            artist_state.chars().take(125).collect::<String>() + "..."
        } else {
            artist_state
        };

        let mut activity = Activity::new()
            .details(&title_truncated)
            .state(&artist_truncated)
            .assets(
                Assets::new()
                    .large_image("cadence_logo")
                    .large_text("Cadence Music Player")
            );
            
        let album_truncated;
        if !album.is_empty() {
            album_truncated = if album.chars().count() > 128 {
                album.chars().take(125).collect::<String>() + "..."
            } else {
                album.clone()
            };
            activity = activity.assets(
                Assets::new()
                    .large_image("cadence_logo")
                    .large_text("Cadence Music Player")
                    .small_text(&album_truncated)
            );
        }

        if is_playing {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;
            activity = activity.timestamps(Timestamps::new().start(now));
        }

        if client.set_activity(activity).is_err() {
            *client_lock = None;
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn discord_clear_presence(
    state: tauri::State<'_, DiscordState>,
) -> Result<(), String> {
    let mut client_lock = state.0.lock().map_err(|_| "Failed to lock Discord state".to_string())?;
    
    if let Some(client) = client_lock.as_mut() {
        if client.clear_activity().is_err() {
            *client_lock = None;
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn discord_disconnect(
    state: tauri::State<'_, DiscordState>,
) -> Result<(), String> {
    let mut client_lock = state.0.lock().map_err(|_| "Failed to lock Discord state".to_string())?;
    
    if let Some(mut client) = client_lock.take() {
        let _ = client.close();
    }
    
    Ok(())
}

#[tauri::command]
pub async fn restart_app(
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    app_handle.restart();
    #[allow(unreachable_code)]
    Ok(())
}
