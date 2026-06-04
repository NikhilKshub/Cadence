import { useMemo } from 'react';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Song } from '../types/song';
import { Mic2, Play } from 'lucide-react';

export default function Artists() {
  const { songs } = useLibraryStore();

  const artists = useMemo(() => {
    const artistMap = new Map<string, {
      name: string
      songs: Song[]
      coverArt: string | null
    }>();
    
    songs.forEach(song => {
      const name = song.artist || 'Unknown Artist';
      if (!artistMap.has(name)) {
        artistMap.set(name, {
          name,
          songs: [],
          coverArt: null
        });
      }
      artistMap.get(name)!.songs.push(song);
      if (!artistMap.get(name)!.coverArt && song.albumArtPath) {
        artistMap.get(name)!.coverArt = song.albumArtPath;
      }
    });
    
    return Array.from(artistMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0D0D0D] px-[32px] py-[28px] pb-[120px]">
      <header className="mb-6">
        <h1 className="font-['Cabinet_Grotesk'] text-[32px] font-[800] tracking-[-0.02em] text-[#F5F0EB]">
          Artists
        </h1>
        <p className="font-['Satoshi'] text-[14px] text-[#9A9080] mt-1">
          {artists.length} artists
        </p>
      </header>

      {artists.length === 0 ? (
        <div className="flex h-full w-full flex-col items-center justify-center space-y-4 pt-20">
          <Mic2 className="text-[#E8630A] w-24 h-24 opacity-80" />
          <h2 className="font-['Cabinet_Grotesk'] text-[24px] text-[#F5F0EB]">No artists yet</h2>
          <p className="font-['Satoshi'] text-[#9A9080]">Add music to see your artists</p>
        </div>
      ) : (
        <div 
          className="mt-[24px] grid gap-[20px]" 
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
        >
          {artists.map((artist, i) => {
            const artSrc = artist.coverArt ? convertFileSrc(artist.coverArt) : null;
            
            return (
              <div 
                key={i}
                className="group cursor-pointer text-center transition-transform duration-200 ease-in-out hover:-translate-y-1"
                onClick={() => usePlayerStore.getState().playArtist(artist.songs, 0)}
              >
                <div className="relative w-full aspect-square overflow-hidden rounded-full bg-gradient-to-br from-[#1C1C1C] to-[#2A2520] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                  {artSrc ? (
                    <img 
                      src={artSrc} 
                      alt={artist.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Mic2 className="h-[32px] w-[32px] text-[#E8630A]" />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#E8630A] shadow-[0_8px_24px_rgba(232,99,10,0.5)]">
                      <Play className="h-[20px] w-[20px] text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
                
                {/* Artist Info */}
                <div className="mt-[12px]">
                  <p className="truncate font-['Satoshi'] text-[14px] font-[600] text-[#F5F0EB]">
                    {artist.name}
                  </p>
                  <p className="mt-[4px] font-['Satoshi'] text-[12px] text-[#5A5248]">
                    {artist.songs.length} {artist.songs.length === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
