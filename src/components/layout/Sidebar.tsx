import { useState } from 'react';
import { House, Music2, Disc3, Mic2, ListMusic, Radio, Moon, Settings2, Play, Pause } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { usePlayer } from '../../hooks/usePlayer';
import { useLibraryStore } from '../../store/libraryStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import SleepTimerModal from '../common/SleepTimerModal';

const NAV_ITEMS = [
  { label: 'Home', page: 'home', icon: House },
  { label: 'Library', page: 'library', icon: Music2 },
  { label: 'Albums', page: 'albums', icon: Disc3 },
  { label: 'Artists', page: 'artists', icon: Mic2 },
  { label: 'Playlists', page: 'playlists', icon: ListMusic },
];

export default function Sidebar() {
  const currentPage = useUiStore((state) => state.currentPage);
  const navigate = useUiStore((state) => state.navigate);
  const { currentSong, isPlaying, progressPercent, play, pause } = usePlayer();
  const playlists = useLibraryStore((state) => state.playlists);
  const [sleepTimerOpen, setSleepTimerOpen] = useState(false);

  const playlistColors = ['#E8630A', '#4ADE80', '#60A5FA'];

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col bg-[#0D0D0D] border-r border-[rgba(255,255,255,0.06)]">
      {/* SECTION 1 — App Brand */}
      <div className="p-[20px] pb-2">
        <div className="brand-shine group flex flex-row items-center gap-2 select-none cursor-pointer rounded-lg p-2 -ml-2 transition-all duration-300 hover:bg-white/[0.03] hover:shadow-[0_0_12px_rgba(232,99,10,0.1)]">
          <div className="flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Cadence Logo" className="w-[28px] h-[28px] object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_2px_rgba(232,99,10,0.4)] group-hover:drop-shadow-[0_0_8px_rgba(232,99,10,0.8)]" />
          </div>
          <span className="font-display text-[18px] font-bold text-[#F5F0EB]/90 tracking-[-0.02em] transition-colors duration-300 group-hover:text-white">
            Cadence
          </span>
        </div>
        <div className="h-[1px] bg-[rgba(255,255,255,0.06)] mt-3" />
      </div>

      {/* SECTION 2 — Main Navigation */}
      <div className="px-[12px] pb-[12px] flex flex-col flex-1 overflow-y-auto">
        <span className="font-sans text-[10px] font-semibold tracking-[0.1em] uppercase text-[#5A5248] mb-[8px] pl-[12px]">
          MENU
        </span>

        <nav className="flex flex-col">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;

            return (
              <button
                key={item.page}
                onClick={() => navigate(item.page)}
                className={`h-[40px] px-[12px] rounded-[10px] flex items-center gap-3 transition-all duration-150 ease-in-out mb-[2px] group ${
                  isActive
                    ? 'bg-[rgba(232,99,10,0.10)] text-[#F5F0EB] font-semibold border-l-2 border-[#E8630A] pl-[10px] shadow-[inset_0_0_0_1px_rgba(232,99,10,0.2)]'
                    : 'bg-transparent text-[#9A9080] font-medium hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F0EB]'
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-[#E8630A]' : 'text-[#5A5248] group-hover:text-[#9A9080]'}
                />
                <span className="font-sans text-[14px]">{item.label}</span>
              </button>
            );
          })}

          {currentSong && (
            <button
              onClick={() => navigate('nowplaying')}
              className={`h-[40px] px-[12px] rounded-[10px] flex items-center gap-3 transition-all duration-150 ease-in-out mb-[2px] group ${
                currentPage === 'nowplaying'
                  ? 'bg-[rgba(232,99,10,0.10)] text-[#F5F0EB] font-semibold border-l-2 border-[#E8630A] pl-[10px] shadow-[inset_0_0_0_1px_rgba(232,99,10,0.2)]'
                  : 'bg-transparent text-[#9A9080] font-medium hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F0EB]'
              }`}
            >
              <Radio
                size={18}
                className={currentPage === 'nowplaying' ? 'text-[#E8630A]' : 'text-[#5A5248] group-hover:text-[#9A9080]'}
              />
              <span className="font-sans text-[14px]">Now Playing</span>
            </button>
          )}
        </nav>

        {/* SECTION 3 — Playlists quick access */}
        {playlists.length > 0 && (
          <div className="mt-6 flex flex-col">
            <span className="font-sans text-[10px] font-semibold tracking-[0.1em] uppercase text-[#5A5248] mb-[8px] pl-[12px]">
              PLAYLISTS
            </span>
            <div className="flex flex-col">
              {playlists.slice(0, 3).map((playlist, index) => (
                <button
                  key={playlist.id}
                  onClick={() => navigate('playlists')}
                  className="h-[36px] px-[12px] rounded-[8px] flex items-center gap-2 text-[#9A9080] hover:text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  <div 
                    className="w-[8px] h-[8px] rounded-full shrink-0" 
                    style={{ backgroundColor: playlistColors[index % playlistColors.length] }} 
                  />
                  <span className="font-sans text-[13px] truncate">{playlist.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4 — Bottom area */}
      <div className="mt-auto flex flex-col shrink-0">
        <div className="h-[1px] bg-[rgba(255,255,255,0.06)] mx-[12px] mb-2" />

        <div className="px-[12px] pb-[12px] flex flex-col gap-1">
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => setSleepTimerOpen(true)}
            className="h-[36px] px-[12px] rounded-[8px] flex items-center gap-3 text-[#9A9080] hover:text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.04)] transition-all group"
          >
            <Moon size={16} className="text-[#5A5248] group-hover:text-[#E8630A]" />
            <span className="font-sans text-[13px]">Sleep Timer</span>
          </button>

          <button
            onClick={() => navigate('settings')}
            className="h-[36px] px-[12px] rounded-[8px] flex items-center gap-3 text-[#9A9080] hover:text-[#F5F0EB] hover:bg-[rgba(255,255,255,0.04)] transition-all group"
          >
            <Settings2 size={16} className="text-[#5A5248] group-hover:text-[#E8630A]" />
            <span className="font-sans text-[13px]">Settings</span>
          </button>
        </div>

        {/* Now Playing mini card */}
        {currentSong && (
          <div 
            onClick={() => navigate('nowplaying')}
            className="mx-[12px] mb-[12px] p-[10px] bg-[#1C1C1C] border border-[rgba(255,255,255,0.10)] rounded-[12px] cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <div className="flex flex-row gap-3 items-center">
              <div className="w-[36px] h-[36px] rounded-lg shrink-0 overflow-hidden bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]">
                {currentSong.albumArtPath && (
                  <img src={convertFileSrc(currentSong.albumArtPath)} alt="Album Art" className="w-full h-full object-cover" />
                )}
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-sans text-[12px] font-semibold text-[#F5F0EB] truncate leading-tight">
                  {currentSong.title}
                </span>
                <span className="font-sans text-[11px] text-[#9A9080] truncate mt-0.5">
                  {currentSong.artist || 'Unknown Artist'}
                </span>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  isPlaying ? pause() : play();
                }}
                className="w-[24px] h-[24px] rounded-full bg-[#E8630A] hover:bg-[#FF8C42] flex items-center justify-center shrink-0 transition-colors"
              >
                {isPlaying ? <Pause size={10} color="white" fill="white" /> : <Play size={10} color="white" fill="white" className="ml-[2px]" />}
              </button>
            </div>

            <div className="h-[2px] bg-[rgba(255,255,255,0.10)] rounded-[1px] mt-3">
              <div 
                className="h-full bg-[#E8630A] rounded-[1px]" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
        )}
      </div>

      <SleepTimerModal
        isOpen={sleepTimerOpen}
        onClose={() => setSleepTimerOpen(false)}
      />
    </div>
  );
}
