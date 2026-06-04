// Cadence — Queue panel component
// Slide-out panel showing the current playback queue with drag-to-reorder

import { useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { Play, Pause, Music, X } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useUiStore } from '../../store/uiStore';

export default function QueuePanel() {
  const { queue, queueIndex, isPlaying, reorderQueue, removeFromQueue, clearQueue } = usePlayerStore();
  const toggleQueuePanel = useUiStore(s => s.toggleQueue);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow drag image to generate before setting opacity
    setTimeout(() => {
      const target = e.target as HTMLElement;
      target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderQueue(draggedIndex, index);
    }
    setDragOverIndex(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] border-l border-[#1f1f1f] w-[300px] shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f] shrink-0">
        <h2 className="text-white font-semibold tracking-tight">Up Next</h2>
        <div className="flex gap-2">
          {queue.length > 0 && (
            <button
              onClick={() => clearQueue()}
              className="text-xs text-[#6b6b6b] hover:text-white px-2 py-1 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => toggleQueuePanel()}
            className="text-[#6b6b6b] hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#6b6b6b] gap-3">
            <Music size={32} className="opacity-50" />
            <p className="text-sm font-medium">Queue is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 relative">
            {queue.map((song, idx) => {
              const isCurrent = idx === queueIndex;
              const isDragged = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;

              return (
                <div key={`${song.id}-${idx}`} className="relative">
                  {isDragOver && draggedIndex !== null && idx < draggedIndex && (
                    <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-[#7c3aed] z-10" />
                  )}
                  
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`flex items-center gap-3 p-2 rounded-lg group cursor-grab active:cursor-grabbing transition-colors
                      ${isCurrent ? 'bg-[#7c3aed]/10' : 'hover:bg-[#1a1a1a]'}
                      ${isDragged ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="relative w-10 h-10 shrink-0 rounded bg-[#1f1f1f] overflow-hidden">
                      {song.albumArtPath ? (
                        <img
                          src={convertFileSrc(song.albumArtPath)}
                          className={`w-full h-full object-cover ${isCurrent ? 'opacity-50' : 'group-hover:opacity-50 transition-opacity'}`}
                          alt=""
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
                          <Music size={16} className="text-[#6b6b6b]" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1 rounded-full bg-black/50 text-white hover:scale-110 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCurrent) {
                              usePlayerStore.getState()[isPlaying ? 'pause' : 'play']();
                            } else {
                              usePlayerStore.getState().playSongFromLibrary(song, queue);
                            }
                          }}
                        >
                          {isCurrent && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <span className={`text-sm font-medium truncate ${isCurrent ? 'text-[#a78bfa]' : 'text-white'}`}>
                        {song.title}
                      </span>
                      <span className="text-xs text-[#6b6b6b] truncate">
                        {song.artist || 'Unknown Artist'}
                      </span>
                    </div>

                    <button
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[#6b6b6b] hover:text-white transition-all shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(idx);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {isDragOver && draggedIndex !== null && idx > draggedIndex && (
                    <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-[#7c3aed] z-10" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
