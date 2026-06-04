import { useState, useEffect, useMemo } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import { Search, Play, Clock, Music2, FolderPlus, ChevronLeft, ChevronRight } from 'lucide-react';

interface Stats {
  today_minutes: number;
  week_minutes: number;
  total_songs_played: number;
  top_songs: Array<{ id: string; title: string; artist: string; albumArtPath: string | null; playCount: number }>;
  recent_songs: Array<{ id: string; title: string; artist: string; albumArtPath: string | null }>;
  daily_breakdown: Array<{ date: string; minutes: number; songs_played: number }>;
}

export default function Home() {
  const { songs, addMusicFolder, searchSongs } = useLibraryStore();
  const playerStore = usePlayerStore();
  const { currentSong } = usePlayer();
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');

  // Carousel state
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const fetchStats = () => {
      invoke<Stats>('get_listening_stats')
        .then(setStats)
        .catch((err) => console.error('Failed to get stats', err));
    };
    
    fetchStats();

    const unlisten = listen('library-updated', () => {
      fetchStats();
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // CAROUSEL DATA logic
  const carouselSongs = useMemo(() => {
    const topSongs = stats?.top_songs || [];
    if (topSongs.length >= 3) return topSongs.slice(0, 5);
    
    // Fill with library songs if not enough played
    const libSongs = songs.slice(0, 5);
    const combined = [...topSongs];
    for (const s of libSongs) {
      if (!combined.find(c => c.id === s.id)) {
        combined.push(s);
      }
      if (combined.length >= 5) break;
    }
    return combined;
  }, [stats, songs]);

  const heroSong = carouselSongs[heroIndex] || currentSong || songs[0] || null;

  const hour = new Date().getHours();
  const greeting = hour < 12 
    ? 'Good morning'
    : hour < 17 
      ? 'Good afternoon' 
      : 'Good evening';

  const todayStr = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  const heroArtSrc = heroSong?.albumArtPath
    ? convertFileSrc(heroSong.albumArtPath)
    : null;

  const getFullSong = (song: any) => {
    if (song.filePath) return song;
    return songs.find(s => s.id === song.id) || song;
  };

  const handlePlayHero = () => {
    if (heroSong) {
      playerStore.playSongFromLibrary(getFullSong(heroSong), songs);
    }
  };

  const handlePlaySong = (song: any) => {
    playerStore.playSongFromLibrary(getFullSong(song), songs);
  };

  const handleAddFolder = async () => {
    try {
      const folderPath = await invoke<string | null>('open_folder_dialog');
      if (folderPath) {
        addMusicFolder(folderPath);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hasSongs = songs.length > 0;

  // Sync Hero with currently playing song
  useEffect(() => {
    if (!currentSong) return;
    const idx = carouselSongs.findIndex(s => s.id === currentSong.id);
    if (idx !== -1) setHeroIndex(idx);
  }, [currentSong?.id, carouselSongs]);

  // Cover flow math helper
  const getOffset = (i: number, currentIndex: number, length: number) => {
    let diff = i - currentIndex;
    if (length > 2) {
      const half = Math.floor(length / 2);
      if (diff < -half) diff += length;
      if (diff > half) diff -= length;
    }
    return diff;
  };

  const getCardStyle = (offset: number) => {
    const isCenter = offset === 0;
    const isLeft = offset === -1;
    const isRight = offset === 1;

    if (isCenter) {
      return {
        transform: 'translate(-50%, -50%) rotate(-2deg) scale(1)',
        zIndex: 10,
        opacity: 1,
      };
    } else if (isLeft) {
      return {
        transform: 'translate(-50%, -50%) translateX(-140px) rotate(-10deg) scale(0.75)',
        zIndex: 5,
        opacity: 1, // handled by inner div for visual opacity
      };
    } else if (isRight) {
      return {
        transform: 'translate(-50%, -50%) translateX(140px) rotate(10deg) scale(0.75)',
        zIndex: 5,
        opacity: 1, // handled by inner div
      };
    } else {
      const direction = offset < 0 ? -1 : 1;
      return {
        transform: `translate(-50%, -50%) translateX(${direction * 220}px) rotate(${direction * 15}deg) scale(0.5)`,
        zIndex: 1,
        opacity: 0,
        pointerEvents: 'none' as const,
      };
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-[#0D0D0D] px-[40px] py-[32px] flex flex-col gap-8">
      
      <style>{`
        @keyframes hero-fade-slide {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes simple-fade {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.25; transform: translate(-50%, -50%) scale(1.1); }
        }
        .animate-hero-fade {
          animation: hero-fade-slide 400ms ease forwards;
        }
        .animate-bg-fade {
          animation: simple-fade 600ms ease forwards;
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 5s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>

      {/* 1. SECTION 1 — Header */}
      <div className="flex flex-row items-center justify-between w-full shrink-0 mb-2">
        <div className="flex flex-col">
          <h1 className="font-display text-[32px] font-bold text-[#F5F0EB] tracking-[-0.02em] leading-tight">
            {greeting}
          </h1>
          <p className="font-sans text-[14px] text-[#9A9080] mt-1">
            {todayStr}
          </p>
        </div>

        {hasSongs && (
          <div className="relative flex items-center group">
            <Search size={16} className="absolute left-[16px] text-[#5A5248] group-focus-within:text-[#E8630A] transition-colors" />
            <input 
              type="text"
              placeholder="Search for a song"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-[44px] w-[320px] bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-full pl-[44px] pr-[16px] text-[#F5F0EB] font-sans text-[14px] placeholder-[#5A5248] focus:outline-none focus:border-[rgba(232,99,10,0.5)] focus:bg-[rgba(255,255,255,0.02)] transition-all duration-200"
            />
          </div>
        )}
      </div>

      {/* SEARCH RESULTS */}
      {search.trim() !== '' && (
        <div className="flex flex-col gap-2 bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 shrink-0">
          <h3 className="font-sans text-[12px] font-semibold text-[#5A5248] uppercase tracking-wider mb-2">Search Results</h3>
          {searchSongs && searchSongs(search).length > 0 ? (
            searchSongs(search).slice(0, 5).map(song => (
              <div key={song.id} onClick={() => handlePlaySong(song)} className="flex items-center gap-3 p-2 hover:bg-[rgba(255,255,255,0.04)] rounded-lg cursor-pointer transition-colors">
                <div className="w-[32px] h-[32px] rounded-md bg-[#1C1C1C] overflow-hidden shrink-0">
                  {song.albumArtPath ? (
                    <img src={convertFileSrc(song.albumArtPath)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music2 size={14} className="text-[#5A5248]" /></div>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-sans text-[14px] font-medium text-[#F5F0EB] truncate">{song.title}</span>
                  <span className="font-sans text-[12px] text-[#9A9080] truncate">{song.artist || 'Unknown Artist'}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[#9A9080] font-sans text-[13px] italic p-2">No results found.</p>
          )}
        </div>
      )}

      {/* 2. SECTION 2 — Featured Album Hero (COVER FLOW) */}
      {hasSongs && carouselSongs.length >= 1 && !search && (
        <div className="relative w-full h-[320px] min-h-[320px] rounded-[24px] overflow-hidden flex items-center shrink-0 bg-[#141414] border border-[rgba(255,255,255,0.04)] shadow-2xl">
          
          {/* COVER FLOW COMPONENT */}
          <div className="absolute right-0 top-0 bottom-0 w-[55%] overflow-hidden z-0">
            
            {/* BACKGROUND BLUR LAYER */}
            {heroArtSrc ? (
              <img 
                key={`bg-${heroIndex}`}
                src={heroArtSrc} 
                className="absolute inset-0 w-full h-full object-cover z-[0] animate-bg-fade" 
                style={{ filter: 'blur(50px) saturate(1.4) brightness(0.5)', transform: 'scale(1.2)' }} 
              />
            ) : (
               <div className="absolute inset-0 w-full h-full z-[0]" style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #2A2520 50%, #1C1C1C 100%)' }} />
            )}
            
            {/* Ambient Pulse Glow behind everything */}
            <div className="absolute top-[50%] left-[50%] w-[400px] h-[400px] bg-[#E8630A] blur-[120px] rounded-full animate-pulse-slow z-[1]" />

            {/* Left fade gradient */}
            <div 
              className="absolute inset-y-0 left-0 w-[40%] z-[2]" 
              style={{ background: 'linear-gradient(to right, #141414 0%, transparent 100%)' }} 
            />

            {/* CARDS CONTAINER */}
            <div className="absolute inset-0 z-[3]">
              {carouselSongs.map((song, i) => {
                const offset = getOffset(i, heroIndex, carouselSongs.length);
                const style = getCardStyle(offset);
                const isCenter = offset === 0;
                
                return (
                  <div 
                    key={song.id}
                    className="absolute left-[50%] top-[50%] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={style}
                  >
                    <div className={isCenter ? 'animate-float' : ''}>
                      <div 
                        className={`relative rounded-[22px] overflow-hidden transition-all duration-500 ${isCenter ? 'w-[240px] h-[240px] shadow-[0_32px_80px_rgba(232,99,10,0.4)]' : 'w-[160px] h-[160px] shadow-[0_16px_40px_rgba(0,0,0,0.6)] cursor-pointer group hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)]'}`}
                        onClick={() => {
                          if (offset === -1 || (carouselSongs.length === 2 && offset === 1)) {
                            setHeroIndex(i);
                            playerStore.playSongFromLibrary(getFullSong(song), songs);
                          } else if (offset === 1) {
                            setHeroIndex(i);
                            playerStore.playSongFromLibrary(getFullSong(song), songs);
                          }
                        }}
                      >
                         {/* Visual Effects Frame for Center */}
                         {isCenter && (
                           <>
                             <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0_280deg,#E8630A_360deg)] animate-spin-slow opacity-90 z-[1]" />
                             <div className="absolute inset-[-50%] bg-[conic-gradient(from_180deg,transparent_0_280deg,#FF8C42_360deg)] animate-spin-slow opacity-90 z-[1]" style={{ animationDelay: '-2.5s' }} />
                           </>
                         )}

                         <div className={`absolute ${isCenter ? 'inset-[3px] rounded-[19px]' : 'inset-0 rounded-[22px]'} overflow-hidden bg-[#1C1C1C] z-[2]`}>
                           {song.albumArtPath ? (
                             <img src={convertFileSrc(song.albumArtPath)} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1C1C1C] to-[#2A2520]">
                               <Music2 size={isCenter ? 48 : 32} className="text-[#E8630A]" />
                             </div>
                           )}
                           
                           {/* Dark overlay for side cards with hover brighten */}
                           {!isCenter && (
                             <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300 group-hover:bg-opacity-10" />
                           )}
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left Side Content */}
          <div className="relative z-10 w-[50%] px-[48px] flex flex-col justify-center h-full pointer-events-none">
            <div key={`hero-text-${heroIndex}`} className="animate-hero-fade flex flex-col justify-center pointer-events-auto">
              <span className="inline-flex items-center px-[12px] py-[6px] rounded-full bg-[rgba(232,99,10,0.15)] text-[#E8630A] font-sans text-[10px] font-extrabold tracking-[0.15em] uppercase mb-4 self-start backdrop-blur-md border border-[rgba(232,99,10,0.2)]">
                {heroSong && currentSong?.id === heroSong.id ? (
                  <>
                    <span className="w-[6px] h-[6px] rounded-full bg-[#E8630A] mr-2 animate-pulse" />
                    NOW PLAYING
                  </>
                ) : 'MOST PLAYED'}
              </span>
              <h2 className="font-display text-[42px] font-extrabold text-[#F5F0EB] tracking-[-0.02em] leading-[1.1] line-clamp-2 mb-3 drop-shadow-lg">
                {heroSong?.title || 'Unknown Song'}
              </h2>
              <p className="font-sans text-[18px] font-medium text-[#9A9080] mb-8 drop-shadow-md">
                {heroSong?.artist || 'Unknown Artist'}
              </p>
              <button 
                onClick={handlePlayHero} 
                className="flex h-[44px] items-center justify-center gap-3 rounded-full bg-[#E8630A] px-[24px] transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#FF8C42] hover:shadow-[0_12px_32px_rgba(232,99,10,0.3)] self-start group"
              >
                <div className="w-[24px] h-[24px] rounded-full bg-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Play size={12} color="#E8630A" fill="#E8630A" className="translate-x-[1px]" />
                </div>
                <span className="font-sans text-[14px] font-bold text-white tracking-wide">Play Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECTION 3 — Stats Row */}
      {hasSongs && !search && (
        <div className="flex flex-row gap-5 w-full shrink-0 mt-2">
          {/* Card 1 */}
          <div className="flex-1 bg-[#141414] border border-[rgba(255,255,255,0.04)] rounded-[20px] px-[24px] py-[20px] flex justify-between items-center transition-colors hover:bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.08)]">
            <div className="flex flex-col">
              <span className="font-sans text-[11px] font-semibold tracking-wider uppercase text-[#5A5248] mb-1">Minutes Today</span>
              <div className="flex items-baseline gap-2">
                 <span className="font-display text-[28px] font-bold text-[#F5F0EB] tracking-tight leading-none">
                   {stats ? Math.round(stats.today_minutes || 0) : '0'}
                 </span>
                 <span className="font-sans text-[12px] text-[#9A9080]">
                   / {stats ? stats.daily_breakdown.find(d => d.date === new Date().toISOString().split('T')[0])?.songs_played || 0 : 0} songs
                 </span>
              </div>
            </div>
            <div className="w-[40px] h-[40px] rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center shrink-0">
              <Clock size={18} className="text-[#9A9080]" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex-1 bg-[#141414] border border-[rgba(255,255,255,0.04)] rounded-[20px] px-[24px] py-[20px] flex justify-between items-center transition-colors hover:bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.08)]">
            <div className="flex flex-col">
              <span className="font-sans text-[11px] font-semibold tracking-wider uppercase text-[#5A5248] mb-1">This Week</span>
              <div className="flex items-baseline gap-2">
                 <span className="font-display text-[28px] font-bold text-[#F5F0EB] tracking-tight leading-none">
                   {stats ? (stats.week_minutes / 60).toFixed(1) : '0.0'}
                 </span>
                 <span className="font-sans text-[12px] text-[#9A9080]">hours</span>
              </div>
            </div>
            <div className="flex items-end gap-[4px] h-[28px]">
              {Array.from({length: 7}).map((_, i) => {
                const dayStat = stats?.daily_breakdown[i];
                const maxMins = stats ? Math.max(...(stats.daily_breakdown.map(d => d.minutes) || [1])) : 1;
                const height = dayStat ? Math.max(15, (dayStat.minutes / maxMins) * 100) : 15;
                return <div key={i} className="w-[5px] rounded-full bg-[#E8630A] transition-all duration-300 opacity-80" style={{ height: `${height}%` }} />
              })}
            </div>
          </div>

          {/* Card 3: Your Library & Scan Folder */}
          <div className="flex-1 bg-[#141414] border border-[rgba(255,255,255,0.04)] rounded-[20px] px-[24px] py-[20px] flex justify-between items-center transition-colors hover:bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.08)]">
            <div className="flex flex-col">
              <span className="font-sans text-[11px] font-semibold tracking-wider uppercase text-[#5A5248] mb-1">Your Library</span>
              <div className="flex items-baseline gap-2">
                 <span className="font-display text-[28px] font-bold text-[#F5F0EB] tracking-tight leading-none">
                   {songs.length}
                 </span>
                 <span className="font-sans text-[12px] text-[#9A9080]">songs</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                 onClick={handleAddFolder}
                 className="flex items-center justify-center h-[32px] px-3 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(232,99,10,0.15)] text-[#9A9080] hover:text-[#E8630A] transition-colors border border-[rgba(255,255,255,0.06)] group"
                 title="Scan Music Folder"
              >
                <FolderPlus size={14} className="mr-1.5" />
                <span className="font-sans text-[12px] font-medium">Add Music</span>
              </button>
              <div className="w-[40px] h-[40px] rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center shrink-0">
                <Music2 size={18} className="text-[#9A9080]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECTION 4 — Popular Songs */}
      {hasSongs && !search && stats?.top_songs && stats.top_songs.length > 0 && (
        <div className="flex flex-col gap-4 w-full shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] font-bold text-[#F5F0EB]">Popular songs</h2>
            <div className="flex gap-2">
               <div className="w-[32px] h-[32px] rounded-full border border-[rgba(255,255,255,0.08)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"><ChevronLeft size={16} className="text-[#9A9080]" /></div>
               <div className="w-[32px] h-[32px] rounded-full border border-[rgba(255,255,255,0.08)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"><ChevronRight size={16} className="text-[#F5F0EB]" /></div>
            </div>
          </div>
          <div className="flex gap-[20px] overflow-x-auto pb-4 pt-2 px-[2px] scrollbar-none [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {stats.top_songs.map((song) => (
              <div 
                key={`pop-${song.id}`} 
                onClick={() => handlePlaySong(song)} 
                className="group relative w-[160px] h-[160px] shrink-0 cursor-pointer rounded-[14px] overflow-hidden bg-[#1C1C1C] transition-transform duration-250 cubic-bezier(0.4,0,0.2,1) hover:scale-[1.05]"
              >
                 {song.albumArtPath ? (
                    <img src={convertFileSrc(song.albumArtPath)} className="absolute inset-0 w-full h-full object-cover" />
                 ) : (
                    <div className="absolute inset-0 bg-[#1C1C1C] flex items-center justify-center"><Music2 size={32} className="text-[#2A2520]" /></div>
                 )}
                 
                 {/* Gradient Overlay */}
                 <div 
                   className="absolute bottom-0 left-0 right-0 h-[70%]" 
                   style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }} 
                 />
                 
                 {/* Text Container at bottom */}
                 <div className="absolute bottom-0 left-0 right-0 p-[10px] flex flex-col z-10">
                    <span className="font-sans text-[13px] font-semibold text-[#F5F0EB] truncate mb-[2px]">{song.title}</span>
                    <span className="font-sans text-[11px] text-[#9A9080] truncate">{song.artist || 'Unknown Artist'}</span>
                 </div>

                 {/* Play Overlay on hover */}
                 <div className="absolute inset-0 bg-[rgba(0,0,0,0.3)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                    <div className="w-[44px] h-[44px] rounded-full bg-[#E8630A] flex items-center justify-center shadow-[0_8px_24px_rgba(232,99,10,0.5)]">
                      <Play size={18} color="white" fill="white" className="ml-[2px]" />
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4.5 — Recently Played */}
      {hasSongs && !search && stats?.recent_songs && stats.recent_songs.length > 0 && (
        <div className="flex flex-col gap-4 w-full shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] font-bold text-[#F5F0EB]">Recently Played</h2>
            <button className="font-sans text-[13px] font-medium text-[#E8630A] hover:underline transition-all">See all</button>
          </div>
          <div className="flex gap-[20px] overflow-x-auto pb-4 pt-2 px-[2px] scrollbar-none [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {stats.recent_songs.map((song) => (
              <div 
                key={`recent-${song.id}`} 
                onClick={() => handlePlaySong(song)} 
                className="group relative w-[160px] h-[160px] shrink-0 cursor-pointer rounded-[14px] overflow-hidden bg-[#1C1C1C] transition-transform duration-250 cubic-bezier(0.4,0,0.2,1) hover:scale-[1.05]"
              >
                 {song.albumArtPath ? (
                    <img src={convertFileSrc(song.albumArtPath)} className="absolute inset-0 w-full h-full object-cover" />
                 ) : (
                    <div className="absolute inset-0 bg-[#1C1C1C] flex items-center justify-center"><Music2 size={32} className="text-[#2A2520]" /></div>
                 )}
                 
                 {/* Gradient Overlay */}
                 <div 
                   className="absolute bottom-0 left-0 right-0 h-[70%]" 
                   style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }} 
                 />
                 
                 {/* Text Container at bottom */}
                 <div className="absolute bottom-0 left-0 right-0 p-[10px] flex flex-col z-10">
                    <span className="font-sans text-[13px] font-semibold text-[#F5F0EB] truncate mb-[2px]">{song.title}</span>
                    <span className="font-sans text-[11px] text-[#9A9080] truncate">{song.artist || 'Unknown Artist'}</span>
                 </div>

                 {/* Play Overlay on hover */}
                 <div className="absolute inset-0 bg-[rgba(0,0,0,0.3)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                    <div className="w-[44px] h-[44px] rounded-full bg-[#E8630A] flex items-center justify-center shadow-[0_8px_24px_rgba(232,99,10,0.5)]">
                      <Play size={18} color="white" fill="white" className="ml-[2px]" />
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SECTION 5 — Most Played (List) */}
      {hasSongs && !search && stats?.top_songs && stats.top_songs.length > 0 && (
        <div className="flex flex-col gap-4 w-full shrink-0 pb-12 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] font-bold text-[#F5F0EB]">Top Listens</h2>
            <button className="font-sans text-[13px] font-medium text-[#E8630A] hover:underline transition-all">See all</button>
          </div>
          <div className="flex flex-col gap-[2px]">
            {stats.top_songs.slice(0, 5).map((song, idx) => (
              <div key={`toplist-${song.id}`} onClick={() => handlePlaySong(song)} className="flex items-center gap-[12px] h-[56px] rounded-[10px] px-[12px] -mx-[12px] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150 cursor-pointer group">
                <span className={`w-[28px] text-center font-display text-[18px] font-extrabold ${idx === 0 ? 'text-[#E8630A]' : idx < 3 ? 'text-[#9A9080]' : 'text-[#5A5248]'}`}>
                  {idx + 1}
                </span>
                <div className="w-[40px] h-[40px] rounded-[8px] overflow-hidden shrink-0 bg-[#141414] border border-[rgba(255,255,255,0.04)]">
                  {song.albumArtPath ? (
                    <img src={convertFileSrc(song.albumArtPath)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music2 size={16} className="text-[#2A2520]" /></div>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0 justify-center">
                  <span className="font-sans text-[14px] font-medium text-[#F5F0EB] truncate">{song.title}</span>
                  <span className="font-sans text-[12px] text-[#9A9080] truncate mt-[2px]">{song.artist || 'Unknown Artist'}</span>
                </div>
                <div className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-[20px] px-[10px] py-[3px]">
                  <span className="font-sans text-[11px] font-medium text-[#9A9080]">{song.playCount} plays</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!hasSongs && !search && (
        <div className="flex flex-col items-center justify-center flex-1 w-full h-full m-auto py-20">
          <div className="w-[80px] h-[80px] rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center mb-[24px] shadow-xl">
            <Music2 size={36} className="text-[#E8630A]" />
          </div>
          <h2 className="font-display text-[32px] font-bold text-[#F5F0EB] text-center mb-[8px] tracking-tight">
            Welcome to Cadence
          </h2>
          <p className="font-sans text-[15px] text-[#9A9080] text-center max-w-[300px] mb-[32px]">
            Add your music folder to get started
          </p>
          <button 
            onClick={handleAddFolder} 
            className="flex h-[48px] items-center justify-center gap-2 rounded-[24px] bg-[#E8630A] px-[32px] transition-all duration-200 hover:-translate-y-[2px] hover:bg-[#FF8C42] hover:shadow-[0_8px_24px_rgba(232,99,10,0.3)] group"
          >
            <FolderPlus size={18} color="white" className="group-hover:scale-110 transition-transform" />
            <span className="font-sans text-[15px] font-bold text-white tracking-wide">Add Music Folder</span>
          </button>
        </div>
      )}

    </div>
  );
}
