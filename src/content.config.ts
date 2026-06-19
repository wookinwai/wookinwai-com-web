import { defineCollection, z } from 'astro:content';

/**
 * Content comes from the CMS API (wookinwai-com-api) at BUILD time. A CMS
 * publish triggers a Cloudflare deploy hook, which rebuilds this static site and
 * re-fetches. Override the endpoint with PUBLIC_API_URL in `.env`.
 */
const API = import.meta.env.PUBLIC_API_URL ?? 'https://api.wookinwai.com';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(new URL(path, API));
  if (!res.ok) {
    throw new Error(`CMS fetch failed: ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * Load a collection from the CMS, tolerating the absence of data.
 * - A reachable CMS that returns `[]` builds normally (no content).
 * - An UNREACHABLE / erroring CMS only warns and returns `[]` in dev, so the
 *   site runs standalone; in a production build it rethrows, so a broken API
 *   never silently ships an empty live site.
 */
async function loadCollection<T extends { slug: string }>(
  label: string,
  path: string
): Promise<Array<{ id: string } & T>> {
  try {
    const items = await fetchJson<T[]>(path);
    return items.map((item) => ({ id: item.slug, ...item }));
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[content] CMS unreachable at ${API}${path}; building with no ${label}. (${err})`);
      return [];
    }
    throw err;
  }
}

const needItem = z.object({ label: z.string(), text: z.string() });

/** Selected work — section 03, CMS-driven. */
const work = defineCollection({
  loader: () => loadCollection<{ slug: string } & Record<string, unknown>>('work', '/api/work'),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    tease: z.string(),
    status: z.enum(['live', 'building', 'ongoing', 'closed']),
    role: z.string().nullable(),
    engagement: z.enum(['upside', 'engaged']).nullable(),
    shot: z.object({ url: z.string(), label: z.string() }).nullable(),
    screenshotUrl: z.string().nullable(),
    nd: z.array(needItem),
    stack: z.array(z.string()),
    visit: z.object({ href: z.string(), label: z.string() }).nullable(),
    bodyHtml: z.string(),
    sortOrder: z.number(),
  }),
});

/** Notes — CMS-driven. */
const notes = defineCollection({
  loader: () => loadCollection<{ slug: string } & Record<string, unknown>>('notes', '/api/notes'),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    bodyHtml: z.string(),
    tags: z.array(z.string()),
    heroUrl: z.string().nullable(),
    heroAlt: z.string().nullable(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().nullable(),
  }),
});

export const collections = { work, notes };
