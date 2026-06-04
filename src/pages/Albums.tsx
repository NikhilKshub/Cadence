import React, { useMemo } from 'react';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Song } from '../types/song';
import { Disc3, Music2, Play } from 'lucide-react';

export default function Albums() {
  const { songs } = useLibraryStore();

  const albums = useMemo(() => {
    const albumMap = new Map<string, {
      name: string
      artist: string
      songs: Song[]
      coverArt: string | null
    }>();
    
    songs.forEach(song => {
      const key = `${song.album}-${song.albumArtist || song.artist}`;
      if (!albumMap.has(key)) {
        albumMap.set(key, {
          name: song.album || 'Unknown Album',
          artist: song.albumArtist || song.artist || 'Unknown Artist',
          songs: [],
          coverArt: song.albumArtPath
        });
      }
      albumMap.get(key)!.songs.push(song);
      if (!albumMap.get(key)!.coverArt && song.albumArtPath) {
        albumMap.get(key)!.coverArt = song.albumArtPath;
      }
    });
    
    return Array.from(albumMap.values())
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [songs]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0D0D0D] px-[32px] py-[28px] pb-[120px]">
      <header className="mb-6">
        <h1 className="font-['Cabinet_Grotesk'] text-[32px] font-[800] tracking-[-0.02em] text-[#F5F0EB]">
          Albums
        </h1>
        <p className="font-['Satoshi'] text-[14px] text-[#9A9080] mt-1">
          {albums.length} albums
        </p>
      </header>

      {albums.length === 0 ? (
        <div className="flex h-full w-full flex-col items-center justify-center space-y-4 pt-20">
          <Disc3 className="text-[#E8630A] w-24 h-24 opacity-80" />
          <h2 className="font-['Cabinet_Grotesk'] text-[24px] text-[#F5F0EB]">No albums yet</h2>
          <p className="font-['Satoshi'] text-[#9A9080]">Add music to see your albums</p>
        </div>
      ) : (
        <div 
          className="mt-[24px] grid gap-[20px]" 
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
        >
          {albums.map((album, i) => {
            const artSrc = album.coverArt ? convertFileSrc(album.coverArt) : null;
            
            return (
              <div 
                key={i}
                className="group cursor-pointer transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-1"
                onClick={() => usePlayerStore.getState().playAlbum(album.songs, 0)}
              >
                <div className="relative w-full aspect-square overflow-hidden rounded-[14px] bg-[#1C1C1C] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                  {artSrc ? (
                    <img 
                      src={artSrc} 
                      alt={album.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1C1C1C] to-[#2A2520]">
                      <Music2 className="h-[32px] w-[32px] text-[#E8630A]" />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#E8630A] shadow-[0_8px_24px_rgba(232,99,10,0.5)]">
                      <Play className="h-[20px] w-[20px] text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
                
                {/* Album Info */}
                <div className="mt-[12px]">
                  <p className="truncate font-['Satoshi'] text-[14px] font-[600] text-[#F5F0EB]">
                    {album.name}
                  </p>
                  <p className="mt-1 truncate font-['Satoshi'] text-[13px] text-[#9A9080]">
                    {album.artist}
                  </p>
                  <p className="mt-1 font-['Satoshi'] text-[12px] text-[#5A5248]">
                    {album.songs.length} {album.songs.length === 1 ? 'song' : 'songs'}
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
