/**
 * Pre-Computed Edge Delivery Compiler for EmDash CMS & Astro on Cloudflare Workers.
 * Computes complete <head> metadata and connected JSON-LD @graph at write-time (save/publish),
 * enabling sub-0.1ms TTFB and near-zero CPU time on Cloudflare Workers Free Tier (< 10 ms CPU).
 *
 * Zero external runtime dependencies. Strict TypeScript.
 */

import type { SeoPluginOptions, EntrySeoMetadata, FaqItem } from '../types.js';
import { DEFAULT_OPTIONS } from '../config.js';
import { resolveSeoVariables } from '../config.js';
import {
  cleanOgTitle,
  normalizeOgLocale,
  generateRobotsDirective,
  extractTaxonomyTerms,
  pickTemplate,
  templateKeyFor,
  getPagedNumber,
  stripPageParam,
  buildPagedPath,
} from './metadata-utils.js';
import { buildConnectedSchemaGraph } from './schema-builder.js';
import { generateAutoBreadcrumbs, type BreadcrumbItem } from './breadcrumbs.js';
import { extractTableOfContents, type TocItem } from './toc-extractor.js';
import { extractFaqsFromContent } from '../importers/rankmath-importer.js';

/**
 * Escapes characters for safe inclusion in HTML attributes and content.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Fast DJB2 32-bit hash returning an 8-character hex string.
 * Used for cache invalidation detection on content mutation.
 * Sub-microsecond execution time (< 0.005ms), zero dependencies.
 */
