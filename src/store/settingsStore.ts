// Cadence — Settings store (Zustand)
// Manages all user preferences, persisted via tauri-plugin-store

import { create } from 'zustand';
import type { AppSettings } from '../types/settings';

interface SettingsStoreState extends AppSettings {
  // Whether store data has been loaded from disk
  _hydrated: boolean;
  // Actions
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  addMusicFolder: (folderPath: string) => void;
  removeMusicFolder: (folderPath: string) => void;
  /** Load persisted settings from disk (called once on app init) */
  hydrate: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#7c3aed',
  dynamicAccentColor: true,
  musicFolders: [],
  startMinimized: false,
  minimizeToTray: true,
  crossfadeEnabled: false,
  crossfadeDuration: 5,
  sleepTimerMinutes: null,
  lastFmEnabled: false,
  lastFmUsername: '',
  lastFmSessionKey: '',
  lastFmApiKey: '',
  lastFmApiSecret: '',
  discordRpcEnabled: false,
  language: 'en',
  windowBounds: {
    x: 100,
    y: 100,
    width: 1280,
    height: 800,
  },
  hasCompletedOnboarding: false,
};

export async function initializeSettings(): Promise<void> {
  try {
    const { load } = await import('@tauri-apps/plugin-store');
    const store = await load('settings.json', { autoSave: true } as any);
    const saved = await store.get('settings');
    if (saved && typeof saved === 'object') {
      useSettingsStore.setState({ ...DEFAULT_SETTINGS, ...(saved as AppSettings) });
    } else {
      useSettingsStore.setState(DEFAULT_SETTINGS);
    }
  } catch (e) {
    // Production store failed
    // Use defaults — do not crash
    console.error('Settings init error:', e);
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const { load } = await import('@tauri-apps/plugin-store');
    const store = await load('settings.json', { autoSave: true } as any);
    await store.set('settings', settings);
    await store.save();
  } catch (err) {
    console.warn('Failed to persist settings:', err);
  }
}

export const useSettingsStore = create<SettingsStoreState>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  _hydrated: false, // We won't use this internally anymore for loading check, but keep for type compatibility if needed

  hydrate: async () => {}, // Deprecated, do not use

  updateSettings: (updates) => {
    const newSettings = { ...get(), ...updates };
    set(newSettings);
    
    // Extract only settings fields for saving
    const { _hydrated, updateSettings, resetSettings, addMusicFolder, removeMusicFolder, hydrate, ...settings } = newSettings;
    saveSettings(settings as AppSettings);
  },

  resetSettings: () => {
    set({ ...DEFAULT_SETTINGS });
    saveSettings(DEFAULT_SETTINGS);
  },

  addMusicFolder: (folderPath) => {
    const state = get();
    if (state.musicFolders.includes(folderPath)) return;
    const newFolders = [...state.musicFolders, folderPath];
    set({ musicFolders: newFolders });
    
    const { _hydrated, updateSettings, resetSettings, addMusicFolder, removeMusicFolder, hydrate, ...settings } = get();
    saveSettings(settings as AppSettings);
  },

  removeMusicFolder: (folderPath) => {
    set((state) => ({
      musicFolders: state.musicFolders.filter((f) => f !== folderPath),
    }));
    
    const { _hydrated, updateSettings, resetSettings, addMusicFolder, removeMusicFolder, hydrate, ...settings } = get();
    saveSettings(settings as AppSettings);
  },
}));
