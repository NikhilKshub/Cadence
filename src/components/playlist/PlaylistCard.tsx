// Cadence — Playlist card component
// Renders a playlist as a card in the playlists grid

import type { Playlist } from '../../types/playlist';

interface PlaylistCardProps {
  playlist: Playlist;
  onClick?: (playlist: Playlist) => void;
}

export default function PlaylistCard({ playlist, onClick }: PlaylistCardProps) {
  // TODO: Implement playlist card with cover art, name, and song count
  return (
    <div
      className="playlist-card"
      onClick={() => onClick?.(playlist)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(playlist); }}
    >
      <div className="playlist-card-art">
        {/* Cover art or collage */}
      </div>
      <div className="playlist-card-info">
        <span className="playlist-card-name">{playlist.name}</span>
        <span className="playlist-card-count">{playlist.songCount} songs</span>
      </div>
    </div>
  );
}
