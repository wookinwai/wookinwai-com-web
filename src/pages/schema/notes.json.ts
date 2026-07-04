// Corpus-wide schema.org @graph for all notes, as JSON-LD. An agent-discovery
// surface: crawlers can fetch the whole site's structured data for /notes/*
// in one request instead of scraping per-page <script type="application/ld+json">
// tags. Reuses the same piece-builders as the per-page graph (src/lib/seo.ts)
// so the two never drift.
import { getCollection } from 'astro:content';
import { createSchemaEndpoint } from '@jdevalk/astro-seo-graph';
import { articleGraphPieces } from '~/lib/seo';

export const GET = createSchemaEndpoint({
  entries: () => getCollection('notes'),
  mapper: (note) => articleGraphPieces(note, new URL(`/notes/${note.data.slug}/`, 'https://www.wookinwai.com')),
});
