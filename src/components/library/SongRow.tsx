// Cadence — Song row component
// Renders a single song as a row in the library list view

import type { Song } from '../../types/song';

interface SongRowProps {
  song: Song;
  isActive?: boolean;
  isSelected?: boolean;
  onPlay?: (song: Song) => void;
  onContextMenu?: (event: React.MouseEvent, song: Song) => void;
}

export default function SongRow({ song, isActive = false, isSelected = false, onPlay, onContextMenu }: SongRowProps) {
  // TODO: Implement song row with columns: title, artist, album, duration, actions
  return (
    <div
      className={`song-row ${isActive ? 'song-row-active' : ''} ${isSelected ? 'song-row-selected' : ''}`}
      onDoubleClick={() => onPlay?.(song)}
      onContextMenu={(e) => onContextMenu?.(e, song)}
      role="row"
    >
      <span className="song-title">{song.title}</span>
      <span className="song-artist">{song.artist}</span>
      <span className="song-album">{song.album}</span>
    </div>
  );
}
