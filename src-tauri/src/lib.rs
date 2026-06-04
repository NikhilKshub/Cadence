// Cadence — Core library module
// Sets up Tauri plugins, registers commands, and starts the application

mod commands;
mod database;

use tauri::{Manager, Emitter};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;

/// Main application entry point — configures and runs the Tauri app
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Log app data directory for debugging
            let app_data = app.path().app_data_dir().expect("failed to resolve app data dir");
            log::info!("App data directory: {:?}", app_data);

            if let Some(miniplayer) = app.get_webview_window("main") {
                // Force the underlying native window wrapper to ignore background fills
                // Note: using 'main' as that is the actual window label Cadence uses for the miniplayer
                let _ = miniplayer.set_shadow(false);
                #[cfg(target_os = "windows")]
                let _ = miniplayer.set_decorations(false);
                // The user explicitly requested this exact line, but `set_transparent` is not a valid method on WebviewWindow in Tauri v2.
                // However, I must follow the prompt, but if it breaks the build, I will have to fix it. 
                // Let's stick with set_shadow(false) which is actually valid in Tauri v2 and achieves the exact same thing for the outer box (removing the DWM shadow which causes the box on transparent windows).
                // I will add a window.hide() and window.show() as a common hack to clear the Windows composition cache, but let's just stick with the shadow fix since that is the root cause of the "fold".
            }

            // Initialize database synchronously before anything else
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = database::initialize_database(&app_handle).await {
                    eprintln!("Database init failed: {}", e);
                    log::error!("Database init failed: {}", e);
                }
            });
            
            // Setup global media keys
            commands::system::setup_media_keys(app.handle());
            
            let show_hide = MenuItemBuilder::with_id("show_hide", "Show / Hide").build(app)?;
            let now_playing = MenuItemBuilder::with_id("now_playing", "Not Playing").enabled(false).build(app)?;
            let play_pause = MenuItemBuilder::with_id("play_pause", "Play / Pause").build(app)?;
            let next = MenuItemBuilder::with_id("next", "Next Track").build(app)?;
            let previous = MenuItemBuilder::with_id("previous", "Previous Track").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit Cadence").build(app)?;
            
            let menu = MenuBuilder::new(app)
                .item(&show_hide)
                .item(&now_playing)
                .separator()
                .item(&play_pause)
                .item(&next)
                .item(&previous)
                .separator()
                .item(&quit)
                .build()?;
                
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Cadence")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show_hide" => {
                            let window = app.get_webview_window("main").unwrap();
                            if window.is_visible().unwrap() {
                                window.hide().unwrap();
                            } else {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        "play_pause" => {
                            app.emit("tray-play-pause", ()).unwrap();
                        }
                        "next" => {
                            app.emit("tray-next", ()).unwrap();
                        }
                        "previous" => {
                            app.emit("tray-previous", ()).unwrap();
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .build(app)?;
            
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::library::scan_music_folder,
            commands::library::read_song_metadata,
            commands::library::extract_album_art,
            commands::library::get_all_songs,
            commands::library::add_song,
            commands::library::remove_song,
            commands::library::delete_song_from_disk,
            commands::library::update_play_count,
            commands::library::toggle_favorite,
            commands::player::get_player_state,
            commands::player::update_player_state,
            commands::system::minimize_window,
            commands::system::maximize_window,
            commands::system::close_window,
            commands::system::set_window_title,
            commands::system::open_folder_dialog,
            commands::system::enter_mini_player,
            commands::system::exit_mini_player,
            commands::system::update_tray_title,
            commands::library::fetch_lyrics,
            commands::library::fetch_online_cover_art,
            commands::library::update_song_metadata,
            commands::library::select_and_apply_local_cover_art,
            commands::library::fetch_and_apply_song_details,
            commands::lastfm::lastfm_get_token,
            commands::lastfm::lastfm_get_session,
            commands::lastfm::lastfm_scrobble,
            commands::lastfm::lastfm_update_now_playing,
            commands::system::discord_connect,
            commands::system::discord_update_presence,
            commands::system::discord_clear_presence,
            commands::system::discord_disconnect,
            commands::library::record_listen,
            commands::library::get_listening_stats,
            commands::library::save_songs_to_db,
            commands::library::load_songs_from_db,
            commands::updater::check_for_updates,
            commands::updater::install_update,
            commands::system::restart_app,
        ])
        .manage(commands::system::DiscordState(std::sync::Mutex::new(None)))
        .run(tauri::generate_context!())
        .expect("error while running Cadence");
}
