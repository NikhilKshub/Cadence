// Cadence — Application entry point
// Delegates to lib.rs for the actual Tauri setup

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    cadence_lib::run();
}
