CREATE TABLE IF NOT EXISTS songs (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    artist          TEXT DEFAULT '',
    album           TEXT DEFAULT '',
    album_artist    TEXT DEFAULT '',
    genre           TEXT DEFAULT '',
    year            INTEGER,
    duration        REAL NOT NULL,
    file_path       TEXT NOT NULL UNIQUE,
    file_name       TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    format          TEXT NOT NULL,
    bitrate         INTEGER,
    sample_rate     INTEGER,
    album_art_path  TEXT,
    play_count      INTEGER DEFAULT 0,
    last_played     TEXT,
    date_added      TEXT NOT NULL,
    is_favorite     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS playlists (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    cover_art_path  TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id     TEXT NOT NULL,
    song_id         TEXT NOT NULL,
    position        INTEGER NOT NULL,
    added_at        TEXT NOT NULL,
    PRIMARY KEY (playlist_id, song_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lyrics (
  song_id TEXT PRIMARY KEY,
  found INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0,
  plain_lyrics TEXT,
  synced_lyrics TEXT,
  source TEXT DEFAULT '',
  fetched_at TEXT NOT NULL,
  FOREIGN KEY (song_id) REFERENCES songs(id) 
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listening_stats (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL,
  listened_at TEXT NOT NULL,
  duration_listened REAL NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (song_id) REFERENCES songs(id) 
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,
  total_minutes REAL NOT NULL DEFAULT 0,
  songs_played INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
