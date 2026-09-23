'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import themes, { DEFAULT_THEME } from './gradient/themes';

const ThemeContext = createContext({ theme: DEFAULT_THEME, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  // Nothing is written back until the stored choice has been read, or the
  // default would overwrite it on mount (reliably so under Strict Mode's
  // double effect run).
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('abg-theme');
    if (stored && themes[stored]) setTheme(stored);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('abg-theme', theme);

    // Browser chrome (mobile status bar, Safari's tinted toolbar) matches the
    // top of the sky rather than cutting a hard line above it.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = themes[theme].recipe.stops[0];
  }, [theme, loaded]);

  // Each theme names its own successor, so the cycle lives with the themes.
  const toggle = () => setTheme(t => themes[t].next);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
