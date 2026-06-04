// Cadence — UI state store (Zustand)
// Manages theme, navigation, sidebar, modals, and context menus

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface ContextMenuItem {
  label: string;
  action: string;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface UiStoreState {
  // State
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  sidebarCollapsed: boolean;
  currentPage: string;
  isMiniPlayer: boolean;
  isQueueOpen: boolean;
  activeModal: string | null;
  contextMenu: ContextMenuState | null;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: string) => void;
  toggleSidebar: () => void;
  navigate: (page: string) => void;
  toggleMiniPlayer: () => void;
  toggleQueue: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  openContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  closeContextMenu: () => void;
}

export const useUiStore = create<UiStoreState>()((set, get) => ({
  // Initial state
  theme: 'dark',
  accentColor: '#7c3aed',
  sidebarCollapsed: false,
  currentPage: 'home',
  isMiniPlayer: false,
  isQueueOpen: false,
  activeModal: null,
  contextMenu: null,

  // Actions
  setTheme: (theme) => set({ theme }),

  setAccentColor: (color) => set({ accentColor: color }),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  navigate: (page) => set({ currentPage: page }),

  toggleMiniPlayer: () => {
    const state = get();
    const isMini = !state.isMiniPlayer;
    // Logic without logging
    set({ isMiniPlayer: isMini });
    if (isMini) {
      invoke('enter_mini_player');
    } else {
      invoke('exit_mini_player');
    }
  },

  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),

  openModal: (modalId) => set({ activeModal: modalId }),

  closeModal: () => set({ activeModal: null }),

  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),

  closeContextMenu: () => set({ contextMenu: null }),
}));
