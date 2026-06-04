// Cadence — Player state type definition
// Represents the current playback state of the audio engine

import type { Song } from './song';

export type RepeatMode = 'none' | 'one' | 'all';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isPaused: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration of current track in seconds */
  duration: number;
  /** Volume level from 0 (silent) to 1 (max) */
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Upcoming songs in the playback queue */
  queue: Song[];
  /** Index of the current song in the queue */
  queueIndex: number;
  /** Crossfade duration in seconds; 0 means disabled */
  crossfadeDuration: number;
}