export function computeContentHash(content: string | any): string {
  if (content === null || content === undefined) return '00000000';
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Verifies whether an entry's precomputed SEO cache is present and valid.
 * If currentContent is provided, validates that the content hash matches.
 */
export function isCacheValid(entry: any, currentContent?: string): boolean {
  const seo = entry?.data?.seo || entry?.seo;
  if (!seo || !seo._cachedHead || !seo._cachedSchemaGraph || !seo._cachedHash) {
    return false;
  }
  if (currentContent !== undefined) {
    return seo._cachedHash === computeContentHash(currentContent);
  }
  return true;
}

/**
 * Normalizes an entry and extracts SEO configuration with consistent defaults.
 */
function extractNormalizedMetadata(entry: any, options: SeoPluginOptions) {
  const data = entry?.data || entry || {};
  const rawSeo = data.seo || entry?.seo || {};

  const rawFocusKws: string[] = rawSeo.focusKeywords || [];
  const fieldKw = typeof data.focus_keyword === 'string' ? data.focus_keyword.trim() : '';
  const focusKeywords = fieldKw && !rawFocusKws.includes(fieldKw) ? [fieldKw, ...rawFocusKws] : rawFocusKws;

  const seo: EntrySeoMetadata = {
    focusKeywords,
    noIndex: Boolean(rawSeo.noIndex),
    noFollow: Boolean(rawSeo.noFollow),
    noArchive: rawSeo.noArchive,
    noSnippet: rawSeo.noSnippet,
    maxSnippet: rawSeo.maxSnippet,
    noImageIndex: rawSeo.noImageIndex,
    noTranslate: rawSeo.noTranslate,
    maxImagePreview: rawSeo.maxImagePreview || 'large',
    metaTitle: rawSeo.metaTitle,
    metaDescription: rawSeo.metaDescription,
    canonicalUrl: rawSeo.canonicalUrl,
    ogTitle: rawSeo.ogTitle,
    ogDescription: rawSeo.ogDescription,
    ogImage: rawSeo.ogImage,
    ogType: rawSeo.ogType,
    twitterCard: rawSeo.twitterCard,
    twitterTitle: rawSeo.twitterTitle,
    twitterDescription: rawSeo.twitterDescription,
    twitterImage: rawSeo.twitterImage,
    schemaType: rawSeo.schemaType || data.schema_type,
    schemaOverrides: rawSeo.schemaOverrides,
    faqs: rawSeo.faqs,
    primaryCategory: rawSeo.primaryCategory,
    cornerstone: rawSeo.cornerstone ?? (data.cornerstone !== undefined ? Boolean(data.cornerstone) : undefined),
    author: rawSeo.author || (entry?.author ? { name: typeof entry.author === 'string' ? entry.author : entry.author.name } : options.defaultAuthor),
    reviewedBy: rawSeo.reviewedBy || (entry?.reviewed_by ? { name: typeof entry.reviewed_by === 'string' ? entry.reviewed_by : entry.reviewed_by.name } : (data.reviewed_by ? { name: typeof data.reviewed_by === 'string' ? data.reviewed_by : data.reviewed_by.name } : undefined)),
    speakableSelectors: rawSeo.speakableSelectors || options.defaultSpeakableSelectors,
    howToSteps: rawSeo.howToSteps,
    geoOptimization: rawSeo.geoOptimization,
    aeoOptimization: rawSeo.aeoOptimization,
  };

  const siteName = options.siteName || DEFAULT_OPTIONS.siteName;
  const cleanSiteUrl = (options.siteUrl || DEFAULT_OPTIONS.siteUrl).replace(/\/+$/, '');

  let canonicalUrl = seo.canonicalUrl || entry?.canonicalUrl || data.canonicalUrl || entry?.url || data.url;
  if (!canonicalUrl) {
    const slug = entry?.slug || data.slug || '';
    const collection = entry?.collection || data.collection || '';
    if (slug) {
      const pathPart = collection ? `/${collection}/${slug}` : `/${slug}`;
      canonicalUrl = `${cleanSiteUrl}${pathPart.endsWith('/') ? pathPart : `${pathPart}/`}`;
    } else {
      canonicalUrl = `${cleanSiteUrl}/`;
    }
  } else if (!canonicalUrl.startsWith('http://') && !canonicalUrl.startsWith('https://')) {
    const norm = canonicalUrl.startsWith('/') ? canonicalUrl : `/${canonicalUrl}`;
    canonicalUrl = `${cleanSiteUrl}${norm}`;
  }

  let pathname: string;
  try {
    pathname = new URL(canonicalUrl, cleanSiteUrl).pathname;
  } catch {
    pathname = '/';
  }

  const tplKey = templateKeyFor(entry?.collection || data.collection, pathname, false);
  const pageNum = getPagedNumber(pathname);

  // Paginated canonical: /page/N self-references; /page/1 collapses to base.
  if (!seo.canonicalUrl) {
    if (pageNum > 1) {
      canonicalUrl = `${cleanSiteUrl}${buildPagedPath(pathname, pageNum)}`;
      pathname = new URL(canonicalUrl, cleanSiteUrl).pathname;
    } else if (/\/page\/1\/?$/.test(pathname)) {
      canonicalUrl = `${cleanSiteUrl}${stripPageParam(pathname)}`;
      pathname = new URL(canonicalUrl, cleanSiteUrl).pathname;
    }
  }

  const rawTitle = seo.metaTitle || data.title || entry?.title || siteName;
  let fullTitle = rawTitle;
  const varCtx = {
    title: data.title || entry?.title,
    excerpt: data.excerpt || entry?.excerpt,
    date: entry?.createdAt || data.createdAt,
    category: data.category || entry?.category,
    page: pageNum > 1 ? pageNum : undefined,
    seoTitle: seo.metaTitle,
    focusKeyword: focusKeywords[0],
  };

  const titleTpl = pickTemplate(options.titleTemplates, tplKey, options.defaultTitleTemplate);
  if (!seo.metaTitle && titleTpl && (data.title || entry?.title)) {
    fullTitle = resolveSeoVariables(titleTpl, varCtx, options);
  } else if (rawTitle.includes('%')) {
    fullTitle = resolveSeoVariables(
      rawTitle,
      varCtx,
      options
    );
  } else if (!rawTitle.includes(siteName)) {
    const sep = options.defaultSeparator || ' | ';
    fullTitle = `${rawTitle}${sep}${siteName}`;
  }

  let description = seo.metaDescription || seo.ogDescription || '';
  if (!description) {
    const descTpl = pickTemplate(options.descriptionTemplates, tplKey, undefined);
    if (descTpl) description = resolveSeoVariables(descTpl, varCtx, options);
  }
  if (!description) {
    description = data.excerpt || entry?.excerpt || options.defaultDescription || '';
  }

  const finalImage = seo.ogImage || data.featured_image || entry?.featured_image || data.image || entry?.image || options.defaultOgImage;
  const publishedTime = entry?.publishedTime || data.publishedTime || entry?.createdAt || data.createdAt;
  const modifiedTime = entry?.modifiedTime || data.modifiedTime || entry?.updatedAt || data.updatedAt;
  const author = entry?.author || data.author;

  const resolvedOgType = seo.ogType || (entry?.collection === 'blog' || data.collection === 'blog' || entry?.type === 'article' || data.type === 'article' ? 'article' : 'website');
  const ogType = resolvedOgType === 'service' ? 'website' : resolvedOgType;

  const cleanSocialTitle = seo.ogTitle || cleanOgTitle(fullTitle, siteName, options.defaultSeparator);
  const ogDescription = seo.ogDescription || description;

  const twitterCard = seo.twitterCard || (finalImage ? 'summary_large_image' : 'summary');
  const twitterTitle = seo.twitterTitle || cleanSocialTitle;
  const twitterDescription = seo.twitterDescription || ogDescription;
  const twitterImage = seo.twitterImage || finalImage;

  const locale = entry?.locale || data.locale || 'en_GB';
  const normalizedLocale = normalizeOgLocale(locale);

  const rawContent = typeof data.content === 'string'
    ? data.content
    : (typeof entry?.content === 'string' ? entry.content : '');

  const taxonomy = extractTaxonomyTerms(data);
  const category = seo.primaryCategory || entry?.category || data.category || taxonomy.articleSection;

  return {
    data,
    seo,
    siteName,
    cleanSiteUrl,
    rawTitle,
    fullTitle,
    description,
    canonicalUrl,
    pathname,
    pageNum,
    tplKey,
    finalImage,
    publishedTime,
    modifiedTime,
    author,
    resolvedOgType,
    ogType,
    cleanSocialTitle,
    ogDescription,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    locale,
    normalizedLocale,
    rawContent,
    taxonomy,
    category,
  };
}

/**
 * Compiles pre-rendered <head> HTML string containing:
 * - <title>
 * - <meta name="description">
 * - <link rel="canonical">
 * - <meta name="robots">
 * - Multilingual hreflang alternates (if present)
 * - NLWeb link (if configured)
 * - OpenGraph meta tags
 * - Twitter Card meta tags
 */
export function compilePrecomputedHead(entry: any, options: SeoPluginOptions): string {
  const meta = extractNormalizedMetadata(entry, options);
  const tags: string[] = [];

  // 1. Title
  tags.push(`<title>${escapeHtml(meta.fullTitle)}</title>`);

  // 2. Meta description
  if (meta.description) {
    tags.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
  }

  // 2b. Site verification
  if (options.verification?.google) {
    tags.push(`<meta name="google-site-verification" content="${escapeHtml(options.verification.google)}" />`);
  }
  if (options.verification?.bing) {
    tags.push(`<meta name="msvalidate.01" content="${escapeHtml(options.verification.bing)}" />`);
  }
  if (options.verification?.yandex) {
    tags.push(`<meta name="yandex-verification" content="${escapeHtml(options.verification.yandex)}" />`);
  }
  if (options.verification?.pinterest) {
    tags.push(`<meta name="p:domain_verify" content="${escapeHtml(options.verification.pinterest)}" />`);
  }

  // 3. Canonical URL (omitted if noIndex is true)
  if (!meta.seo.noIndex && meta.canonicalUrl) {
    tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`);
  }

  // 3b. Paginated prev/next (page 1 is self-canonical, no prev/next)
  if (meta.pageNum > 1 && meta.canonicalUrl) {
    const base = stripPageParam(meta.pathname);
    const prev = meta.pageNum === 2
      ? `${meta.cleanSiteUrl}${base}`
      : `${meta.cleanSiteUrl}${buildPagedPath(base, meta.pageNum - 1)}`;
    tags.push(`<link rel="prev" href="${escapeHtml(prev)}" />`);
    tags.push(`<link rel="next" href="${escapeHtml(`${meta.cleanSiteUrl}${buildPagedPath(base, meta.pageNum + 1)}`)}" />`);
  }

  // 4. Robots directive
  const robotsDirective = generateRobotsDirective({
    noIndex: meta.seo.noIndex,
    noFollow: meta.seo.noFollow,
    noArchive: meta.seo.noArchive,
    noSnippet: meta.seo.noSnippet,
    maxSnippet: meta.seo.maxSnippet,
    noImageIndex: meta.seo.noImageIndex,
    noTranslate: meta.seo.noTranslate,
    maxImagePreview: meta.seo.maxImagePreview || 'large',
    path: meta.pathname,
    archiveNoindex: options.archiveNoindex,
  });
  if (robotsDirective) {
    tags.push(`<meta name="robots" content="${escapeHtml(robotsDirective)}" />`);
  }

  // 5. Multilingual hreflang alternates
  const alternateLinks = entry?.alternateLinks || meta.data?.alternateLinks;
  if (Array.isArray(alternateLinks)) {
    for (const alt of alternateLinks) {
      if (alt?.hreflang && alt?.href) {
        tags.push(`<link rel="alternate" hreflang="${escapeHtml(alt.hreflang)}" href="${escapeHtml(alt.href)}" />`);
      }
    }
  }

  // 6. NLWeb endpoint
  if (options.nlwebEndpoint) {
    tags.push(`<link rel="nlweb" href="${escapeHtml(options.nlwebEndpoint)}" />`);
  }

  // 7. OpenGraph
  tags.push(`<meta property="og:title" content="${escapeHtml(meta.cleanSocialTitle)}" />`);
  if (meta.ogDescription) {
    tags.push(`<meta property="og:description" content="${escapeHtml(meta.ogDescription)}" />`);
  }
  if (meta.canonicalUrl) {
    tags.push(`<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />`);
  }
  tags.push(`<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`);
  tags.push(`<meta property="og:type" content="${escapeHtml(meta.ogType)}" />`);
  tags.push(`<meta property="og:locale" content="${escapeHtml(meta.normalizedLocale)}" />`);
  if (options.fbAppId) {
    tags.push(`<meta property="fb:app_id" content="${escapeHtml(options.fbAppId)}" />`);
  }

  if (meta.finalImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(meta.finalImage)}" />`);
    tags.push(`<meta property="og:image:width" content="1200" />`);
    tags.push(`<meta property="og:image:height" content="630" />`);
    tags.push(`<meta property="og:image:alt" content="${escapeHtml(meta.cleanSocialTitle)}" />`);
    if (meta.finalImage.startsWith('https://')) {
      tags.push(`<meta property="og:image:secure_url" content="${escapeHtml(meta.finalImage)}" />`);
    }
    const imgType = meta.finalImage.endsWith('.png') ? 'image/png' : meta.finalImage.endsWith('.webp') ? 'image/webp' : meta.finalImage.endsWith('.gif') ? 'image/gif' : 'image/jpeg';
    tags.push(`<meta property="og:image:type" content="${imgType}" />`);
  }

  if (meta.ogType === 'article') {
    if (meta.publishedTime) {
      tags.push(`<meta property="article:published_time" content="${escapeHtml(meta.publishedTime)}" />`);
    }
    if (meta.modifiedTime) {
      tags.push(`<meta property="article:modified_time" content="${escapeHtml(meta.modifiedTime)}" />`);
    }
    if (meta.author) {
      const authorName = typeof meta.author === 'string' ? meta.author : (meta.author as any)?.name;
      if (authorName) tags.push(`<meta property="article:author" content="${escapeHtml(authorName)}" />`);
    }
    if (meta.category) {
      tags.push(`<meta property="article:section" content="${escapeHtml(meta.category)}" />`);
    }
    for (const kw of (meta.taxonomy.keywords || []).slice(0, 10)) {
      tags.push(`<meta property="article:tag" content="${escapeHtml(kw)}" />`);
    }
  }

  // 8. Twitter Card
  tags.push(`<meta name="twitter:card" content="${escapeHtml(meta.twitterCard)}" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(meta.twitterTitle)}" />`);
  if (meta.twitterDescription) {
    tags.push(`<meta name="twitter:description" content="${escapeHtml(meta.twitterDescription)}" />`);
  }
  if (meta.twitterImage) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(meta.twitterImage)}" />`);
  }
  if (options.twitterSite) {
    tags.push(`<meta name="twitter:site" content="${escapeHtml(options.twitterSite)}" />`);
  }
  if (options.twitterCreator) {
    tags.push(`<meta name="twitter:creator" content="${escapeHtml(options.twitterCreator)}" />`);
  }

  return tags.join('\n');
}

