import { Unbounded, JetBrains_Mono } from 'next/font/google';
import ThemeProvider from '@/components/ThemeProvider';
import './globals.css';

const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['400', '600', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Abhinav Gupta',
  description: 'Software engineer building interactive, technically ambitious web experiences.',
};

// viewport-fit=cover lets the scene run under notches and rounded corners in
// landscape instead of sitting inside letterbox bars. theme-color starts on
// the day sky's top stop; ThemeProvider keeps it in step with the scene.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FBE7CD',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${unbounded.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
