// Sitemap-style XML index of the site's schema.org JSON endpoints — lets
// agent crawlers discover the structured-data corpus without parsing HTML.
import { getCollection } from 'astro:content';
import { createSchemaMap } from '@jdevalk/astro-seo-graph';

const notes = await getCollection('notes');
const latestNoteUpdate = notes.reduce<Date>((latest, note) => {
  const updated = note.data.updatedDate ?? note.data.pubDate;
  return updated > latest ? updated : latest;
}, new Date(0));

export const GET = createSchemaMap({
  siteUrl: 'https://www.wookinwai.com',
  entries: [{ path: '/schema/notes.json', lastModified: notes.length ? latestNoteUpdate : new Date() }],
});
