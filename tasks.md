# WebABC SEO (`@emdash/plugin-seo`) — Remaining Tasks

Date: 2026-10-09. Health: 219/219 vitest (20 files), `astro check` 0 errors,
`eslint` 0 errors, `astro build` clean, max src file 499 lines, `dependencies: {}`.

Prior work (P0/P1/P2, all landed and tested) was removed from this file to keep
it actionable. `git log --oneline` is the record of what shipped: per-type
title templates, 32-check analyzer, 17-type connected `@graph`, content-driven
sitemaps (index/news/video/image/xhtml) + XSL, settings-driven robots (13 AI
bots), host-write-through redirects, KV protocol cache, IndexNow lifecycle +
key-file + fan-out route, passage citability → `llms-full`, Answers API,
speakable/FAQ loop, 4-engine WP import + CSV, bulk editor, enforced role
matrix, settings export/import, honest audits, E-E-A-T/GEO scoring.

Constraints (every task): files in `packages/emdash-seo/src/` stay <= 500 lines,
zero emojis (SVG icons in `admin/icons.tsx` only), zero runtime deps, Cloudflare
Workers free-tier safe (< 10 ms CPU, string buffers, capped loops), native plugin
contract (`format: "native"` in `packages/emdash-seo/src/index.ts`), single
**WebABC SEO** sidebar item. No fiction: error paths fail loudly, no seeded data.

Verify per task: `pnpm vitest run`, `pnpm run typecheck`, `pnpm run lint`.

## Remaining — actionable (ranked)

- [ ] Score history/trends: persist capped audit snapshots (e.g. last 30, KV list)
  and render a trend sparkline/table in the Audit hub tab. Today only latest is
  kept (`routes/api-v1/state.ts`, `admin/settings/HubDataTabs.tsx`).
- [ ] Product commerce depth: dedicated `sku`, `gtin`, `brand`, `price`,
  `availability`, `shipping` fields flowing into the Product emitter instead of
  `schemaOverrides` passthrough only (`types.ts`, `engine/schema-builder.ts`,
  editor widget).
- [ ] Email reports/webhooks: scheduled audit digest (opt-in settings keys +
  host email/cron access) with score deltas and top issues.
- [ ] Multi-location entities: `locations[]` on the business profile emitting
  one node per branch (LocalBusiness + department/subOrganization links).
- [ ] Generative Content-AI suggestions: rewrite/titleFAQ suggestions via
  Workers AI when `env.AI` exists, lexical fallback otherwise. The
  `getWorkersAiEmbeddings` stub (`engine/semantic-analyzer.ts`) is the seam —
  wire it or delete it.
- [ ] Outbound-authority citation heuristic: reward links to authoritative
  domains in E-E-A-T scoring (today only counts exist via `external_links`).
- [ ] Settings-template import: map RankMath `rank-math-options-titles` /
  robots rules into plugin options during migration (`importers/*`).
- [ ] RSS footer/header link attribution (minor).
- [ ] Attachment-URL redirect handling (minor; likely host-adjacent — verify
  before building).

## Remaining — blocked (do not build until unblocked)

- [ ] GSC integration — blocked: external OAuth/API credentials and consent flow.
- [ ] Corpus IDF + vector salience — blocked: sync `analyzeContent` has no async
  KV path; needs engine refactor. No dead code shipped instead.
- [ ] IndexNow fan-out cron trigger — blocked: no host cron hook. The
  `_emdash/api/seo/indexnow/fanout` route is ready for an external scheduler.

## Decisions — intentionally not built

- Stemming/morphology: exact `\bkw\b` kept (dependency-free, predictable).
- Slug-change 301s: host creates them natively with chain collapsing; plugin
  `onSlugChange` stays a CSV/manual utility (duplicating would shadow host rules).
- HTTP `Link:` headers: host-owned, not plugin-emittable; HTML discovery links
  shipped instead.
- IndexNow key-file publicness: by design (verification requires it).
- 404 request-time logging: host middleware owns it; plugin store is KV-backed
  API + admin surface, not a second logger.
