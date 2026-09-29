# EmDash CMS Built-in SEO Features Reference

> **Source:** Official EmDash Documentation ([https://docs.emdashcms.com/guides/seo/](https://docs.emdashcms.com/guides/seo/))  
> **Status:** Captured as reference for `@emdash/plugin-seo` architecture and interoperability.

---

## 1. Overview of Built-in Features

EmDash provides core search engine optimization (SEO) features for content entries, page heads, sitemaps, `robots.txt`, and redirects. Most of them work once a collection has SEO enabled and the site renders `<EmDashHead>` in its page heads.

| Feature | Output | Requires |
| :--- | :--- | :--- |
| **SEO Panel** | Title, description, image, canonical URL, and no-index per entry | SEO enabled on the collection (`supports: ["seo"]`) |
| **Head Metadata** | Description, robots, canonical, Open Graph, and Twitter Card tags | `<EmDashHead>` in the page head |
| **Structured Data** | JSON-LD `BlogPosting` or `WebSite` | `<EmDashHead>` in the page head |
| **Sitemaps** | `/sitemap.xml` and `/sitemap-{collection}.xml` | SEO enabled on the collection |
| **`robots.txt`** | `/robots.txt` with a sitemap reference | Enabled by default |
| **Site-wide Settings** | Verification tags, default social image, title separator | Values in **Settings > SEO** in admin |
| **Translations** | `hreflang` links in the head and the sitemap | Astro i18n configured |
| **Redirects & 404 Log** | Redirect (301, 302, 307, 308) and gone (410, 451) rules, log of missed URLs | Enabled by default |

---

## 2. Enabling SEO on a Collection

Turn on **SEO** for a collection in **Content Types** in the EmDash admin. In a seed file or collection definition, add `"seo"` to the collection’s `supports` array:

```json
{
  "version": "1",
  "collections": [
    {
      "slug": "posts",
      "label": "Posts",
      "urlPattern": "/posts/{slug}",
      "supports": ["drafts", "revisions", "seo"],
      "fields": [
        { "slug": "title", "label": "Title", "type": "string", "required": true }
      ]
    }
  ]
}
```

* **Behavior:** With SEO enabled, the editor of a saved entry displays an **SEO** panel in the admin UI, and published entries appear in the collection's sitemap.
* **Routability:** Collections with **Routable** turned off stay out of the sitemap.

---

## 3. SEO Fields Per Entry (Admin Editor Panel)

The **SEO** panel in the entry editor provides the following controls:

* **OG Image:** The social preview image (`og:image`) and the image listed for the entry in the XML sitemap.
* **SEO Title:** Replaces the entry title in social previews, structured data, and in `<title>` when the page renders the title from `getSeoMeta()`.
* **Meta Description:** The summary snippet shown below the title in search engine result pages (SERPs). The panel counts characters against a 160-character guideline.
* **Canonical URL:** Points search engines to the original authoritative version of a page when duplicate URLs exist.
* **Hide from search engines:** Adds `noindex, nofollow` to the page and removes the entry from the XML sitemap and `hreflang` alternates.

*Empty fields fall back to values passed to `createPublicPageContext()`. `getSeoMeta()` falls back to the entry’s `title` and `excerpt` fields.*

---

## 4. Rendering SEO Metadata on Content Pages

`<EmDashHead>` renders the SEO metadata for a page context. On a content page, pass the entry’s collection and database ID as `content`, so `<EmDashHead>` applies the entry’s SEO panel values.

### Official Implementation Pattern:

```astro
---
import { decodeSlug, getEmDashEntry, getSeoMeta, getSiteSettings } from "emdash";
import { createPublicPageContext } from "emdash/page";
import { EmDashHead } from "emdash/ui";

const slug = decodeSlug(Astro.params.slug);
if (!slug) return Astro.redirect("/404");

const { entry: post } = await getEmDashEntry("posts", slug);
if (!post) return Astro.redirect("/404");

const settings = await getSiteSettings();
const seo = getSeoMeta(post, {
  siteTitle: settings.title,
  siteUrl: settings.url || Astro.url.origin,
  titleSeparator: settings.seo?.titleSeparator,
  path: Astro.url.pathname,
});

const page = createPublicPageContext({
  Astro,
  kind: "content",
  title: seo.title,
  pageTitle: seo.ogTitle,
  description: seo.description,
  canonical: seo.canonical,
  siteName: settings.title,
  content: { collection: "posts", id: post.data.id, slug: post.data.slug },
});
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{seo.title}</title>
    <EmDashHead page={page} />
  </head>
  <body>
    <h1>{post.data.title}</h1>
  </body>
</html>
```

### Tags Rendered by `<EmDashHead>`:
1. Meta description (`<meta name="description" content="...">`).
2. Robots directives (`<meta name="robots" content="noindex, nofollow">`) when hidden from search engines.
3. Canonical link (`<link rel="canonical" href="...">`) and `og:url`.
4. OpenGraph tags (`og:type`, `og:title`, `og:description`, `og:image`, `og:site_name`) and Twitter Card tags. When a page has no custom image, `og:image` falls back to the site's default social image.
5. Article meta: `article:published_time`, `article:modified_time`, and `article:author` when the page context includes `articleMeta`.

> [!NOTE]
> `<EmDashHead>` does not render the `<title>` element directly. Render it explicitly in the page or layout.

---

## 5. Built-in Structured Data (JSON-LD)

`<EmDashHead>` adds a JSON-LD `<script type="application/ld+json">` tag based on page context:
* **Articles (`pageType: "article"`):** Emits a `BlogPosting` schema with headline, description, image, datePublished, dateModified, author, and publisher.
* **Other Pages (`kind: "custom"`):** Emits a basic `WebSite` schema with site name and URL.

*Plugins can extend or replace structured data through the `page:metadata` hook.*

---

## 6. Built-in Sitemaps

EmDash serves an automatic XML sitemap index at `/sitemap.xml`:
* **Index Structure:** Points to child sitemaps at `/sitemap-{collection}.xml` for each collection with at least one published entry, including `<lastmod>` dates.
* **Inclusions & Filters:** Lists published, non-deleted entries with slugs that are not hidden (`noindex`).
* **Images:** Includes Google image sitemap extensions (`<image:image><image:loc>...</image:loc></image:image>`) for entry OG images.
* **Pagination:** Up to 50,000 entries per collection sitemap, ordered by last update.

---

## 7. Built-in `robots.txt`

EmDash serves a virtual `/robots.txt` dynamically. By default, it allows all crawlers, blocks internal admin/API routes, and appends the sitemap directive:

```text
User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /_emdash/

Sitemap: https://example.com/sitemap.xml
```

Custom robots rules can be configured in **Settings > SEO > robots.txt**. EmDash automatically appends `Sitemap:` if omitted.

---

## 8. Site-wide SEO Settings (**Settings > SEO**)

Located in the EmDash Admin Panel under **Settings > SEO**:
* **Title Separator:** The divider character between page title and site name (e.g. `|`, `—`).
* **Default Social Image:** Global fallback `og:image` when an entry has no featured or custom social image.
* **Search Engine Verification:** Webmaster verification tokens:
  * Google Verification: Emits `<meta name="google-site-verification" content="...">`.
  * Bing Verification: Emits `<meta name="msvalidate.01" content="...">`.
* **robots.txt Editor:** Overrides default virtual `robots.txt`.

---

## 9. Built-in Redirects & 404 Monitoring

Managed via **Redirects** in the EmDash Admin Panel:
* **Redirect Rules:** Supports status codes `301`, `302`, `307`, `308`, `410 Gone`, and `451 Unavailable For Legal Reasons`.
* **Pattern Matching:** Supports named segments (`/old/[slug]`) and catch-all wildcards (`/old-blog/[...path]`).
* **Auto-Redirect on Slug Change:** Changing an entry slug automatically generates a `301` redirect from the old URL and collapses redirect chains.
* **404 Error Log:** Tracks missed requests (up to 10,000 URLs) with frequency counts in the **404 Errors** tab, enabling one-click creation of 301 redirects or 410 Gone markers.

---

## 10. How `@emdash/plugin-seo` Extends Built-in SEO

The `@emdash/plugin-seo` suite does not discard EmDash's built-ins; it builds directly upon them to achieve **full Rank Math Pro / Yoast Premium parity**:

| Capability | EmDash Built-in | `@emdash/plugin-seo` Extension |
| :--- | :--- | :--- |
| **JSON-LD Schema** | Basic `BlogPosting` or `WebSite` | Full **Connected Schema `@graph`**: `LocalBusiness`, `Organization`, `Service`, `OfferCatalog`, `BreadcrumbList`, `ItemList`, `FAQPage`, and `AggregateRating` |
| **On-Page Content Audit** | Character counter only | **Real-Time Content Analyzer**: Keyword density (0.8–2.5%), keyword placement (title, slug, intro, headings), word count, single H1, and image alt tags |
| **AI Search Protocols** | Not supported | Dynamic edge `/llms.txt` and `/llms-full.txt` generators |
| **Navigation & SERP UX** | Basic breadcrumb routes | Automated visual `<Breadcrumbs />` component + Google `BreadcrumbList` microdata |
| **Table of Contents** | Not supported | Dynamic `<TableOfContents />` with auto-slugified anchors and Google `ItemList` sitelink jump markup |
| **FAQ Accordions** | Not supported | Interactive `<FaqBlock />` component + Google `FAQPage` schema |
| **WordPress Migration** | Copies raw meta into custom fields | Intercepts `content:beforeSave` to normalize Rank Math/Yoast SEO fields, extract Gutenberg FAQ blocks into `data.seo.faqs`, and strip static TOC blocks |
| **Head Rendering** | `<EmDashHead />` (basic meta + basic schema) | `<SeoHead />` runs alongside `<EmDashHead />`, enriching the page with connected entity graphs and advanced Twitter/OpenGraph tags |
