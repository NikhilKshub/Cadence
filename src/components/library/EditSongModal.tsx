import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Modal from '../common/Modal';
import { useLibraryStore } from '../../store/libraryStore';
import type { Song } from '../../types/song';
import { Save, X, RefreshCw, ImageOff, MicVocal, Upload } from 'lucide-react';

interface EditSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
}

interface LyricsResult {
  found: boolean;
  synced: boolean;
  plain_lyrics: string | null;
  synced_lyrics: string | null;
  source: string;
}

export default function EditSongModal({ isOpen, onClose, song }: EditSongModalProps) {
  const { editSongMetadata } = useLibraryStore();

  // ─── ALL HOOKS MUST BE DECLARED HERE, BEFORE ANY EARLY RETURN ───
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingArt, setIsRefreshingArt] = useState(false);
  const [artFeedback, setArtFeedback] = useState<string | null>(null);
  const [isUploadingArt, setIsUploadingArt] = useState(false);
  const [isRefreshingLyrics, setIsRefreshingLyrics] = useState(false);
  const [lyricsFeedback, setLyricsFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (song) {
      setTitle(song.title || '');
      setArtist(song.artist || '');
      setAlbum(song.album || '');
    }
  }, [song]);

  // Reset feedback states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setArtFeedback(null);
      setLyricsFeedback(null);
      setIsSaving(false);
      setIsRefreshingArt(false);
      setIsUploadingArt(false);
      setIsRefreshingLyrics(false);
    }
  }, [isOpen]);

  // ─── EARLY RETURN AFTER ALL HOOKS ───
  if (!isOpen || !song) return null;

  // ─── EVENT HANDLERS ───

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await editSongMetadata(song.id, { title, artist, album });
      onClose();
    } catch (err) {
      console.error('Failed to save metadata:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoTag = async () => {
    setIsRefreshingArt(true);
    setArtFeedback(null);
    try {
      const details = await invoke<{
        title: string;
        artist: string;
        album: string;
        art_path: string | null;
      }>('fetch_and_apply_song_details', {
        songId: song.id,
        queryTitle: title,
        queryArtist: artist,
        filePath: song.filePath,
      });

      if (details) {
        setTitle(details.title);
        setArtist(details.artist);
        setAlbum(details.album);

        useLibraryStore.getState().updateSong(song.id, {
          title: details.title,
          artist: details.artist,
          album: details.album,
          albumArtPath: details.art_path || song.albumArtPath,
        });

        try {
          const { default: Database } = await import('@tauri-apps/plugin-sql');
          const db = await Database.load('sqlite:cadence.db');
          await db.execute(
            'INSERT OR REPLACE INTO song_cache (song_id, title, artist, album, artwork_url, plain_lyrics) VALUES ($1, $2, $3, $4, $5, $6)',
            [song.id, details.title, details.artist, details.album, details.art_path || song.albumArtPath, null]
          );
        } catch (dbErr) {
          console.warn('DB update after auto-tag failed (non-fatal):', dbErr);
        }

        setArtFeedback('Details Found!');
      } else {
        setArtFeedback('Not found');
      }
    } catch (err) {
      console.error('Failed to auto-tag:', err);
      setArtFeedback('Error');
    } finally {
      setIsRefreshingArt(false);
      setTimeout(() => setArtFeedback(null), 3000);
    }
  };

  const handleClearArt = async () => {
    try {
      useLibraryStore.getState().updateSong(song.id, { albumArtPath: null });
      const { default: Database } = await import('@tauri-apps/plugin-sql');
      const db = await Database.load('sqlite:cadence.db');
      await db.execute(
        'UPDATE song_cache SET artwork_url = NULL WHERE song_id = $1',
        [song.id]
      );
    } catch (err) {
      console.warn('Failed to clear art (non-fatal):', err);
    }
  };

  const handleUploadArt = async () => {
    setIsUploadingArt(true);
    setArtFeedback(null);
    try {
      const artPath = await invoke<string | null>('select_and_apply_local_cover_art', {
        songId: song.id,
        filePath: song.filePath,
      });

      if (artPath) {
        useLibraryStore.getState().updateSong(song.id, { albumArtPath: artPath });
        try {
          const { default: Database } = await import('@tauri-apps/plugin-sql');
          const db = await Database.load('sqlite:cadence.db');
          await db.execute(
            'UPDATE song_cache SET artwork_url = $1 WHERE song_id = $2',
            [artPath, song.id]
          );
        } catch (dbErr) {
          console.warn('DB update after upload failed (non-fatal):', dbErr);
        }
        setArtFeedback('Uploaded!');
      } else {
        setArtFeedback('Cancelled');
      }
    } catch (err) {
      console.error('Failed to upload art:', err);
      setArtFeedback('Error');
    } finally {
      setIsUploadingArt(false);
      setTimeout(() => setArtFeedback(null), 3000);
    }
  };

  const handleRefreshLyrics = async () => {
    setIsRefreshingLyrics(true);
    setLyricsFeedback(null);
    try {
      // Clear stale cache entry first
      try {
        const { default: Database } = await import('@tauri-apps/plugin-sql');
        const db = await Database.load('sqlite:cadence.db');
        await db.execute('DELETE FROM song_cache WHERE song_id = $1', [song.id]);
      } catch { /* non-fatal */ }

      let result: LyricsResult | null = null;
      try {
        result = await invoke<LyricsResult>('fetch_lyrics', {
          title: title,
          artist: artist,
          album: album || '',
          duration: song.duration || 0
        });
      } catch (err) {
        console.error('fetch_lyrics error:', err);
      }

      if (result && result.found) {
        setLyricsFeedback('Found!');
        // Only cache real lyrics
        try {
          const { default: Database } = await import('@tauri-apps/plugin-sql');
          const db = await Database.load('sqlite:cadence.db');
          await db.execute(
            'INSERT OR REPLACE INTO song_cache (song_id, title, artist, album, artwork_url, plain_lyrics, synced_lyrics) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [song.id, title, artist, album || '', song.albumArtPath, result.plain_lyrics, result.synced_lyrics]
          );
        } catch (dbErr) {
          console.warn('Cache save failed (non-fatal):', dbErr);
        }
      } else {
        setLyricsFeedback('Not found');
      }
    } catch (err) {
      console.error('Failed to refresh lyrics:', err);
      setLyricsFeedback('Error');
    } finally {
      setIsRefreshingLyrics(false);
      setTimeout(() => setLyricsFeedback(null), 3000);
    }
  };

  // ─── RENDER ───
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Song Info" className="w-[450px]">
      <div className="flex flex-col gap-4 p-4">

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#a3a3a3]">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-[#7c3aed] focus:outline-none transition-colors"
            placeholder="Song Title"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#a3a3a3]">Artist</label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-[#7c3aed] focus:outline-none transition-colors"
            placeholder="Artist Name"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#a3a3a3]">Album</label>
          <input
            type="text"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-[#7c3aed] focus:outline-none transition-colors"
            placeholder="Album Name"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-2 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">Metadata Actions</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAutoTag}
              disabled={isRefreshingArt}
              className="flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-[#a3a3a3] hover:border-[#4a4a4a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshingArt ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {isRefreshingArt ? 'Fetching...' : artFeedback ? artFeedback : 'Auto-Tag Details'}
            </button>

            <button
              onClick={handleUploadArt}
              disabled={isUploadingArt}
              className="flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-[#a3a3a3] hover:border-[#4a4a4a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingArt ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
              Upload Cover Art
            </button>

            <button
              onClick={handleClearArt}
              className="flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-[#a3a3a3] hover:border-red-900 hover:text-red-400 transition-colors"
            >
              <ImageOff size={14} />
              Clear Artwork
            </button>

            <button
              onClick={handleRefreshLyrics}
              disabled={isRefreshingLyrics}
              className="flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-[#a3a3a3] hover:border-[#4a4a4a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshingLyrics ? <RefreshCw size={14} className="animate-spin" /> : <MicVocal size={14} />}
              {isRefreshingLyrics ? 'Fetching...' : lyricsFeedback ? lyricsFeedback : 'Refresh Lyrics'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-[#a3a3a3] hover:text-white transition-colors"
          >
            <X size={16} />
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </Modal>
  );
}
