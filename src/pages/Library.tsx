import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Music2, Play, Heart, ListPlus, Plus, Pencil, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import type { Song } from '../types/song';
import EditSongModal from '../components/library/EditSongModal';
import AddToPlaylistModal from '../components/library/AddToPlaylistModal';
import DeleteConfirmationModal from '../components/library/DeleteConfirmationModal';
import { toast } from '../store/toastStore';
import AnimatedHeart from '../components/common/AnimatedHeart';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type SortField = 'title' | 'artist' | 'album' | 'duration';

export default function Library() {
  const { songs, isScanning, searchSongs, toggleFavorite, removeSong } = useLibraryStore();
  const playerStore = usePlayerStore();
  const { currentSong, isPlaying } = usePlayer();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('title');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [songForPlaylist, setSongForPlaylist] = useState<Song | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    song: Song;
  } | null>(null);

  // Dismiss context menu on click or escape
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    
    if (contextMenu) {
      document.addEventListener('click', handleGlobalClick);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu]);

  const filtered = search.trim() !== '' ? searchSongs(search) : songs;

  const sorted = [...filtered].sort((a, b) => {
    const val = sortAsc ? 1 : -1;
    switch(sortBy) {
      case 'title': 
        return val * (a.title || a.fileName || '').localeCompare(b.title || b.fileName || '');
      case 'artist': 
        return val * (a.artist || '').localeCompare(b.artist || '');
      case 'album': 
        return val * (a.album || '').localeCompare(b.album || '');
      case 'duration': 
        return val * (a.duration - b.duration);
      default: return 0;
    }
  });

  const handleDoubleClick = (song: Song) => {
    playerStore.playSongFromLibrary(song, sorted);
  };

  const handleContextMenu = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, song });
  };

  const handleRemoveFromAppAndDisk = async (song: Song) => {
    try {
      // 1. Wipe from local storage drive and database first
      await invoke('delete_song_from_disk', { songId: song.id, filePath: song.filePath });
      
      // 2. Remove the song from the library UI store
      removeSong(song.id);
      
      // 3. Purge from active player queue and state
      playerStore.purgeSongFromPlayer(song.id);
      // Update local state to reflect deletion
      toast.success(`Deleted ${song.title || song.fileName}`);
    } catch (error) {
      toast.error(`Failed to complete deletion: ${error}`);
    }
  };

  return (
    <div className="h-full w-full bg-[#0D0D0D] px-[32px] py-[28px] overflow-y-auto flex flex-col relative">
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes eq {
          0% { height: 30%; }
          100% { height: 100%; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* HEADER ROW */}
      <div className="flex flex-row justify-between items-center mb-[24px] shrink-0">
        <div className="flex flex-col">
          <h1 className="font-display text-[32px] font-extrabold text-[#F5F0EB] tracking-[-0.02em] leading-tight">Library</h1>
          <span className="font-sans text-[14px] text-[#9A9080] mt-[4px]">{songs.length} songs</span>
        </div>

        <div className="flex flex-row gap-3 items-center">
          <div className="relative flex items-center group">
            <Search size={15} className="absolute left-[12px] text-[#5A5248] group-focus-within:text-[#E8630A] transition-colors" />
            <input 
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-[38px] w-[240px] bg-[#141414] border border-[rgba(255,255,255,0.08)] rounded-[19px] pl-[36px] pr-[14px] text-[#F5F0EB] font-sans text-[13px] placeholder-[#5A5248] focus:outline-none focus:border-[#E8630A] transition-all duration-200"
            />
          </div>

          <div className="relative flex items-center h-[38px] bg-[#141414] border border-[rgba(255,255,255,0.08)] rounded-[10px] px-[14px] cursor-pointer hover:border-[rgba(255,255,255,0.15)] transition-colors group">
            <span className="font-sans text-[13px] text-[#9A9080] capitalize pr-5">{sortBy}</span>
            <ChevronDown size={14} className="absolute right-[14px] text-[#9A9080] group-hover:text-[#F5F0EB] transition-colors" />
            <select 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="album">Album</option>
              <option value="duration">Duration</option>
            </select>
          </div>
        </div>
      </div>

      {/* EMPTY STATE */}
      {!isScanning && songs.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 h-full py-20 mt-10">
          <div className="w-[64px] h-[64px] bg-[#141414] border border-[rgba(255,255,255,0.08)] rounded-[16px] flex items-center justify-center p-[18px]">
            <Music2 size={28} className="text-[#E8630A]" />
          </div>
          <h2 className="font-display text-[24px] font-bold text-[#F5F0EB] mt-5">No songs yet</h2>
          <p className="font-sans text-[14px] text-[#9A9080] mt-2 text-center max-w-[300px]">Add a music folder from the Home page to import your library</p>
        </div>
      )}

      {/* MAIN LIST */}
      {(songs.length > 0 || isScanning) && (
        <div className="flex flex-col">
          {/* COLUMN HEADERS */}
          <div className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] gap-4 mb-1 px-[16px] shrink-0">
            <div className="w-[40px] text-center font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5A5248]">#</div>
            
            {['title', 'artist', 'album'].map(field => (
              <div 
                key={field}
                onClick={() => {
                  if (sortBy === field) setSortAsc(!sortAsc);
                  else { setSortBy(field as any); setSortAsc(true); }
                }}
                className={`font-sans text-[11px] font-semibold uppercase tracking-[0.08em] cursor-pointer transition-colors duration-150 flex items-center gap-1 ${sortBy === field ? 'text-[#E8630A]' : 'text-[#5A5248] hover:text-[#9A9080]'}`}
              >
                {field}
                {sortBy === field && (sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              </div>
            ))}

            <div 
              onClick={() => {
                if (sortBy === 'duration') setSortAsc(!sortAsc);
                else { setSortBy('duration'); setSortAsc(true); }
              }}
              className={`text-right font-sans text-[11px] font-semibold uppercase tracking-[0.08em] cursor-pointer transition-colors duration-150 flex items-center justify-end gap-1 ${sortBy === 'duration' ? 'text-[#E8630A]' : 'text-[#5A5248] hover:text-[#9A9080]'}`}
            >
              {sortBy === 'duration' && (sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
              DURATION
            </div>
          </div>

          {/* LOADING/SCANNING SKELETONS */}
          {isScanning && songs.length === 0 && (
            <div className="flex flex-col mt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] gap-4 h-[52px] px-[16px] items-center">
                  <div className="w-[16px] h-[16px] rounded-full mx-auto" style={{ background: 'linear-gradient(90deg, #1C1C1C 25%, #242424 50%, #1C1C1C 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                  <div className="flex flex-row gap-3 items-center">
                    <div className="w-[36px] h-[36px] rounded-lg shrink-0" style={{ background: 'linear-gradient(90deg, #1C1C1C 25%, #242424 50%, #1C1C1C 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="w-[60%] h-[12px] rounded" style={{ background: 'linear-gradient(90deg, #1C1C1C 25%, #242424 50%, #1C1C1C 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                    </div>
                  </div>
                  <div className="w-[40%] h-[12px] rounded" style={{ background: 'linear-gradient(90deg, #1C1C1C 25%, #242424 50%, #1C1C1C 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                  <div className="w-[50%] h-[12px] rounded" style={{ background: 'linear-gradient(90deg, #1C1C1C 25%, #242424 50%, #1C1C1C 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                  <div className="w-[30px] h-[12px] rounded ml-auto" style={{ background: 'linear-gradient(90deg, #1C1C1C 25%, #242424 50%, #1C1C1C 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                </div>
              ))}
            </div>
          )}

          {/* SONG ROWS */}
          {!isScanning && sorted.length > 0 && (
            <div className="flex flex-col pb-[120px]">
              {sorted.map((song, index) => {
                const isCurrentSong = song.id === currentSong?.id;

                return (
                  <div 
                    key={song.id}
                    onDoubleClick={() => handleDoubleClick(song)}
                    onContextMenu={(e) => handleContextMenu(e, song)}
                    className={`group grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] gap-4 h-[52px] px-[16px] rounded-[10px] items-center cursor-pointer transition-colors duration-150 border-l-[2px] ${isCurrentSong ? 'bg-[rgba(232,99,10,0.08)] border-[#E8630A]' : 'bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.04)]'}`}
                    style={{
                      animation: `slide-up 200ms ease forwards`,
                      animationDelay: `${Math.min(index, 20) * 25}ms`,
                      opacity: 0,
                      transform: 'translateY(8px)'
                    }}
                  >
                    {/* COLUMN 1 */}
                    <div className="w-[40px] text-center flex items-center justify-center">
                      {isCurrentSong ? (
                        <div className="flex items-end justify-center gap-[2px] h-[14px]">
                          {[1,2,3].map(i => (
                            <div key={i} className="w-[3px] bg-[#E8630A] rounded-t-sm" style={{ height: isPlaying ? '100%' : '40%', animation: isPlaying ? `eq ${0.5 + i*0.2}s ease-in-out infinite alternate` : 'none' }} />
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className="font-mono text-[12px] text-[#5A5248] group-hover:hidden">{index + 1}</span>
                          <span 
                            onClick={(e) => { e.stopPropagation(); playerStore.playSongFromLibrary(song, sorted); }}
                            className="hidden group-hover:block cursor-pointer"
                          >
                            <Play size={16} className="text-[#9A9080] hover:text-[#F5F0EB] transition-colors" />
                          </span>
                        </>
                      )}
                    </div>

                    {/* COLUMN 2 */}
                    <div className="flex flex-row gap-3 items-center min-w-0 pr-2">
                      <div className="w-[36px] h-[36px] rounded-lg shrink-0 overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[#141414]">
                        {song.albumArtPath ? (
                          <img src={convertFileSrc(song.albumArtPath)} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1C1C1C] to-[#242424]"><Music2 size={16} className="text-[#5A5248]" /></div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-sans text-[14px] truncate ${isCurrentSong ? 'text-[#E8630A] font-semibold' : 'text-[#F5F0EB] font-medium'}`}>
                          {song.title || song.fileName.replace(/\.[^/.]+$/, '')}
                        </span>
                        <span className="shrink-0 font-sans text-[10px] text-[#5A5248] bg-[rgba(255,255,255,0.06)] rounded-[4px] px-[5px] py-[1px] uppercase tracking-wider hidden sm:block">
                          {song.fileName.split('.').pop() || 'UNK'}
                        </span>
                      </div>
                    </div>

                    {/* COLUMN 3 */}
                    <div className="font-sans text-[13px] text-[#9A9080] group-hover:text-[#F5F0EB] transition-colors duration-150 truncate pr-2">
                      {song.artist || 'Unknown Artist'}
                    </div>

                    {/* COLUMN 4 */}
                    <div className="font-sans text-[13px] text-[#5A5248] truncate pr-2">
                      {song.album || 'Unknown Album'}
                    </div>

                    {/* COLUMN 5 */}
                    <div className="flex items-center justify-end gap-3 text-right">
                      <div className={`transition-all duration-150 w-[24px] h-[24px] flex items-center justify-center ${song.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <AnimatedHeart 
                          isLiked={!!song.isFavorite} 
                          onClick={() => toggleFavorite(song.id)}
                          size={14}
                        />
                      </div>
                      <span className="font-mono text-[12px] text-[#5A5248] w-[40px]">
                        {formatTime(song.duration)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu && createPortal(
        <div 
          key={`${contextMenu.x}-${contextMenu.y}`}
          className="fixed bg-[#1C1C1C]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.15)] rounded-[12px] p-[6px] shadow-[0_24px_54px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[180px] z-[9999] animate-scale-in origin-top-left"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 360), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
        >
          <button onClick={() => { playerStore.playSongFromLibrary(contextMenu.song, sorted); setContextMenu(null); }} className="w-full h-[36px] px-[12px] rounded-[8px] flex flex-row items-center gap-2 font-sans text-[13px] text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-100">
            <Play size={15} className="text-[#9A9080]" /> Play Now
          </button>
          <button onClick={() => { playerStore.playSongNext(contextMenu.song); setContextMenu(null); }} className="w-full h-[36px] px-[12px] rounded-[8px] flex flex-row items-center gap-2 font-sans text-[13px] text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-100">
            <ListPlus size={15} className="text-[#9A9080]" /> Play Next
          </button>
          <button onClick={() => { playerStore.addToQueue(contextMenu.song); setContextMenu(null); }} className="w-full h-[36px] px-[12px] rounded-[8px] flex flex-row items-center gap-2 font-sans text-[13px] text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-100">
            <Plus size={15} className="text-[#9A9080]" /> Add to Queue
          </button>
          
          <div className="h-[1px] w-full bg-[rgba(255,255,255,0.06)] my-[4px]" />
          
          <button onClick={() => { setSongForPlaylist(contextMenu.song); setIsPlaylistModalOpen(true); setContextMenu(null); }} className="w-full h-[36px] px-[12px] rounded-[8px] flex flex-row items-center gap-2 font-sans text-[13px] text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-100">
            <ListPlus size={15} className="text-[#9A9080]" /> Add to Playlist
          </button>
          <button onClick={() => { setEditSong(contextMenu.song); setIsEditModalOpen(true); setContextMenu(null); }} className="w-full h-[36px] px-[12px] rounded-[8px] flex flex-row items-center gap-2 font-sans text-[13px] text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-100">
            <Pencil size={15} className="text-[#9A9080]" /> Edit Info
          </button>
          
          <div className="h-[1px] w-full bg-[rgba(255,255,255,0.06)] my-[4px]" />

          <button onClick={() => { toggleFavorite(contextMenu.song.id); setContextMenu(null); }} className="w-full h-[36px] px-[12px] rounded-[8px] flex flex-row items-center gap-2 font-sans text-[13px] text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-100">
            <Heart size={15} className={contextMenu.song.isFavorite ? 'text-[#E8630A] fill-[#E8630A]' : 'text-[#9A9080]'} /> Toggle Favorite
          </button>

          <div className="h-[1px] w-full bg-[rgba(255,255,255,0.06)] my-[4px]" />

          <button onClick={() => { setSongToDelete(contextMenu.song); setIsDeleteModalOpen(true); setContextMenu(null); }} className="w-full h-[36px] px-[12px] rounded-[8px] flex flex-row items-center gap-2 font-sans text-[13px] text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ef4444] transition-colors duration-100">
            <Trash2 size={15} className="text-inherit" /> Delete from App & Disk
          </button>
        </div>,
        document.body
      )}

      {/* MODALS */}
      <EditSongModal 
        isOpen={isEditModalOpen} 
        onClose={() => { setIsEditModalOpen(false); setEditSong(null); }} 
        song={editSong} 
      />
      <AddToPlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => { setIsPlaylistModalOpen(false); setSongForPlaylist(null); }}
        song={songForPlaylist}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSongToDelete(null); }}
        onConfirm={() => songToDelete && handleRemoveFromAppAndDisk(songToDelete)}
        songTitle={songToDelete?.title || songToDelete?.fileName || 'Unknown Song'}
      />
    </div>
  );
}
