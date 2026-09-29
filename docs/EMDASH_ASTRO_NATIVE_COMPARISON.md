# Architectural Audit: Native Astro & EmDash Built-ins vs. `@emdash/plugin-seo`

> **Document Status:** Reference Architecture & Audit Report  
> **Objective:** Define clear boundaries between Astro & EmDash native capabilities vs. `@emdash/plugin-seo` extensions to enforce a strict **"Extend, Don't Rewrite"** architectural principle.

---

## 1. Executive Summary

EmDash CMS and Astro provide extensive, production-grade SEO infrastructure out of the box that executes with sub-millisecond CPU times on Cloudflare Workers. 

A thorough investigation of `node_modules/emdash` and Astro reveals that `@emdash/plugin-seo` previously duplicated or shadowed several native systems (such as sitemaps, `robots.txt`, redirect middleware, and `<head>` tag generation), rather than leveraging EmDash's official extension mechanisms—most notably the **`page:metadata` hook** and the **native redirect middleware**.

By adopting a strict **"Extend, Don't Rewrite"** model:
1. **EmDash Core** handles base routing, redirects, 404 tracking, sitemap index sharding, image sitemap generation, virtual `robots.txt`, CSP hashing, and `<head>` tag deduplication.
2. **`@emdash/plugin-seo`** provides high-value capabilities that neither Astro nor EmDash supports: **Rank Math Pro / Yoast Premium parity, connected JSON-LD `@graph` entities, real-time content scoring, Gutenberg block migration hooks, interactive UI components, and edge AI search protocols (`/llms.txt`)**.

---

## 2. Native EmDash & Astro Core Capabilities

Detailed code analysis of `node_modules/emdash/src/` identifies the following built-in systems:

### 2.1 `<EmDashHead />` & the `page:metadata` Hook Pipeline
* **Source:** `node_modules/emdash/src/components/EmDashHead.astro` & `node_modules/emdash/src/page/metadata.ts`
* **Native Hook:** EmDash exposes an official extension point: **`"page:metadata"`**.
* **Execution Flow:** When `<EmDashHead page={page} />` renders, it collects plugin contributions:
  ```typescript
  const [pluginContributions, fragments] = await Promise.all([
    runtime.collectPageMetadata(resolvedPage), // Runs all registered 'page:metadata' hooks
    runtime.collectPageFragments(resolvedPage),
  ]);
  ```
* **First-Wins Resolution:** Metadata contributions are ordered as:
  `[...plugin, ...site, ...base]`
  Because plugins sit at the front of the array, any tag emitted by a plugin (`meta`, `property`, `link`, or `jsonld`) **automatically overrides** EmDash's base and site defaults.
* **Built-in Security & CSP:** EmDash automatically computes SHA-256 CSP hashes (`registerJsonLdCspHashes`) and sanitizes JSON-LD strings against script-breakout XSS (`safeJsonLdSerialize`).
* **Site Verification & i18n:** EmDash natively injects Google (`google-site-verification`) and Bing (`msvalidate.01`) verification tags from Admin **Settings > SEO**, as well as `<link rel="alternate" hreflang="...">` for all translations.

### 2.2 Dynamic XML Sitemaps (`/sitemap.xml`)
* **Source:** `node_modules/emdash/src/astro/routes/sitemap.xml.ts` & `sitemap-[collection].xml.ts`
* **Sharded Index:** Serves a `/sitemap.xml` index pointing to child sitemaps at `/sitemap-{collection}.xml` for each collection with published content.
* **Smart Filtering:** Automatically excludes drafts, trashed entries, unroutable collections, and entries marked with **Hide from search engines** (`noindex`).
* **Google Image Extensions:** Queries entry OG images and automatically outputs Google Image Sitemap tags (`<image:image><image:loc>...</image:loc></image:image>`).
* **Multi-Language:** Emits translation variants with `<xhtml:link rel="alternate" hreflang="...">` and `hreflang="x-default"`.

### 2.3 Virtual `robots.txt` (`/robots.txt`)
* **Source:** `node_modules/emdash/src/astro/routes/robots.txt.ts`
* Dynamically allows all crawlers and disallows `/_emdash/` (admin/API routes).
* Automatically resolves the canonical origin and appends `Sitemap: https://<domain>/sitemap.xml`.
* **Admin UI Integration:** When custom directives are entered under **Settings > SEO > robots.txt** in the EmDash Admin Panel, EmDash automatically serves that custom configuration at the edge.

