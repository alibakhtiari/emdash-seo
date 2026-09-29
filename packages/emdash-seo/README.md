# @emdash/plugin-seo

Enterprise SEO Suite for EmDash CMS & Astro: WordPress SEO Parity (Rank Math Pro / Yoast Premium), Connected Schema Graphs (JSON-LD), Real-Time Content Analyzer, Automated Breadcrumbs, Table of Contents, FAQ Blocks, Edge Protocols (XML Sitemaps, Robots, LLMs.txt), and Edge Redirections.

Designed as an **in-process Native EmDash Plugin** with **zero external runtime dependencies**, guaranteeing 100% compatibility with **Cloudflare Workers Free Tier** (sub-10ms CPU constraints and zero worker loaders) as well as Paid plans and Node.js runtimes.

---

## Features

- **Rank Math & Yoast Parity:** Migrate focus keywords, custom titles, descriptions, canonical URLs, robots directives (`noindex`, `nofollow`, `noimageindex`), and custom OpenGraph/Twitter social cards.
- **Native WordPress Migration Hooks:** Automatically intercepts EmDash's `content:beforeSave` hook to elevate Rank Math / Yoast metadata, extract Gutenberg FAQ blocks into `data.seo.faqs`, and strip static TOC blocks.
- **Connected JSON-LD Schema Graph:** Emits Google-compliant unified `@graph` linking `LocalBusiness`, `Organization`, `WebPage`, `WebSite`, `Service`, `AggregateRating`, `FAQPage`, `BreadcrumbList`, and `ItemList`.
- **Automated Breadcrumbs:** Computes hierarchical breadcrumb trails from URL routes, rendering accessible microdata (`Breadcrumbs.astro`) and Google `BreadcrumbList` schema.
- **Automated Table of Contents (TOC):** Parses `<h2>` and `<h3>` headings, auto-injects slugified anchor IDs, and outputs Google `ItemList` jump-link schema (`TableOfContents.astro`).
- **Automated FAQ Blocks & Schema:** Extracts Rank Math FAQ blocks, `<details>/<summary>` accordions, and outputs Google `FAQPage` schema (`FaqBlock.astro`).
- **Real-Time Content Analyzer:** On-page audits checking focus keyword density (0.8%–2.5%), placement (title, slug, description, intro, headings), word count, heading hierarchy, and image alt tags.
- **Dynamic Edge Protocols:** Edge-rendered `/sitemap.xml` with image extensions, virtual `/robots.txt`, and dynamic AI search `/llms.txt` & `/llms-full.txt`.
- **IndexNow Real-Time Search Push:** Instantly pings Bing, Yandex, Seznam, Naver, and Yep on publish, live updates, unpublish, and permanent deletion with a 60-second debounce and KV tombstone caching.
- **Fuzzy 404 URL Redirect Suggester:** Algorithmic similarity matcher combining Levenshtein edit distance, Jaccard token overlap, and last-segment slug matching (`/_emdash/api/seo/fuzzy-redirects`).
- **Multilingual & Hreflang Alternates:** Generates `<link rel="alternate" hreflang="…" href="…">` and `x-default` for multilingual Astro i18n & EmDash setups with BCP 47 code normalization.
- **Public Schema Map Route:** Exposes `/schemamap.xml` and `/_emdash/api/seo/schema-map` indexing structured-data URLs for search bots and AI agent scrapers.
- **EmDash Native `page:metadata` Hook Interoperability:** Automatically injects `<meta>`, `<link>`, OpenGraph, and connected JSON-LD schemas into public pages without mandatory Astro layout tags.
- **NLWeb Conversational Agent Link Discovery:** Advertises `<link rel="nlweb" href="…">` for AI agents to discover conversational chat surfaces.
- **Social & Metadata Hygiene:** Validates 130+ Facebook OpenGraph locales (`og:locale`), strips duplicate site name suffixes from `og:title`, and strictly suppresses robots/canonical tags on 404 pages.
- **Edge Redirections & 404 Logging:** Fast 301, 302, and 410 redirect matching (exact, prefix, and regex) to eliminate broken links and maintain organic rankings.

---

## Installation

Inside an EmDash & Astro project:

```bash
pnpm add @emdash/plugin-seo
```

---

## Setup in Astro

Register `seoPlugin` in `astro.config.mjs`:

```javascript
import { defineConfig } from "astro/config";
import emdash from "emdash";
import { seoPlugin } from "@emdash/plugin-seo";

export default defineConfig({
  site: "https://example.com",
  integrations: [
    emdash({
      plugins: [
        seoPlugin({
          defaultTitle: "My Company",
          titleTemplate: "%title% | %siteName%",
          defaultDescription: "High-performance services and modern solutions.",
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
          sitemap: {
            enabled: true,
            includeImages: true,
          },
          robots: {
            enabled: true,
          },
          llmsTxt: {
            enabled: true,
          },
          breadcrumbs: {
            enabled: true,
          },
        }),
      ],
    }),
  ],
});
```

---

## Component Usage

### 1. In Layout Head (`SeoHead.astro`)

```astro
---
import SeoHead from "@emdash/plugin-seo/head";

const { title, description, slug, image, schemaType } = Astro.props;
---
<head>
  <SeoHead
    title={title}
    description={description}
    canonical={Astro.url.href}
    ogImage={image}
    schemaType={schemaType || "Service"}
  />
</head>
```

### 2. Automated Breadcrumbs (`Breadcrumbs.astro`)

```astro
---
import Breadcrumbs from "@emdash/plugin-seo/components/Breadcrumbs";
---
<Breadcrumbs pathname={Astro.url.pathname} />
```

### 3. Automated Table of Contents (`TableOfContents.astro`)

```astro
---
import TableOfContents from "@emdash/plugin-seo/components/TableOfContents";

const { htmlContent } = Astro.props;
---
<TableOfContents html={htmlContent} minHeadings={3} />
```

### 4. Interactive FAQ Accordion (`FaqBlock.astro`)

```astro
---
import FaqBlock from "@emdash/plugin-seo/components/FaqBlock";

const faqs = [
  { question: "How quickly can services be scheduled?", answer: "Usually same-day or within 24 hours of booking." },
  { question: "Are services fully insured and guaranteed?", answer: "Yes, 100% comprehensive coverage and satisfaction guaranteed." },
];
---
<FaqBlock items={faqs} emitSchema={true} />
```

---

## WordPress Migration & Lifecycle Interception

When importing content via EmDash's official migrator (`emdash site import` or the Admin UI Site Transfer tool), `@emdash/plugin-seo` hooks directly into the `content:beforeSave` lifecycle:

1. **Rank Math & Yoast Metadata Normalization:** Automatically inspects incoming `meta._rankmath` and `meta._yoast` objects and maps them into first-class `data.seo` attributes (meta titles, meta descriptions, focus keywords, robots directives, canonical URLs, and social sharing cards).
2. **FAQ Block Extraction:** Scans content for Gutenberg Rank Math FAQ blocks (`<!-- wp:rank-math/faq-block -->`), HTML class markers (`div#rank-math-faq`), or Kadence accordion blocks, parses questions and answers, and populates `data.seo.faqs` for rendering via `<FaqBlock />` with Google `FAQPage` schema.
3. **Table of Contents Modernization:** Detects Gutenberg Rank Math TOC blocks (`<!-- wp:rank-math/toc-block -->` or `#rank-math-toc`), extracts heading references, and strips the static HTML block from the content body. This allows `<TableOfContents />` to dynamically render accessible jump links and Google `ItemList` rich sitelink schema.

---

## License

MIT © EmDash SEO Contributors
