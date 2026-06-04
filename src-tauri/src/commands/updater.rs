// Cadence — Updater commands
// Handles checking for and installing updates via tauri-plugin-updater

use tauri::{command, AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;
use serde_json::json;

#[command]
pub async fn check_for_updates(
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    if let Ok(updater) = app_handle.updater() {
        if let Ok(Some(update)) = updater.check().await {
            return Ok(json!({
                "available": true,
                "version": update.version.clone(),
                "notes": update.body.clone().unwrap_or_default(),
                "date": update.date.map(|d| d.to_string()).unwrap_or_default()
            }));
        }
    }
    
    // Either no update, or check failed (offline etc)
    Ok(json!({ "available": false }))
}

#[command]
pub async fn install_update(
    app_handle: AppHandle,
) -> Result<(), String> {
    if let Ok(updater) = app_handle.updater() {
        if let Ok(Some(update)) = updater.check().await {
            let mut downloaded = 0;
            
            let _ = update.download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    if let Some(total) = content_length {
                        let percent = (downloaded as f64 / total as f64) * 100.0;
                        let _ = app_handle.emit("update-progress", json!({ "percent": percent }));
                    }
                },
                || {
                    // Download finished
                    let _ = app_handle.emit("update-progress", json!({ "percent": 100 }));
                }
            ).await;
            
            // After install, restart the app
            app_handle.restart();
        }
    }
    
    #[allow(unreachable_code)]
    Ok(())
}
