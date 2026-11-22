import localFont from 'next/font/local';

// Shared by the root layout and global-error (which replaces the layout and
// so has to load its own fonts). The site uses Unbounded 800 and JetBrains
// Mono 400/500.
//
// Self-hosted (0.5.32): the latin files Google Fonts serves, in app/fonts/.
// next/font/google fetched them at build time, and Turbopack's build broke
// on that fetch ("next/font/google queries have exactly one entry") with
// fonts.js unchanged; local files make the build independent of Google.
export const unbounded = localFont({
  // (0.5.12) Only the h1 uses it, at 800: that one weight, not the axis.
  src: [{ path: './fonts/unbounded-latin.woff2', weight: '800', style: 'normal' }],
  variable: '--font-display',
  display: 'swap',
  // (0.5.17) Not preloaded: no text shows on the first screen yet (the h1
  // and intro are visually hidden), so Safari warned the preload unused.
  // Fetched when text first needs it; next/font's adjusted fallback holds
  // the layout meanwhile.
  preload: false,
});

export const jetbrainsMono = localFont({
  // One variable file over 400–600 (what Google served for those weights).
  src: [{ path: './fonts/jetbrains-mono-latin.woff2', weight: '400 600', style: 'normal' }],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

export const fontVariables = `${unbounded.variable} ${jetbrainsMono.variable}`;