### 2.4 Edge Redirects & 404 Logging
* **Source:** `node_modules/emdash/src/astro/middleware/redirect.ts` & `src/database/repositories/redirect.ts`
* **Native Middleware:** Runs on every request before route matching (skips `/_emdash/*`, `/_image`, and static assets).
* **Supported Codes:** `301`, `302`, `307`, `308`, `410 Gone`, and `451 Unavailable For Legal Reasons`.
* **Wildcards & Params:** Supports named segments (`/old/[slug]`) and catch-all wildcards (`/old-blog/[...path]`).
* **Slug Change Auto-Redirects:** Changing an entry slug automatically creates a `301` redirect from the old URL and collapses redirect chains.
* **Native 404 Hit Log:** Missed URLs are recorded into SQLite / D1 (up to 10,000 URLs) with hit counts and referrers, viewable in the Admin UI under **Redirects > 404 Errors**.

---

## 3. Analysis: Where Our Plugin Duplicated Native Features

| Feature Area | EmDash Native Built-in | Previous `@emdash/plugin-seo` Approach | Resulting Issue |
| :--- | :--- | :--- | :--- |
| **Head Rendering** | `<EmDashHead />` (consumes `page:metadata`, handles CSP, XSS, deduplication) | Created `<SeoHead.astro>` and included **both** in `Base.astro` | **Duplicate `<head>` tags:** Produced duplicate `<meta name="description">`, duplicate `<link rel="canonical">`, and duplicate JSON-LD scripts. |
| **Sitemaps** | High-performance sharded `/sitemap.xml` & `/sitemap-{collection}.xml` with image & i18n support | Registered custom `/sitemap.xml` in plugin virtual routes | Shadowed EmDash's native multi-collection sitemap generator with a monolithic sitemap. |
| **`robots.txt`** | Native `/robots.txt` linked to Admin **Settings > SEO** | Registered virtual `/robots.txt` in plugin routes | Disconnected the Admin UI's robots.txt editor from the actual served response. |
| **Redirects & 404s** | Native middleware (`redirect.ts`), SQLite/D1 `redirects` table, and built-in 404 log | Custom `matchRedirect()` in `routes/redirects.ts` and custom `seo_404_logs` table | Duplicate redirect evaluation and two separate 404 tracking databases. |

---

## 4. Analysis: Where Our Plugin Delivers True Unique Value

These capabilities are **absent from both Astro and EmDash** and represent the core value of `@emdash/plugin-seo`:

```mermaid
graph TD
    subgraph EmDash Built-ins [Core Foundation]
        A[Collection SEO Panel]
        B[EmDashHead.astro]
        C[Native Sitemap & robots.txt]
        D[Edge Redirect Middleware & 404 Log]
    end

    subgraph EmDash SEO Plugin [Unique Extensions via Hooks]
        E[page:metadata Hook] -->|Injects| B
        F[content:beforeSave Hook] -->|Normalizes| A
        G[Dynamic Edge Routes]
        H[Astro UI Components]
    end

    subgraph Unique Deliverables
        E --> I[Connected JSON-LD @graph: LocalBusiness, Service, FAQ, TOC, Ratings]
        E --> J[NLWeb AI Discovery Tag]
        F --> K[Rank Math / Yoast Meta Normalization]
        F --> L[Gutenberg FAQ Block Parser -> data.seo.faqs]
        F --> M[Gutenberg TOC Block Cleaner -> data.seo.hasToc]
        G --> N[/llms.txt & /llms-full.txt Edge Markdown]
        G --> O[IndexNow Instant Submission Engine]
        H --> P[Breadcrumbs.astro + Microdata]
        H --> Q[TableOfContents.astro + ItemList Jump Links]
        H --> R[FaqBlock.astro + FAQPage Accordions]
        S[engine/content-analyzer.ts] --> T[0-100 Real-Time SEO & Keyword Density Scoring]
    end
```

### 4.1 Connected Schema `@graph` Engine (`schema-builder.ts`)
* **The Gap in Core EmDash:** Native EmDash outputs only a bare `BlogPosting` or `WebSite` schema.
* **Plugin Value:** Constructs an interconnected, Google-compliant `@graph`:
  * `LocalBusiness` / `Organization` (geoCoordinates, openingHours, priceRange, sameAs, areaServed).
  * `AggregateRating` & customer reviews.
  * `Service` & `OfferCatalog`.
  * `FAQPage` schema linked directly to the parent page.
  * `ItemList` schema for Table of Contents sitelink jumps.
  * `BreadcrumbList` schema.
  * Publishing principles, copyright year, and licensing metadata.
* **Extension Mechanism:** Injected cleanly into `<EmDashHead>` via `{ kind: "jsonld", id: "primary", graph: schema }` inside the `page:metadata` hook.

