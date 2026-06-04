// Cadence — Player state store (Zustand)
// Manages all playback state: current song, queue, volume, shuffle, repeat

import { create } from 'zustand';
import type { Song } from '../types/song';
import type { RepeatMode } from '../types/player';
import { audioEngine } from '../utils/audioEngine';
import { useUiStore } from './uiStore';
import { useSettingsStore } from './settingsStore';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { extractDominantColor, applyAccentColor, resetAccentColor } from '../utils/colorExtractor';

function updateSongAccentColor(song: Song | null) {
  const isDynamic = useSettingsStore.getState().dynamicAccentColor;
  if (!isDynamic || !song || !song.albumArtPath) {
    resetAccentColor();
    useUiStore.getState().setAccentColor('#7c3aed');
    return;
  }
  const artSrc = convertFileSrc(song.albumArtPath);
  extractDominantColor(artSrc).then(color => {
    applyAccentColor(color);
    useUiStore.getState().setAccentColor(color);
  }).catch(() => {
    resetAccentColor();
    useUiStore.getState().setAccentColor('#7c3aed');
  });
}

function updateTrayInfo(song: Song | null) {
  if (song) {
    const title = song.title || 'Unknown';
    const artist = song.artist || 'Unknown Artist';
    
    emit('song-changed', { title, artist }).catch(console.error);
    invoke('update_tray_title', { title: `${title} - ${artist}` }).catch(console.error);
  } else {
    emit('song-changed', { title: 'Not Playing', artist: '' }).catch(console.error);
    invoke('update_tray_title', { title: 'Cadence' }).catch(console.error);
  }
}

async function scrobbleTrack(song: Song): Promise<void> {
  const settings = useSettingsStore.getState();
  if (!settings.lastFmEnabled) return;
  if (!settings.lastFmSessionKey) return;
  if (!song.title || !song.artist) return;
  
  const timestamp = Math.floor(Date.now() / 1000);
  
  await invoke('lastfm_scrobble', {
    apiKey: settings.lastFmApiKey,
    apiSecret: settings.lastFmApiSecret,
    sessionKey: settings.lastFmSessionKey,
    title: song.title,
    artist: song.artist,
    album: song.album || '',
    duration: song.duration,
    timestamp
  }).catch(err => 
    console.error('Scrobble failed:', err)
  );
}

async function updateNowPlaying(song: Song): Promise<void> {
  const settings = useSettingsStore.getState();
  if (!settings.lastFmEnabled) return;
  if (!settings.lastFmSessionKey) return;
  if (!song.title || !song.artist) return;
  
  await invoke('lastfm_update_now_playing', {
    apiKey: settings.lastFmApiKey,
    apiSecret: settings.lastFmApiSecret,
    sessionKey: settings.lastFmSessionKey,
    title: song.title,
    artist: song.artist,
    album: song.album || '',
    duration: song.duration,
  }).catch(err => 
    console.error('Update Now Playing failed:', err)
  );
}

async function updateDiscordPresence(
  song: Song | null, 
  isPlaying: boolean
): Promise<void> {
  const settings = useSettingsStore.getState();
  if (!settings.discordRpcEnabled) return;
  
  if (!song) {
    invoke('discord_clear_presence').catch(() => {});
    return;
  }
  
  invoke('discord_update_presence', {
    title: song.title || song.fileName,
    artist: song.artist || 'Unknown Artist',
    album: song.album || '',
    duration: song.duration,
    isPlaying
  }).catch(() => {});
}

interface PlayerStoreState {
  // State
  currentSong: Song | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: Song[];
  queueIndex: number;
  crossfadeDuration: number;
  hasScrobbled: boolean;

  // Actions
  scrobbleCurrentSong: () => void;
  play: (song?: Song) => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  purgeSongFromPlayer: (songId: string) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  setCurrentSong: (song: Song | null) => void;
  playSongFromLibrary: (song: Song, library: Song[]) => void;
  playSongNext: (song: Song) => void;
  playAlbum: (songs: Song[], startIndex?: number) => void;
  playArtist: (songs: Song[], startIndex?: number) => void;
  playPlaylist: (songs: Song[], startIndex?: number) => void;

