# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # astro dev: local server at http://localhost:4321
npm run build      # astro build: prerenders the whole site to ./dist
npm run preview    # astro preview: serve the built ./dist
npm run format     # prettier -w . (Astro plugin; 120 cols, single quotes, semicolons)
npm run cf:preview # astro build && wrangler dev: preview the static-assets build on Workers
```

Node `>=22.12`. There is no test suite and no separate lint step; `npm run build` (Astro type-checks `.astro` frontmatter) plus `npm run format` are the checks.

**Deploy is not local.** Both wookinwai.com repos deploy through **Cloudflare Workers Builds** (Git-connected): pushing the connected branch builds `dist/` and publishes it as a Workers static-assets site (`wrangler.jsonc`, no `main` worker). The `deploy` npm script (`astro build && wrangler deploy`) exists only as a manual fallback.

## Architecture

**Static Astro 6 site.** Fully prerendered, no SSR and no Cloudflare adapter. `astro.config.mjs` only sets `site` + the sitemap integration, and output is plain static assets in `dist/`.

**Content is fetched from an external CMS at build time.** `src/content.config.ts` defines the `work` and `notes` collections with custom loaders that `fetch` JSON from the CMS API (default `https://api.wookinwai.com`, override with `PUBLIC_API_URL`). The CMS lives in a **separate repo, `wookinwai-com-api`** (a working directory of this session); a CMS publish fires a Cloudflare deploy hook that rebuilds this site. Failure handling is asymmetric and important:
- In **dev**, an unreachable/erroring CMS only warns and yields `[]`, so the site runs standalone.
- In a **production build** it **rethrows**, so a broken API can never silently ship an empty live site. Consequence: `npm run build` requires the CMS reachable. To build offline or against test data, point `PUBLIC_API_URL` at a local mock that serves `/api/work` and `/api/notes`. Zod schemas in this file (e.g. the `status` enum) must match what the CMS emits.

**`src/consts.ts` is the single source of truth** for identity and chrome: `SITE`, `NAV`, `SOCIALS`, and `PROFILE_LINKS` (the `/card` channel list). `Header`, `Footer`, and pages read from it; edit links/identity here, not inline.

**Design system: "The Drafting Table"** (paper tones, a single drafting-green accent, Source Serif 4 + IBM Plex Mono, hand-drawn plot background and registration ticks).
- All tokens live in `src/styles/global.css` under Tailwind v4's `@theme` block (CSS-first config: there is **no `tailwind.config`**, and Tailwind is wired via `@tailwindcss/postcss` in `postcss.config.mjs`). `font-sans` = Source Serif 4, `font-mono` = IBM Plex Mono.
- **Theming** is one set of CSS custom properties re-declared under `html[data-pal='ink']` (the "lamplight"/dark palette), so the whole site re-themes through the `data-pal` attribute with no per-utility dark variants. The toggle persists to `localStorage['pal']`.
- Reusable idioms (defined in `global.css`, used across pages): `.rise` + `.d1`–`.d4` entrance delays, `.reveal` + `.sec-rule` scroll reveals, `[data-stagger]` cascades, `.row-edge` green-rule hover, `.smark.<status>` work-status markers. `SectionHead`, `EmailButton`, and `Ticks` are the shared building blocks; new pages should compose these rather than invent new patterns.

**`BaseLayout.astro` owns the chrome and is View-Transitions aware** (`<ClientRouter />`). This drives several non-obvious rules:
- A pre-paint `is:inline` head script sets `data-pal` and adds the `.motion` class before first paint (avoids theme flash; `.motion` gates the staggered-reveal hidden states in CSS so no-JS/reduced-motion keep everything visible).
- The inline head script does **not** re-run on client-side navigation, so palette + motion are re-asserted on `astro:after-swap`, and all interactive handlers (theme toggle, `IntersectionObserver`s, the homepage anime.js relays, the `/card` copy button) re-bind on `astro:page-load`. **Any new client script must follow this pattern** (bind on `astro:page-load`, guard with a `dataset.*` flag) or it will break after the first navigation.
- `animejs` powers the `[data-stagger]` cascades here and the homepage's growth→gap→build / timeline "relays" (`src/pages/index.astro` `<script>`), which play only on-screen and skip under reduced motion.

Path alias: `~/*` → `src/*` (`tsconfig.json`, extends `astro/tsconfigs/strict`).

## Conventions

- **No em dashes in user-facing copy** (owner preference). Use commas/periods/colons, or the site's kicker separator ` · `. Dev-only code/HTML comments are exempt.
- Page kickers, labels, and footers are lowercase mono; headings are serif with a closing green-italic emphasis word (`<em class="font-medium italic text-acc">`); match this voice when adding copy.
- `docs/claude-design-files/` is the design source-of-truth (tokens, guidelines). `docs/old/` is the previous (mosaic) design, kept for reference only; do not wire it into the build.
