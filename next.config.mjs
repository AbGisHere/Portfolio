/** @type {import('next').NextConfig} */
// (0.5.44) Security headers on every route. Inline scripts are the theme
// script, Next's bootstrap and the JSON-LD; Vercel Analytics loads from the
// site's own origin (/_vercel/insights), so 'self' covers it. The renderer
// builds the house in a worker (blob: allowed).
const isDev = process.env.NODE_ENV !== 'production';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig = {
  // The local harness builds into its own directory (NEXT_DIST_DIR), so a
  // production build never touches a running `next dev`'s cache.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // (0.5.13) The prebuilt house is fetched by its worker's content hash, so
  // it can be kept a year; the moon's photo a day (its name doesn't change).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
      { source: '/house/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      // (0.5.16) The shipped lightmap, named by its hash in the query.
      { source: '/lightmap/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/moon.jpg', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};

export default nextConfig;
