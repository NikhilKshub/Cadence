// Cadence — Theme hook
// Manages theme application and system theme detection

import { useEffect } from 'react';
import { useUiStore } from '../store/uiStore';

/**
 * Applies the current theme to the document root element.
 * Handles 'system' theme by detecting OS preference via matchMedia.
 * Call once in the root App component.
 */
export function useTheme() {
  const theme = useUiStore((state) => state.theme);
  const accentColor = useUiStore((state) => state.accentColor);

  useEffect(() => {
    const root = document.documentElement;

    let resolvedTheme: 'light' | 'dark';

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = prefersDark ? 'dark' : 'light';
    } else {
      resolvedTheme = theme;
    }

    root.setAttribute('data-theme', resolvedTheme);
  }, [theme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.setAttribute('data-theme', event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply dynamic accent color as CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor);
  }, [accentColor]);
}
