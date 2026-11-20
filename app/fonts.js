import { Unbounded, JetBrains_Mono } from 'next/font/google';

// Shared by the root layout and global-error (which replaces the layout and
// so has to load its own fonts). Unbounded at its one weight; JetBrains Mono
// as one file over part of its axis. The site uses Unbounded 800 and JetBrains Mono
// 400/500.
export const unbounded = Unbounded({
  subsets: ['latin'],
  // (0.5.12) Only the h1 uses it, at 800: that one weight, not the axis.
  weight: ['800'],
  variable: '--font-display',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  // Narrows the axis to 400–600: the whole axis (no `weight`, as the docs
  // suggest for variable fonts) is 9 KB more to preload. Turbopack doesn't
  // take a '400 600' range string.
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const fontVariables = `${unbounded.variable} ${jetbrainsMono.variable}`;
