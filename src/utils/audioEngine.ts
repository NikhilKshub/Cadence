// Cadence — Audio Engine Class
// Manages audio playback using Howler

import { Howl } from 'howler';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';

export class AudioEngine {
  private howler: Howl | null = null;
  private currentFilePath: string | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private elapsedSeconds: number = 0;

  constructor() {}

  public load(filePath: string, autoPlay: boolean = false): void {
    if (this.currentFilePath && this.elapsedSeconds > 10) {
      const currentSong = usePlayerStore.getState().currentSong;
      if (currentSong) {
        invoke('record_listen', {
          songId: currentSong.id,
          durationListened: this.elapsedSeconds,
          completed: false
        }).catch(console.error);
      }
    }

    if (this.howler) {
      this.howler.unload();
      this.stopProgressTracking();
    }

    this.elapsedSeconds = 0;
    this.currentFilePath = filePath;

    const assetUrl = convertFileSrc(filePath);
    
    this.howler = new Howl({
      src: [assetUrl],
      html5: false,
      format: ['mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a'],
      volume: usePlayerStore.getState().volume,
      mute: usePlayerStore.getState().isMuted,
      onload: () => {
        usePlayerStore.setState({ duration: this.howler?.duration() || 0 });
        if (autoPlay) {
          this.play();
        }
      },
      onplay: () => {
        usePlayerStore.setState({ isPlaying: true, isPaused: false });
        this.startProgressTracking();
      },
      onpause: () => {
        usePlayerStore.setState({ isPaused: true, isPlaying: false });
      },
      onend: () => {
        this.handleTrackEnd();
      },
      onloaderror: (id, error) => {
        console.error('Audio load error:', id, error);
        usePlayerStore.setState({ isPlaying: false });
      },
      onplayerror: (id, error) => {
        console.error('Audio play error:', id, error);
        usePlayerStore.setState({ isPlaying: false });
      }
    });
  }

  public play(): void {
    if (this.howler && !this.howler.playing()) {
      this.howler.play();
    }
  }

  public pause(): void {
    if (this.howler) {
      this.howler.pause();
    }
  }

  public stop(): void {
    if (this.howler) {
      this.howler.stop();
    }
    this.stopProgressTracking();
  }

  public seekTo(seconds: number): void {
    if (this.howler) {
      this.howler.seek(seconds);
      usePlayerStore.setState({ currentTime: seconds });
    }
  }

  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (this.howler) {
      this.howler.volume(clampedVolume);
    }
    usePlayerStore.setState({ volume: clampedVolume });
  }

  public toggleMute(): void {
    const isMuted = !usePlayerStore.getState().isMuted;
    if (this.howler) {
      this.howler.mute(isMuted);
    }
    usePlayerStore.setState({ isMuted });
  }

  public getCurrentTime(): number {
    if (this.howler && this.howler.playing()) {
      return this.howler.seek() as number;
    }
    return usePlayerStore.getState().currentTime;
  }

  public getDuration(): number {
    if (this.howler) {
      return this.howler.duration();
    }
    return 0;
  }

  public unload(): void {
    if (this.howler) {
      this.howler.unload();
      this.howler = null;
    }
    this.currentFilePath = null;
    this.stopProgressTracking();
  }

  private startProgressTracking(): void {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      if (this.howler && this.howler.playing()) {
        const position = this.howler.seek() as number;
        usePlayerStore.setState({ currentTime: position });
        
        this.elapsedSeconds += 0.25;
        
        const duration = this.howler.duration();
        if (duration && position >= 30 && (position >= duration / 2 || position >= 240)) {
          const store = usePlayerStore.getState();
          if (!store.hasScrobbled) {
            store.scrobbleCurrentSong();
          }
        }
      }
    }, 250);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private handleTrackEnd(): void {
    const currentSong = usePlayerStore.getState().currentSong;
    if (currentSong) {
      invoke('record_listen', {
        songId: currentSong.id,
        durationListened: this.elapsedSeconds,
        completed: true
      }).catch(console.error);

      useLibraryStore.getState().updateSong(currentSong.id, {
        playCount: currentSong.playCount + 1,
        lastPlayed: new Date().toISOString()
      });
    }
    
    this.elapsedSeconds = 0;
    this.stopProgressTracking();
    
    const repeatMode = usePlayerStore.getState().repeat;

    if (repeatMode === 'one') {
      if (this.currentFilePath) {
        this.load(this.currentFilePath, true);
      }
    } else {
      usePlayerStore.getState().next();
      const nextSong = usePlayerStore.getState().currentSong;
      if (nextSong) {
        this.load(nextSong.filePath, true);
      } else {
        this.unload();
      }
    }
  }
}

export const audioEngine = new AudioEngine();
