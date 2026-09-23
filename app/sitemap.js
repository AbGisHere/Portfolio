import { SITE } from './site';

// One entry per live route. Add routes here as they ship; never list one
// that doesn't resolve.
const ROUTES = [{ path: '/', priority: 1 }];

export default function sitemap() {
  return ROUTES.map(({ path, priority }) => ({
    url: `${SITE.url}${path === '/' ? '' : path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority,
  }));
}
