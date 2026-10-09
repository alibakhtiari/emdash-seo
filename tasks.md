# WebABC SEO (`@emdash/plugin-seo`) — Master Task List

Date: 2026-10-08. Health: 208/208 vitest, `astro check` 0 errors, `eslint` 0 errors, max src file 497 lines, `dependencies: {}`.

Commits landed (`main` ahead 6):
- `51f223c` feat(seo): per-type title templates, verification/social head parity, metadata divergence fix
- `69979aa` feat(edge): content-driven sitemaps with index pagination, settings-driven robots with AI toggle, case-safe urls, self-ref hreflang, async llms-full
- `c785a26` feat(redirects): match options with chain guard, CRUD plus CSV and slug monitor, admin table, IndexNow key file and submission log
- `fb686e2` feat(analysis): severity-weighted scoring with readability and 5 new checks, passive and BM25 upgrades, orphan and schema audit penalties, Product Review Event Recipe Video Course schema
- `1d0601c` feat(admin): AIOSEO SEOPress CSV importers with beforeSave merge, audit and links hub tabs, SERP FAQ editor, taxonomy noindex, cornerstone panel, role guard
- `5958453` test(seo): align hreflang self-ref, en_GB locale, tags-only keywords, case-preserving urls with intended behavior

Constraints (every task): files in `packages/emdash-seo/src/` stay <= 500 lines, zero emojis (SVG icons in `admin/icons.tsx` only), zero runtime deps, Cloudflare Workers free-tier safe (< 10 ms CPU, string buffers, capped loops), native plugin contract (`format: "native"` in `packages/emdash-seo/src/index.ts`), single **WebABC SEO** sidebar item.

Verify per task: `pnpm vitest run`, `pnpm run typecheck`, `pnpm run lint`.

## Independent audit verification — 2026-10-08 (verified against code, not just claimed)

Two external audits supplied; each claim checked. Result: **all load-bearing claims CONFIRMED** except two nuance corrections. The IndexNow public-key note from the reporter is accepted: key-file publicness is by design (verification requires it) — the real gap is only that no route serves it.

Confirmed real (promoted into P0/P1 below):
- In-memory redirect + 404 stores with seeded demo data (`/legacy-carpet-care`, `/old-price-list` count 42), `storage: {}` in `packages/emdash-seo/src/index.ts:306,363`, module arrays in `packages/emdash-seo/src/routes/api-v1/state.ts:10-77` — vanish on isolate recycle
- `record404Hit` dead (defined `state.ts:72`, re-exported `index.ts:87`, zero runtime call sites); `matchRedirect`/`createRedirectResponse` zero call sites outside re-export (`index.ts:16,181-182`); no host middleware wires them
- Links tab broken: `handleLinkOpportunities` exists (`routes/api-v1/links.ts:9`), admin fetches `v1/links/opportunities/:id` (`HubDataTabs.tsx:109`), no route registered in `routes/plugin-routes.ts`
- `onSlugChange` dead (`routes/api-v1/redirects.ts:65`; other hits are unrelated React props); `parseRedirectsCsv` dead + naive `line.split(',')` corrupts quoted commas (`redirects.ts:35-58`)
- Legacy audit serves 2 hardcoded entries behind a `// Query all published content from DB` comment (`routes/api-audit.ts:8-27`); v1 audit swallows DB errors (`catch {}`) then substitutes a sample and returns `success: true` (`routes/api-v1/audit.ts:19-53`); page cap 100/collection, no pagination (`audit.ts:19-24`); mapper drops `schemaType`/`cornerstone` so "no schema" fires on ~100% and cornerstone uses the 300-word bar (`audit.ts:26-35`)
- `hasSeoCap` defined, never called (`index.ts:282`); everything trusts host `permission`
- Threshold drift: title 30-60 (`content-analyzer.ts:321`) vs audit message "Target: 40-60" (`audit-runner.ts:114`) with flag bands <30/>70 (`audit-runner.ts:114-117`); desc 120-156 (`content-analyzer.ts:306-316`) vs audit <70/>165 (`audit-runner.ts:136-141`); GEO copy 35-55/25-50 words vs code 18-75/8-65 (`geo-aeo-analyzer.ts:124,200,275,332`)
- Only `focusKeywords[0]` scored (`content-analyzer.ts:36`, `head-compiler.ts:122`, `metadata-handler.ts:38`, `content-hooks.ts:193`); no duplicate-focus/cannibalization check; `findInternalLinkOpportunities` never excludes already-linked targets (`link-analyzer.ts:67-103`, no existing-link check)
- Cleaning-business bias in generic engine: `clean`/`carpet` cluster routing + "related cleaning services" string (`content-analyzer.ts:258,397-414`), `rugs|carpets` stat regex (`geo-aeo-analyzer.ts:30`); SERP preview ships carpet-cleaning-London demo defaults (`admin-preview.tsx:32-52`, standalone page — editor SERP tab itself is live-wired)
- `og:title` override dropped on the `page:metadata` path (derives from `fullTitle` in `metadata-handler.ts:54`, honors `metaDescription→ogDescription` fallback at `:57`); cached precompute path carries `ogTitle` (`head-compiler.ts:90-94`) — behavior depends on render path
- Dead options with zero consumers outside `types.ts`: `titleTemplates`, `descriptionTemplates`, `sitemapOptions`; sitemap priority/changefreq hardcoded (`sitemap.ts:137-138,164-166`), featured-image-only, no GSC integration, no settings import/export anywhere in `src`

