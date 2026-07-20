import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

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
const decisionItem = z.object({ lead: z.string(), body: z.string() });

/** Selected work — section 03, CMS-driven. */
const work = defineCollection({
  loader: () => loadCollection<{ slug: string } & Record<string, unknown>>('work', '/api/work'),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    tease: z.string(),
    status: z.enum(['live', 'building', 'testing', 'ongoing', 'closed']),
    role: z.string().nullable(),
    engagement: z.enum(['upside', 'engaged']).nullable(),
    shot: z.object({ url: z.string(), label: z.string() }).nullable(),
    screenshotUrl: z.string().nullable(),
    nd: z.array(needItem),
    stack: z.array(z.string()),
    visit: z.object({ href: z.string(), label: z.string() }).nullable(),
    bodyHtml: z.string(),
    sortOrder: z.number(),
    // .nullish() (not .nullable()): as of this change the live CMS hasn't
    // shipped these fields yet — they're absent from /api/work entirely,
    // not present-as-null. Tolerate both shapes so the build doesn't break
    // on an API that hasn't deployed the companion change.
    screenshotAlt: z.string().nullish(),
    updatedDate: z.coerce.date().nullish(),
    // Same reasoning: shipped with the mobile-frame CMS change; absent from
    // the live API until that deploys. Missing/null renders the browser frame.
    shotFrame: z.enum(['browser', 'mobile']).nullish(),
    // Structured case-study content driving the /work page and the homepage
    // cards (CMS migrations 0008 + 0009). Same rollout tolerance as above:
    // .nullish() for scalars, .default([]) for the arrays, so the web builds
    // against an API that hasn't shipped these yet (renders empty, not broken).
    relationship: z.string().nullish(), // "relationship /" display line
    decisionsLabel: z.string().nullish(), // overrides the "decisions along the way" label
    outcome: z.string().nullish(), // homepage plate caption
    involvement: z.string().nullish(), // homepage "how involved" line
    currentState: z.string().nullish(), // "current state" line
    gap: z.array(z.string()).default([]), // opportunity & the gap
    system: z.array(z.string()).default([]), // the system
    decisions: z.array(decisionItem).default([]), // decisions along the way
    roleDetail: z.array(z.string()).default([]), // "my role", one entry per paragraph
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
    // .nullish(): these are new fields on the companion CMS; tolerate the
    // field being entirely absent from older API responses, not just null
    // (see the same reasoning on work.screenshotAlt/updatedDate above).
    bodyMd: z.string().nullish(),
    seoTitle: z.string().nullish(),
    seoDescription: z.string().nullish(),
  }),
});

export const collections = { work, notes };
