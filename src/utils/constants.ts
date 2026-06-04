// Cadence — Application-wide constants
// Centralized configuration values used throughout the app

/** Application metadata */
export const APP_NAME = 'Cadence';
export const APP_VERSION = '1.0.0';
export const APP_IDENTIFIER = 'com.cadence.player';

/** SQLite database filename (stored in Tauri's appDataDir) */
export const DATABASE_NAME = 'cadence.db';

/** Supported audio file extensions */
export const SUPPORTED_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a'] as const;

/** Default volume level (0-1) */
export const DEFAULT_VOLUME = 0.7;

/** Default crossfade duration in seconds */
export const DEFAULT_CROSSFADE_DURATION = 5;

/** Minimum window dimensions */
export const MIN_WINDOW_WIDTH = 900;
export const MIN_WINDOW_HEIGHT = 600;

/** Default window dimensions */
export const DEFAULT_WINDOW_WIDTH = 1280;
export const DEFAULT_WINDOW_HEIGHT = 800;

/** Default accent color (purple) */
export const DEFAULT_ACCENT_COLOR = '#7c3aed';
export const DEFAULT_ACCENT_COLOR_DARK = '#a78bfa';

/** Navigation page identifiers */
export const PAGES = {
  HOME: 'home',
  LIBRARY: 'library',
  ALBUMS: 'albums',
  ARTISTS: 'artists',
  PLAYLISTS: 'playlists',
  NOW_PLAYING: 'now-playing',
  SETTINGS: 'settings',
  ONBOARDING: 'onboarding',
} as const;

/** Maximum file size for album art extraction (5 MB) */
export const MAX_ALBUM_ART_SIZE = 5 * 1024 * 1024;

/** Debounce delay for search input (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Number of seconds into a track before "previous" restarts instead of going back */
export const PREVIOUS_THRESHOLD_SECONDS = 3;
