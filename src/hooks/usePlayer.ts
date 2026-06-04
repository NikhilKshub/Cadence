// Cadence — usePlayer hook
// React hook to access player store state and actions, simplifying component usage

import { usePlayerStore } from '../store/playerStore';

export function usePlayer() {
  const store = usePlayerStore();
  
  return {
    // State
    currentSong: store.currentSong,
    isPlaying: store.isPlaying,
    isPaused: store.isPaused,
    currentTime: store.currentTime,
    duration: store.duration,
    volume: store.volume,
    isMuted: store.isMuted,
    shuffle: store.shuffle,
    repeat: store.repeat,
    queue: store.queue,
    queueIndex: store.queueIndex,
    
    // Actions
    play: store.play,
    pause: store.pause,
    stop: store.stop,
    next: store.next,
    previous: store.previous,
    seekTo: store.seekTo,
    setVolume: store.setVolume,
    toggleMute: store.toggleMute,
    toggleShuffle: store.toggleShuffle,
    cycleRepeat: store.cycleRepeat,
    addToQueue: store.addToQueue,
    removeFromQueue: store.removeFromQueue,
    clearQueue: store.clearQueue,
    
    // Computed helpers
    progressPercent: store.duration > 0 
      ? (store.currentTime / store.duration) * 100 
      : 0,
    isLoaded: store.currentSong !== null,
  };
}
