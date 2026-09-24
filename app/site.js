/**
 * Facts about the site that more than one file needs: metadata, JSON-LD,
 * robots, sitemap. Keep this to things that are true today — see PRODUCT.md's
 * evidence rules before adding anything here.
 */

// The canonical origin. The domain lives in config, not here: `SITE_URL`
// overrides (e.g. to pick one of several production domains), then Vercel's
// `VERCEL_PROJECT_PRODUCTION_URL` (set on every build, the project's primary
// production domain), then localhost for local builds.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const url = (
  process.env.SITE_URL ||
  (productionHost ? `https://${productionHost}` : 'http://localhost:3000')
).replace(/\/$/, '');

export const SITE = {
  url,
  name: 'Abhinav Gupta',
  role: 'Software engineer',
  description:
    'Software engineer building interactive, technically ambitious web experiences.',
  github: 'https://github.com/AbGisHere',
};
