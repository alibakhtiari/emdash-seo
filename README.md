# EmDash SEO Suite — Native Astro & EmDash CMS Plugin

[![Astro](https://img.shields.io/badge/Astro-7.3-orange?logo=astro)](https://astro.build)
[![EmDash CMS](https://img.shields.io/badge/EmDash_CMS-1.0.1-purple)](https://emdashcms.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Free_%26_Paid-f38020?logo=cloudflare)](https://workers.cloudflare.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-grade, edge-rendered SEO suite (`@emdash/plugin-seo`) for **Astro** and **EmDash CMS**, with automated WordPress migration capabilities (Rank Math Pro, Yoast SEO Premium, All in One SEO) targeting Cloudflare Workers (Free & Paid).

Built as an **in-process Native Plugin**, it bypasses the requirement for Cloudflare Dynamic Worker loaders (`worker_loaders`), guaranteeing complete feature parity on **Cloudflare Workers Free Tier** (under 10 ms CPU constraints and zero subscription costs) and Paid plans.

---

## 🌟 Key Features

### 1. Best-of-WordPress SEO Parity
* **Connected Schema Graph (JSON-LD):** Emits a unified `@graph` linking `LocalBusiness`, `Organization`, `WebPage`, `WebSite`, `Service`, `AggregateRating`, and `BreadcrumbList`.
* **Automated Breadcrumbs:** Automatically computes hierarchical breadcrumb trails from URL routes, rendering accessible microdata (`Breadcrumbs.astro`) and Google-compliant schema.
* **Automated Table of Contents (TOC):** Parses `<h2>` and `<h3>` headings, auto-injects slugified anchor IDs, and outputs Google `ItemList` jump-link schema (`TableOfContents.astro`).
* **Automated FAQ Blocks & Schema:** Extracts Rank Math FAQ blocks, `<details>/<summary>` accordions, and outputs Google `FAQPage` schema (`FaqBlock.astro`).
* **Real-time Content Analyzer:** Validates focus keyword placement (Title, Meta Description, URL Slug, First 100 words, H2/H3 subheadings), keyword density (0.8%–2.5%), heading hierarchy, image `alt` attributes, and content length.
* **Dynamic Edge Protocols:** Edge-rendered `/sitemap.xml` (with image extensions and auto-sharding), virtual `/robots.txt`, and AI search sitemaps (`/llms.txt`).
* **Edge Redirections & 404 Logging:** Instant 301, 302, and 410 redirect matching (exact, prefix, and regex) to preserve search rankings and log broken backlinks.

### 2. WordPress Migration Engine
* **Direct REST API Ingestion:** Authenticates with WordPress using Application Passwords (`WP_USER` & `WP_APP_PASSWORD` in `.env`).
* **1-File Helper Exporter:** Optional drop-in WordPress plugin ([scripts/emdash-export-helper.php](scripts/emdash-export-helper.php)) to export custom tables (`wp_rank_math_redirections`) in 1 click.
* **EmDash Native Migrator Extension:** Intercepts EmDash native imports (`meta._rankmath` and `meta._yoast`) and normalizes them into first-class SEO schemas.
* **Initial Migration Ready:** Ingests posts, pages, services, categories, and FAQs directly into structured EmDash collections.

---

## 📁 Repository Structure

```text
├── docs/                           # Comprehensive Specifications & Guides
│   ├── PRD.md                      # Product Requirement Document
│   ├── MIGRATION_PLAN.md           # Step-by-step WordPress migration plan
│   ├── SEO_PLUGIN_ARCHITECTURE.md  # Deep technical architecture of @emdash/plugin-seo
│   └── WP_IMPORT_GUIDE.md          # WordPress connection & Rank Math/Yoast mapping table
├── packages/
│   └── emdash-seo/                 # Standalone EmDash SEO Suite Plugin (@emdash/plugin-seo)
│       ├── package.json
│       ├── src/
│       │   ├── index.ts            # Native plugin entrypoint (createPlugin & seoPlugin)
│       │   ├── types.ts            # Strict TypeScript interfaces
│       │   ├── config.ts           # Variable templating (%title%, %siteName%, %separator%)
│       │   ├── engine/
│       │   │   ├── content-analyzer.ts  # Real-time on-page SEO analyzer
│       │   │   ├── schema-builder.ts    # Connected JSON-LD @graph generator
│       │   │   ├── breadcrumbs.ts       # Automated breadcrumb trail calculator
│       │   │   ├── toc-extractor.ts     # Table of Contents extractor & anchor injector
│       │   │   ├── link-analyzer.ts     # Internal linking graph & orphan detector
│       │   │   └── audit-runner.ts      # Sitewide technical health audit runner
│       │   ├── routes/
│       │   │   ├── sitemap.ts           # Streaming XML sitemap & index handler
│       │   │   ├── robots.ts            # Virtual robots.txt handler
│       │   │   ├── llms-txt.ts          # AI search /llms.txt route
│       │   │   └── redirects.ts         # Edge redirect matcher (301, 302, 410)
│       │   ├── head/
│       │   │   ├── SeoHead.astro        # Drop-in Astro head injection component
│       │   │   ├── SchemaGraph.astro    # JSON-LD Schema Graph component
│       │   │   └── OpenGraph.astro      # Social meta tags builder
│       │   └── components/
│       │       ├── Breadcrumbs.astro    # Accessible breadcrumb navigation
│       │       ├── TableOfContents.astro# Interactive Table of Contents with jump links
│       │       └── FaqBlock.astro       # Interactive FAQ accordion with schema
├── scripts/
│   ├── migrate-wordpress.ts        # Automated WordPress migration CLI
│   ├── emdash-export-helper.php    # 1-file helper WordPress export plugin
│   └── test-seo-plugin.ts          # Plugin verification test suite
├── seed/
│   └── seed.json                   # Seed database with sample services & blog posts
├── src/
│   ├── components/                 # Reusable UI components (Reviews badge, Service cards)
│   ├── layouts/                    # Base layout with SeoHead integration
│   ├── pages/                      # Astro routes (homepage, services, blog, search, 404)
│   └── worker.ts                   # Cloudflare Workers entrypoint
├── astro.config.mjs                # Astro configuration with emdash and seoPlugin
├── wrangler.jsonc                  # Cloudflare Workers D1 & R2 bindings
└── pnpm-workspace.yaml             # pnpm monorepo workspace configuration
```

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js**: v22+ (tested with v24.18)
* **Package Manager**: `pnpm` (v11+)

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
Fill in your credentials:
```env
EMDASH_ENCRYPTION_KEY="<32-byte-hex-key>"

# WordPress Connection
WP_URL="https://my-wordpress-site.com"
WP_USER="admin"
WP_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"
```

### 4. Run Migration
```bash
# Extract full posts, pages, services, FAQs, and Rank Math metadata
pnpm run migrate:wp
```

### 5. Run Verification Tests
```bash
# Verify Content Analyzer, Schema Graph, Breadcrumbs, TOC, and Edge Routes
pnpm run test:seo
```

### 6. Development Server
```bash
pnpm run dev
```
Visit `http://localhost:4321` to preview the site, or `http://localhost:4321/_emdash/admin` for the CMS admin panel.

### 7. Production Build & Cloudflare Deployment
```bash
# Build for Cloudflare Workers
pnpm run build

# Deploy to Cloudflare Workers
pnpm run deploy
```

---

## 📖 Detailed Documentation

* [PRD (Product Requirement Document)](docs/PRD.md)
* [WordPress to Astro Migration Plan](docs/MIGRATION_PLAN.md)
* [SEO Plugin Technical Architecture](docs/SEO_PLUGIN_ARCHITECTURE.md)
* [WordPress Import & Authentication Guide](docs/WP_IMPORT_GUIDE.md)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
