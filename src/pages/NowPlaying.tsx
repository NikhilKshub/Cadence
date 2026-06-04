import { useState, useEffect, useRef } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { Music2, Heart, MicOff } from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import { useLibraryStore } from '../store/libraryStore';
import { formatTime } from '../utils/formatters';

// ── Types ──────────────────────────────────────────────────────────────────
interface LyricsResult {
  found: boolean;
  synced: boolean;
  plain_lyrics: string | null;
  synced_lyrics: string | null;
  source: string;
}

interface SyncedLine {
  time: number;
  text: string;
}

type LyricsState = 'idle' | 'loading' | 'found' | 'not_found';
type ActiveTab = 'lyrics' | 'queue';

// ── Helpers ────────────────────────────────────────────────────────────────
function parseSyncedLrc(lrc: string): SyncedLine[] {
  const lines: SyncedLine[] = [];
  for (const raw of lrc.split('\n')) {
    const match = raw.match(/^\[(\d{1,3}):(\d{2})\.(\d{1,3})\](.*)/);
    if (!match) continue;
    const mins = parseInt(match[1]!, 10);
    const secs = parseInt(match[2]!, 10);
    const text = match[4]!.trim();
    if (text) lines.push({ time: mins * 60 + secs, text });
  }
  return lines;
}

// ── In-Memory Lyrics Cache ─────────────────────────────────────────────
interface CachedLyrics {
  result: LyricsResult;
  syncedLines: SyncedLine[];
  artworkUrl: string | null;
}
const lyricsMemoryCache = new Map<string, CachedLyrics>();

// ── Component ─────────────────────────────────────────────────────────────

