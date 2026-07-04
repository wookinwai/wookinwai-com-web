// RFC 9727 API catalog at /.well-known/api-catalog — lists the site's
// machine-readable endpoints (schema.org JSON, schema map, RSS, sitemap) so
// agents can discover them without crawling HTML.
import { createApiCatalog } from '@jdevalk/astro-seo-graph';

export const GET = createApiCatalog({
  siteUrl: 'https://www.wookinwai.com',
  schemaEndpoints: [{ path: '/schema/notes.json', schemaType: 'BlogPosting' }],
  schemaMap: { path: '/schemamap.xml' },
  additional: [{ anchor: '/rss.xml', type: 'https://www.w3.org/2005/Atom' }, { anchor: '/sitemap-index.xml' }],
});
