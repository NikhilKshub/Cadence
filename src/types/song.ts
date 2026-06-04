// Cadence — Song type definition
// Represents a single audio track in the music library

export type AudioFormat = 'mp3' | 'flac' | 'wav' | 'ogg' | 'aac' | 'm4a';

export interface Song {
  /** UUID generated on import */
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  genre: string;
  year: number | null;
  /** Duration in seconds */
  duration: number;
  /** Absolute local file path */
  filePath: string;
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  format: AudioFormat;
  bitrate: number | null;
  sampleRate: number | null;
  /** Path to extracted and cached album art, null if none */
  albumArtPath: string | null;
  playCount: number;
  /** ISO date string of last playback, null if never played */
  lastPlayed: string | null;
  /** ISO date string when the song was added to the library */
  dateAdded: string;
  isFavorite: boolean;
}
