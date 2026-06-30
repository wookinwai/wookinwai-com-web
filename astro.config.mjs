import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import seoGraph from '@jdevalk/astro-seo-graph/integration';

// Notes are CMS-driven (not local files), so the sitemap's lastmod can't come
// from git history (gitLastmod doesn't apply). Fetch the collection once at
// config-eval time and build a slug → date lookup the serialize callback can
// consult per-URL.
const API_URL = process.env.PUBLIC_API_URL ?? 'https://api.wookinwai.com';

async function fetchNoteLastmods() {
  try {
    const res = await fetch(new URL('/api/notes', API_URL));
    if (!res.ok) return new Map();
    const notes = await res.json();
    return new Map(notes.map((note) => [note.slug, new Date(note.updatedDate ?? note.pubDate)]));
  } catch {
    // Sitemap lastmod is a nice-to-have; an unreachable CMS here shouldn't
    // fail the build (content.config.ts's loader is the source of truth for
    // build failures on a broken CMS).
    return new Map();
  }
}

const noteLastmods = await fetchNoteLastmods();

// IndexNow needs a generated key + the production Workers Builds env. Gate so
// local/dev builds never crash on a missing key, and so PR/preview builds
// don't submit to IndexNow — only the `main`-branch production build does.
const indexNowEnabled =
  process.env.WORKERS_CI === '1' && process.env.WORKERS_CI_BRANCH === 'main' && Boolean(process.env.INDEXNOW_KEY);

// Site URL feeds Astro.site — canonical URLs (src/lib/seo.ts + the <Seo>
// component), the RSS feed, and the sitemap that robots.txt + BaseLayout's
// <link rel="sitemap"> point at.
export default defineConfig({
  site: 'https://www.wookinwai.com',
  integrations: [
    sitemap({
      serialize(item) {
        const slug = item.url.replace(/\/$/, '').split('/').pop();
        const lastmod = slug ? noteLastmods.get(slug) : undefined;
        if (lastmod) {
          return { ...item, lastmod: lastmod.toISOString() };
        }
        return item;
      },
    }),
    // Build-time SEO validation: H1 count, duplicate metadata across pages,
    // missing image alt text, title/description length, and internal links
    // that don't resolve to a built page.
    seoGraph({
      validateH1: true,
      validateUniqueMetadata: true,
      validateImageAlt: true,
      validateMetadataLength: true,
      validateInternalLinks: { skip: (href) => href.startsWith('/api/') },
      ...(indexNowEnabled
        ? {
            indexNow: {
              key: process.env.INDEXNOW_KEY,
              host: 'www.wookinwai.com',
              siteUrl: 'https://www.wookinwai.com',
            },
          }
        : {}),
      llmsTxt: {
        title: 'Woo Kin Wai',
        siteUrl: 'https://www.wookinwai.com',
        summary:
          'Woo Kin Wai is a software builder and technical partner who helps founders and SMEs design, build, and ship products.',
      },
      // Emits <link rel="alternate" type="text/markdown"> on every page,
      // pointing at the .md route in src/pages/notes/[...slug].md.ts. The
      // package verifies at build time that the target .md file actually
      // exists in the build output and strips the link (with a warning) if
      // not — so notes without a backfilled bodyMd degrade gracefully
      // instead of shipping a 404 link.
      markdownAlternate: true,
    }),
  ],
  // Tailwind v4 is wired through its dedicated Vite plugin. Under Astro 7
  // (Vite 8 / Rolldown) this resolves `@import 'tailwindcss'` in global.css;
  // the older @tailwindcss/postcss route conflicts with Vite's postcss-import.
  vite: { plugins: [tailwindcss()] },
});
