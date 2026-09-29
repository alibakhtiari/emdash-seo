# AGENTS.md — Agent & AI Pair Programming Guide

This repository contains the **EmDash SEO Suite** (`@emdash/plugin-seo`) for **Astro** and **EmDash CMS**, with automated WordPress migration capabilities (Rank Math Pro, Yoast SEO, AIOSEO) targeting Cloudflare Workers.

---

## 🏗️ Architectural Core Principles

### 1. Cloudflare Workers Free Tier Budget (< 10 ms CPU, < 1 MB Bundle)
- Every route, schema builder, XML generator, and redirect matcher must execute with sub-millisecond CPU overhead.
- Never introduce heavyweight external libraries (e.g., Cheerio, jsdom, massive AST parsers) into runtime dependencies.
- Zero Cloudflare dynamic `worker_loaders`: Plugins must be registered as in-process native plugins (`format: "native"`).

### 2. EmDash Native Plugin Contract
In `astro.config.mjs`, EmDash integrations require plugins to be native descriptors:
```javascript
export default defineConfig({
  integrations: [
    emdash({
      plugins: [
        seoPlugin({ ...options }) // Returns { format: "native", entrypoint: "@emdash/plugin-seo", options }
      ]
    })
  ]
});
```
The entrypoint must export `createPlugin(options)` returning an object with `id`, `version`, `hooks`, and optional `routes`.

### 3. URL & Search Equity Preservation
- Zero ranking loss: All URLs from the source WordPress site preserve their exact slugs with trailing slashes or execute edge 301 redirects via `src/routes/redirects.ts`.

---

## 🛠️ Key CLI Commands

Always run these commands from the repository root using `pnpm`:

```bash
# Quality Assurance Suite
pnpm run lint             # Run ESLint across all JS, TS, and Astro files
pnpm run lint:fix         # Auto-fix linting issues
pnpm run test             # Run Vitest test suites (16+ unit & integration tests)
pnpm run typecheck        # Run Astro diagnostic checks and TypeScript --noEmit

# Development & Build
pnpm run dev              # Start Astro & EmDash dev server (http://localhost:4321)
pnpm run build            # Compile production Cloudflare Workers bundle to dist/
pnpm run preview          # Preview local production build
```

> **WordPress Migration:** Use the native EmDash Admin GUI at `http://localhost:4321/_emdash/admin` $\rightarrow$ **Settings** $\rightarrow$ **Transfer / Import** to import posts, pages, and media directly from your WordPress site.


---

## 📁 Repository Layout

```text
├── docs/                        # Specifications & Architecture Guides
│   ├── PRD.md                   # Product Requirements Document
│   ├── MIGRATION_PLAN.md        # Site inventory, Kadence mappings, and redirect map
│   ├── SEO_PLUGIN_ARCHITECTURE.md # Technical design of @emdash/plugin-seo
│   ├── WP_IMPORT_GUIDE.md       # WordPress REST API auth & meta mappings
│   ├── EMDASH_ASTRO_NATIVE_COMPARISON.md # Native vs Plugin audit & extension guide
│   └── references/
│       └── EMDASH_BUILTIN_SEO.md # Official EmDash built-in SEO reference guide
├── packages/
│   └── emdash-seo/              # Standalone SEO Suite (@emdash/plugin-seo)
│       ├── package.json
│       ├── src/
│       │   ├── index.ts         # createPlugin() and seoPlugin() entrypoints
│       │   ├── types.ts         # Strict TypeScript definitions
│       │   ├── config.ts        # Templating & default business entity
│       │   ├── engine/          # Content analyzer, schema builder, breadcrumbs, TOC
│       │   ├── routes/          # Sitemaps, robots.txt, dynamic llms.txt & llms-full.txt, redirects
│       │   ├── head/            # SeoHead.astro, SchemaGraph.astro, OpenGraph.astro
│       │   └── components/      # Breadcrumbs.astro, TableOfContents.astro, FaqBlock.astro
├── scripts/
│   ├── emdash-export-helper.php # 1-file companion helper plugin for custom table redirects
│   └── test-seo-plugin.ts       # Comprehensive SEO verification runner
├── seed/
│   └── seed.json                # Seed database with sample services & blog posts
├── src/
│   ├── components/              # Reusable UI components (Reviews, Cards, FAQ)
│   ├── env.d.ts                 # Astro ambient declarations & emdash/ui typings
│   ├── layouts/                 # Base layout with SeoHead integration
│   ├── pages/                   # Astro routes (homepage, services, blog, search, 404)
│   └── worker.ts                # Cloudflare Workers entrypoint
├── tests/                       # Vitest test suites
│   ├── content-analyzer.test.ts
│   ├── schema-builder.test.ts
│   ├── breadcrumbs-toc.test.ts
│   ├── wordpress-migration.test.ts
│   └── edge-protocols.test.ts
├── eslint.config.js             # Flat ESLint config
├── tsconfig.json                # TypeScript project configuration
├── vitest.config.ts             # Vitest test runner configuration
└── wrangler.jsonc               # Cloudflare Workers bindings (D1 & R2)
```

