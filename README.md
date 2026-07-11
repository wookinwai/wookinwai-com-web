# wookinwai.com

[![Quality](https://github.com/wookinwai/wookinwai-com-web/actions/workflows/quality.yml/badge.svg)](https://github.com/wookinwai/wookinwai-com-web/actions/workflows/quality.yml)
[![Link check](https://github.com/wookinwai/wookinwai-com-web/actions/workflows/link-check.yml/badge.svg)](https://github.com/wookinwai/wookinwai-com-web/actions/workflows/link-check.yml)

Personal website for Woo Kin Wai, a software builder and technical partner for founders and SMEs.

The site is a fully prerendered Astro application. It fetches work and notes from the companion CMS during each build, then deploys the generated files through Cloudflare Workers Builds.

## Quick start

Requirements: Node.js 22.12 or newer and a reachable CMS API.

```bash
npm ci
npm run dev
```

The local site runs at `http://localhost:4321`. Set `PUBLIC_API_URL` to use another CMS endpoint. Development tolerates an unavailable CMS, but production builds fail instead of publishing an empty site.

## Checks

```bash
npm run check
npm run format:check
npm run build
```

GitHub Actions runs the same type, content-schema, formatting, build, dependency, and generated-link checks on pushes to `main` and on pull requests.

## Architecture

- Astro 7 with static output
- Tailwind CSS 4 through the Vite plugin
- Content collections loaded from `https://api.wookinwai.com`
- Build-time SEO validation and sitemap generation
- Cloudflare Workers static-assets deployment

Identity, navigation, and profile links live in `src/consts.ts`. Design tokens and shared visual patterns live in `src/styles/global.css`.

## Deployment

Cloudflare Workers Builds owns normal deployment. A push to the connected branch builds `dist/` and publishes it as a static-assets Worker. The local `npm run deploy` command is only a manual fallback.

CMS publishing triggers a Cloudflare deploy hook so the static site rebuilds with the latest content.
