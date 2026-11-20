/** @type {import('next').NextConfig} */
const nextConfig = {
  // The local harness builds into its own directory (NEXT_DIST_DIR), so a
  // production build never touches a running `next dev`'s cache.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // (0.5.13) The prebuilt house is fetched by its worker's content hash, so
  // it can be kept a year; the moon's photo a day (its name doesn't change).
  async headers() {
    return [
      { source: '/house/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      // (0.5.16) The shipped lightmap, named by its hash in the query.
      { source: '/lightmap/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/moon.jpg', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};

export default nextConfig;
