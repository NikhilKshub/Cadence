import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Music, ListMusic, ArrowLeft, Play, Heart, Trash2 } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import type { Song } from '../types/song';
import { convertFileSrc } from '@tauri-apps/api/core';
import { formatTime } from '../utils/formatters';

const GRADIENTS = [
  'from-[#1a1a2e] to-[#16213e]',
  'from-[#0f3460] to-[#533483]',
  'from-[#1a1a2e] to-[#2d1b69]'
];

export default function Playlists() {
  const playlists = useLibraryStore((state) => state.playlists);
  const songs = useLibraryStore((state) => state.songs);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);
  const deletePlaylist = useLibraryStore((state) => state.deletePlaylist);
  const removeSongFromPlaylist = useLibraryStore((state) => state.removeSongFromPlaylist);

  const playerStore = usePlayerStore();
  const player = usePlayer();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    playlistId: string | null;
    songId: string | null;
  }>({ visible: false, x: 0, y: 0, playlistId: null, songId: null });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    }
    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.visible]);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
    setIsModalOpen(false);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
  };

  const handleCardClick = (id: string) => {
    setActivePlaylistId(id);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'playlist' | 'song' = 'playlist') => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      playlistId: type === 'playlist' ? id : activePlaylistId,
      songId: type === 'song' ? id : null,
    });
  };

  const handleDeletePlaylist = () => {
    if (contextMenu.playlistId) {
      deletePlaylist(contextMenu.playlistId);
      if (activePlaylistId === contextMenu.playlistId) {
        setActivePlaylistId(null);
      }
    }
    setContextMenu({ visible: false, x: 0, y: 0, playlistId: null, songId: null });
  };

  const handleRemoveSong = () => {
    if (contextMenu.playlistId && contextMenu.songId) {
      removeSongFromPlaylist(contextMenu.playlistId, contextMenu.songId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, playlistId: null, songId: null });
  };

  const activePlaylist = activePlaylistId ? playlists.find(p => p.id === activePlaylistId) : null;
  const activeSongs = activePlaylist ? activePlaylist.songIds.map(id => songs.find(s => s.id === id)).filter((s): s is Song => s !== undefined) : [];

  return (
    <div className="flex h-full w-full flex-col bg-[#0c0c0c] p-8 pb-32 overflow-y-auto custom-scrollbar relative select-none">
      
      {/* Top Header Section */}
      {!activePlaylist && (
        <div className="flex w-full items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-bold text-white tracking-tight">Playlists</h1>
            <span className="text-sm text-[#6b6b6b]">{playlists.length} playlists</span>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#6d28d9]"
          >
            <Plus size={18} />
            New Playlist
          </button>
        </div>
      )}

      {/* Content */}
      {activePlaylist ? (
        <div className="flex flex-col w-full h-full animate-fade-in">
          <div className="flex items-start gap-6 mb-10">
            <button 
              onClick={() => setActivePlaylistId(null)}
              className="mt-1 p-2 rounded-full bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="h-48 w-48 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#2d1b69] shadow-2xl flex items-center justify-center">
              {activePlaylist.coverArtPath ? (
                <img src={convertFileSrc(activePlaylist.coverArtPath)} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music size={64} className="text-white opacity-80" />
              )}
            </div>
            <div className="flex flex-col justify-end h-48 pb-2">
              <span className="text-sm font-medium text-white uppercase tracking-wider mb-2">Playlist</span>
              <h1 className="text-5xl font-bold text-white tracking-tight mb-4">{activePlaylist.name}</h1>
              {activePlaylist.description && (
                <p className="text-sm text-[#a3a3a3] mb-4 max-w-2xl">{activePlaylist.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-[#a3a3a3]">
                <span>{activePlaylist.songCount} songs</span>
                <span className="h-1 w-1 rounded-full bg-[#3a3a3a]"></span>
                <span>{formatTime(activePlaylist.totalDuration)}</span>
              </div>
              
              <div className="mt-6 flex items-center gap-4">
                <button 
                  onClick={() => {
                    if (activeSongs.length > 0) playerStore.playSongFromLibrary(activeSongs[0]!, activeSongs);
                  }}
                  disabled={activeSongs.length === 0}
                  className="flex items-center justify-center h-12 w-12 rounded-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Play size={22} className="ml-1" fill="currentColor" />
                </button>
              </div>
            </div>
          </div>

          {activeSongs.length > 0 ? (
            <div className="flex flex-col w-full">
              <div className="flex w-full items-center border-b border-[#1f1f1f] pb-2 mb-2 px-4 text-xs uppercase text-[#6b6b6b] tracking-wider font-medium select-none">
                <div className="w-12 shrink-0 text-center">#</div>
                <div className="flex-1">Title</div>
                <div className="flex-1">Artist</div>
                <div className="w-24 shrink-0 text-right">Duration</div>
                <div className="w-10 shrink-0"></div>
              </div>
              
              {activeSongs.map((song, index) => {
                const isPlaying = player.currentSong?.id === song.id;
                return (
                  <div
                    key={`${song.id}-${index}`}
                    onDoubleClick={() => playerStore.playSongFromLibrary(song, activeSongs)}
                    onContextMenu={(e) => handleContextMenu(e, song.id, 'song')}
                    className={`group flex w-full items-center rounded-lg px-4 py-2 transition-all duration-150 cursor-default select-none
                      ${isPlaying ? 'bg-[#1a1a2e] border-l-2 border-[#7c3aed]' : 'hover:bg-[#161616] border-l-2 border-transparent'}
                    `}
                  >
                    <div className="flex w-12 shrink-0 items-center justify-center text-sm text-[#6b6b6b]">
                      {isPlaying ? (
                        <div className="flex items-end gap-1 h-4 w-4">
                          <div className="h-full w-1 bg-[#7c3aed] animate-pulse" />
                          <div className="h-2/3 w-1 bg-[#7c3aed] animate-pulse" style={{ animationDelay: '100ms' }} />
                          <div className="h-1/2 w-1 bg-[#7c3aed] animate-pulse" style={{ animationDelay: '200ms' }} />
                        </div>
                      ) : (
                        <>
                          <span className="group-hover:hidden">{index + 1}</span>
                          <Play size={14} className="hidden group-hover:block fill-current text-white cursor-pointer" onClick={() => playerStore.playSongFromLibrary(song, activeSongs)} />
                        </>
                      )}
                    </div>

                    <div className="flex flex-1 items-center gap-4 min-w-0 pr-4">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]">
                        {song.albumArtPath && <img key={`${song.id}-${song.albumArtPath}`} src={convertFileSrc(song.albumArtPath)} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                      </div>
                      <span className={`truncate text-sm font-medium ${isPlaying ? 'text-[#a78bfa]' : 'text-white'}`}>
                        {song.title?.trim() || song.fileName.replace(/\.[^/.]+$/, '')}
                      </span>
                    </div>

                    <div className="flex-1 truncate text-[13px] text-[#a3a3a3] pr-4">{song.artist || 'Unknown Artist'}</div>
                    <div className="w-24 shrink-0 text-right text-[13px] text-[#6b6b6b] tabular-nums">{formatTime(song.duration)}</div>
                    
                    <div className="flex w-10 shrink-0 items-center justify-end">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }}
                        className={`transition-colors duration-150 hover:text-white ${song.isFavorite ? 'opacity-100 text-[#7c3aed]' : 'opacity-0 text-[#6b6b6b] group-hover:opacity-100'}`}
                      >
                        <Heart size={16} className={song.isFavorite ? 'fill-[#7c3aed]' : ''} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center mt-20">
               <Music size={48} className="text-[#2a2a2a] mb-4" />
               <p className="text-[#a3a3a3]">This playlist is empty.</p>
               <p className="text-sm text-[#6b6b6b] mt-1">Right click any song in your library to add it here.</p>
             </div>
          )}
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center mt-20">
          <ListMusic size={64} className="text-[#2a2a2a] mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">No playlists yet</h2>
          <p className="text-sm text-[#6b6b6b] mb-6">Create your first playlist to get started</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-full bg-[#7c3aed] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#6d28d9] hover:scale-105"
          >
            <Plus size={18} />
            New Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {playlists.map((playlist, index) => {
            const gradient = GRADIENTS[index % GRADIENTS.length];
            return (
              <div 
                key={playlist.id}
                onClick={() => handleCardClick(playlist.id)}
                onContextMenu={(e) => handleContextMenu(e, playlist.id, 'playlist')}
                className="group flex flex-col gap-3 rounded-xl p-3 hover:bg-[#1a1a1a] transition-all duration-150 cursor-pointer border border-transparent hover:border-white/10 hover:scale-[1.02]"
              >
                <div className={`flex h-[160px] w-full items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg overflow-hidden`}>
                  {playlist.coverArtPath ? (
                    <img src={playlist.coverArtPath} alt={playlist.name} className="h-full w-full object-cover" />
                  ) : (
                    <Music size={32} className="text-white opacity-80" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="truncate text-[14px] font-bold text-white">{playlist.name}</span>
                  <div className="flex items-center gap-2 text-[12px] text-[#6b6b6b] mt-1">
                    <span>{playlist.songCount} songs</span>
                    <span className="h-1 w-1 rounded-full bg-[#3a3a3a]"></span>
                    <span>{formatTime(playlist.totalDuration)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Playlist Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div 
            className="flex w-[400px] flex-col rounded-2xl bg-[#161616] p-6 shadow-2xl border border-[#2a2a2a]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-6">New Playlist</h2>
            <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#a3a3a3]">Name</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="My awesome playlist"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1f1f1f] px-4 py-2.5 text-sm text-white focus:border-[#7c3aed] focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#a3a3a3]">Description (optional)</label>
                <textarea 
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="What's the vibe?"
                  rows={3}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1f1f1f] px-4 py-2.5 text-sm text-white focus:border-[#7c3aed] focus:outline-none transition-colors resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white border border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu.visible && createPortal(
        <div 
          key={`${contextMenu.x}-${contextMenu.y}`}
          ref={contextMenuRef}
          className="fixed bg-[#1C1C1C]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.15)] rounded-[12px] p-[6px] shadow-[0_24px_54px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] min-w-[160px] z-[9999] animate-scale-in origin-top-left"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 100), left: Math.min(contextMenu.x, window.innerWidth - 160) }}
        >
          {contextMenu.songId ? (
            <button onClick={handleRemoveSong} className="w-full h-[36px] px-[12px] rounded-[8px] flex flex-row items-center gap-2 font-sans text-[13px] text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ef4444] transition-colors duration-100">
              <Trash2 size={15} /> Remove from Playlist
            </button>
          ) : (
            <button onClick={handleDeletePlaylist} className="w-full h-[36px] px-[12px] rounded-[8px] flex flex-row items-center gap-2 font-sans text-[13px] text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ef4444] transition-colors duration-100">
              <Trash2 size={15} /> Delete Playlist
            </button>
          )}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