### 4.2 Native Migration & Block Transformation (`content:beforeSave` Hook)
* **The Gap in Core EmDash:** EmDash's native WordPress migrator stores Rank Math/Yoast fields as raw, unparsed objects in `meta._rankmath` and ignores Gutenberg blocks.
* **Plugin Value:**
  * Auto-normalizes Rank Math/Yoast focus keywords, titles, descriptions, canonicals, and robots flags into first-class `data.seo`.
  * Automatically identifies Gutenberg FAQ blocks (`<!-- wp:rank-math/faq-block -->`) and Kadence accordions, extracting them into structured `data.seo.faqs`.
  * Automatically detects and strips static Gutenberg TOC blocks (`stripRankMathTocBlock`), enabling dynamic, responsive navigation.

### 4.3 Next-Gen Edge AI Search Protocols (`/llms.txt` & `/llms-full.txt`)
* **The Gap in Core EmDash:** Neither Astro nor EmDash supports AI crawler sitemaps (Perplexity, ChatGPT, Claude, Gemini).
* **Plugin Value:** Edge-rendered virtual routes serving structured Markdown sitemaps without filesystem dependencies.

### 4.4 Interactive Astro UI & Microdata Components
* **The Gap in Core EmDash:** EmDash provides zero frontend UI components for navigation structures.
* **Plugin Value:**
  * `<Breadcrumbs.astro>`: Accessible ARIA breadcrumbs + Schema.org microdata.
  * `<TableOfContents.astro>`: Dynamic heading extraction with smooth scrolling and Google `ItemList` jump-link markup.
  * `<FaqBlock.astro>`: Accessible `<details>/<summary>` accordions with Google `FAQPage` schema.

### 4.5 Instant IndexNow Search Engine Submission (`indexnow.ts`)
* **The Gap in Core EmDash:** EmDash relies solely on passive XML sitemap crawling.
* **Plugin Value:** Hooks into `content:afterPublish`, `content:afterSave`, and `content:afterDelete` to instantly ping Bing, Yandex, and IndexNow-enabled engines upon publication or update.

### 4.6 Real-Time On-Page Content Analyzer (`content-analyzer.ts`)
* **The Gap in Core EmDash:** EmDash only counts characters against a 160-character guideline.
* **Plugin Value:** 0–100 algorithmic SEO health scoring analyzing focus keyword density (0.8%–2.5%), keyword placement (title, slug, intro, headings), single H1 validation, and missing image alt text.

---

## 5. Architectural Recommendations: True "Extend, Don't Rewrite"

To achieve maximum performance, maintainability, and compatibility with Cloudflare Workers:

### 1. Unify `<head>` Rendering into `<EmDashHead page={pageCtx} />`
- In layout files (e.g. `src/layouts/Base.astro`), remove `<SeoHead />` and rely solely on `<EmDashHead page={pageCtx} />`.
- Our plugin already implements `handlePageMetadata()` via the `page:metadata` hook. When `<EmDashHead>` executes, EmDash places our contributions (`jsonld: "primary"`, OpenGraph, Twitter, canonical, robots) at the top of the stack, taking full advantage of EmDash's built-in CSP hashing and XSS escaping.

### 2. Delegate Sitemaps and Robots to EmDash Core
- Turn off or remove `/sitemap.xml` and `/robots.txt` from plugin virtual routes (`packages/emdash-seo/src/index.ts`).
- Let EmDash serve its native sharded `/sitemap.xml` + `/sitemap-{collection}.xml` (with Google Image extensions and i18n alternates) and native `/robots.txt` (with CMS Admin UI integration).

### 3. Delegate Redirects to EmDash Native Middleware
- Remove standalone redirect route handlers (`routes/redirects.ts`) and the redundant `seo_404_logs` table.
- Rely on EmDash's native `redirects` table and its built-in Admin UI 404 log.

### 4. Maintain and Polish Plugin Extension Points
- **`page:metadata` hook:** Connected JSON-LD `@graph`, advanced social cards, NLWeb tags.
- **`content:beforeSave` hook:** Rank Math/Yoast normalization, FAQ block auto-extraction, and TOC block cleanup during native site transfers.
- **Lifecycle hooks (`afterPublish`, `afterDelete`):** IndexNow instant ping engine.
- **Edge AI search routes:** `/llms.txt` and `/llms-full.txt`.
- **UI Components:** `<Breadcrumbs />`, `<TableOfContents />`, `<FaqBlock />`.
- **Content Analysis Engine:** `analyzeContent()`.
