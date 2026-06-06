import { Music } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface PlaylistCoverArtProps {
  artPaths: (string | null | undefined)[];
  className?: string;
  iconSize?: number;
}

export default function PlaylistCoverArt({ artPaths, className = "", iconSize = 32 }: PlaylistCoverArtProps) {
  const uniqueArts = Array.from(new Set(artPaths.filter(Boolean))) as string[];
  const arts = uniqueArts.slice(0, 4);

  if (arts.length === 0) {
    return (
      <div className={`flex items-center justify-center overflow-hidden ${className}`}>
        <Music size={iconSize} className="text-white opacity-80" />
      </div>
    );
  }

  if (arts.length === 1) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img src={arts[0] ? convertFileSrc(arts[0]) : ''} className="w-full h-full object-cover" alt="Playlist Cover" />
      </div>
    );
  }

  if (arts.length === 2) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img 
          src={arts[0] ? convertFileSrc(arts[0]) : ''} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
        />
        <img 
          src={arts[1] ? convertFileSrc(arts[1]) : ''} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0 pointer-events-none">
          <line x1="0" y1="100" x2="100" y2="0" stroke="#161616" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    );
  }

  if (arts.length === 3) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img 
          src={arts[0] ? convertFileSrc(arts[0]) : ''} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }} // Top
        />
        <img 
          src={arts[1] ? convertFileSrc(arts[1]) : ''} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 100%, 50% 50%)' }} // Bottom Right
        />
        <img 
          src={arts[2] ? convertFileSrc(arts[2]) : ''} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ clipPath: 'polygon(0 0, 50% 50%, 50% 100%, 0 100%)' }} // Bottom Left
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0 pointer-events-none">
          <line x1="0" y1="0" x2="50" y2="50" stroke="#161616" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <line x1="100" y1="0" x2="50" y2="50" stroke="#161616" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <line x1="50" y1="100" x2="50" y2="50" stroke="#161616" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    );
  }

  // 4 slices
  return (
    <div className={`relative overflow-hidden ${className}`}>
        <img 
          src={arts[0] ? convertFileSrc(arts[0]) : ''} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }} // Top
        />
        <img 
          src={arts[1] ? convertFileSrc(arts[1]) : ''} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)' }} // Right
        />
        <img 
          src={arts[2] ? convertFileSrc(arts[2]) : ''} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ clipPath: 'polygon(100% 100%, 0 100%, 50% 50%)' }} // Bottom
        />
        <img 
          src={arts[3] ? convertFileSrc(arts[3]) : ''} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ clipPath: 'polygon(0 100%, 0 0, 50% 50%)' }} // Left
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0 pointer-events-none">
          <line x1="0" y1="0" x2="100" y2="100" stroke="#161616" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <line x1="100" y1="0" x2="0" y2="100" stroke="#161616" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
    </div>
  );
}
