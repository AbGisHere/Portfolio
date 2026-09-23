import { Unbounded, JetBrains_Mono } from 'next/font/google';

// Shared by the root layout and global-error (which replaces the layout and
// so has to load its own fonts).
export const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['400', '600', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const fontVariables = `${unbounded.variable} ${jetbrainsMono.variable}`;
