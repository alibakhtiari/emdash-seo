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
- [ ] Entity→schema output: emit ECI `detected` entities as `mentions` (Thing
  nodes, cap 5) and point page `about` at the top entity instead of always the
  publisher org (verified gap 2026-10-09: signal computed then discarded;
  `engine/schema-builder.ts`, keywords already flow in).
- [ ] Speakable template contract: default selectors match no theme DOM
  (verified: only admin/docs/tests reference them). Ship documented classes in
  layouts (or drop defaults) so emitted `cssSelector` resolves; fall back to
  `speakableText` excerpt when selectors are absent.
- [ ] Training/search crawler split: per-group robots policies (allow
  `OAI-SearchBot`/`Claude-SearchBot` for citations, deny `Google-Extended`/
  `CCBot`/`anthropic-ai` for training) replacing the single `blockAiBots`
  boolean (`routes/robots.ts`).
- [ ] GEO research trio: freshness check (`dateModified` age),
  statistic-attribution check ("According to…" sourcing), semantic-slug check
  (slug mirrors focus keyword terms).
- [ ] Product commerce depth: dedicated `sku`, `gtin`, `brand`, `price`,
  `availability`, `shipping` fields flowing into the Product emitter instead of
  `schemaOverrides` passthrough only (`types.ts`, `engine/schema-builder.ts`,
  editor widget).
- [x] Email reports (`engine/digest.ts` + `plugin:activate` scheduling + `cron`
  dispatch): weekly audit digest with score deltas, opt-in via `digest_enabled`/
  `digest_email` settings, honest skip reasons, `email:send` capability declared.
  Webhooks not shipped: outbound fetch is allowlist-bound (`allowedHosts`),
  which cannot cover user URLs — recorded, not silently half-built.
- [x] RSS footer / attachment redirect: verified host-side (`src/pages/rss.xml.ts`
  renders the feed; attachment routing has no plugin request hook) — correctly
  out of plugin scope, not built.
- [x] HowTo/FAQ rich-result copy: corrected to "schema markup and AI answers"
  (general sites are ineligible for FAQ rich results since 2023).
- [ ] Multi-location entities: `locations[]` on the business profile emitting
  one node per branch (LocalBusiness + department/subOrganization links).
- [ ] Generative Content-AI suggestions: rewrite/title FAQ copy via
  `pickDirectAnswer`-style injection is done for ranking; full generative
  rewrite suggestions still need a host-provided model call — open, small
  (follow the `ctx.embedTexts` injection pattern).
- [ ] Outbound-authority citation heuristic: reward links to authoritative
  domains in E-E-A-T scoring (today only counts exist via `external_links`).
- [ ] Settings-template import: map RankMath `rank-math-options-titles` /
  robots rules into plugin options during migration (`importers/*`).
- [ ] HowTo/FAQ rich-result copy: review admin guidance strings against
  current Google documentation (flagged 2026-10-09, unverified wording).
- [ ] RSS footer/header link attribution (minor).
- [ ] Attachment-URL redirect handling (minor; likely host-adjacent — verify
  before building).

## Remaining — blocked (do not build until unblocked)

- [ ] GSC integration — blocked: external OAuth/API credentials and consent flow.
- [ ] Corpus IDF + vector salience (incl. honest BM25 labeling: `idf` defaults
  to 1.0 at the sole call site) — blocked: sync `analyzeContent` has no async
  KV path; needs engine refactor. No dead code shipped instead.
- [x] IndexNow fan-out route + host cron scheduling (`plugin:activate` ensures
  daily fan-out, `cron` dispatches to it; external scheduler still works)
- [x] Embeddings bridged (not dead): `cosineSimilarity` + `pickDirectAnswer`
  re-rank via `ctx.embedTexts` or `ctx.env.AI` bge-small, lexical fallback,
  tested both paths

## Audit 2026-10-09 v2 — verified findings log (all claims checked line-level)

Fixed same-day: `/answers` draft disclosure (published-status 404 +
confidence-floor nulls instead of `faqs[0]`); robots llms exception when
blocked + 5 missing search/training bots; `llms-full` HTML stripped via
`cleanHtmlStructure`; `score += 0` no-op removed; docs corrected (redirect
wording, agent statuses). Refuted with evidence: title digit/power checks stay
(info-weight CTR hints mirroring RankMath's own title tests); `extractTopicalNgrams`
+ `getWorkersAiEmbeddings` are tested public API exports, not dead code.
Accepted risk: auth fail-open on identity-less ctx (server-side/host-internal
calls carry no identity; host route permission is the primary layer) — recorded
here instead of silently assumed. Nuance kept: redirect matcher + fuzzy + 404
store are library/admin surfaces over host-owned serving, not request hooks;
no mass deletion (write-through already primary).

## Decisions — intentionally not built

- Stemming/morphology: exact `\bkw\b` kept (dependency-free, predictable).
- Slug-change 301s: host creates them natively with chain collapsing; plugin
  `onSlugChange` stays a CSV/manual utility (duplicating would shadow host rules).
- HTTP `Link:` headers: host-owned, not plugin-emittable; HTML discovery links
  shipped instead.
- IndexNow key-file publicness: by design (verification requires it).
- 404 request-time logging: host middleware owns it; plugin store is KV-backed
  API + admin surface, not a second logger.
