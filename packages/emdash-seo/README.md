# @emdash/plugin-seo

Enterprise SEO Suite for EmDash CMS & Astro: WordPress SEO Parity (Rank Math Pro / Yoast Premium), Connected Schema Graphs (JSON-LD), Real-Time Content Analyzer, Automated Breadcrumbs, Table of Contents, FAQ Blocks, Edge Protocols (XML Sitemaps, Robots, LLMs.txt), and Edge Redirections.

Designed as an **in-process Native EmDash Plugin** with **zero external runtime dependencies**, guaranteeing 100% compatibility with **Cloudflare Workers Free Tier** (sub-10ms CPU constraints and zero worker loaders) as well as Paid plans and Node.js runtimes.

---

## Features

- **Rank Math & Yoast Parity:** Migrate focus keywords, custom titles, descriptions, canonical URLs, robots directives (`noindex`, `nofollow`, `noimageindex`), and custom OpenGraph/Twitter social cards.
- **Connected JSON-LD Schema Graph:** Emits Google-compliant unified `@graph` linking `CleaningService`, `LocalBusiness`, `Organization`, `WebPage`, `WebSite`, `Service`, `AggregateRating`, `FAQPage`, `BreadcrumbList`, and `ItemList`.
- **Automated Breadcrumbs:** Computes hierarchical breadcrumb trails from URL routes, rendering accessible microdata (`Breadcrumbs.astro`) and Google `BreadcrumbList` schema.
- **Automated Table of Contents (TOC):** Parses `<h2>` and `<h3>` headings, auto-injects slugified anchor IDs, and outputs Google `ItemList` jump-link schema (`TableOfContents.astro`).
- **Automated FAQ Blocks & Schema:** Extracts Rank Math FAQ blocks, `<details>/<summary>` accordions, and outputs Google `FAQPage` schema (`FaqBlock.astro`).
- **Real-Time Content Analyzer:** On-page audits checking focus keyword density (0.8%–2.5%), placement (title, slug, description, intro, headings), word count, heading hierarchy, and image alt tags.
- **Dynamic Edge Protocols:** Edge-rendered `/sitemap.xml` with image extensions, virtual `/robots.txt`, and AI search `/llms.txt`.
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
  site: "https://4seasonscarpetclean.co.uk",
  integrations: [
    emdash({
      plugins: [
        seoPlugin({
          defaultTitle: "4 Seasons Carpet Clean",
          titleTemplate: "%title% | %siteName%",
          defaultDescription: "Top-rated carpet, upholstery & rug cleaning specialists.",
          siteUrl: "https://4seasonscarpetclean.co.uk",
          business: {
            name: "4 Seasons Carpet Clean",
            telephone: "+44 20 8945 3999",
            priceRange: "££",
            address: {
              streetAddress: "22 Park Lane",
              addressLocality: "London",
              postalCode: "W1K 1BE",
              addressCountry: "GB",
            },
            rating: {
              ratingValue: 5.0,
              reviewCount: 343,
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
    schemaType={schemaType || "CleaningService"}
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
  { question: "How long does carpet drying take?", answer: "Usually 2 to 4 hours with our low-moisture system." },
  { question: "Are your cleaning solutions pet-safe?", answer: "Yes, 100% eco-friendly and pet-safe." },
];
---
<FaqBlock items={faqs} emitSchema={true} />
```

---

## License

MIT © 4 Seasons Carpet Clean & EmDash Contributors
