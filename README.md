# WebABC SEO Suite — Native Astro & EmDash CMS Plugin

[![Astro](https://img.shields.io/badge/Astro-7.3-orange?logo=astro)](https://astro.build)
[![EmDash CMS](https://img.shields.io/badge/EmDash_CMS-1.1.0-purple)](https://emdashcms.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Free_%26_Paid-f38020?logo=cloudflare)](https://workers.cloudflare.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-grade, edge-rendered SEO, Generative AI (GEO) and Answer Engine Optimization (AEO) suite (`@emdash/plugin-seo` / `webabcSeoPlugin`) for **Astro** and **EmDash CMS**, with automated WordPress migration capabilities (Rank Math Pro, Yoast SEO Premium, All in One SEO) targeting Cloudflare Workers (Free & Paid).

Built as an **in-process Native Plugin**, it bypasses the requirement for Cloudflare Dynamic Worker loaders (`worker_loaders`), guaranteeing complete feature parity on **Cloudflare Workers Free Tier** (under 10 ms CPU constraints and zero subscription costs) and Paid plans.

---

## 🌟 Key Features

### 1. Unified Admin Hub & Clean UI Standards
* **Single Admin Navigation Entry:** Consolidated under a single **WebABC SEO** item in the EmDash navigation menu (`/_emdash/admin/plugins/emdash-seo/settings`), eliminating sidebar clutter.
* **Integrated Top Tab Bar:** Effortlessly switch between:
  - **SEO Settings:** Business profiles, Person schema, social accounts, and breadcrumb rules.
  - **SERP & Social Preview:** Live Google Desktop/Mobile, Facebook OpenGraph, and X (Twitter) card emulators.
  - **Readability Checker:** Hemingway-style live color highlighting, Flesch Reading Ease score, grade level, passive voice flags, and transition word ratios.
  - **Alt Image Auditor:** Sitewide and entry image accessibility audit with inline quick-editing.
  - **Fuzzy 301 Redirects:** Algorithmic similarity matcher (Levenshtein + Jaccard) for 404 URL remediation.
* **Zero Emojis Policy:** 100% typed SVG icon library (`packages/emdash-seo/src/admin/icons.tsx`), delivering a professional, distraction-free UI.
* **Strict Modularity:** Every source file in the suite is strictly limited to $\le 500$ lines for maintainability and edge performance.

### 2. Generative Engine & Answer Engine Optimization (GEO & AEO)
* **AI Search Engine Readiness:** Optimizes content for extraction and direct citation by AI search engines (Perplexity, ChatGPT Search, Claude, Google Gemini / AI Overviews).
* **Direct Answer Extraction:** Identifies and scores lead paragraph direct answers, definition blocks, structured bullet lists, and summary tables.
* **Voice Search & Speakable Selectors:** Automatically selects and emits Google Speakable CSS selectors (`#field-excerpt`, `.post-lead`, `.aeo-summary`).
* **Edge AI Search Protocols:** Dynamically edge-renders `/llms.txt` and `/llms-full.txt` knowledge bases without disk file dependencies.

### 3. Semi-Automatic Schema Selector & Author E-E-A-T
* **Intelligent Auto-Inference:** Evaluates title keywords, route paths, collection types, and body content in real time using `inferSchemaType()` to automatically select the optimal Schema.org entity (`BlogPosting`, `Service`, `HowTo`, `AboutPage`, `ContactPage`, `TechArticle`, `Article`, etc.).
* **One-Click Manual Override:** Authors can override the auto-suggestion at any time or revert back to dynamic inference with the dynamic indicator icon.
* **First-Class E-E-A-T Schema:** Full structured schema profiles for authors (`Person`) and medical/technical reviewers (`reviewedBy`), including `jobTitle`, `worksFor`, and `sameAs` authority links.

### 4. Interactive Content Studio & Field Widgets
* **Instant Availability on New Content:** Custom field widgets (`emdash-seo:focus-keyword` and `emdash-seo:seo-suite`) provide live SEO, Readability, and GEO/AEO studio tools directly in the editor form even before the first draft is saved.
* **Sidebar Panel Integration:** Automatically mounts the **SEO & Readability Suite** panel in the EmDash right sidebar once entries are saved.
* **Sub-Millisecond Pre-Computed Edge Delivery:** Compiles `<head>` tags and JSON-LD `@graph` into `data.seo._cachedHead` and `data.seo._cachedSchemaGraph` on save, delivering `< 0.1ms` TTFB on Cloudflare Workers Free Tier.

### 5. Best-of-WordPress SEO Parity & Automation
* **Connected Schema Graph (JSON-LD):** Emits a unified `@graph` linking `LocalBusiness`, `Organization`, `WebPage`, `WebSite`, `Service`, `AggregateRating`, `FAQPage`, `BreadcrumbList`, and `ItemList`.
* **Automated Breadcrumbs & TOC:** Computes hierarchical breadcrumb trails (`Breadcrumbs.astro`) and dynamic Table of Contents (`TableOfContents.astro`) with slugified anchor IDs and Google `ItemList` jump-link schema.
* **Automated FAQ Accordions:** Renders accessible accordions (`FaqBlock.astro`) with Google `FAQPage` schema.
* **IndexNow Real-Time Search Push:** Instantly pings Bing, Yandex, Seznam, Naver, and Yep on publish, updates, and unpublish with debounce and KV tombstone caching.

---

## 📁 Repository Structure

```text
├── docs/                           # Comprehensive Specifications & Guides
│   ├── PRD.md                      # Product Requirement Document
│   ├── MIGRATION_PLAN.md           # Step-by-step WordPress migration plan
│   ├── SEO_PLUGIN_ARCHITECTURE.md  # Deep technical architecture of WebABC SEO
│   └── WP_IMPORT_GUIDE.md          # WordPress connection & Rank Math/Yoast mapping table
├── packages/
│   └── emdash-seo/                 # WebABC SEO Suite Plugin (@emdash/plugin-seo)
│       ├── package.json
│       ├── src/
│       │   ├── index.ts            # createPlugin, seoPlugin, and webabcSeoPlugin exports
│       │   ├── types.ts            # Strict TypeScript interfaces
│       │   ├── config.ts           # Variable templating (%title%, %siteName%, %separator%)
│       │   ├── engine/             # Real-time analyzers, readability, schema, GEO/AEO
│       │   ├── admin/              # Admin pages, tabs, icons, and custom field widgets
│       │   ├── head/               # SeoHead.astro, SchemaGraph.astro, OpenGraph.astro
│       │   └── components/         # Breadcrumbs.astro, TableOfContents.astro, FaqBlock.astro
├── seed/
│   └── seed.json                   # Seed database with sample services, posts & pages
├── src/
│   ├── components/                 # Reusable UI components
│   ├── layouts/                    # Base layout with SeoHead integration
│   ├── pages/                      # Astro routes (homepage, services, blog, search, 404)
│   └── worker.ts                   # Cloudflare Workers entrypoint
├── astro.config.mjs                # Astro configuration with emdash and webabcSeoPlugin
├── wrangler.jsonc                  # Cloudflare Workers D1 & R2 bindings
└── pnpm-workspace.yaml             # pnpm monorepo workspace configuration
```

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js**: v22+
* **Package Manager**: `pnpm` (v10+)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/alibakhtiari/emdash-seo.git
cd emdash-seo

# Install workspace dependencies
pnpm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Generate an EmDash encryption key:
```bash
pnpm exec emdash secrets generate
```
Add the generated key to `.env`:
```env
EMDASH_ENCRYPTION_KEY="emdash_enc_v1_..."
```

### 4. Development Server
```bash
pnpm run dev
```
Visit `http://localhost:4321` to preview the website, or `http://localhost:4321/_emdash/admin` to access the CMS admin panel and WebABC SEO dashboard.

### 5. Quality Assurance & Verification
```bash
pnpm run lint             # ESLint verification (0 errors)
pnpm run typecheck        # Astro & TypeScript diagnostic check (0 errors)
pnpm run test             # Run 208+ Vitest unit & integration tests
pnpm run build            # Compile production Cloudflare Workers bundle
```

---

## 📖 Detailed Documentation

* [PRD (Product Requirement Document)](docs/PRD.md)
* [WebABC SEO Plugin Architecture](docs/SEO_PLUGIN_ARCHITECTURE.md)
* [WordPress to Astro Migration Plan](docs/MIGRATION_PLAN.md)
* [WordPress Import & Meta Mapping Guide](docs/WP_IMPORT_GUIDE.md)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
