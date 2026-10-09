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

## P1 — scoring, schema long-tail, migration depth

- [ ] Cannibalization: duplicate-`focusKeywords` check across entries (`audit-runner.ts:29-45` dedupes titles/descs only); score secondary keywords (today `focusKeywords[0]` only in `content-analyzer.ts:36,196`); add keyphrase-length, URL-length/stopwords, title sentiment/power-word/number checks
- [ ] Wire computed readability into score: Flesch threshold, `consecutiveSentenceStarters`, `longParagraphsCount`, `longSectionsCount`, subheading-distribution (`>300w` without H2/H3) — today advisory in `readability-auditor.ts:121-339`, unscored in `content-analyzer.ts:262-292`
- [ ] E-E-A-T scoring: `eeat_author/reviewer/experience/citations` checks from existing `content-hooks.ts:90-120` + `geo-aeo-analyzer.ts:152-158` (author/reviewer/dates/outbound citations); fuse into weighted grade
- [ ] Fuse GEO into SEO grade: `geoScore/aeoScore/overallAiScore` penalize content grade (today side-by-side in `WidgetGeoAeoTab.tsx:16-108` only); fix window copy drift (detector 18-75w vs 35-55w vs 8-65w in `geo-aeo-analyzer.ts:123,200,275,332`)
- [ ] Per-page orphan + link-opps in `analyzeContent` (today boolean `internal_links` in `content-analyzer.ts:251-259`; graph only sitewide in `audit-runner.ts:178-183`); call `findInternalLinkOpportunities` (`link-analyzer.ts:67-103`) from report; fix relative-href miss in `audit-runner.ts:74-76`; add anchor-text/`rel` quality
- [ ] Schema long-tail: `JobPosting`, LocalBusiness subtypes, per-post `aggregateRating`, VideoObject duration/contentUrl, Collection/SearchPage inference, NewsArticle <-> news-sitemap coupling (`schema-builder.ts:270-438`)
- [ ] Head auto-fill: `og:locale:alternate` from hreflang set (today manual `localeAlternate`, `SeoHead.astro:210-230`); content-first-image fallback; `twitter:image:alt`; `keywords/articleSection` passthrough in `SchemaGraph.astro:53-74`
- [ ] Migration depth: map Yoast `_yoast_wpseo_is_cornerstone`, RankMath secondary keywords/score/pillar, AIOSEO truSEO/link-assistant, title-template + robots-txt rule import (`importers/*`, `content-hooks.ts:44-72`)
- [ ] Roles: per-module caps + settings UI (today binary `hasSeoCap` admin/editor in `index.ts:282`); cornerstone bulk assignment; `settings/save:149` permission check in `plugin-routes.ts:149`

## P2 — modern beyond WordPress (GEO/AEO/moat)

- [ ] Passage citability index + `llms-full` injection: score `parseBlocks` paragraphs (definition-verb + stat-density + experience + Q-proximity, 35-55w), persist top-3 in `seo.geoOptimization`, emit TL;DR/stats/FAQ blocks in `generateLlmsFullBody` (`llms-txt.ts:251-298`) instead of blind slice
- [ ] Corpus IDF in D1 + Workers-AI hybrid: accumulate DF on `afterPublish`, real `idf=log((N-df+0.5)/(df+0.5))+1` with `1.0` fallback, blend `0.7*BM25 + 0.3*cosine(bge-small)` via `getWorkersAiEmbeddings` (`semantic-analyzer.ts:445-461`)
- [ ] Edge KV precompute for `sitemap-*.xml`/`robots`/`llms*` on publish (reuse `computeContentHash/isCacheValid` in `head-compiler.ts:51-64`), stale-while-revalidate for <10 ms p99
- [ ] AI-crawler budget router: per-bot robots groups + lightweight `llms`-first HTML for GPTBot/ClaudeBot/PerplexityBot, KV hit log dashboard (extend `robots.ts:72-80`)
- [ ] Answers API `GET /_emdash/api/seo/v1/answers?q=` returning `speakableCandidate` + FAQs/HowTo + citing URLs (`geo-aeo-analyzer.ts:228-258,375-394`)
- [ ] Sitemap-`lastmod` IndexNow fan-out on cron (hourly diff of `collectSitemapEntries` in `sitemap.ts:96-149` vs KV snapshot, batch `submitToIndexNow`); cool cron from `* * * * *` to hourly in `wrangler.jsonc:23`
- [ ] i18n discovery: `Link: <u>; rel=alternate; hreflang=..` headers + `llms.txt` discovery link (`head-compiler.ts:233-359` / `SeoHead.astro:189-256`); fix `llms-full` locale prefixes (`llms-txt.ts:287` hardcodes `siteUrl+pattern`); `speakableSelectors` default audit + Service/VideoObject Speakable (`schema-builder.ts:182,313`); TOC/breadcrumb emission checks for `>1500w`; guard `shouldSkipSegment` 1-2-digit over-match (`breadcrumbs.ts:50-51` eats `/top-10/`); single cornerstone threshold source (`content-editor-panel.tsx:75` 1200/600 vs analyzer 600 vs audit 900/300)
