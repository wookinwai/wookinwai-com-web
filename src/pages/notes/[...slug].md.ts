// Markdown alternate for notes: AI agents / LLMs can fetch a clean
// `.md` rendering of a note instead of scraping the rendered HTML.
// Mirrors the `/notes/[...slug]` route (the site's only dynamic content
// with bodies). PostLayout emits the discovery link only for notes that have
// bodyMd, so every advertised alternate exists in the static build.
import { getCollection } from 'astro:content';
import { createMarkdownEndpoint } from '@jdevalk/astro-seo-graph';

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  // Only prerender slugs for notes that actually have a markdown body —
  // bodyMd is null for older notes the CMS hasn't backfilled yet, and
  // there's no useful markdown to serve for those (no static path → 404
  // for that slug, instead of shipping an empty body).
  return notes.filter((note) => note.data.bodyMd).map((note) => ({ params: { slug: note.data.slug } }));
}

export const GET = createMarkdownEndpoint({
  entries: () => getCollection('notes'),
  // Slug-match guard: only the entry whose slug equals the requested param
  // may render. Without this, the first entry whose mapper returns
  // non-null would win for every URL — a known footgun in this package.
  mapper: (note, slug) => {
    if (note.data.slug !== slug || !note.data.bodyMd) return null;
    return {
      frontmatter: {
        title: note.data.title,
        canonical: `https://www.wookinwai.com/notes/${note.data.slug}/`,
        pubDate: note.data.pubDate,
        updatedDate: note.data.updatedDate ?? undefined,
        author: 'Woo Kin Wai',
        description: note.data.seoDescription ?? note.data.description,
        tags: note.data.tags,
      },
      body: note.data.bodyMd,
    };
  },
});
