// Central JSON-LD graph builders, wired through @jdevalk/seo-graph-core so
// every entity cross-references the others by a stable @id (Person worksFor
// → Organization, WebSite author/publisher → Person, Article author/publisher
// → Person/Organization, WebPage isPartOf → WebSite, etc). Replaces the old
// hand-rolled, disconnected @graph in components/SEO.astro.
import {
  assembleGraph,
  buildArticle,
  buildBreadcrumbList,
  buildImageObject,
  buildPiece,
  buildWebPage,
  buildWebSite,
  makeIds,
  type BreadcrumbItem,
  type GraphEntity,
} from '@jdevalk/seo-graph-core';
import { breadcrumbsFromUrl } from '@jdevalk/astro-seo-graph';
import type { CollectionEntry } from 'astro:content';
import type { Organization, Person } from 'schema-dts';
import { SITE } from '~/consts';

const ids = makeIds({ siteUrl: SITE.url });

// Stable @id for the org entity, scoped under the site's id namespace.
const organizationId = ids.organization('tiny-edges');

/**
 * Site-wide singletons: Person + Organization, linked by @id. There's no
 * dedicated buildPerson/buildOrganization export in seo-graph-core (only
 * buildWebSite, buildSiteNavigationElement, buildWebPage, buildArticle,
 * buildBreadcrumbList, buildImageObject, buildVideoObject) — these two use
 * the generic buildPiece with a schema-dts type param for autocomplete.
 */
function buildPerson(): Record<string, unknown> {
  return buildPiece<Person>({
    '@type': 'Person',
    '@id': ids.person,
    name: SITE.author,
    url: SITE.url,
    jobTitle: SITE.role,
    email: `mailto:${SITE.email}`,
    worksFor: { '@id': organizationId },
    address: { '@type': 'PostalAddress', addressLocality: SITE.location, addressCountry: 'MY' },
  });
}

function buildOrganization(): Record<string, unknown> {
  return buildPiece<Organization>({
    '@type': 'Organization',
    '@id': organizationId,
    name: SITE.org,
    url: SITE.orgUrl,
    founder: { '@id': ids.person },
    address: { '@type': 'PostalAddress', addressLocality: SITE.location, addressCountry: 'MY' },
  });
}

/** The site-wide trio (WebSite + Person + Organization) shared by every graph. */
function siteEntities(): Record<string, unknown>[] {
  const person = buildPerson();
  const organization = buildOrganization();
  const website = buildWebSite(
    {
      url: SITE.url,
      name: SITE.author,
      description: SITE.role,
      publisher: { '@id': ids.person },
    },
    ids
  );
  return [website, person, organization];
}

/** WebSite + Person + Organization, assembled and cross-linked by @id. */
export function siteGraph(): { '@context': 'https://schema.org'; '@graph': GraphEntity[] } {
  return assembleGraph(siteEntities() as GraphEntity[], { warnOnDanglingReferences: true });
}

/** Derive an ordered BreadcrumbItem[] from a page URL via the package helper. */
function breadcrumbItems(url: URL, pageName: string): BreadcrumbItem[] {
  return breadcrumbsFromUrl({
    url,
    siteUrl: SITE.url,
    pageName,
  });
}

/** Site graph entities + WebPage + BreadcrumbList for a static page. */
export function pageGraph(input: { url: URL; title: string; description?: string }): {
  '@context': 'https://schema.org';
  '@graph': GraphEntity[];
} {
  const { url, title, description } = input;
  const pageUrl = url.href;

  const webPage = buildWebPage(
    {
      url: pageUrl,
      name: title,
      description,
      isPartOf: { '@id': ids.website },
      breadcrumb: { '@id': ids.breadcrumb(pageUrl) },
    },
    ids
  );

  const breadcrumb = buildBreadcrumbList(
    {
      url: pageUrl,
      items: breadcrumbItems(url, title),
    },
    ids
  );

  return assembleGraph([...siteEntities(), webPage, breadcrumb] as GraphEntity[], {
    warnOnDanglingReferences: true,
  });
}

/**
 * Raw schema.org pieces for a note: WebPage + BreadcrumbList + BlogPosting
 * Article + ImageObject (when a hero image exists), site trio included.
 * Unassembled (no `@context`/`@graph` envelope) so callers can either pass
 * straight to `assembleGraph` (see `articleGraph` below) or to
 * `createSchemaEndpoint`'s `mapper`, which assembles internally.
 */
export function articleGraphPieces(note: CollectionEntry<'notes'>, url: URL): GraphEntity[] {
  const { title, description, heroUrl, heroAlt, pubDate, updatedDate, seoTitle, seoDescription } = note.data;
  const pageUrl = url.href;
  // SEO/schema metadata only — prefer the per-item override, fall back to the
  // on-page title/description. The visible H1/subtitle elsewhere always use
  // the raw `title`/`description`, not these.
  const metaTitle = seoTitle ?? title;
  const metaDescription = seoDescription ?? description;

  const image = heroUrl
    ? buildImageObject(
        {
          pageUrl,
          url: heroUrl,
          // Remote CMS images: actual dimensions aren't known at build time.
          // 1200x630 matches the site's og.png fallback aspect ratio.
          width: 1200,
          height: 630,
          caption: heroAlt ?? undefined,
        },
        ids
      )
    : undefined;

  const webPage = buildWebPage(
    {
      url: pageUrl,
      name: metaTitle,
      description: metaDescription,
      isPartOf: { '@id': ids.website },
      breadcrumb: { '@id': ids.breadcrumb(pageUrl) },
      ...(image ? { primaryImage: { '@id': ids.primaryImage(pageUrl) } } : {}),
    },
    ids
  );

  const breadcrumb = buildBreadcrumbList(
    {
      url: pageUrl,
      items: breadcrumbItems(url, title),
    },
    ids
  );

  const article = buildArticle(
    {
      url: pageUrl,
      isPartOf: { '@id': ids.webPage(pageUrl) },
      author: { '@id': ids.person, name: SITE.author },
      publisher: { '@id': organizationId, name: SITE.org },
      headline: metaTitle,
      description: metaDescription,
      datePublished: pubDate,
      dateModified: updatedDate ?? pubDate,
      ...(image ? { image: { '@id': ids.primaryImage(pageUrl) } } : {}),
    },
    ids,
    'BlogPosting'
  );

  return [...siteEntities(), webPage, breadcrumb, article, ...(image ? [image] : [])] as GraphEntity[];
}

/** Site graph + BlogPosting Article + ImageObject + BreadcrumbList for a note. */
export function articleGraph(
  note: CollectionEntry<'notes'>,
  url: URL
): { '@context': 'https://schema.org'; '@graph': GraphEntity[] } {
  return assembleGraph(articleGraphPieces(note, url), { warnOnDanglingReferences: true });
}
