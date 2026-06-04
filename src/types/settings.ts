// Cadence — Application settings type definition
// Persisted to SQLite settings table as key-value pairs

export type ThemeMode = 'light' | 'dark' | 'system';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppSettings {
  theme: ThemeMode;
  /** Hex color string for the UI accent */
  accentColor: string;
  /** When true, accent color is dynamically extracted from album art */
  dynamicAccentColor: boolean;
  /** List of folder paths the user has added to their music library */
  musicFolders: string[];
  startMinimized: boolean;
  minimizeToTray: boolean;
  crossfadeEnabled: boolean;
  /** Crossfade duration in seconds */
  crossfadeDuration: number;
  /** Sleep timer in minutes; null means disabled */
  sleepTimerMinutes: number | null;
  lastFmEnabled: boolean;
  lastFmUsername: string;
  /** Last.fm session key — token-based auth only, never store passwords */
  lastFmSessionKey: string;
  lastFmApiKey: string;
  lastFmApiSecret: string;
  discordRpcEnabled: boolean;
  language: string;
  windowBounds: WindowBounds;
  /** Whether the user has completed the first-launch onboarding */
  hasCompletedOnboarding: boolean;
}
