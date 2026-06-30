// IndexNow key verification file: https://www.bing.com/indexnow
// Served at /<INDEXNOW_KEY>.txt once a key is generated and set as an env
// var. No key in this prerendered build = getStaticPaths returns no routes,
// so the path simply doesn't exist (no broken/empty route shipped).
import type { APIRoute } from 'astro';
import { createIndexNowKeyRoute } from '@jdevalk/astro-seo-graph';

const key = process.env.INDEXNOW_KEY;

export function getStaticPaths() {
  return key ? [{ params: { key } }] : [];
}

const notConfigured: APIRoute = () => new Response('IndexNow key not configured', { status: 404 });

export const GET: APIRoute = key ? createIndexNowKeyRoute({ key }) : notConfigured;
