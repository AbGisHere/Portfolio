'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import themes, { DEFAULT_THEME } from './gradient/themes';

const ThemeContext = createContext({ theme: DEFAULT_THEME, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    const stored = window.localStorage.getItem('abg-theme');
    if (stored && themes[stored]) setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('abg-theme', theme);
  }, [theme]);

  // Each theme names its own successor, so the cycle lives with the themes.
  const toggle = () => setTheme(t => themes[t].next);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
