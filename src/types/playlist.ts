// Cadence — Playlist type definition
// Represents a user-created collection of songs

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverArtPath: string | null;
  /** Ordered list of song IDs in this playlist */
  songIds: string[];
  /** ISO date string */
  createdAt: string;
  /** ISO date string */
  updatedAt: string;
  /** Total duration of all songs in seconds */
  totalDuration: number;
  songCount: number;
}
