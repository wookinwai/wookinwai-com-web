import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site URL feeds Astro.site — canonical URLs (SEO.astro), the RSS feed, and
// the sitemap that robots.txt + BaseLayout's <link rel="sitemap"> point at.
export default defineConfig({
  site: 'https://www.wookinwai.com',
  integrations: [sitemap()],
});
