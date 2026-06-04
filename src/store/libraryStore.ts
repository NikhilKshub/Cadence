// Cadence — Library state store (Zustand)
// Manages the music library: songs, scanning state, and derived groupings

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Song, AudioFormat } from '../types/song';
import { useSettingsStore } from './settingsStore';

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverArtPath: string | null;
  songIds: string[];
  createdAt: string;
  updatedAt: string;
  totalDuration: number;
  songCount: number;
}

/** Shape of the Rust SongMetadata struct (snake_case from backend) */
interface RustSongMetadata {
  id: string;
  title: string;
  artist: string;
  album: string;
  album_artist: string;
  genre: string;
  year: number | null;
  duration: number;
  file_path: string;
  file_name: string;
  file_size: number;
  format: string;
  bitrate: number | null;
  sample_rate: number | null;
  has_album_art: boolean;
  date_added: string;
}

/** Payload emitted by the Rust "scan-progress" event */
interface ScanProgressPayload {
  scanned: number;
  found: number;
}

/** Map a DB row (camelCase JSON from Rust) back to our Song interface */
function mapDbRowToSong(row: any): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    albumArtist: row.albumArtist || '',
    genre: row.genre || '',
    year: row.year ?? null,
    duration: row.duration,
    filePath: row.filePath,
    fileName: row.fileName,
    fileSize: row.fileSize,
    format: (row.format || 'mp3') as AudioFormat,
    bitrate: row.bitrate ?? null,
    sampleRate: row.sampleRate ?? null,
    albumArtPath: row.albumArtPath ?? null,
    playCount: row.playCount ?? 0,
    lastPlayed: row.lastPlayed ?? null,
    dateAdded: row.dateAdded,
    isFavorite: row.isFavorite === true || row.isFavorite === 1,
  };
}

interface LibraryStoreState {
  // State
  songs: Song[];
  isScanning: boolean;
  scanProgress: number;
  lastScanned: string | null;
  playlists: Playlist[];

  // Actions
  setSongs: (songs: Song[]) => void;
  addSongs: (songs: Song[]) => void;
  removeSong: (songId: string) => void;
  updateSong: (songId: string, updates: Partial<Song>) => void;
  loadLibraryFromDb: () => Promise<void>;
  autoTagSongDetails: (songId: string) => Promise<void>;
  editSongMetadata: (songId: string, updates: { title: string; artist: string; album: string }) => Promise<void>;
  setScanning: (isScanning: boolean) => void;
  setScanProgress: (progress: number) => void;
  toggleFavorite: (songId: string) => void;
  scanFolder: (folderPath: string) => Promise<void>;
  addMusicFolder: (folderPath: string) => Promise<void>;

  // Derived data accessors
  getAlbums: () => { name: string; artist: string; songs: Song[]; artPath: string | null }[];
  getArtists: () => { name: string; songCount: number; albumCount: number }[];
  getSongsByAlbum: (album: string) => Song[];
  getSongsByArtist: (artist: string) => Song[];
  searchSongs: (query: string) => Song[];

