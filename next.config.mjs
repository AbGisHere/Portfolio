/** @type {import('next').NextConfig} */
const nextConfig = {
  // The local harness builds into its own directory (NEXT_DIST_DIR), so a
  // production build never touches a running `next dev`'s cache.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