---

## 🌐 EmDash Built-in SEO & Suite Interoperability

EmDash provides baseline SEO out-of-the-box:
1. **Collection Level:** Collections define `supports: ["seo"]`, enabling the **SEO Panel** in the admin entry editor (SEO Title, Meta Description, OG Image, Canonical URL, No-Index).
2. **Head Rendering:** `<EmDashHead page={page} />` consumes `createPublicPageContext()` to render basic OpenGraph, Twitter card, robots, and article publication tags.
3. **Core Protocols:** EmDash automatically serves `/sitemap.xml`, `/sitemap-{collection}.xml`, and `/robots.txt`.
4. **Edge Redirects & 404 Logging:** EmDash handles path redirects (301, 302, 307, 308, 410) and tracks 404 errors in SQLite / D1.

👉 **Complete Built-in SEO Guide:** See [`docs/references/EMDASH_BUILTIN_SEO.md`](docs/references/EMDASH_BUILTIN_SEO.md) for full official documentation.

### How `@emdash/plugin-seo` Extends Built-in SEO:
- **Dual Head Architecture:** In `src/layouts/Base.astro`, `<SeoHead />` runs alongside `<EmDashHead />`. `<EmDashHead />` handles core page context & verification tags, while `<SeoHead />` injects the complete connected JSON-LD `@graph` (`LocalBusiness`, `Organization`, `Service`, `AggregateRating`, `FAQPage`, `BreadcrumbList`, and `ItemList`).
- **Gutenberg & Rank Math Ingestion:** During EmDash Native Site Transfer (`/_emdash/admin` $\rightarrow$ Settings $\rightarrow$ Transfer / Import), the plugin's `content:beforeSave` lifecycle hook intercepts entries, maps Rank Math / Yoast metadata into `data.seo`, auto-extracts FAQ blocks into `data.seo.faqs`, and strips static TOC blocks for dynamic Astro component rendering.
- **AI Search Optimization:** Adds edge-rendered `/llms.txt` and `/llms-full.txt` markdown endpoints for LLM crawlers without filesystem dependencies.

---

## 🧩 SEO Suite Features & Component Rules

### `<SeoHead />`
Include in `<head>` of all layouts:
```astro
---
import SeoHead from "@emdash/plugin-seo/head";
---
<head>
  <SeoHead
    title={title}
    description={description}
    canonicalUrl={Astro.url.href}
    type="service"
  />
</head>
```
Emits:
- Canonical `<link>` and meta description.
- Robots directives (`index, follow, max-image-preview:large`, etc.).
- Complete OpenGraph and Twitter cards.
- Connected JSON-LD `@graph` (`WebSite`, `LocalBusiness`, `Organization`, `WebPage`, `BreadcrumbList`, `ItemList`, `FAQPage`, `Service`).

### `<Breadcrumbs />`
```astro
---
import Breadcrumbs from "@emdash/plugin-seo/components/Breadcrumbs";
---
<Breadcrumbs pathname={Astro.url.pathname} />
```
Automatically generates hierarchical breadcrumbs with schema.org microdata and accessible ARIA navigation.

### `<TableOfContents />`
```astro
---
import TableOfContents from "@emdash/plugin-seo/components/TableOfContents";
---
<TableOfContents html={postContent} />
```
Extracts `<h2>` and `<h3>` headings, injects anchor IDs, and outputs Google `ItemList` jump-link schema.

### `<FaqBlock />`
```astro
---
import FaqBlock from "@emdash/plugin-seo/components/FaqBlock";
---
<FaqBlock items={faqs} emitSchema={true} />
```
Renders accessible accordions and outputs Google `FAQPage` schema.

---

## 🚦 Testing & Code Quality Expectations

Before pushing commits:
1. `pnpm run lint` must pass with 0 errors.
2. `pnpm run test` must pass all test suites.
3. `pnpm run typecheck` must report 0 errors and 0 warnings.
4. `pnpm run build` must compile clean server output targeting Cloudflare Workers.
