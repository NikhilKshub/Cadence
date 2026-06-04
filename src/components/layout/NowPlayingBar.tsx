import React, { useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat,
  Repeat1, 
  Volume2, 
  VolumeX, 
  List, 
  PictureInPicture2,
  Heart,
  Music2 
} from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useLibraryStore } from '../../store/libraryStore';
import { useUiStore } from '../../store/uiStore';
import { audioEngine } from '../../utils/audioEngine';
import { convertFileSrc } from '@tauri-apps/api/core';
import { formatTime } from '../../utils/formatters';

const CustomNowPlayingIcon = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <path d="M7 14h3 M12 14h5 M7 18h5 M14 18h3" />
  </svg>
);

export default function NowPlayingBar() {
  const { 
    currentSong, isPlaying, currentTime,
    duration, volume, isMuted, shuffle, repeat,
    progressPercent, next, previous,
    seekTo, setVolume, toggleMute,
    toggleShuffle, cycleRepeat
  } = usePlayer();

  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const { toggleQueue, toggleMiniPlayer, navigate } = useUiStore();
  const progressBarRef = useRef<HTMLDivElement>(null);

  const artSrc = currentSong?.albumArtPath
    ? convertFileSrc(currentSong.albumArtPath)
    : null;

  const handlePlayPause = () => {
    if (!currentSong) return;
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentSong || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(percent * duration);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const hasSong = currentSong !== null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-[88px] w-full items-center overflow-hidden bg-[rgba(13,13,13,0.85)] backdrop-blur-[40px] border-t border-[rgba(255,255,255,0.08)] select-none">
      <div className="flex h-full w-full items-center p-0">
        {/* LEFT COLUMN */}
        <div className="flex w-[30%] min-w-[220px] items-center gap-3 pl-[20px]">
        {/* Album Art Container */}
        <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.10)] bg-gradient-to-br from-[#1C1C1C] to-[#2A2520]">
          {artSrc ? (
            <img src={artSrc} alt="Album Art" className="h-full w-full object-cover" />
          ) : (
            <Music2 size={20} color="#5A5248" />
          )}
        </div>
        
        {/* Song Info */}
        <div className="flex flex-col min-w-0 flex-1">
          {hasSong ? (
            <>
              <span className="truncate text-[14px] font-semibold text-[#F5F0EB] max-w-[160px] font-sans">
                {currentSong.title}
              </span>
              <span className="truncate text-[12px] text-[#9A9080] max-w-[160px] font-sans">
                {currentSong.artist || 'Unknown Artist'}
              </span>
            </>
          ) : (
            <span className="text-[14px] font-semibold text-[#5A5248] font-sans">
              Not playing
            </span>
          )}
        </div>
        
        {/* Heart Button */}
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => hasSong && toggleFavorite(currentSong.id)}
          className={`group flex h-[28px] w-[28px] items-center justify-center rounded-[6px] transition-colors duration-150 ${hasSong ? 'cursor-pointer' : 'opacity-40 pointer-events-none'}`}
        >
          <Heart 
            size={15} 
            className={`transition-colors duration-150 ${
              currentSong?.isFavorite 
                ? 'fill-[#E8630A] text-[#E8630A]' 
                : 'text-[#5A5248] group-hover:text-[#9A9080]'
            }`} 
          />
        </button>
      </div>

      {/* CENTER COLUMN */}
      <div className="flex flex-1 h-full flex-col items-center justify-center px-[24px]">
        {/* Controls row */}
        <div className={`flex items-center justify-center gap-5 mb-1.5 transition-opacity duration-300 ${hasSong ? 'opacity-100' : 'opacity-40'}`}>
          <button 
            onMouseDown={e => e.preventDefault()}
            onClick={toggleShuffle}
            disabled={!hasSong}
            className={`flex h-[28px] w-[28px] items-center justify-center rounded-lg transition-colors duration-150 ${
              shuffle ? 'bg-[rgba(232,99,10,0.12)] text-[#E8630A]' : 'text-[#5A5248] hover:text-[#9A9080]'
            }`}
          >
            <Shuffle size={16} />
          </button>
          
          <button 
            onMouseDown={e => e.preventDefault()}
            onClick={previous}
            disabled={!hasSong}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-lg text-[#9A9080] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F5F0EB]"
          >
            <SkipBack size={18} className="fill-current" />
          </button>
          
          <button 
            onMouseDown={e => e.preventDefault()}
            onClick={handlePlayPause}
            className={`flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#E8630A] transition-all duration-200 ${
              hasSong 
                ? 'hover:scale-105 hover:bg-[#FF8C42] hover:shadow-[0_0_24px_rgba(232,99,10,0.4)] active:scale-95 cursor-pointer' 
                : 'opacity-100 cursor-default'
            }`}
            style={{ opacity: 1 }}
          >
            {isPlaying ? (
              <Pause size={20} color="white" fill="white" />
            ) : (
              <Play size={20} color="white" fill="white" />
            )}
          </button>
          
          <button 
            onMouseDown={e => e.preventDefault()}
            onClick={next}
            disabled={!hasSong}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-lg text-[#9A9080] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F5F0EB]"
          >
            <SkipForward size={18} className="fill-current" />
          </button>
          
          <button 
            onMouseDown={e => e.preventDefault()}
            onClick={cycleRepeat}
            disabled={!hasSong}
            className={`flex h-[28px] w-[28px] items-center justify-center rounded-lg transition-colors duration-150 ${
              repeat !== 'none' ? 'bg-[rgba(232,99,10,0.12)] text-[#E8630A]' : 'text-[#5A5248] hover:text-[#9A9080]'
            }`}
          >
            {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Progress section */}
        <div className={`flex w-full max-w-[460px] items-center gap-3 transition-opacity duration-300 ${hasSong ? 'opacity-100' : 'opacity-40'}`}>
          <span className="w-[40px] text-right text-[11px] text-[#5A5248] font-mono">
            {hasSong ? formatTime(currentTime) : '0:00'}
          </span>
          
          <div 
            className={`group relative flex h-[20px] flex-1 items-center ${hasSong ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={hasSong ? handleProgressClick : undefined}
            ref={progressBarRef}
          >
            <div className="relative h-[4px] w-full rounded-full bg-[rgba(255,255,255,0.08)] transition-[height] duration-150 group-hover:h-[6px]">
              <div 
                className="absolute left-0 top-0 h-full rounded-full bg-[#E8630A] transition-all duration-150"
                style={{ width: hasSong ? `${progressPercent}%` : '0%' }}
              >
                {hasSong && (
                  <div className="absolute right-[-5px] top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full bg-[#F5F0EB] opacity-0 shadow-[0_0_8px_rgba(232,99,10,0.6)] transition-opacity duration-150 group-hover:opacity-100" />
                )}
              </div>
            </div>
          </div>
          
          <span className="w-[40px] text-left text-[11px] text-[#5A5248] font-mono">
            {hasSong ? formatTime(duration) : '0:00'}
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex w-[30%] items-center justify-end gap-2 pr-[20px]">
        {/* Volume control */}
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${hasSong ? 'opacity-100' : 'opacity-40'}`}>
          <button 
            onMouseDown={e => e.preventDefault()}
            onClick={toggleMute}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-lg text-[#5A5248] transition-colors duration-150 hover:text-[#9A9080]"
          >
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          <div className="group relative flex h-[36px] w-[72px] cursor-pointer items-center">
            <input 
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="absolute z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="relative h-[3px] w-full overflow-visible rounded-[2px] bg-[rgba(255,255,255,0.08)] transition-[height] duration-150 group-hover:h-[5px] pointer-events-none">
              <div 
                className="absolute left-0 top-0 h-full rounded-[2px] bg-[#E8630A]"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              >
                <div className="absolute right-[-5px] top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full bg-[#F5F0EB]" />
              </div>
            </div>
          </div>
        </div>

        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={() => navigate('nowplaying')}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#5A5248] transition-colors duration-150 hover:text-[#9A9080] ml-2"
        >
          <CustomNowPlayingIcon size={16} />
        </button>

        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={toggleQueue}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#5A5248] transition-colors duration-150 hover:text-[#9A9080]"
        >
          <List size={16} />
        </button>
        
        <button 
          onMouseDown={e => e.preventDefault()}
          onClick={toggleMiniPlayer}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#5A5248] transition-colors duration-150 hover:text-[#9A9080]"
        >
          <PictureInPicture2 size={16} />
        </button>
      </div>
      </div>
    </div>
  );
}
