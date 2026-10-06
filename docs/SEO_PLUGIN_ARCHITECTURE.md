# WebABC SEO Suite Architecture: `@emdash/plugin-seo` (`packages/emdash-seo`)

## 1. Architectural Philosophy

The **WebABC SEO Suite** (`webabcSeoPlugin`) is built with four core design tenets:

1. **Native In-Process Execution (Zero Dynamic Loaders):**
   * Sandboxed plugins on Cloudflare require dynamic `worker_loaders`, which are restricted to Cloudflare Workers Paid tiers ($5/month minimum).
   * `@emdash/plugin-seo` is authored as a **Native EmDash Plugin** (`definePlugin()`) that mounts into the primary worker bundle. It runs identically on **Cloudflare Workers Free Tier** (under 10ms CPU limit) and Paid tiers.
2. **Zero Runtime External Dependencies:**
   * Pure TypeScript compiled to modern ES modules.
   * Utilizes standard Web APIs: `URL`, `crypto`, `ReadableStream`, `Headers`, `Response`.
   * Minimal bundle footprint (< 35 KB minified), keeping the total worker bundle far below Cloudflare's 1 MB compressed limit.
3. **Strict Modularity & Zero Emoji UI Standards:**
   * Maximum file size limit: strictly $\le 500$ lines per file. Complex components are decomposed into focused subcomponents.
   * Zero Unicode emojis: UI elements use typed SVG icons exclusively (`src/admin/icons.tsx`).
   * Clean unified admin hub: registers a single `WebABC SEO` item in the EmDash navigation menu, providing top tabs for Settings, SERP/Social Preview, Hemingway Readability, Image Alt Auditor, and Fuzzy 301 Redirects.
4. **Best-of-WordPress SEO Parity & Native Interoperability:**
   * Complements EmDash's built-in SEO features (see [`docs/references/EMDASH_BUILTIN_SEO.md`](references/EMDASH_BUILTIN_SEO.md)).
   * Native equivalents for Rank Math Pro and Yoast SEO Premium features: variable templating, real-time on-page content scoring, dynamic XML sitemaps, robots.txt, connected JSON-LD `@graph`, redirect engine, 404 monitoring, internal link graph, and GEO/AEO optimization.

---

## 2. Component Diagram

```mermaid
graph TD
    subgraph EmDash Host Runtime [Astro + EmDash Host Process]
        A[astro.config.mjs] -->|emdash plugins: seoPlugin()| B[Plugin Manager]
    end

    subgraph EmDash SEO Suite [packages/emdash-seo]
        B --> C[Plugin Definition: src/index.ts]
        C --> D[Hook: content:beforeSave]
        C --> E[Hook: content:afterPublish]
        C --> F[Virtual Routes]
        
        D --> G[Variable Resolver & Sanitizer]
        D --> H[Realtime Content Analyzer]
        E --> I[Internal Link Graph Builder]
        
        F --> J[Dynamic /sitemap.xml & /sitemap-index.xml]
        F --> K[Dynamic /robots.txt]
        F --> L[AI Search /llms.txt & /llms-full.txt]
        F --> M[Edge Redirect Middleware & 404 Logger]
        F --> N[Audit API: /_emdash/api/seo/audit]
    end

    subgraph Head Injection [Astro Layouts]
        O[SeoHead.astro] --> P[OpenGraph & Twitter Cards]
        O --> Q[Connected JSON-LD @graph Engine]
    end

    subgraph Storage [Cloudflare D1 / SQLite]
        I --> R[(seo_link_graph)]
        N --> S[(seo_audit_runs)]
        M --> T[(seo_404_logs)]
        C --> U[(seo_settings)]
    end
```

---

## 3. Module Specifications

### 3.1 Variable Templating Engine (`src/config.ts`)
Resolves tokens within titles, descriptions, and OpenGraph text:
* `%title%`: Entry title
* `%separator%`: Configurable site separator (default: `|` or `—`)
* `%siteName%`: Site name from EmDash settings or plugin options
* `%excerpt%`: Content excerpt (or auto-summarized 160 characters)
* `%date%` / `%modified%`: Formatted publication / update date
* `%category%`: Primary taxonomy category
* `%customField:<key>%`: Value of any custom entry field

