import { SITE } from '../site';

// A plain-markdown summary for LLM agents (llmstxt.org). Generated rather than
// a file in public/, so its links follow SITE.url. Built once, served static.
export const dynamic = 'force-static';

export function GET() {
  const body = `# ${SITE.name}

> ${SITE.description} This is his personal portfolio site.

The site is a single continuous, scroll-driven experience rather than a page of stacked sections. It opens on 3D mountain peaks under a real-light sky (a short tilt down from the sky on first load), with a day/night toggle (click the sun or moon). Scrolling pulls the camera back and down the mountain onto a desk with an open laptop in a meadow, where the projects will be, and on to a house on a hill with a pool, where contact will be. Real project, resume and contact content arrives in later releases and will be listed here as it ships.

## Links

- [Portfolio](${SITE.url}): the site itself
- [GitHub](${SITE.github}): code and projects
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
