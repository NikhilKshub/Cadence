// Cadence — useKeyboardShortcuts hook
// Handles app-wide keyboard shortcuts and global media keys

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { usePlayerStore } from '../store/playerStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    // Local keyboard shortcuts (when app is focused)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      const store = usePlayerStore.getState();

      switch (e.key) {
        case ' ':
          e.preventDefault(); // Prevent page scroll
          if (store.isPlaying) {
            store.pause();
          } else {
            store.play();
          }
          break;

        case 'ArrowRight':
          if (e.ctrlKey) {
            store.next();
          } else {
            const nextTime = Math.min(store.currentTime + 5, store.duration);
            store.seekTo(nextTime);
          }
          break;

        case 'ArrowLeft':
          if (e.ctrlKey) {
            store.previous();
          } else {
            const prevTime = Math.max(store.currentTime - 5, 0);
            store.seekTo(prevTime);
          }
          break;

        case 'ArrowUp':
          store.setVolume(store.volume + 0.05);
          break;

        case 'ArrowDown':
          store.setVolume(store.volume - 0.05);
          break;

        case 'm':
        case 'M':
          store.toggleMute();
          break;

        case 's':
        case 'S':
          store.toggleShuffle();
          break;

        case 'r':
        case 'R':
          store.cycleRepeat();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Global media keys (Tauri events)
    const unlistenPlayPause = listen('media-play-pause', () => {
      const store = usePlayerStore.getState();
      if (store.isPlaying) {
        store.pause();
      } else {
        store.play();
      }
    });

    const unlistenNext = listen('media-next', () => {
      usePlayerStore.getState().next();
    });

    const unlistenPrevious = listen('media-previous', () => {
      usePlayerStore.getState().previous();
    });

    const unlistenStop = listen('media-stop', () => {
      usePlayerStore.getState().stop();
    });

    // Tray events
    const unlistenTrayPlayPause = listen('tray-play-pause', () => {
      const store = usePlayerStore.getState();
      if (store.isPlaying) {
        store.pause();
      } else {
        store.play();
      }
    });

    const unlistenTrayNext = listen('tray-next', () => {
      usePlayerStore.getState().next();
    });

    const unlistenTrayPrevious = listen('tray-previous', () => {
      usePlayerStore.getState().previous();
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unlistenPlayPause.then(f => f());
      unlistenNext.then(f => f());
      unlistenPrevious.then(f => f());
      unlistenStop.then(f => f());
      unlistenTrayPlayPause.then(f => f());
      unlistenTrayNext.then(f => f());
      unlistenTrayPrevious.then(f => f());
    };
  }, []);
}
