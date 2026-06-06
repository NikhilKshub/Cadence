import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import { Heart, Play, Music2 } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import AnimatedHeart from '../components/common/AnimatedHeart';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LikedSongs() {
  const getLikedSongs = useLibraryStore((state) => state.getLikedSongs);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const playerStore = usePlayerStore();
  const { currentSong, isPlaying } = usePlayer();
  const likedSongs = getLikedSongs();

  return (
    <div className="flex flex-col h-full bg-[#0D0D0D]">
      <div className="flex-none px-[40px] pt-[60px] pb-[40px] border-b border-[rgba(255,255,255,0.06)] flex items-end gap-6 bg-gradient-to-b from-[rgba(232,99,10,0.15)] to-transparent">
        <div className="w-[180px] h-[180px] rounded-[16px] bg-gradient-to-br from-[#E8630A] to-[#FF8C42] flex items-center justify-center shadow-[0_16px_40px_rgba(232,99,10,0.3)] shrink-0">
          <Heart size={80} className="text-white fill-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-sans text-[12px] font-bold tracking-[0.15em] uppercase text-[#F5F0EB] mb-2 opacity-80">
            System Collection
          </span>
          <h1 className="font-display text-[64px] font-extrabold tracking-tight text-[#F5F0EB] leading-none mb-4">
            Liked Songs
          </h1>
          <p className="font-sans text-[15px] font-medium text-[#9A9080]">
            {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[40px] py-[24px]">
        {likedSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20">
            <AnimatedHeart isLiked={false} onClick={() => {}} size={64} className="mb-6 opacity-50" />
            <h2 className="font-display text-[24px] font-bold text-[#F5F0EB] mb-2">
              No liked songs yet
            </h2>
            <p className="font-sans text-[15px] text-[#9A9080]">
              Tap the heart on any song to save it here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] gap-4 mb-1 px-[16px] shrink-0">
              <div className="w-[40px] text-center font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5A5248]">#</div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5A5248]">TITLE</div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5A5248]">ARTIST</div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5A5248]">ALBUM</div>
              <div className="text-right font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5A5248]">DURATION</div>
            </div>
            
            <div className="flex flex-col pb-[120px]">
              {likedSongs.map((song, index) => {
                const isCurrentSong = song.id === currentSong?.id;

                return (
                  <div 
                    key={song.id}
                    onDoubleClick={() => playerStore.playSongFromLibrary(song, likedSongs)}
                    className={`group grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] gap-4 h-[52px] px-[16px] rounded-[10px] items-center cursor-pointer transition-colors duration-150 border-l-[2px] ${isCurrentSong ? 'bg-[rgba(232,99,10,0.08)] border-[#E8630A]' : 'bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.04)]'}`}
                  >
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
                            onClick={(e) => { e.stopPropagation(); playerStore.playSongFromLibrary(song, likedSongs); }}
                            className="hidden group-hover:block cursor-pointer"
                          >
                            <Play size={16} className="text-[#9A9080] hover:text-[#F5F0EB] transition-colors" />
                          </span>
                        </>
                      )}
                    </div>

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
                      </div>
                    </div>

                    <div className="font-sans text-[13px] text-[#9A9080] group-hover:text-[#F5F0EB] transition-colors duration-150 truncate pr-2">
                      {song.artist || 'Unknown Artist'}
                    </div>

                    <div className="font-sans text-[13px] text-[#5A5248] truncate pr-2">
                      {song.album || 'Unknown Album'}
                    </div>

                    <div className="flex items-center justify-end gap-3 text-right">
                      <div className="w-[24px] h-[24px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
          </div>
        )}
      </div>
    </div>
  );
}