  // Sleep timer
  sleepTimer: {
    isActive: boolean;
    minutesRemaining: number | null;
    intervalId: ReturnType<typeof setInterval> | null;
  };
  startSleepTimer: (minutes: number) => void;
  stopSleepTimer: () => void;
}

export const usePlayerStore = create<PlayerStoreState>()((set, get) => ({
  // Initial state
  currentSong: null,
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isMuted: false,
  shuffle: false,
  repeat: 'none',
  queue: [],
  queueIndex: -1,
  crossfadeDuration: 0,
  hasScrobbled: false,

  sleepTimer: {
    isActive: false,
    minutesRemaining: null,
    intervalId: null,
  },

  // Actions
  scrobbleCurrentSong: () => {
    const song = get().currentSong;
    if (!song) return;
    if (get().hasScrobbled) return;
    set({ hasScrobbled: true });
    scrobbleTrack(song);
  },

  play: (song) => {
    if (song) {
      set({ currentSong: song, isPlaying: true, isPaused: false, currentTime: 0, duration: song.duration, hasScrobbled: false });
      audioEngine.load(song.filePath, true);
      updateSongAccentColor(song);
      updateTrayInfo(song);
      updateNowPlaying(song);
      updateDiscordPresence(song, true);
    } else {
      const { currentSong } = get();
      if (currentSong) {
        audioEngine.play();
        set({ isPlaying: true, isPaused: false });
        updateDiscordPresence(currentSong, true);
      }
    }
  },

  pause: () => {
    audioEngine.pause();
    set({ isPlaying: false, isPaused: true });
    updateDiscordPresence(get().currentSong, false);
  },

  stop: () => {
    audioEngine.stop();
    set({ isPlaying: false, isPaused: false, currentTime: 0, currentSong: null, hasScrobbled: false });
    updateSongAccentColor(null);
    updateTrayInfo(null);
    updateDiscordPresence(null, false);
  },

  next: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
      if (queue.length > 1 && nextIndex === queueIndex) {
        nextIndex = (nextIndex + 1) % queue.length;
      }
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0;
        } else {
          get().stop();
          return;
        }
      }
    }

    const nextSong = queue[nextIndex];
    if (nextSong) {
      set({ queueIndex: nextIndex, currentSong: nextSong, currentTime: 0, duration: nextSong.duration, isPlaying: true, isPaused: false, hasScrobbled: false });
      audioEngine.load(nextSong.filePath, true);
      updateSongAccentColor(nextSong);
      updateTrayInfo(nextSong);
      updateNowPlaying(nextSong);
      updateDiscordPresence(nextSong, true);
    } else {
      get().stop();
    }
  },

  previous: () => {
    const { queue, queueIndex, currentTime, repeat } = get();
    
    if (currentTime > 3) {
      audioEngine.seekTo(0);
      set({ currentTime: 0 });
      return;
    }

    if (queue.length === 0) {
       audioEngine.seekTo(0);
       return;
    }

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      if (repeat === 'all') {
        prevIndex = queue.length - 1;
      } else {
        audioEngine.seekTo(0);
        return;
      }
    }
    
    const prevSong = queue[prevIndex];
    if (prevSong) {
      set({ queueIndex: prevIndex, currentSong: prevSong, currentTime: 0, duration: prevSong.duration, isPlaying: true, isPaused: false, hasScrobbled: false });
      audioEngine.load(prevSong.filePath, true);
      updateSongAccentColor(prevSong);
      updateTrayInfo(prevSong);
      updateNowPlaying(prevSong);
      updateDiscordPresence(prevSong, true);
    }
  },

  seekTo: (time) => {
    audioEngine.seekTo(time);
    set({ currentTime: time });
  },

  setVolume: (volume) => {
    audioEngine.setVolume(volume);
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },

  toggleMute: () => {
    audioEngine.toggleMute();
    set((state) => ({ isMuted: !state.isMuted }));
  },

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  cycleRepeat: () => {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(get().repeat);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    if (nextMode !== undefined) {
      set({ repeat: nextMode });
    }
  },

  addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),

  removeFromQueue: (index) => set((state) => ({
    queue: state.queue.filter((_, i) => i !== index),
    queueIndex: index < state.queueIndex ? state.queueIndex - 1 : state.queueIndex,
  })),

  purgeSongFromPlayer: (songId) => set((state) => {
    let newQueueIndex = state.queueIndex;
    const deletedIndex = state.queue.findIndex(s => s.id === songId);
    
    if (deletedIndex !== -1 && deletedIndex < state.queueIndex) {
      newQueueIndex -= 1;
    }
    
    // Check if the current song is the one being deleted
    if (state.currentSong?.id === songId) {
      state.stop();
      return {
        queue: state.queue.filter(s => s.id !== songId),
        queueIndex: newQueueIndex,
        currentSong: null,
        isPlaying: false,
      };
    }

    return {
      queue: state.queue.filter(s => s.id !== songId),
      queueIndex: newQueueIndex,
    };
  }),

  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  reorderQueue: (fromIndex, toIndex) => set((state) => {
    const newQueue = [...state.queue];
    const [movedItem] = newQueue.splice(fromIndex, 1);
    if (movedItem) {
      newQueue.splice(toIndex, 0, movedItem);
    }

    let newQueueIndex = state.queueIndex;
    if (state.queueIndex === fromIndex) {
      newQueueIndex = toIndex;
    } else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) {
      newQueueIndex = state.queueIndex - 1;
    } else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) {
      newQueueIndex = state.queueIndex + 1;
    }

    return { queue: newQueue, queueIndex: newQueueIndex };
  }),

  setCurrentSong: (song) => {
    set({ currentSong: song, currentTime: 0, duration: song?.duration ?? 0, hasScrobbled: false });
    updateSongAccentColor(song);
    updateTrayInfo(song);
    if (song) {
      audioEngine.load(song.filePath, false);
      updateNowPlaying(song);
      updateDiscordPresence(song, false);
    } else {
      updateDiscordPresence(null, false);
    }
  },

  playSongFromLibrary: (song, library) => {
    const index = library.findIndex(s => s.id === song.id);
    set({ queue: library, queueIndex: index, currentSong: song, currentTime: 0, duration: song.duration, isPlaying: true, isPaused: false, hasScrobbled: false });
    audioEngine.load(song.filePath, true);
    updateSongAccentColor(song);
    updateTrayInfo(song);
    updateNowPlaying(song);
    updateDiscordPresence(song, true);
  },

  playSongNext: (song) => {
    set((state) => {
      const newQueue = [...state.queue];
      newQueue.splice(state.queueIndex + 1, 0, song);
      return { queue: newQueue };
    });
  },

  playAlbum: (songs, startIndex = 0) => {
    const song = songs[startIndex];
    if (song) {
      set({ queue: songs, queueIndex: startIndex, currentSong: song, currentTime: 0, duration: song.duration, isPlaying: true, isPaused: false, hasScrobbled: false });
      audioEngine.load(song.filePath, true);
      updateSongAccentColor(song);
      updateTrayInfo(song);
      updateNowPlaying(song);
      updateDiscordPresence(song, true);
    }
  },

  playArtist: (songs, startIndex = 0) => {
    get().playAlbum(songs, startIndex);
  },

  playPlaylist: (songs, startIndex = 0) => {
    get().playAlbum(songs, startIndex);
  },

  startSleepTimer: (minutes) => {
    // Clear any existing timer
    const existing = get().sleepTimer.intervalId;
    if (existing !== null) clearInterval(existing);

    const intervalId = setInterval(() => {
      const { sleepTimer } = get();
      const remaining = (sleepTimer.minutesRemaining ?? 1) - 1;
      if (remaining <= 0) {
        audioEngine.stop();
        get().stopSleepTimer();
      } else {
        set((state) => ({
          sleepTimer: { ...state.sleepTimer, minutesRemaining: remaining },
        }));
      }
    }, 60_000);

    set({
      sleepTimer: {
        isActive: true,
        minutesRemaining: minutes,
        intervalId,
      },
    });
  },

  stopSleepTimer: () => {
    const { sleepTimer } = get();
    if (sleepTimer.intervalId !== null) clearInterval(sleepTimer.intervalId);
    set({
      sleepTimer: {
        isActive: false,
        minutesRemaining: null,
        intervalId: null,
      },
    });
  },
}));
