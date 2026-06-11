// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// `site` powers canonical URLs (SEO.astro), the RSS feed, and the sitemap —
// previously these relied on hard-coded fallbacks and robots.txt advertised a
// sitemap that was never generated.
export default defineConfig({
  site: 'https://www.wookinwai.com',
  integrations: [sitemap()],
});