  // Playlist Actions
  createPlaylist: (name: string, description?: string) => string;
  deletePlaylist: (playlistId: string) => void;
  renamePlaylist: (playlistId: string, name: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  getPlaylistSongs: (playlistId: string) => Song[];
}

/** Persist current songs to SQLite via Rust command (fire-and-forget) */
async function persistSongsToDb(songs: Song[]) {
  try {
    await invoke('save_songs_to_db', { songs });
  } catch (err) {
    console.error('Failed to persist songs to DB:', err);
  }
}

export const useLibraryStore = create<LibraryStoreState>()((set, get) => ({
  // Initial state
  songs: [],
  isScanning: false,
  scanProgress: 0,
  lastScanned: null,
  playlists: [],

  // Actions
  setSongs: (songs) => set({ songs }),

  addSongs: async (songs) => {
    const existingPaths = new Set(get().songs.map(s => s.filePath));
    const newSongs = songs.filter(s => !existingPaths.has(s.filePath));
    if (newSongs.length === 0) return;
    set(state => ({ songs: [...state.songs, ...newSongs] }));

    // Persist new songs to SQLite via Rust
    persistSongsToDb(newSongs);
  },

  removeSong: (songId) => set((state) => ({
    songs: state.songs.filter((s) => s.id !== songId),
  })),

  updateSong: async (songId, updates) => {
    // 1. Update library store
    set((state) => ({
      songs: state.songs.map((s) => (s.id === songId ? { ...s, ...updates } : s)),
    }));

    // 2. Sync playerStore so bottom bar + Now Playing page update too
    import('./playerStore').then(({ usePlayerStore }) => {
      const playerState = usePlayerStore.getState();
      if (playerState.currentSong?.id === songId) {
        usePlayerStore.setState({
          currentSong: { ...playerState.currentSong, ...updates },
        });
      }
      const queueIdx = playerState.queue.findIndex((s) => s.id === songId);
      if (queueIdx !== -1) {
        const newQueue = [...playerState.queue];
        newQueue[queueIdx] = { ...newQueue[queueIdx]!, ...updates };
        usePlayerStore.setState({ queue: newQueue });
      }
    }).catch(err => console.warn('Could not sync playerStore in updateSong (non-fatal):', err));

    // 3. Persist the updated song to DB
    const song = get().songs.find(s => s.id === songId);
    if (song) {
      persistSongsToDb([song]);
    }
  },

  loadLibraryFromDb: async () => {
    try {
      const rows = await invoke<any[]>('load_songs_from_db');
      
      if (rows && rows.length > 0) {
        const loadedSongs: Song[] = rows.map(mapDbRowToSong);
        set({ songs: loadedSongs });
      }
    } catch (err) {
      console.error('Failed to load library from db:', err);
    }
  },

  autoTagSongDetails: async (songId) => {
    const song = get().songs.find(s => s.id === songId);
    if (!song || !song.title) return;

    try {
      const details = await invoke<{
        title: string;
        artist: string;
        album: string;
        art_path: string | null;
      }>('fetch_and_apply_song_details', {
        songId: song.id,
        queryTitle: song.title,
        queryArtist: song.artist || '',
        filePath: song.filePath,
      });

      if (details) {
        // Update local state with the fetched details (this also persists to DB via updateSong)
        get().updateSong(songId, {
          title: details.title || song.title,
          artist: details.artist || song.artist,
          album: details.album || song.album,
          albumArtPath: details.art_path || song.albumArtPath,
        });
      }
    } catch (err) {
      console.error('Failed to auto-tag song details:', err);
    }
  },

  editSongMetadata: async (songId, updates) => {
    const song = get().songs.find(s => s.id === songId);
    if (!song) return;

    // 1. Update library store (this now automatically syncs playerStore + DB too)
    get().updateSong(songId, updates);

    // 2. Write to physical file tags
    try {
      await invoke('update_song_metadata', {
        filePath: song.filePath,
        title: updates.title,
        artist: updates.artist,
        album: updates.album,
      });
    } catch (err) {
      console.warn('Could not write tags to physical file (non-fatal):', err);
    }
  },

  setScanning: (isScanning) => set({ isScanning }),

  setScanProgress: (progress) => set({ scanProgress: Math.max(0, Math.min(100, progress)) }),

  toggleFavorite: async (songId) => {
    set((state) => ({
      songs: state.songs.map((s) =>
        s.id === songId ? { ...s, isFavorite: !s.isFavorite } : s
      ),
    }));

    // Persist the toggled song to DB
    const song = get().songs.find(s => s.id === songId);
    if (song) {
      persistSongsToDb([song]);
    }
  },

  // Scan a folder and build the library from all discovered audio files
  scanFolder: async (folderPath: string): Promise<void> => {
    if (get().isScanning) return;
    const { addSongs } = get();

    // 1. Mark scanning as active
    set({ isScanning: true, scanProgress: 0 });

    // 2. Listen for real-time scan progress events from the Rust backend
    const unlisten = await listen<ScanProgressPayload>('scan-progress', (event) => {
      const { found } = event.payload;
      const progress = Math.min((found / 100) * 10, 90);
      set({ scanProgress: progress });
    });

    let filePaths: string[];

    try {
      // 3. Invoke the Rust folder scanner
      filePaths = await invoke<string[]>('scan_music_folder', { folderPath });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('scan_music_folder failed:', message);
      set({ isScanning: false, scanProgress: 0 });
      unlisten();
      return;
    }

    // Done listening to scan-progress — the walk is finished
    unlisten();

    // 4. If no files found, bail out early
    if (filePaths.length === 0) {
      set({ isScanning: false, scanProgress: 0 });
      return;
    }

    // 5. Process files in batches of 20
    const batchSize = 20;
    const totalFiles = filePaths.length;

    for (let i = 0; i < totalFiles; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchSongs: Song[] = [];

      for (const filePath of batch) {
        try {
          // 6a. Read metadata for this file
          const meta = await invoke<RustSongMetadata>('read_song_metadata', { filePath });

          // 6b. Extract album art if the file has embedded art
          let albumArtPath: string | null = null;
          if (meta.has_album_art) {
            try {
              albumArtPath = await invoke<string | null>('extract_album_art', { filePath });
            } catch {
              // If art extraction fails, continue with null
              albumArtPath = null;
            }
          }

          // 6c. Map Rust snake_case SongMetadata → TypeScript camelCase Song
          const song: Song = {
            id: meta.id,
            title: meta.title,
            artist: meta.artist,
            album: meta.album,
            albumArtist: meta.album_artist,
            genre: meta.genre,
            year: meta.year,
            duration: meta.duration,
            filePath: meta.file_path,
            fileName: meta.file_name,
            fileSize: meta.file_size,
            format: meta.format as AudioFormat,
            bitrate: meta.bitrate,
            sampleRate: meta.sample_rate,
            albumArtPath,
            playCount: 0,
            lastPlayed: null,
            dateAdded: meta.date_added,
            isFavorite: false,
          };

          batchSongs.push(song);
        } catch {
          // 6d. If read_song_metadata fails for a file, skip it silently
          continue;
        }
      }

      // 7. Add the completed batch to the store incrementally (also persists to DB)
      if (batchSongs.length > 0) {
        addSongs(batchSongs);
      }

      // 8. Update progress proportionally (90–100 range for metadata processing)
      const processed = Math.min(i + batchSize, totalFiles);
      const metadataProgress = 90 + (processed / totalFiles) * 10;
      set({ scanProgress: Math.min(metadataProgress, 100) });
    }

    // 9. Scanning complete
    set({
      scanProgress: 100,
      isScanning: false,
    });
    
    import('./toastStore').then(({ toast }) => {
      toast.success(`Found ${filePaths.length} songs`);
    });

    // 10. Record when the last scan happened
    set({ lastScanned: new Date().toISOString() });

    // 11. Auto-fetch missing details in background
    const songsToFetch = get().songs.filter(
      s => (!s.albumArtPath || !s.artist) && s.title && s.title.trim() !== ''
    );

    if (songsToFetch.length > 0) {
      // Run in background without awaiting
      (async () => {
        for (let i = 0; i < songsToFetch.length; i += 3) {
          const batch = songsToFetch.slice(i, i + 3);
          await Promise.allSettled(
            batch.map(song => get().autoTagSongDetails(song.id))
          );
          if (i + 3 < songsToFetch.length) {
            await new Promise(r => setTimeout(r, 500));
          }
        }
      })();
    }
  },

  // Register a music folder and scan it
  addMusicFolder: async (folderPath: string): Promise<void> => {
    // Add the folder to settings if not already present
    const settingsStore = useSettingsStore.getState();
    settingsStore.addMusicFolder(folderPath);

    // Trigger a scan of the newly added folder
    await get().scanFolder(folderPath);
  },

  // Derived data — group songs by album
  getAlbums: () => {
    const { songs } = get();
    const albumMap = new Map<string, { name: string; artist: string; songs: Song[]; artPath: string | null }>();

    for (const song of songs) {
      const key = `${song.album}::${song.albumArtist || song.artist}`;
      const existing = albumMap.get(key);
      if (existing) {
        existing.songs.push(song);
        if (!existing.artPath && song.albumArtPath) {
          existing.artPath = song.albumArtPath;
        }
      } else {
        albumMap.set(key, {
          name: song.album,
          artist: song.albumArtist || song.artist,
          songs: [song],
          artPath: song.albumArtPath,
        });
      }
    }

    return Array.from(albumMap.values());
  },

  // Derived data — group songs by artist
  getArtists: () => {
    const { songs } = get();
    const artistMap = new Map<string, Set<string>>();
    const artistSongCount = new Map<string, number>();

    for (const song of songs) {
      const artist = song.artist || 'Unknown Artist';
      if (!artistMap.has(artist)) {
        artistMap.set(artist, new Set<string>());
        artistSongCount.set(artist, 0);
      }
      artistMap.get(artist)?.add(song.album);
      artistSongCount.set(artist, (artistSongCount.get(artist) ?? 0) + 1);
    }

    return Array.from(artistMap.entries()).map(([name, albums]) => ({
      name,
      songCount: artistSongCount.get(name) ?? 0,
      albumCount: albums.size,
    }));
  },

  getSongsByAlbum: (album) => {
    return get().songs
      .filter((s) => s.album === album)
      .sort((a, b) => {
        const aTrack = (a as any).trackNumber;
        const bTrack = (b as any).trackNumber;
        if (aTrack && bTrack) {
          return aTrack - bTrack;
        }
        return a.title.localeCompare(b.title);
      });
  },

  getSongsByArtist: (artist) => {
    return get().songs
      .filter((s) => s.artist === artist)
      .sort((a, b) => {
        const albumCompare = (a.album || '').localeCompare(b.album || '');
        if (albumCompare !== 0) return albumCompare;
        
        const aTrack = (a as any).trackNumber;
        const bTrack = (b as any).trackNumber;
        if (aTrack && bTrack) {
          return aTrack - bTrack;
        }
        return (a.title || '').localeCompare(b.title || '');
      });
  },

  searchSongs: (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return get().songs
      .filter((s) => 
        (s.title || '').toLowerCase().includes(lowerQuery) ||
        (s.artist || '').toLowerCase().includes(lowerQuery) ||
        (s.album || '').toLowerCase().includes(lowerQuery) ||
        (s.genre || '').toLowerCase().includes(lowerQuery)
      )
      .slice(0, 50);
  },

  createPlaylist: (name, description) => {
    const id = crypto.randomUUID();
    const newPlaylist: Playlist = {
      id,
      name,
      description: description || '',
      coverArtPath: null,
      songIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDuration: 0,
      songCount: 0,
    };
    set((state) => ({ playlists: [...state.playlists, newPlaylist] }));

    return id;
  },

  deletePlaylist: (playlistId) => {
    set((state) => ({ playlists: state.playlists.filter(p => p.id !== playlistId) }));
  },

  renamePlaylist: (playlistId, name) => {
    set((state) => ({
      playlists: state.playlists.map(p => 
        p.id === playlistId ? { ...p, name, updatedAt: new Date().toISOString() } : p
      )
    }));
  },

  addSongToPlaylist: (playlistId, songId) => {
    set((state) => {
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (!playlist || playlist.songIds.includes(songId)) return state;

      const newSongIds = [...playlist.songIds, songId];
      const newDuration = newSongIds.reduce((sum, id) => {
        const song = state.songs.find(s => s.id === id);
        return sum + (song?.duration || 0);
      }, 0);

      return {
        playlists: state.playlists.map(p => 
          p.id === playlistId ? { 
            ...p, 
            songIds: newSongIds, 
            songCount: newSongIds.length, 
            totalDuration: newDuration,
            updatedAt: new Date().toISOString() 
          } : p
        )
      };
    });
  },

  removeSongFromPlaylist: (playlistId, songId) => {
    set((state) => {
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (!playlist) return state;

      const newSongIds = playlist.songIds.filter(id => id !== songId);
      const newDuration = newSongIds.reduce((sum, id) => {
        const song = state.songs.find(s => s.id === id);
        return sum + (song?.duration || 0);
      }, 0);

      return {
        playlists: state.playlists.map(p => 
          p.id === playlistId ? { 
            ...p, 
            songIds: newSongIds, 
            songCount: newSongIds.length, 
            totalDuration: newDuration,
            updatedAt: new Date().toISOString() 
          } : p
        )
      };
    });
  },

  getPlaylistSongs: (playlistId) => {
    const state = get();
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) return [];

    return playlist.songIds
      .map(id => state.songs.find(s => s.id === id))
      .filter((s): s is Song => s !== undefined);
  },
}));
