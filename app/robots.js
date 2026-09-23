import { SITE } from './site';

// Everything is open, AI crawlers included: being findable and quotable by
// assistants is part of the point. The named agents are listed so the intent
// is explicit rather than inherited from the wildcard.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: AI_CRAWLERS, allow: '/' },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