/**
 * Compiles pre-rendered JSON-LD schema graph <script> tag containing:
 * - Connected @graph with WebSite, Organization/LocalBusiness, WebPage, BreadcrumbList,
 *   ItemList (TOC), FAQPage, and contextual entity (Service or Article).
 */
export function compilePrecomputedSchemaGraph(entry: any, options: SeoPluginOptions): string {
  const meta = extractNormalizedMetadata(entry, options);

  let toc: TocItem[] = entry?.toc || meta.data?.toc || [];
  if (toc.length === 0 && meta.rawContent) {
    const tocResult = extractTableOfContents(meta.rawContent);
    if (tocResult.toc.length > 0) {
      toc = tocResult.toc;
    } else if (/#{2,3}\s+/.test(meta.rawContent)) {
      // Support markdown heading syntax (## and ###)
      const mdRegex = /^(#{2,3})\s+(.+)$/gm;
      let match: RegExpExecArray | null;
      while ((match = mdRegex.exec(meta.rawContent)) !== null) {
        const level = match[1].length === 2 ? 2 : 3;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
        toc.push({ id, text, level: level as 2 | 3 });
      }
    }
  }

  let faqs: FaqItem[] = meta.seo.faqs || entry?.faqs || meta.data?.faqs || [];
  if (faqs.length === 0 && meta.rawContent) {
    faqs = extractFaqsFromContent(meta.rawContent);
  }

  const breadcrumbs: BreadcrumbItem[] =
    entry?.breadcrumbs ||
    meta.data?.breadcrumbs ||
    generateAutoBreadcrumbs(meta.pathname, meta.cleanSiteUrl, meta.rawTitle, meta.category);

  const graph = buildConnectedSchemaGraph({
    siteUrl: meta.cleanSiteUrl,
    siteName: meta.siteName,
    canonicalUrl: meta.canonicalUrl,
    title: meta.fullTitle,
    description: meta.description,
    imageUrl: meta.finalImage,
    datePublished: meta.publishedTime,
    dateModified: meta.modifiedTime,
    authorName: meta.author || meta.seo.author?.name || 'Editorial Team',
    author: meta.seo.author,
    reviewedBy: meta.seo.reviewedBy,
    speakableSelectors: meta.seo.speakableSelectors,
    howToSteps: meta.seo.howToSteps,
    breadcrumbs,
    pathname: meta.pathname,
    category: meta.category,
    toc,
    seo: meta.seo,
    business: options.business,
    faqs,
    publishingPrinciples: options.publishingPrinciples,
    copyrightYear: options.copyrightYear,
    licenseUrl: options.licenseUrl,
    blogUrl: options.blogUrl,
    blogName: options.blogName,
    navigationItems: options.navigationItems,
    keywords: meta.taxonomy.keywords?.length ? meta.taxonomy.keywords : (meta.seo.focusKeywords || []),
    articleSection: meta.taxonomy.articleSection || meta.category,
    customGraphNodes: entry?.customGraphNodes || meta.data?.customGraphNodes || [],
  });

  const json = JSON.stringify(graph).replace(/<\/script/gi, '<\\/script');
  return `<script type="application/ld+json">${json}</script>`;
}