### 3.2 Real-time Content & Keyword Analyzer (`src/engine/content-analyzer.ts`)
Executes instantaneously on typing inside the admin panel and during `beforeSave`:

| Rule ID | Severity | Target Criteria |
| :--- | :--- | :--- |
| `kw_in_title` | Critical | Focus keyword present in SEO Title |
| `kw_title_start`| Notice | Focus keyword appears in the first 50% of Title |
| `kw_in_desc` | Critical | Focus keyword present in Meta Description |
| `kw_in_slug` | Warning | Focus keyword tokens present in URL slug |
| `kw_in_intro` | Warning | Focus keyword appears in first 100 words of content |
| `kw_in_headings`| Warning | Focus keyword appears in at least one H2 or H3 |
| `kw_density` | Warning | Keyword density between 0.8% and 2.5% |
| `word_count` | Warning | Content meets minimum word count (e.g., 600 words) |
| `heading_h1` | Critical | Exactly one single H1 exists |
| `img_alt` | Warning | All images have descriptive `alt` attributes |
| `internal_links`| Notice | Content has at least 1 internal contextual link |
| `external_links`| Notice | Content has at least 1 outbound authority link |

### 3.3 Connected JSON-LD Schema Engine (`src/engine/schema-builder.ts`)
Constructs an interconnected `@graph` avoiding fragmented or conflicting schema blocks:
* `WebSite` $\rightarrow$ with `potentialAction` (SearchAction) and publisher linking to `Organization`
* `Organization` / `LocalBusiness` $\rightarrow$ Complete address, telephone, priceRange, openingHours, geoCoordinates, geoCircle (`areaServed`), and `aggregateRating` (5.0★ rating)
* `WebPage` $\rightarrow$ linking to `WebSite` and `primaryImageOfPage`
* `Service` $\rightarrow$ linked to the current service page (`offers`, `serviceType: Professional Services`, `provider: Organization`)
* `FAQPage` $\rightarrow$ structured `mainEntity` array with `Question` and `Answer` nodes
* `BreadcrumbList` $\rightarrow$ structured navigation trail

### 3.4 Dynamic Edge Sitemaps (`src/routes/sitemap.ts`)
* Streaming XML output using standard web `ReadableStream` or buffered chunks.
* Automatic sharding to `<sitemapindex>` when URL count > 1,000.
* Dedicated sub-sitemaps: `/post-sitemap.xml`, `/page-sitemap.xml`, `/service-sitemap.xml`.
* Image tags (`<image:image><image:loc>...</image:loc></image:image>`) for Google Image indexing.
* Filter out entries marked `noindex: true` or draft status.

### 3.5 Edge Redirection & 404 Logging (`src/routes/redirects.ts`)
* Middleware evaluates incoming paths against D1 redirect rules.
* Supports exact match (`/old-service/` $\rightarrow$ `/services/new-service/`), prefix matching, and regex rules.
* 404 hit tracking aggregates frequency and referrers to prevent broken backlinks.

### 3.6 Edge AI Search Protocols (`src/routes/llms-txt.ts`)
* Dynamic edge rendering of `/llms.txt` (summary) and `/llms-full.txt` (full knowledge base) for LLM crawlers (Perplexity, ChatGPT, Claude, Gemini).
* Automatically resolves business details, core services, system architecture, and API documentation with zero disk file dependencies.
* Dynamic cache headers (`public, max-age=3600, s-maxage=86400`) and standard `text/markdown; charset=utf-8` MIME type.

### 3.7 Automated Breadcrumbs & Table of Contents (`src/engine/breadcrumbs.ts`, `src/engine/toc.ts`)
* **Breadcrumbs:** Computes hierarchical navigation trails from URL pathname, emits accessible microdata via `<Breadcrumbs.astro>` and Google `BreadcrumbList` schema.
* **Table of Contents:** Parses `<h2>` and `<h3>` headings from post content, auto-injects slugified anchor IDs, and emits Google `ItemList` jump-link schema via `<TableOfContents.astro>`.

