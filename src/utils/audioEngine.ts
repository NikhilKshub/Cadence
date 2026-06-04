// Cadence — Audio Engine Class
// Manages audio playback using native HTML5 Audio for maximum compatibility in Tauri

import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';

export class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private currentFilePath: string | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private elapsedSeconds: number = 0;

  constructor() {
    this.audio = new Audio();
    this.audio.autoplay = false;

    // Attach native event listeners
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio) {
        usePlayerStore.setState({ duration: this.audio.duration });
      }
    });

    this.audio.addEventListener('play', () => {
      usePlayerStore.setState({ isPlaying: true, isPaused: false });
      this.startProgressTracking();
    });

    this.audio.addEventListener('pause', () => {
      usePlayerStore.setState({ isPaused: true, isPlaying: false });
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnd();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('HTMLAudioElement error:', e);
      usePlayerStore.setState({ isPlaying: false });
    });
  }

  /**
   * Loads an audio file path into the native audio element.
   * Converts path to Tauri asset src before loading.
   */
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

    if (this.audio) {
      this.audio.pause();
      this.stopProgressTracking();
    }

    this.elapsedSeconds = 0;
    this.currentFilePath = filePath;

    const assetUrl = convertFileSrc(filePath);
    console.error('Loading audio with native Audio:', assetUrl);

    if (this.audio) {
      this.audio.src = assetUrl;
      this.audio.volume = usePlayerStore.getState().volume;
      this.audio.muted = usePlayerStore.getState().isMuted;
      this.audio.load();

      if (autoPlay) {
        this.play();
      }
    }
  }

  /**
   * Starts playback of the loaded track.
   */
  public play(): void {
    if (this.audio) {
      this.audio.play().catch(e => {
        console.error('Audio play failed:', e);
      });
    }
  }

  /**
   * Pauses playback of the loaded track.
   */
  public pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * Stops playback of the loaded track and resets seek position.
   */
  public stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.stopProgressTracking();
  }

  /**
   * Seeks to a specific timestamp in seconds.
   */
  public seekTo(seconds: number): void {
    if (this.audio) {
      this.audio.currentTime = seconds;
      usePlayerStore.setState({ currentTime: seconds });
    }
  }

  /**
   * Updates playback volume.
   * Clamps the value between 0 and 1.
   */
  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = clampedVolume;
    }
    usePlayerStore.setState({ volume: clampedVolume });
  }

  /**
   * Toggles the mute state of the audio engine.
   */
  public toggleMute(): void {
    const isMuted = !usePlayerStore.getState().isMuted;
    if (this.audio) {
      this.audio.muted = isMuted;
    }
    usePlayerStore.setState({ isMuted });
  }

  /**
   * Returns current seek position in seconds.
   */
  public getCurrentTime(): number {
    if (this.audio) {
      return this.audio.currentTime;
    }
    return 0;
  }

  /**
   * Returns total duration of current track in seconds.
   */
  public getDuration(): number {
    if (this.audio && !isNaN(this.audio.duration)) {
      return this.audio.duration;
    }
    return 0;
  }

  /**
   * Unloads the current song and frees engine resources.
   */
  public unload(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.currentFilePath = null;
    this.stopProgressTracking();
  }

  /**
   * Starts tracking current playback position every 250ms.
   */
  private startProgressTracking(): void {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      if (this.audio && !this.audio.paused) {
        const position = this.audio.currentTime;
        usePlayerStore.setState({ currentTime: position });
        
        this.elapsedSeconds += 0.25;
        
        // Last.fm scrobble condition check
        const duration = this.audio.duration;
        if (!isNaN(duration) && position >= 30 && (position >= duration / 2 || position >= 240)) {
          const store = usePlayerStore.getState();
          if (!store.hasScrobbled) {
            store.scrobbleCurrentSong();
          }
        }
      }
    }, 250);
  }

  /**
   * Stops the progress tracking interval.
   */
  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Handles actions when a song completes playback.
   * Obeys repeat configurations.
   */
  private handleTrackEnd(): void {
    const currentSong = usePlayerStore.getState().currentSong;
    if (currentSong) {
      invoke('record_listen', {
        songId: currentSong.id,
        durationListened: this.elapsedSeconds,
        completed: true
      }).catch(console.error);

      // Only increment play count when song actually finishes playing
      useLibraryStore.getState().updateSong(currentSong.id, {
        playCount: currentSong.playCount + 1,
        lastPlayed: new Date().toISOString()
      });
    }
    
    // Reset elapsed seconds immediately so `load()` doesn't trigger the "incomplete" event
    this.elapsedSeconds = 0;

    this.stopProgressTracking();
    const repeatMode = usePlayerStore.getState().repeat;

    if (repeatMode === 'one') {
      if (this.currentFilePath) {
        this.load(this.currentFilePath, true);
      }
    } else {
      // For 'all' or 'none', invoke the store's next() action
      usePlayerStore.getState().next();
      // Load and play the new current track from the store (if any)
      const nextSong = usePlayerStore.getState().currentSong;
      if (nextSong) {
        this.load(nextSong.filePath, true);
      } else {
        this.unload();
      }
    }
  }
}

// Export a singleton instance of the AudioEngine
export const audioEngine = new AudioEngine();