Refuted / nuanced (not added as defects):
- "SERP preview shows demo data, not live entry" — only true of the standalone demo page defaults; the editor `serp` tab is wired to the live entry. Kept as de-branding polish (P2), not a correctness bug.
- "Public IndexNow key is a vulnerability" — rejected per reporter verification; keys are public by spec. Only the missing `/{key}.txt` route is tracked (P0).

## DONE — WordPress parity + GEO/AEO baseline

- [x] Per-type template types (`SeoTemplateKey`, `titleTemplates/descriptionTemplates`, `archiveNoindex`, verification, `twitterSite/Creator`, `fbAppId`, `sitemapOptions`) — `packages/emdash-seo/src/types.ts:172-244`
- [x] Variable tokens (`%seo_title%/%focuskw%/%currentdate%/%page%/%pt_plural%/%parent_title%/%customField:%`) — `packages/emdash-seo/src/config.ts:97-121`
- [x] Head parity (template title, full robots, OG image alt/secure/type, `article:section/tag`, Twitter site/creator, hreflang) — `packages/emdash-seo/src/engine/head-compiler.ts:233-359`, `packages/emdash-seo/src/engine/metadata-handler.ts:14-308`, `packages/emdash-seo/src/head/SeoHead.astro:93-206`, `packages/emdash-seo/src/head/OpenGraph.astro:48-93`
- [x] Sitemap content-driven + 1000/file pagination + per-collection + image + cache headers — `packages/emdash-seo/src/routes/sitemap.ts:76-233`
- [x] Robots settings-driven + AI-bot toggle + crawl-delay — `packages/emdash-seo/src/routes/robots.ts:29-103`
- [x] URLs case-safe + `/page/N` + query + i18n prefix — `packages/emdash-seo/src/engine/urls.ts:35-93`
- [x] Hreflang self-ref + x-default + BCP-47 — `packages/emdash-seo/src/engine/hreflang.ts:55-93`
- [x] `llms.txt` dynamic + `llms-full.txt` 1500ch x 100 — `packages/emdash-seo/src/routes/llms-txt.ts:54-298`
- [x] Redirects exact/prefix/regex + ignoreQuery/slash/case + self-loop + 5-hop chain guard + 410/451 — `packages/emdash-seo/src/routes/redirects.ts:51-172`
- [x] Redirect CRUD API + CSV parser + `onSlugChange` helper + admin table + IndexNow key/log/debounce/tombstones — `packages/emdash-seo/src/routes/api-v1/redirects.ts:35-243`, `packages/emdash-seo/src/admin-redirects.tsx:107-172`, `packages/emdash-seo/src/engine/indexnow.ts:19-374`
- [x] Analyzer 19 checks + severity weighting (`error=3/warning=2/info=1`) + readability wired + 5 new checks (`external_links`, `meta_desc_length` 120-156, `title_width` 30-60, `image_keyphrase`, `keyphrase_distribution`) — `packages/emdash-seo/src/engine/content-analyzer.ts:121-423`
- [x] Passive (`be`/`have-been`/`get`), transitions (~100), complex words, BM25 (`k1=1.2,b=0.75`) feeding ECI 20%, orphan/schema audit penalties — `packages/emdash-seo/src/engine/sentence-segmenter.ts:184-222`, `packages/emdash-seo/src/engine/semantic-analyzer.ts:158-295`, `packages/emdash-seo/src/engine/audit-runner.ts:50-183`
- [x] Schema WebSite/Org/LocalBusiness/WebPage/Speakable/Nav/Blog/Breadcrumb/ItemList/Service/Article-family/Product/Review/Event/Recipe/VideoObject/Course/HowTo/FAQPage + `inferSchemaType` — `packages/emdash-seo/src/engine/schema-builder.ts:100-438`, `packages/emdash-seo/src/engine/schema-nodes.ts:99-116`
- [x] Importers RankMath/Yoast/AIOSEO/SEOPress/CSV + `beforeSave` fill-empty merge — `packages/emdash-seo/src/importers/*`, `packages/emdash-seo/src/hooks/content-hooks.ts:44-72`
- [x] Single-hub admin (Settings/Preview/Readability/Alts/Fuzzy301/Audit/Links), taxonomy noindex, cornerstone panel, SERP/FAQ editor tabs, `hasSeoCap` + `seo:manage` stamping — `packages/emdash-seo/src/admin/settings-page.tsx:126-136`, `packages/emdash-seo/src/admin/settings/HubDataTabs.tsx:32-159`, `packages/emdash-seo/src/index.ts:282-299`

