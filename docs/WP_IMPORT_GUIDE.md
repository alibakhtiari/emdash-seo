# WordPress & SEO Plugins Import Guide for EmDash CMS & Astro

## 1. Overview

This guide explains how to extract content, media, Gutenberg / block builder elements, and Rank Math / Yoast SEO metadata from any **WordPress** installation and import them into **EmDash CMS + Astro**.

You have two simple options to connect and extract:
* **Option A (Recommended — Direct REST API via `.env`):** No plugin installation required on WordPress. Just generate an **Application Password** in WordPress admin and add it to `.env`.
* **Option B (1-File Helper WordPress Plugin):** Upload a single PHP helper file (`scripts/emdash-export-helper.php`) to WordPress to export custom tables (`wp_rank_math_redirections`), schemas, and settings in one click.

---

## 2. Option A: EmDash Native Migrator (Recommended)

WordPress (v5.6+) has native Application Passwords built into core. EmDash's official native migrator connects directly to your WordPress site and automatically triggers the `@emdash/plugin-seo` lifecycle hooks during ingestion.

### Step 1: Create an Application Password in WordPress
1. Log in to your WordPress dashboard (`https://my-wordpress-site.com/wp-admin/`).
2. Go to **Users** $\rightarrow$ **Profile** (or **All Users** $\rightarrow$ Edit your user).
3. Scroll down to the **Application Passwords** section.
4. In the "New Application Password Name" field, enter `EmDash Migration`.
5. Click **Add New Application Password**.
6. Copy the generated 24-character password (e.g. `abcd efgh ijkl mnop qrst uvwx`).

### Step 2: Run the Official EmDash GUI Migrator
1. Start your development server:
   ```bash
   pnpm run dev
   ```
2. Open your browser and navigate to:
   `http://localhost:4321/_emdash/admin` $\rightarrow$ **Settings** $\rightarrow$ **Transfer / Import**
3. Enter your WordPress site URL, username, and the Application Password created in Step 1.
4. Click **Start Import**.

### What Happens Automatically:
* Downloads all posts, pages, and media metadata via the native EmDash pipeline.
* EmDash fires the `content:beforeSave` hook on each post.
* `@emdash/plugin-seo` intercepts every entry:
  - Queries Rank Math / Yoast metadata (`metaTitle`, `metaDescription`, `focusKeywords`, `noIndex`, `canonicalUrl`, schemas).
  - Automatically extracts Rank Math & Kadence FAQ blocks into `data.seo.faqs`.
  - Automatically strips static Gutenberg Rank Math TOC blocks so Astro's dynamic `<TableOfContents />` renders live anchor links and `ItemList` schema.

---

## 3. Option B: 1-File Companion Helper Plugin (`scripts/emdash-export-helper.php`)

If you have custom redirect rules stored in third-party database tables (such as `wp_rank_math_redirections` or John Godley's `redirection_items`, which are not exposed over standard WP REST API), you can drop in our lightweight companion helper:

1. Copy [`scripts/emdash-export-helper.php`](../scripts/emdash-export-helper.php) into `/wp-content/plugins/emdash-export-helper/emdash-export-helper.php` on WordPress (or paste into your child theme `functions.php`).
2. Activate it in **Plugins** $\rightarrow$ **Installed Plugins**.
3. It exposes a protected endpoint:
   `GET https://my-wordpress-site.com/wp-json/emdash-export/v1/redirects?secret=YOUR_SECRET_KEY`
4. The edge redirect matcher (`@emdash/plugin-seo/routes/redirects`) imports the resulting rules directly.
5. Deactivate and delete the helper plugin once migration is complete.

---

## 4. Rank Math & Yoast SEO Data Mapping Table

| WordPress / SEO Plugin Field | Target WebABC SEO Schema (`data.seo`) | Description & Value Transformation |
| :--- | :--- | :--- |
| `rank_math_title` / `_yoast_wpseo_title` | `metaTitle` | Replaces variables like `%title% %sep% %sitename%` |
| `rank_math_description` / `_yoast_wpseo_metadesc` | `metaDescription` | Cleaned text snippet for SERP |
| `rank_math_focus_keyword` / `_yoast_wpseo_focuskw` | `focusKeywords` | Array of strings (e.g. `["web development", "cloud architecture"]`) |
| `rank_math_canonical_url` / `_yoast_wpseo_canonical` | `canonicalUrl` | Absolute canonical URL override |
| `rank_math_robots` / `_yoast_wpseo_meta-robots-noindex` | `noIndex` | `boolean` (true if noindex selected) |
| `rank_math_robots` / `_yoast_wpseo_meta-robots-nofollow`| `noFollow` | `boolean` (true if nofollow selected) |
| `rank_math_facebook_title` | `ogTitle` | Custom OpenGraph title fallback |
| `rank_math_facebook_image` | `ogImage` | Custom OpenGraph image URL |
| `rank_math_twitter_title` | `twitterTitle` | Custom Twitter card title |
| `rank_math_schema_*` | `schemaType` & `schemaOverrides` | Maps to `LocalBusiness`, `Service`, `Article`, `FAQPage` |
| `wp:rank-math/faq-block` & Kadence accordions | `faqs` | Extracted into `[{ question, answer }]` array for JSON-LD & accordions |
| `wp:rank-math/toc-block` | `hasToc` & `<TableOfContents />` | Static Gutenberg TOC stripped; dynamic Astro TOC renders anchors & `ItemList` schema |
| `wp_rank_math_redirections` / `redirection_items` | Edge `RedirectRule[]` | 1:1 path preservation, prefix match, regex support (301, 302, 410) |
