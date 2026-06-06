// Cadence — Root application component
// Handles page routing via uiStore (no React Router)

import { useUiStore } from './store/uiStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import NowPlayingBar from './components/layout/NowPlayingBar';
import QueuePanel from './components/player/QueuePanel';
import MiniPlayer from './components/miniPlayer/MiniPlayer';
import Onboarding from './pages/Onboarding';
import ToastContainer from './components/common/Toast';
import GlobalLikeAnimation from './components/common/GlobalLikeAnimation';

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSettingsStore, initializeSettings } from './store/settingsStore';
import { useLibraryStore } from './store/libraryStore';
import { toast } from './store/toastStore';
import { FolderPlus } from 'lucide-react';
import type { AudioFormat, Song } from './types/song';

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

export default function App() {
  const theme = useUiStore((state) => state.theme);
  const isMiniPlayer = useUiStore((state) => state.isMiniPlayer);
  const isQueueOpen = useUiStore((state) => state.isQueueOpen);
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);

  const [dragOver, setDragOver] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Hydrate settings from disk on first mount
  useEffect(() => {
    initializeSettings()
      .then(() => setIsSettingsLoaded(true))
      .catch(() => setIsSettingsLoaded(true));
  }, []);

  // Load library from database on startup once settings are hydrated
  useEffect(() => {
    if (isSettingsLoaded) {
      useLibraryStore.getState().loadLibraryFromDb().catch(console.error);
    }
  }, [isSettingsLoaded]);

  useEffect(() => {
    const settings = useSettingsStore.getState();
    if (settings.discordRpcEnabled) {
      invoke('discord_connect').catch(() => {});
    }
  }, []);

  // Check for updates after 5 seconds delay to not slow down startup
  useEffect(() => {
    const timer = setTimeout(() => {
      invoke('check_for_updates').catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Set initial theme to avoid flash
  useEffect(() => {
    if (isSettingsLoaded) {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    }
  }, [theme, isSettingsLoaded]);

  // Drag and drop listener
  useEffect(() => {
    let unlistenFn: () => void;
    
    const setupListener = async () => {
      unlistenFn = await listen('tauri://drag-drop', async (event: any) => {
        setDragOver(false);
        const paths: string[] = event.payload.paths || [];
        
        const audioExtensions = ['mp3','flac','wav','ogg','aac','m4a'];
        
        const audioFiles = paths.filter(p => {
          const ext = p.split('.').pop()?.toLowerCase();
          return ext && audioExtensions.includes(ext);
        });
        
        if (audioFiles.length === 0) return;
        
        toast.info(`Adding ${audioFiles.length} songs...`);
        
        const newSongs: Song[] = [];
        
        for (const filePath of audioFiles) {
          try {
            const meta = await invoke<RustSongMetadata>('read_song_metadata', { filePath });
            
            let albumArtPath: string | null = null;
            if (meta.has_album_art) {
              try {
                albumArtPath = await invoke<string | null>('extract_album_art', { filePath });
              } catch {
                albumArtPath = null;
              }
            }

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
            newSongs.push(song);
          } catch (e) {
            console.error('Failed to add:', filePath, e);
          }
        }

        if (newSongs.length > 0) {
          useLibraryStore.getState().addSongs(newSongs);
          toast.success(`Added ${newSongs.length} songs to library`);
        }
      });
    };
    
    setupListener();
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Show nothing while settings are loading from disk
  if (!isSettingsLoaded) {
    return (
      <div style={{
        background: '#0c0c0c',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          background: '#1a1a2e',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px'
        }}>🎵</div>
        <p style={{ 
          color: '#6b6b6b', 
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif'
        }}>
          Loading Cadence...
        </p>
      </div>
    );
  }

  // Show onboarding if first launch
  if (!hasCompletedOnboarding) {
    return <Onboarding />;
  }


  return (
    <div 
      className="flex h-screen w-screen flex-col overflow-hidden relative"
      data-theme={theme === 'system' ? 'dark' : theme}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
    >
      <ToastContainer />

      {/* Drag Over Overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-[9998] flex items-center justify-center bg-[#7c3aed]/10 border-4 border-dashed border-[#7c3aed] transition-opacity duration-150">
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <FolderPlus className="w-12 h-12 text-[#7c3aed]" />
            <h2 className="text-white text-xl font-bold">Drop music files here</h2>
            <p className="text-[#a3a3a3] text-sm">MP3, FLAC, WAV, OGG, AAC, M4A</p>
          </div>
        </div>
      )}

      {isMiniPlayer ? (
        <MiniPlayer />
      ) : (
        <>
          <TitleBar />

          <div className="flex flex-1 overflow-hidden pb-[88px]">
            <Sidebar />
            <MainContent />
            {isQueueOpen && <QueuePanel />}
          </div>
          <NowPlayingBar />
        </>
      )}
      <GlobalLikeAnimation />
    </div>
  );
}
