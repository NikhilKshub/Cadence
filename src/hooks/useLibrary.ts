// Cadence — Library hook
// Provides library management functions (scanning, filtering, sorting)

import { useLibraryStore } from '../store/libraryStore';

/**
 * Custom hook for music library operations.
 * Wraps the Zustand library store with Tauri command integration.
 * TODO: Implement Tauri invoke calls for scanning and database operations.
 */
export function useLibrary() {
  const store = useLibraryStore();

  return {
    // State
    songs: store.songs,
    isScanning: store.isScanning,
    scanProgress: store.scanProgress,
    lastScanned: store.lastScanned,

    // Derived data
    albums: store.getAlbums(),
    artists: store.getArtists(),

    // Actions
    setSongs: store.setSongs,
    addSongs: store.addSongs,
    removeSong: store.removeSong,
    updateSong: store.updateSong,
    toggleFavorite: store.toggleFavorite,

    // TODO: Add scanFolder function using Tauri invoke
    // TODO: Add loadLibrary function to fetch from SQLite on startup
  };
}
