/**
 * Facts about the site that more than one file needs: metadata, JSON-LD,
 * robots, sitemap. Keep this to things that are true today — see PRODUCT.md's
 * evidence rules before adding anything here.
 */

// Vercel sets this on every build of the project; the fallback is the current
// production alias, for local builds.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE = {
  url: productionHost ? `https://${productionHost}` : 'https://abgishere.vercel.app',
  name: 'Abhinav Gupta',
  role: 'Software engineer',
  description:
    'Software engineer building interactive, technically ambitious web experiences.',
  github: 'https://github.com/AbGisHere',
};
