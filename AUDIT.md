# Repository Audit — wookinwai-com-web

**Date:** 2026-06-09 · **Scope:** comprehensive (security, dependencies, code quality, config/infra) · **Commit audited:** `68dff9d`

## Summary

**Overall risk: LOW.** This is a well-built static Astro 6 site deployed to Cloudflare Workers static assets. There are no known dependency vulnerabilities (`npm audit`: 0 across 442 packages), no secrets in the repo, strong baseline security headers, and every `set:html` usage was traced to a safe source. The one functional defect found is that the sitemap advertised in `robots.txt` is never generated because the repo has no `astro.config.mjs` to register the `@astrojs/sitemap` integration. Remaining items are hardening and hygiene recommendations.

## Findings

| # | Severity | Finding |
|---|----------|---------|
| W-1 | Medium | ~~Sitemap is advertised but never generated~~ — **fixed in `569fb54`** (astro.config.mjs added) |
| W-2 | Low | CSP allows `'unsafe-inline'` for scripts |
| W-3 | Info | `set:html` sites verified safe — trust boundary is the CMS |
| W-4 | Info | JSON-LD injection relies on data staying static |
| W-5 | Info | No tests, linting, or CI |

### W-1 (Medium) — Sitemap advertised but never generated

> **Resolved in commit `569fb54`** (Quiet Pages redesign): `astro.config.mjs` now sets
> `site: 'https://www.wookinwai.com'` and registers `sitemap()`. The build emits
> `sitemap-index.xml`, and canonical URLs / RSS derive from `Astro.site`. The original
> finding is kept below for the record.

There is no `astro.config.*` file in the repo, so:

- `@astrojs/sitemap` (a direct dependency in `package.json`) is never registered — integrations can only be activated in the Astro config — so **no `sitemap-index.xml` is ever emitted by the build**.
- `public/robots.txt` advertises `Sitemap: https://www.wookinwai.com/sitemap-index.xml` and `src/layouts/BaseLayout.astro:55` links `<link rel="sitemap" href="/sitemap-index.xml" />`. Both currently resolve to the 404 page. Search engines crawling robots.txt will repeatedly hit a missing sitemap.
- `Astro.site` is undefined, so canonical URLs (`src/components/SEO.astro:21`) and the RSS feed (`src/pages/rss.xml.ts:12`) only work because of hard-coded fallbacks.

**Remediation:** add an `astro.config.mjs` with `site: 'https://www.wookinwai.com'` and `integrations: [sitemap()]`. This also lets you drop the hard-coded fallbacks in `SEO.astro` and `rss.xml.ts`.

### W-2 (Low) — CSP allows `'unsafe-inline'` scripts

`public/_headers` ships a solid CSP, but `script-src 'self' 'unsafe-inline' https://*.clarity.ms` permits any injected inline script to run, which removes most of the XSS protection a CSP provides. For a static site whose only dynamic HTML comes from your own server-sanitized CMS, the practical risk is low, but it can be tightened:

- Astro 6 supports experimental CSP support (`experimental.csp`) which emits hashes for its inline scripts, allowing `'unsafe-inline'` to be dropped from `script-src`.
- The Clarity bootstrap snippet can be hashed or moved to an external file.
- `style-src 'unsafe-inline'` is harder to remove (Astro scoped styles and the theme toggle rely on it) and is a much lower-value attack surface; reasonable to keep.

### W-3 (Info) — `set:html` usage verified safe

All four raw-HTML sinks were traced to their sources:

| Location | Source | Verdict |
|---|---|---|
| `src/pages/index.astro:305` | CMS `bodyHtml` | Sanitized server-side by the API (`sanitize-html` allowlist, on save **and** on read) |
| `src/pages/notes/[...slug].astro:13` | CMS `bodyHtml` | Same as above |
| `src/pages/contact.astro:165` | `faqs` array defined statically in the same file (`contact.astro:39`) | Author-controlled, safe |
| `src/components/SEO.astro:77` | `JSON.stringify` of a static object | Safe |

Residual risk: the trust boundary is the CMS admin account. If that single account is compromised, sanitized-but-attacker-authored content reaches this site. That is an accepted property of the architecture, not a defect.

### W-4 (Info) — JSON-LD `</script>` edge case

`SEO.astro:77` injects `JSON.stringify(jsonLd)` into a `<script type="application/ld+json">`. `JSON.stringify` does not escape `</script>`, so if CMS-derived strings (e.g. note titles) are ever added to `jsonLd`, a value containing `</script>` could break out of the tag. Today the object is entirely static, so this is informational only. If you ever feed dynamic data in, escape `<` as `<` first.

### W-5 (Info) — No tests, linting, or CI

- No test runner, no ESLint, no `.github/workflows/`. Prettier is the only tooling.
- Deploys appear to rely on the Cloudflare deploy hook / manual `npm run deploy`; nothing verifies `astro build` succeeds before content publishes trigger a rebuild.
- Lowest-effort win: a single GitHub Actions workflow running `npm ci && npm run build` (and `prettier --check .`) on push. A failing CMS fetch already fails production builds by design (`src/content.config.ts:25-39` — good), so a green build is a meaningful signal here.

## Dependency report

`npm audit`: **0 vulnerabilities** (info/low/moderate/high/critical all 0; 442 packages resolved).

All direct dependencies are current except a patch-level lag on Astro:

| Package | Locked | Latest | Note |
|---|---|---|---|
| astro | 6.4.4 | 6.4.5 | patch update available |
| everything else | — | — | already at latest |

No upgrade constraints. `npm update astro` when convenient.

## Strengths

- Zero `npm audit` findings; dependency set is small and current.
- No secrets, no committed `.env` (gitignore covers `.env`, `.env.production`).
- Strong security-header baseline in `public/_headers`: `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, `frame-ancestors 'none'`, `form-action 'self'`, scoped `img-src`/`connect-src`.
- Strict TypeScript (`astro/tsconfigs/strict`).
- Build fails loudly in production if the CMS is unreachable (`content.config.ts`) — an empty site can't silently ship.
- Zod schemas validate the CMS contract at build time (`content.config.ts`).
- Accessibility-conscious: animations gated behind a `.motion` class respecting reduced-motion.

## Prioritized recommendations

1. ~~**Fix the sitemap** (W-1)~~ — done in `569fb54` (`astro.config.mjs` with `site` + `sitemap()`).
2. **Add minimal CI** (W-5): build + format check on push. (`npm run format` works again as of `569fb54` — the prettier config was renamed to `.cjs`.)
3. **Tighten CSP `script-src`** (W-2) via Astro's experimental CSP hashing when convenient.
4. Bump `astro` to 6.4.5.
