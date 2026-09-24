import { SITE } from '../site';

// A plain-markdown summary for LLM agents (llmstxt.org). Generated rather than
// a file in public/, so its links follow SITE.url. Built once, served static.
export const dynamic = 'force-static';

export function GET() {
  const body = `# ${SITE.name}

> ${SITE.description} This is his personal portfolio site.

The site is being rebuilt layer by layer. What's live today is the opening scene: an animated mountain atmosphere with a day/night toggle (click the sun), and a first stretch of scroll that pulls the camera back from the mountains as the sky turns toward evening. Projects, resume, dev log and contact arrive in later releases and will be listed here as they ship.

## Links

- [Portfolio](${SITE.url}): the site itself
- [GitHub](${SITE.github}): code and projects
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
