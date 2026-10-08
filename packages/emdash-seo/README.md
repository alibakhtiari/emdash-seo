# WebABC SEO Suite (`@emdash/plugin-seo`)

Enterprise Search, Generative AI (GEO), and Answer Engine Optimization (AEO) Suite for **EmDash CMS** and **Astro**. Built as an **in-process Native Plugin** with zero heavy runtime dependencies, guaranteed sub-10ms CPU performance, and 100% compatibility with **Cloudflare Workers Free Tier** and Paid tiers.

---

## 🌟 Suite Capabilities

### 1. Unified Admin Hub & Zero-Emoji UI
* **Single Admin Navigation Entry:** Mounts a clean **WebABC SEO** item in the EmDash navigation menu (`/_emdash/admin/plugins/emdash-seo/settings`).
* **Integrated Top Tab Bar:**
  - **SEO Settings:** LocalBusiness / Organization / Person entities, social profiles, and breadcrumbs.
  - **SERP & Social Preview:** Live interactive preview of Google Desktop, Google Mobile, Facebook OpenGraph, and X Cards.
  - **Readability Checker:** Hemingway-style live color highlighting (hard/very hard sentences, passive voice, transition words, complex word simplifications).
  - **Alt Image Auditor:** Detects missing alts, filename patterns, redundant prefixes, and offers inline instant quick-editing.
  - **Fuzzy 301 Redirects:** Smart algorithmic suggestions (Levenshtein + Jaccard) for broken 404 URLs.
* **Zero Emojis Policy:** Strict SVG icon library (`packages/emdash-seo/src/admin/icons.tsx`) ensures clean, professional styling.

### 2. Generative & Answer Engine Optimization (GEO & AEO)
* **AI Search Engine Readiness:** Optimizes content for citation by Perplexity, ChatGPT Search, Claude, and Google Gemini AI Overviews.
* **Direct Answer Optimization:** Automatically identifies and scores direct answer candidates in lead paragraphs, definition lists, and comparison tables.
* **Speakable Selectors:** Automatically assigns Google Speakable CSS selectors (`#field-excerpt`, `.post-lead`, `.aeo-summary`) for voice search engines.
* **AI Search Protocol Routes:** Dynamically generates `/llms.txt` and `/llms-full.txt` endpoints directly at the edge.

### 3. Semi-Automatic Schema Selector & Author E-E-A-T
* **Intelligent Auto-Inference:** Evaluates page title, URL slug, collection type, and content structure in real time (`inferSchemaType()`) to select the ideal Schema.org type (`BlogPosting`, `Service`, `HowTo`, `AboutPage`, `ContactPage`, `TechArticle`, `Article`, etc.).
* **Manual Override Dropdown:** Allows authors to lock any schema entity or revert to dynamic auto-evaluation with the live indicator badge.
* **Author & Reviewer E-E-A-T Schema:** Comprehensive support for author and reviewer credentials (`name`, `jobTitle`, `worksFor`, `sameAs`) in JSON-LD.

### 4. Interactive Field Widgets & Sub-Millisecond Edge Delivery
* **Custom Field Widgets:** `emdash-seo:focus-keyword` and `emdash-seo:seo-suite` provide live SEO, Readability, and GEO/AEO studio tools directly in the editor from the moment a new post is opened.
* **Pre-Computed Edge Caches:** On save, the plugin pre-compiles `<head>` tags and JSON-LD `@graph` into `data.seo._cachedHead` and `data.seo._cachedSchemaGraph`, achieving `< 0.1ms` TTFB on Cloudflare Workers Free Tier.

---

## 📦 Installation

```bash
pnpm add @emdash/plugin-seo
```

---

## ⚙️ Configuration in Astro

In `astro.config.mjs`:

```javascript
import { defineConfig } from "astro/config";
import emdash from "emdash";
import { webabcSeoPlugin } from "@emdash/plugin-seo"; // or seoPlugin

export default defineConfig({
  site: "https://example.com",
  integrations: [
    emdash({
      plugins: [
        webabcSeoPlugin({
          defaultTitle: "My Company",
          titleTemplate: "%title% | %siteName%",
          defaultDescription: "Premium services and expert solutions.",
          siteUrl: "https://example.com",
          business: {
            name: "My Company Ltd",
            telephone: "+44 20 8000 0000",
            priceRange: "££",
            address: {
              streetAddress: "100 High Street",
              addressLocality: "London",
              postalCode: "SW1A 1AA",
              addressCountry: "GB",
            },
            aggregateRating: {
              ratingValue: "5.0",
              reviewCount: "150",
            },
          },
          sitemap: { enabled: true, includeImages: true },
          robots: { enabled: true },
          llmsTxt: { enabled: true },
          breadcrumbs: { enabled: true },
        }),
      ],
    }),
  ],
});
```

---

## 🧩 Astro Components

### 1. In `<head>` Layout (`SeoHead.astro`)
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
    author={author}
    reviewedBy={reviewedBy}
  />
</head>
```

### 2. Breadcrumbs (`Breadcrumbs.astro`)
```astro
---
import Breadcrumbs from "@emdash/plugin-seo/components/Breadcrumbs";
---
<Breadcrumbs pathname={Astro.url.pathname} />
```

### 3. Dynamic Table of Contents (`TableOfContents.astro`)
```astro
---
import TableOfContents from "@emdash/plugin-seo/components/TableOfContents";
---
<TableOfContents html={postContent} />
```

### 4. Interactive FAQ Block (`FaqBlock.astro`)
```astro
---
import FaqBlock from "@emdash/plugin-seo/components/FaqBlock";
---
<FaqBlock items={faqs} emitSchema={true} />
```

---

## 🚦 Quality & Constraints
- **Zero Heavy Dependencies:** Pure TypeScript, zero DOM/AST heavy dependencies (no Cheerio, no jsdom).
- **Strict File Modularity:** All source files remain $\le 500$ lines.
- **208+ Tests Passing:** Fully covered by Vitest unit and integration test suites.

---

## 📄 License

MIT © WebABC SEO Contributors