## P0 — blocks "same power as RankMath Pro / Yoast Premium" claim

- [x] Consumed `titleTemplates/descriptionTemplates` per collection in `head-compiler.ts` + `metadata-handler.ts` with `defaultTitleTemplate` fallback; seeded per-type defaults + `archiveNoindex` in `config.ts`
- [x] Auto `rel=prev/next` + paginated canonical (`/page/1` collapses to base) in precomputed head + `metadata-handler` (`SeoHead.astro` props pre-existed)
- [x] Bulk meta editor: `PATCH /_emdash/api/seo/v1/meta` (body `{entries}`, cap 100) + `BulkMetaTab` hub table (`HubDataTabs.tsx`, `settings-page.tsx` bulk tab)
- [x] Redirect parity: status selector 301/302/307/308/410 in admin (`admin-redirects.tsx`); `308` in `RedirectRule` union (`types.ts`); CSV import via `POST {csv}` with quote-aware parser; host `RedirectAccess` write-through (GET/POST/PUT/DELETE) so rules take effect in middleware; hit counts via `recordRedirectHit` + host `hits`
- [x] IndexNow spec route: `GET /_emdash/api/seo/indexnow/key.txt` (`plugin-routes.ts`, public by design); log persisted to KV (`indexnow.ts` `persist/loadIndexNowLog`)
- [x] Sitemap discovery: served `sitemap.xsl` route; `xhtml:link hreflang` alternates; honored `sitemapOptions.excludeCollections/maxUrlsPerFile`; content `<img>` parse (cap 3, max 4 images/URL)
- [x] Persistence (audit-confirmed): KV-backed redirect/404 stores with memory fallback, demo fixtures deleted (`routes/api-v1/state.ts`); host `RedirectAccess.list()` shape (`{items}`) handled; storage reads prefer host → KV → memory
- [x] Request-time wiring (audit-confirmed, corrected): host owns request-time serving (native middleware), 404 logging, and slug-change 301s (`createAutoRedirect` with chain collapsing) — plugin defers instead of duplicating; registered missing `links/opportunities`, `meta` (GET/PUT/PATCH), key-file routes; `onSlugChange` kept as utility for CSV/manual flows (decision noted in `content-hooks.ts`)
- [x] Honest audit data (audit-confirmed): legacy audit reads real entries or 501s; v1 500s on DB failure (no fiction); mapper carries `schemaType`/`cornerstone`; cursor pagination to 2000; dual endpoints kept (legacy delegates to same runner — delete only when admin stops calling it)
- [x] Honest scoring surfaces (audit-confirmed): audit bands match analyzer (30-60 / 120-156); GEO copy matches code windows; `requireSeoCap` second layer on mutating handlers (`engine/auth.ts`, redirects/meta/settings-save); already-linked exclusion in `findInternalLinkOpportunities`
- [x] De-brand generic engine (audit-confirmed, corrected): neutral `general` default + `topicClusters` override + neutral strings/demo copy; `cleaning` cluster kept as opt-in vertical data (content-matched only) after proving generic-only broke ECI on trade content; per-post `ogTitle` honored on `page:metadata` path

## P1 — scoring, schema long-tail, migration depth (landed 2026-10-09; open tails noted)

