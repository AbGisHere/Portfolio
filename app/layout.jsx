import ThemeProvider from '@/components/ThemeProvider';
import { fontVariables } from './fonts';
import { SITE } from './site';
import './globals.css';
import '@/styles/utilities.css';

// Routes set their own `title` and get "<title> · Abhinav Gupta"; `canonical`
// resolves against metadataBase. The OG/Twitter image comes from the
// opengraph-image / twitter-image files beside this layout.
export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    locale: 'en',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.name,
    description: SITE.description,
  },
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

// Runs before first paint so a returning night visitor's backdrop is already
// night, rather than flashing the day sky until React reads localStorage.
const THEME_SCRIPT = `try{var t=localStorage.getItem('abg-theme');if(t==='day'||t==='night')document.documentElement.dataset.theme=t}catch(e){}`;

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: SITE.name,
  alternateName: 'AbG',
  url: SITE.url,
  jobTitle: SITE.role,
  sameAs: [SITE.github],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={fontVariables}
      // The theme script below sets data-theme before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
