import React, { useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ExternalLink } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { usePlayerStore } from '../../store/playerStore';
import { useUiStore } from '../../store/uiStore';
import { useLibraryStore } from '../../store/libraryStore';
import { audioEngine } from '../../utils/audioEngine';
import { convertFileSrc } from '@tauri-apps/api/core';
import AnimatedHeart from '../common/AnimatedHeart';

export default function MiniPlayer() {
  const player = usePlayer();
  const { currentSong, isPlaying, progressPercent } = player;
  const { toggleFavorite } = useLibraryStore();
  const progressRef = useRef<HTMLDivElement>(null);

  const artSrc = currentSong?.albumArtPath 
    ? convertFileSrc(currentSong.albumArtPath) 
    : null;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || player.duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    player.seekTo(percent * player.duration);
  };

  const formatTimeStr = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timeRemaining = Math.max(0, player.duration - player.currentTime);

  return (
    <div 
      className="w-screen h-screen bg-transparent p-0 m-0 overflow-hidden"
      data-tauri-drag-region
    >
      <style>{`
        html, body, #root {
          background-color: transparent !important;
        }
      `}</style>
      
      {/* INNER VISIBLE MINI-PLAYER CARD */}
      <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#0A0A0A] select-none rounded-[32px]" data-tauri-drag-region>
        
        {/* BACKGROUND ART */}
        <div className="absolute inset-0 z-[0] pointer-events-none" data-tauri-drag-region>
          {artSrc ? (
            <img 
              src={artSrc} 
              className="absolute inset-0 w-full h-full object-cover opacity-90" 
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#1C1C1C] to-[#0A0A0A]" />
          )}
          
          {/* Gradients to ensure text readability */}
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="relative z-[1] flex flex-col w-full h-full justify-between p-5" data-tauri-drag-region>
        
        {/* TOP ROW: Artist Info & Actions */}
        <div className="flex flex-row items-center justify-between w-full" data-tauri-drag-region>
          
          {/* Artist Info */}
          <div className="flex flex-row items-center gap-3 min-w-0" data-tauri-drag-region>
            <div className="w-10 h-10 rounded-full bg-black/40 overflow-hidden shrink-0 border border-white/10 shadow-sm pointer-events-none">
              {artSrc ? (
                <img src={artSrc} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10" />
              )}
            </div>
            
            <div className="flex flex-col min-w-0 pointer-events-none" data-tauri-drag-region>
              <span className="text-[15px] font-bold text-white truncate drop-shadow-md tracking-tight leading-tight">
                {currentSong?.artist || 'Unknown Artist'}
              </span>
              <span className="text-[12px] font-medium text-white/60 truncate drop-shadow-md leading-tight mt-[2px]">
                {currentSong?.title || 'Not playing'}
              </span>
            </div>
          </div>

          {/* Top Right Actions */}
          <div className="flex flex-row items-center gap-2 shrink-0 ml-4">
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => useUiStore.getState().toggleMiniPlayer()}
              className="w-[44px] h-[44px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all backdrop-blur-xl border-[1.5px] border-white/20 active:scale-95"
            >
              <ExternalLink size={16} className="text-white" />
            </button>
            <div className="w-[44px] h-[44px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all backdrop-blur-xl border-[1.5px] border-white/20">
              <AnimatedHeart 
                isLiked={!!currentSong?.isFavorite} 
                onClick={() => currentSong && toggleFavorite(currentSong.id)}
                size={16}
                className="w-full h-full text-white fill-white"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM AREA: Progress & Controls */}
        <div className="flex flex-col w-full gap-5 mt-auto">
          
          {/* Progress Section */}
          <div className="flex flex-col gap-2 px-1">
            {/* Timestamps */}
            <div className="flex flex-row items-center justify-between pointer-events-none">
              <span className="text-[12px] font-medium text-white drop-shadow-md">
                {formatTimeStr(player.currentTime)}
              </span>
              <span className="text-[12px] font-medium text-white drop-shadow-md">
                - {formatTimeStr(timeRemaining)}
              </span>
            </div>

            {/* Progress Bar */}
            <div 
              ref={progressRef}
              onClick={handleProgressClick}
              className="w-full h-[4px] bg-white/30 rounded-full cursor-pointer overflow-hidden backdrop-blur-sm shadow-sm"
            >
              <div 
                className="h-full bg-white rounded-full transition-all duration-150 ease-out" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex flex-row items-center justify-center gap-6 pb-2">
            <button 
              onMouseDown={e => e.preventDefault()}
              onClick={() => usePlayerStore.getState().previous()}
              className="w-[52px] h-[52px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all backdrop-blur-xl border-[1.5px] border-white/20 active:scale-95 shadow-lg"
            >
              <SkipBack size={22} className="fill-white text-white" />
            </button>

            <button 
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                if (!currentSong) return;
                if (isPlaying) audioEngine.pause();
                else audioEngine.play();
              }}
              className="w-[72px] h-[72px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all backdrop-blur-xl border-[1.5px] border-white/20 active:scale-95 shadow-lg"
            >
              {isPlaying ? (
                <Pause size={28} className="fill-white text-white" />
              ) : (
                <Play size={28} className="fill-white text-white ml-1" />
              )}
            </button>

            <button 
              onMouseDown={e => e.preventDefault()}
              onClick={() => usePlayerStore.getState().next()}
              className="w-[52px] h-[52px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all backdrop-blur-xl border-[1.5px] border-white/20 active:scale-95 shadow-lg"
            >
              <SkipForward size={22} className="fill-white text-white" />
            </button>
          </div>

        </div>

      </div>
      </div>
    </div>
  );
}