- [x] Cannibalization: duplicate-`focusKeywords` warning in `audit-runner.ts`; secondary keywords scored (`secondary_keywords` info in `engine/extended-checks.ts`); keyphrase-length (`keyphrase_length`), URL-length (`slug_length` 75), title number (`title_engagement`) checks. Open: sentiment/power-word dictionaries, stemming (exact `\bkw\b` kept intentionally — dependency-free)
- [x] Readability in score: `readability_flesch` (60+), `readability_paragraphs` (150w), `readability_subheadings` (300w) warnings (`engine/extended-checks.ts`); new checks live in `engine/extended-checks.ts` to hold the 500-line cap
- [x] E-E-A-T scoring: `eeat_author` warning + `authorName` plumbed through editor widgets and `v1/analyze` (`content-editor-panel.tsx`, `FocusKeywordFieldWidget.tsx`, `api-v1/analyze.ts`); citations covered via `external_links`; experience via GEO signals. Open: reviewer-presence and outbound-authority heuristics
- [x] GEO fused: `ai_citability` info check (`overallAiScore` 60+) in every `analyzeContent` grade
- [x] Orphan loop: audit orphan issues append hub suggestions; `findInternalLinkOpportunities` excludes already-linked targets; per-page `internal_links` kept (graph unavailable at analyze time by design)
- [x] Schema long-tail: `JobPosting` emitter, `CollectionPage`/`SearchResultsPage` inference (`schema-nodes.ts`), VideoObject duration/contentUrl/embedUrl, per-post `aggregateRating` preferred over business (`seo.aggregateRating` in `types.ts`); union completed (Event/Recipe/VideoObject/Course/JobPosting/Collection/Search). Open: LocalBusiness subtypes, News-sitemap coupling
- [x] Head auto-fill: `og:locale:alternate` derived from hreflang (both paths), `twitter:image:alt` (both paths), full `SchemaGraph.astro` passthrough (keywords/section/principles/license/blog/nav), content first-`<img>` fallback before default OG image
- [x] Migration depth: Yoast `_yoast_wpseo_is_cornerstone` + RankMath cornerstone mapped into `seo.cornerstone` via merge (`content-hooks.ts`). Open: RankMath secondary-keyword key unverified (not guessed), truSEO payload, settings-template import
- [x] Roles: `canManageModule` helper + export (`engine/auth.ts`, `index.ts`; editors blocked from settings). Open: admin UI matrix

## P2 — modern beyond WordPress (GEO/AEO/moat; landed 2026-10-09, tails noted)

- [x] Passage citability index (`scorePassages`, top-3 persisted on save) + `llms-full` injection (key excerpts + FAQs over blind slice)
- [x] News sitemap (`sitemap-news.xml`, 2-day window) + video sitemap blocks (YouTube/Vimeo/`<video>` detection, capped)
- [x] Edge KV protocol cache (1h TTL, purge on publish/save) on sitemap/index/news/robots/llms endpoints
- [x] AI bot list extended (13 agents) with per-bot groups + llms allowances; hit-log dashboard impossible without host request hook (noted)
- [x] Settings export/import routes (`settings/export`, `settings/import`, admin-guarded, secrets excluded)
- [x] llms discovery link (HTML `rel=alternate`; HTTP `Link:` headers are host-owned, not plugin-emittable)
- [x] Speakable readiness + reviewer + power-wording + TOC-presence checks; numeric-slug breadcrumb guard (`/top-10/` kept, date archives skipped)
- [x] LocalBusiness subtype inference (10 verticals + explicit `businessType` override)
- [x] Answers API `GET /_emdash/api/seo/v1/answers?q=` (tested)
- [x] Cron cooled hourly; single cornerstone threshold 1200/600
- [x] Role Capabilities UI (`RoleCapsPanel` matrix) + stored `seo_role_caps` enforced via `requireSeoCapFor` on redirects/meta/settings/indexnow routes (tested in `tests/auth.test.ts`)
- [x] IndexNow fan-out route (`_emdash/api/seo/indexnow/fanout`: sitemap-diff vs KV snapshot, cap 200, 501s without KV — external-scheduler triggerable; tested)
- [x] RankMath secondary keywords: covered — importer comma-splits `rank_math_focus_keyword` (array or comma string); no separate meta key exists per RankMath docs/API
- [ ] Corpus IDF in D1 + Workers-AI hybrid (blocked: sync `analyzeContent` has no async KV path; needs engine refactor — no dead code shipped instead)
- [ ] GSC integration (blocked: external OAuth/API credentials)
- [ ] Stemming (exact `\bkw\b` kept intentionally, dependency-free)