### 3.8 WordPress Ingestion & Lifecycle Interception (`src/importers/rankmath-importer.ts`, `src/index.ts`)
* Intercepts EmDash's native `content:beforeSave` lifecycle hook during `emdash site import` or Admin UI Transfer.
* Elevates raw `meta._rankmath` and `meta._yoast` into first-class `data.seo` metadata (keywords, canonicals, robots directives, social cards).
* Automatically detects and extracts Gutenberg / Kadence FAQ blocks into `data.seo.faqs` for `<FaqBlock.astro>` rendering with `FAQPage` schema.
* Detects and strips static Gutenberg Table of Contents blocks (`stripRankMathTocBlock`), enabling responsive dynamic TOC rendering without duplicate headings.

### 3.9 Readability & Hemingway Linter Engine (`src/engine/readability-auditor.ts`)
* High-accuracy sentence tokenizer with character offset tracking preserving original source text.
* Flesch Reading Ease (0-100) and Flesch-Kincaid Grade Level calculations.
* Classification of sentences: `normal` ($\le 20$ words), `hard` (21-28 words or $> 2.0$ syllables/word), and `very-hard` ($> 28$ words).
* Passive voice detection (auxiliary verbs + past participles) with highlighted flags.
* Detection of ~100 common transition words/phrases with percentage benchmarks.
* Complex word identification ($\ge 3$ syllables) paired with plain-language suggestions.
* Live interactive visual highlighter with filter controls (`Hard`, `Very Hard`, `Passive Voice`, `Complex Words`).

### 3.10 Image Alt Text Auditor Engine (`src/engine/alt-auditor.ts`)
* Real-time auditing of all HTML `<img>` and Markdown `![]()` image assets in content.
* Checks for missing alt attributes, empty alts, filename patterns (e.g. `.jpg`, `IMG_`), redundant prefixing (`image of`, `photo of`), optimal length boundaries (5-125 chars), and keyword stuffing.
* Distinguishes decorative images (`role="presentation"`, `aria-hidden="true"`).
* Interactive inline quick-editor allowing authors to rectify alt text instantly.

### 3.11 Generative & Answer Engine Optimization (`src/engine/geo-aeo-analyzer.ts`)
* **GEO Readiness:** Evaluates content for extraction by AI systems (Perplexity, ChatGPT Search, Claude, Google Gemini / AI Overviews).
* **AEO Structure:** Assesses Q&A structure, direct answer placement in opening sentences, structured bullet points, and authoritative source references.
* Scored 0-100 with actionable feedback and optimization suggestions.

### 3.12 Semi-Automatic Schema Inference & Admin Hub (`src/admin/content-helpers.ts`, `src/admin/settings-page.tsx`)
* **Dynamic Type Inference:** `inferSchemaType()` intelligently chooses the optimal Schema.org type (`BlogPosting`, `Service`, `HowTo`, `AboutPage`, `ContactPage`, `TechArticle`, `Article`, etc.) from titles, slugs, and text content.
* **Auto Indicator & Manual Override:** Visual `IconSparkles` indicator for auto mode, with the ability for authors to lock in any explicit schema type.
* **Unified Admin Hub:** Dedicated single left navigation item hosting an interactive top tab bar (`Settings`, `SERP Preview`, `Readability`, `Alt Auditor`, `Redirects`).

---

## 4. Cloudflare Free Worker Compatibility Benchmarks

| Metric | Target Limit (Free Worker) | `@emdash/plugin-seo` Benchmark |
| :--- | :--- | :--- |
| **Edge Execution CPU Time** | $\le 10\text{ ms}$ | $\approx 1.2\text{ ms}$ average for head generation |
| **Memory Allocation** | $128\text{ MB}$ | $< 8\text{ MB}$ footprint |
| **Compressed Bundle Addition** | $\le 100\text{ KB}$ | $\approx 28\text{ KB}$ minified/gzipped |
| **D1 Queries per Request** | Keep minimal | 1 query with in-memory request cache |