export default function NowPlaying() {
  const player = usePlayer();
  const { currentSong, currentTime, queue, queueIndex, isPlaying } = player;
  const { toggleFavorite } = useLibraryStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('lyrics');
  const [lyricsState, setLyricsState] = useState<LyricsState>('idle');
  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null);
  const [syncedLines, setSyncedLines] = useState<SyncedLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Override display values based on cache
  const [displayTitle, setDisplayTitle] = useState('');
  const [displayArtist, setDisplayArtist] = useState('');
  const [displayAlbum, setDisplayAlbum] = useState('');
  const [displayArtwork, setDisplayArtwork] = useState<string | null>(null);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (!currentSong) { setLyricsState('idle'); return; }

    const rawTitle = (currentSong.title?.trim() || currentSong.fileName.replace(/\.[^/.]+$/, '')).trim();
    const rawArtist = (currentSong.artist?.trim() || '');

    setDisplayTitle(rawTitle);
    setDisplayArtist(rawArtist || 'Unknown Artist');
    setDisplayAlbum(currentSong.album || 'Unknown Album');
    setDisplayArtwork(currentSong.albumArtPath ? convertFileSrc(currentSong.albumArtPath) : null);

    const memCached = lyricsMemoryCache.get(currentSong.id);
    if (memCached) {
      setLyricsResult(memCached.result);
      setSyncedLines(memCached.syncedLines);
      setCurrentLineIndex(-1);
      setLyricsState('found');
      if (memCached.artworkUrl) setDisplayArtwork(memCached.artworkUrl);
      return;
    }

    setLyricsState('loading');
    setLyricsResult(null);
    setSyncedLines([]);
    setCurrentLineIndex(-1);

    let cancelled = false;

    const doFetch = async () => {
      try {
        try {
          const { default: Database } = await import('@tauri-apps/plugin-sql');
          const db = await Database.load('sqlite:cadence.db');

          await db.execute(`
            CREATE TABLE IF NOT EXISTS song_cache (
              song_id TEXT PRIMARY KEY,
              title TEXT,
              artist TEXT,
              album TEXT,
              artwork_url TEXT,
              plain_lyrics TEXT,
              synced_lyrics TEXT
            )
          `);
          try { await db.execute('ALTER TABLE song_cache ADD COLUMN synced_lyrics TEXT'); } catch (_) { /* exists */ }

          const rows = await db.select<any[]>(
            'SELECT plain_lyrics, synced_lyrics, artwork_url FROM song_cache WHERE song_id = $1',
            [currentSong.id]
          );

          if (rows && rows.length > 0) {
            const row = rows[0];
            const hasRealLyrics = row.plain_lyrics 
              && row.plain_lyrics !== "No lyrics found automatically for this track."
              && row.plain_lyrics.length > 10;

            if (hasRealLyrics && !cancelled) {
              let artUrl: string | null = null;
              if (row.artwork_url) {
                artUrl = row.artwork_url.startsWith('http') || row.artwork_url.startsWith('asset:')
                  ? row.artwork_url : convertFileSrc(row.artwork_url);
                setDisplayArtwork(artUrl);
              }
              const cachedResult: LyricsResult = {
                found: true,
                synced: !!row.synced_lyrics,
                plain_lyrics: row.plain_lyrics,
                synced_lyrics: row.synced_lyrics || null,
                source: 'cache'
              };
              const cachedLines = row.synced_lyrics ? parseSyncedLrc(row.synced_lyrics) : [];

              setLyricsResult(cachedResult);
              setLyricsState('found');
              setSyncedLines(cachedLines);

              lyricsMemoryCache.set(currentSong.id, {
                result: cachedResult,
                syncedLines: cachedLines,
                artworkUrl: artUrl,
              });
              return;
            } else {
              await db.execute('DELETE FROM song_cache WHERE song_id = $1', [currentSong.id]);
            }
          }
        } catch (dbErr) {
          console.warn('Cache check failed:', dbErr);
        }

        if (cancelled) return;

        let result: LyricsResult | null = null;
        try {
          result = await invoke<LyricsResult>('fetch_lyrics', {
            title: rawTitle,
            artist: rawArtist,
            album: currentSong.album || '',
            duration: currentSong.duration || 0
          });
        } catch (err) {
          console.error('invoke fetch_lyrics failed:', err);
        }

        if (cancelled) return;

        if (result && result.found) {
          const fetchedLines = (result.synced && result.synced_lyrics) 
            ? parseSyncedLrc(result.synced_lyrics) : [];

          setLyricsResult(result);
          setLyricsState('found');
          setSyncedLines(fetchedLines);

          lyricsMemoryCache.set(currentSong.id, {
            result,
            syncedLines: fetchedLines,
            artworkUrl: currentSong.albumArtPath ? convertFileSrc(currentSong.albumArtPath) : null,
          });

          try {
            const { default: Database } = await import('@tauri-apps/plugin-sql');
            const db = await Database.load('sqlite:cadence.db');
            await db.execute(
              'INSERT OR REPLACE INTO song_cache (song_id, title, artist, album, artwork_url, plain_lyrics, synced_lyrics) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [
                currentSong.id,
                rawTitle,
                rawArtist,
                currentSong.album || '',
                currentSong.albumArtPath || null,
                result.plain_lyrics,
                result.synced_lyrics
              ]
            );
          } catch (dbErr) {
            console.warn('Cache save failed:', dbErr);
          }
        } else {
          setLyricsState('not_found');
        }

      } catch (err) {
        console.error('Lyrics pipeline error:', err);
        if (!cancelled) setLyricsState('not_found');
      }
    };

    doFetch();

    return () => { cancelled = true; };
  }, [currentSong?.id, currentSong?.title, currentSong?.artist]);

  // Track current synced lyric line and auto-scroll
  useEffect(() => {
    if (!syncedLines.length) return;
    let idx = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (syncedLines[i]!.time <= currentTime) idx = i;
      else break;
    }
    if (idx !== currentLineIndex) {
      setCurrentLineIndex(idx);
      lineRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, syncedLines]);

  const upcomingQueue = queue.slice(queueIndex + 1);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0D0D0D]">
      <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes rotateBorder {
          to { --angle: 360deg; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2A2A2A;
          border-radius: 4px;
        }
      `}</style>

      {/* LEFT COLUMN */}
      <div className="relative w-[45%] h-full shrink-0 overflow-hidden">
        
        {/* BACKGROUND LAYER */}
        {displayArtwork ? (
          <img src={displayArtwork} className="absolute inset-0 w-full h-full object-cover z-0" style={{ filter: 'blur(80px) saturate(1.6) brightness(0.35)', transform: 'scale(1.3)' }} />
        ) : (
          <div className="absolute inset-0 w-full h-full z-0 bg-gradient-to-br from-[#1C1C1C] to-[#2A2520]" />
        )}
        
        {/* DARK OVERLAY */}
        <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(180deg, rgba(13,13,13,0.3) 0%, rgba(13,13,13,0.7) 100%)' }} />

        {/* CONTENT */}
        <div className="relative z-[2] flex flex-col items-center justify-center h-full px-[40px] py-[48px]">
          
          {/* ALBUM ART CONTAINER */}
          <div className="relative w-[260px] h-[260px] mb-[32px] flex items-center justify-center shrink-0">
            {/* Animated border */}
            {isPlaying && (
              <div 
                className="absolute inset-[-2px] rounded-[22px] z-[1]" 
                style={{ 
                  background: 'conic-gradient(from var(--angle, 0deg), transparent 0deg, #E8630A 60deg, #FF8C42 120deg, transparent 180deg, transparent 360deg)',
                  animation: 'rotateBorder 3s linear infinite'
                }} 
              />
            )}
            
            {/* Main Art */}
            <div 
              className="relative z-[2] w-full h-full rounded-[20px] overflow-hidden bg-[#141414] shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.1)]"
            >
                {displayArtwork ? (
                  <img src={displayArtwork} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1C1C1C] to-[#2A2520]"><Music2 size={64} className="text-[#5A5248]" /></div>
                )}
            </div>
          </div>

          {/* SONG INFO */}
          <div className="w-full text-center mb-[20px]">
            <h1 className="font-display text-[28px] font-extrabold text-[#F5F0EB] tracking-[-0.02em] line-clamp-2 mb-[6px]">
              {displayTitle || 'Unknown Title'}
            </h1>
            <p className="font-sans text-[16px] font-medium text-[#9A9080] mb-[4px]">
              {displayArtist || 'Unknown Artist'}
            </p>
            <p className="font-sans text-[13px] text-[#5A5248]">
              {displayAlbum || 'Unknown Album'}
            </p>
          </div>

          {/* STATS ROW */}
          {currentSong && (
            <div className="flex flex-row items-center justify-center gap-4 mb-[24px]">
              <div className="flex flex-col items-center">
                <span className="font-mono text-[14px] font-medium text-[#F5F0EB]">{currentSong.playCount || 0}</span>
                <span className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#5A5248]">Play count</span>
              </div>
              <div className="w-[1px] h-[24px] bg-[rgba(255,255,255,0.08)]" />
              <div className="flex flex-col items-center">
                <span className="font-mono text-[14px] font-medium text-[#F5F0EB]">{formatTime(currentSong.duration || 0)}</span>
                <span className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#5A5248]">Duration</span>
              </div>
              <div className="w-[1px] h-[24px] bg-[rgba(255,255,255,0.08)]" />
              <div className="flex flex-col items-center">
                <span className="font-mono text-[14px] font-medium text-[#F5F0EB]">{currentSong.format?.toUpperCase() || '—'}</span>
                <span className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#5A5248]">Format</span>
              </div>
              <div className="w-[1px] h-[24px] bg-[rgba(255,255,255,0.08)]" />
              <div className="flex flex-col items-center">
                <span className="font-mono text-[14px] font-medium text-[#F5F0EB]">{currentSong.bitrate ? `${currentSong.bitrate}kbps` : '—'}</span>
                <span className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#5A5248]">Bitrate</span>
              </div>
            </div>
          )}

          {/* HEART BUTTON */}
          {currentSong && (
            <button 
              onClick={() => toggleFavorite(currentSong.id)}
              className="w-[40px] h-[40px] rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-[rgba(232,99,10,0.12)] group"
            >
              <Heart size={18} className={currentSong.isFavorite ? 'text-[#E8630A] fill-[#E8630A]' : 'text-[#5A5248]'} />
            </button>
          )}

        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex flex-col w-[55%] shrink-0 h-full bg-[#0D0D0D] border-l border-[rgba(255,255,255,0.06)] overflow-hidden">
        
        {/* TABS */}
        <div className="flex flex-row h-[52px] border-b border-[rgba(255,255,255,0.06)] px-[28px] items-end gap-[28px] shrink-0">
          {(['lyrics', 'queue'] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-sans text-[14px] font-medium pb-[14px] border-b-[2px] transition-all duration-200 capitalize ${activeTab === tab ? 'text-[#F5F0EB] border-[#E8630A]' : 'text-[#5A5248] border-transparent hover:text-[#9A9080]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB CONTENT: LYRICS */}
        {activeTab === 'lyrics' && (
          <div className="flex-1 overflow-y-auto px-[28px] py-[24px] custom-scrollbar">
            
            {lyricsState === 'loading' && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-[24px] h-[24px] rounded-full border-[2px] border-[rgba(255,255,255,0.08)] border-t-[#E8630A] animate-spin" />
                <span className="font-sans text-[13px] text-[#5A5248]">Finding lyrics...</span>
              </div>
            )}

            {lyricsState === 'found' && syncedLines.length > 0 && (
              <div className="flex flex-col pb-[120px]">
                {syncedLines.map((line, i) => {
                  const isCurrent = i === currentLineIndex;
                  const isPast = i < currentLineIndex;
                  const dist = i - currentLineIndex;
                  
                  let styleStr = 'font-sans text-[14px] text-[#5A5248]'; // FAR FUTURE lines
                  if (isCurrent) {
                    styleStr = 'font-sans text-[18px] font-bold text-[#F5F0EB] scale-[1.02] origin-left';
                  } else if (isPast) {
                    styleStr = 'font-sans text-[14px] text-[#3A3530]';
                  } else if (dist > 0 && dist <= 3) {
                    // UPCOMING lines close
                    if (dist === 1) styleStr = 'font-sans text-[14px] text-[#9A9080]';
                    else if (dist === 2) styleStr = 'font-sans text-[14px] text-[#7A7268]';
                    else if (dist === 3) styleStr = 'font-sans text-[14px] text-[#5A5248]';
                  }

                  return (
                    <div
                      key={i}
                      ref={(el) => { lineRefs.current[i] = el; }}
                      className={`py-[6px] transition-all duration-300 ease cursor-default ${styleStr}`}
                    >
                      {line.text}
                    </div>
                  );
                })}
              </div>
            )}

            {lyricsState === 'found' && syncedLines.length === 0 && lyricsResult?.plain_lyrics && (
              <div className="pb-12">
                <p className="font-sans text-[15px] text-[#9A9080] leading-[1.9] whitespace-pre-line">
                  {lyricsResult.plain_lyrics}
                </p>
              </div>
            )}

            {(lyricsState === 'idle' || lyricsState === 'not_found') && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <MicOff size={40} className="text-[#2A2A2A]" />
                <h2 className="font-display text-[18px] text-[#5A5248]">{lyricsState === 'idle' ? 'No song playing' : 'No lyrics found'}</h2>
                <p className="font-sans text-[13px] text-[#3A3530]">for this track</p>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: QUEUE */}
        {activeTab === 'queue' && (
          <div className="flex-1 overflow-y-auto p-[16px] custom-scrollbar">
            <div className="flex flex-row items-center gap-2 mb-2">
              <h3 className="font-display text-[16px] font-bold text-[#F5F0EB] px-[12px] py-[8px]">Up Next</h3>
              <span className="font-sans text-[12px] text-[#5A5248]">{upcomingQueue.length} songs</span>
            </div>

            <div className="flex flex-col">
              {upcomingQueue.map((song, idx) => {
                const songArt = song.albumArtPath ? convertFileSrc(song.albumArtPath) : null;
                const isNext = idx === 0;
                return (
                  <div key={`${song.id}-${idx}`} className="flex flex-row items-center gap-3 h-[52px] px-[12px] rounded-[10px] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150">
                    <div className="w-[20px] text-center font-mono text-[12px] text-[#5A5248]">
                      {idx + 1}
                    </div>
                    <div className="w-[36px] h-[36px] rounded-[8px] bg-[#141414] overflow-hidden shrink-0 border border-[rgba(255,255,255,0.06)]">
                      {songArt ? (
                        <img src={songArt} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Music2 size={16} className="text-[#5A5248]" /></div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`font-sans text-[13px] font-medium truncate ${isNext ? 'text-[#E8630A]' : 'text-[#F5F0EB]'}`}>{song.title}</span>
                      <span className="font-sans text-[12px] text-[#9A9080] truncate">{song.artist || 'Unknown Artist'}</span>
                    </div>
                    <div className="font-mono text-[11px] text-[#5A5248] ml-auto">
                      {formatTime(song.duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
