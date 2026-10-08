/**
 * EmDash Native page:metadata Hook Handler.
 * Intercepts page rendering to automatically generate and inject complete SEO metadata into <head>.
 * Outputs PageMetadataContribution[] with meta, links, Open Graph, Twitter, and connected JSON-LD graph.
 */

import type { SeoPluginOptions, PageMetadataEvent, PageMetadataContribution } from '../types.js';
import { DEFAULT_OPTIONS, resolveSeoVariables } from '../config.js';
import { cleanOgTitle, normalizeOgLocale, generateRobotsDirective, extractTaxonomyTerms } from './metadata-utils.js';
import { buildConnectedSchemaGraph } from './schema-builder.js';
import { generateAutoBreadcrumbs } from './breadcrumbs.js';
import { buildAlternateLinks, type HreflangEntry } from './hreflang.js';

export async function handlePageMetadata(
  event: PageMetadataEvent,
  ctx: any,
  options: SeoPluginOptions
): Promise<PageMetadataContribution[]> {
  const page = event.page;
  if (!page) return [];

  const path = page.path || (page.url ? new URL(page.url, options.siteUrl).pathname : '/');
  const is404 = path === '/404' || path.endsWith('/404') || path.endsWith('/404/');
  const siteUrl = options.siteUrl.replace(/\/+$/, '');
  const siteName = page.siteName || options.siteName;
  const locale = page.locale || 'en_GB';
  const separator = options.defaultSeparator || DEFAULT_OPTIONS.defaultSeparator || ' | ';

  const contributions: PageMetadataContribution[] = [];

  // 1. Titles (metaTitle wins, resolved through defaultTitleTemplate)
  const dataSeo: any = (page.content?.data as any)?.seo || {};
  const rawTitle = page.seo?.metaTitle || dataSeo?.metaTitle || page.title || siteName;
  const templateCtx = {
    title: rawTitle,
    excerpt: page.description || '',
    seoTitle: page.seo?.metaTitle,
    focusKeyword: dataSeo?.focusKeywords?.[0],
    category: (page.content?.data as any)?.category,
  };
  const templateOpts = { siteName, defaultSeparator: separator };
  let fullTitle: string;
  if (is404) {
    fullTitle = `Page not found${separator}${siteName}`;
  } else if (rawTitle.includes('%')) {
    fullTitle = resolveSeoVariables(rawTitle, templateCtx, templateOpts);
  } else if (rawTitle.includes(siteName)) {
    fullTitle = rawTitle;
  } else if (options.defaultTitleTemplate) {
    fullTitle = resolveSeoVariables(options.defaultTitleTemplate, { ...templateCtx, title: rawTitle }, templateOpts);
  } else {
    fullTitle = rawTitle;
  }
  const ogTitle = is404 ? 'Page not found' : cleanOgTitle(fullTitle, siteName, separator);

  // 2. Meta Description (metaDescription wins, ogDescription fallback)
  const description = page.seo?.metaDescription || page.seo?.ogDescription || dataSeo.metaDescription || dataSeo.ogDescription || page.description || '';
  if (description && !is404) {
    contributions.push({ kind: 'meta', name: 'description', content: description });
  }

  // 2b. Site verification
  if (options.verification?.google && !is404) {
    contributions.push({ kind: 'meta', name: 'google-site-verification', content: options.verification.google });
  }
  if (options.verification?.bing && !is404) {
    contributions.push({ kind: 'meta', name: 'msvalidate.01', content: options.verification.bing });
  }
  if (options.verification?.yandex && !is404) {
    contributions.push({ kind: 'meta', name: 'yandex-verification', content: options.verification.yandex });
  }
  if (options.verification?.pinterest && !is404) {
    contributions.push({ kind: 'meta', name: 'p:domain_verify', content: options.verification.pinterest });
  }

  // 3. Robots Directives (Strict 404 suppression)
  const robots = generateRobotsDirective({
    noIndex: page.seo?.noIndex ?? dataSeo.noIndex,
    noFollow: page.seo?.noFollow ?? dataSeo.noFollow,
    noArchive: page.seo?.noArchive ?? dataSeo.noArchive,
    noSnippet: page.seo?.noSnippet ?? dataSeo.noSnippet,
    maxSnippet: page.seo?.maxSnippet ?? dataSeo.maxSnippet,
    noImageIndex: page.seo?.noImageIndex ?? dataSeo.noImageIndex,
    noTranslate: page.seo?.noTranslate ?? dataSeo.noTranslate,
    maxImagePreview: page.seo?.maxImagePreview ?? dataSeo.maxImagePreview ?? 'large',
    path,
    archiveNoindex: options.archiveNoindex,
  });
  if (robots) {
    contributions.push({ kind: 'meta', name: 'robots', content: robots });
  }

  // 4. Canonical URL (Strict 404 & noindex suppression)
  let canonical: string | null = null;
  if (!is404 && !page.seo?.noIndex) {
    canonical = page.canonical || `${siteUrl}${path.endsWith('/') ? path : `${path}/`}`;
    contributions.push({ kind: 'link', rel: 'canonical', href: canonical });
  }

  // 5. Multilingual & hreflang Alternates
  if (ctx && !is404) {
    try {
      const { isI18nEnabled, getTranslations, getCollectionInfo, getI18nConfig } = await import('emdash');
      if (isI18nEnabled?.() && page.content?.id && page.content?.collection) {
        const transResult = await getTranslations(page.content.collection, page.content.id);
        const cfg = getI18nConfig?.();
        const colInfo = await getCollectionInfo?.(page.content.collection);

        if (transResult && transResult.translations && transResult.translations.length >= 2 && colInfo?.urlPattern) {
          const entries: HreflangEntry[] = [];
          for (const t of transResult.translations) {
            if (t.status === 'published' && t.slug) {
              const itemPath = colInfo.urlPattern.replace('{slug}', t.slug);
              const langPrefix = t.locale === cfg?.defaultLocale && !cfg?.prefixDefaultLocale ? '' : `/${t.locale}`;
              entries.push({
                locale: t.locale,
                url: `${siteUrl}${langPrefix}${itemPath}`,
              });
            }
          }

          const alternates = buildAlternateLinks(entries, cfg?.defaultLocale || 'en');
          for (const a of alternates) {
            contributions.push({
              kind: 'link',
              rel: 'alternate',
              hreflang: a.hreflang,
              href: a.href,
              key: `hreflang:${a.hreflang}`,
            });
          }
        }
      }
    } catch {
      // Ignore if i18n modules are not active
    }
  }

  // Shared taxonomy / author context (mirrors head-compiler.ts schema path)
  const taxonomy = extractTaxonomyTerms(page.content?.data);
  const category = taxonomy.articleSection || (page.content?.data as any)?.category;
  const keywords = taxonomy.keywords?.length ? taxonomy.keywords : (dataSeo?.focusKeywords || []);
  const toAuthor = (v: any) => (typeof v === 'string' ? { name: v } : v);
  const author = toAuthor(page.seo?.author) || toAuthor(dataSeo.author) || (page.articleMeta?.author ? { name: page.articleMeta.author } : undefined);
  const reviewedBy = toAuthor(page.seo?.reviewedBy) || toAuthor(dataSeo.reviewedBy);
  const speakableSelectors = page.seo?.speakableSelectors || dataSeo.speakableSelectors;
  const howToSteps = page.seo?.howToSteps || dataSeo.howToSteps;
  const faqs = page.seo?.faqs || dataSeo.faqs || (page.content?.data as any)?.faqs || [];
  const toc = page.seo?.toc || (page.content?.data as any)?.toc || [];
  const breadcrumbs = page.seo?.breadcrumbs || (page.content?.data as any)?.breadcrumbs || generateAutoBreadcrumbs(path, siteUrl, ogTitle || fullTitle, category);

  // 6. Open Graph
  contributions.push({
    kind: 'property',
    property: 'og:site_name',
    content: siteName,
  });

  contributions.push({
    kind: 'property',
    property: 'og:locale',
    content: normalizeOgLocale(locale),
  });

  if (!is404) {
    const rawOgType = page.seo?.ogType || dataSeo?.ogType;
    const resolvedOgType = rawOgType || (page.kind === 'content' ? 'article' : 'website');
    const ogTypeOut = resolvedOgType === 'service' ? 'website' : resolvedOgType;
    contributions.push({
      kind: 'property',
      property: 'og:type',
      content: ogTypeOut,
    });

    if (options.fbAppId) {
      contributions.push({ kind: 'property', property: 'fb:app_id', content: options.fbAppId });
    }

    if (ogTitle) {
      contributions.push({ kind: 'property', property: 'og:title', content: ogTitle });
    }

    if (description) {
      contributions.push({ kind: 'property', property: 'og:description', content: description });
    }

    if (canonical) {
      contributions.push({ kind: 'property', property: 'og:url', content: canonical });
    }

    const image = page.image || dataSeo.ogImage || options.defaultOgImage;
    if (image) {
      contributions.push({ kind: 'property', property: 'og:image', content: image });
      contributions.push({ kind: 'property', property: 'og:image:width', content: '1200' });
      contributions.push({ kind: 'property', property: 'og:image:height', content: '630' });
      contributions.push({ kind: 'property', property: 'og:image:alt', content: ogTitle || fullTitle });
      if (image.startsWith('https://')) {
        contributions.push({ kind: 'property', property: 'og:image:secure_url', content: image });
      }
    }

    // Article published / author
    if ((page.kind === 'content' || resolvedOgType === 'article') && (page.articleMeta || author)) {
      if (page.articleMeta?.publishedTime) {
        contributions.push({
          kind: 'property',
          property: 'article:published_time',
          content: page.articleMeta.publishedTime,
        });
      }
      if (page.articleMeta?.modifiedTime) {
        contributions.push({
          kind: 'property',
          property: 'article:modified_time',
          content: page.articleMeta.modifiedTime,
        });
      }
      if (typeof page.articleMeta?.author === 'string') {
        contributions.push({
          kind: 'property',
          property: 'article:author',
          content: page.articleMeta.author,
        });
      }
      if (category) {
        contributions.push({ kind: 'property', property: 'article:section', content: category });
      }
      for (const kw of keywords.slice(0, 10)) {
        contributions.push({ kind: 'property', property: 'article:tag', content: kw });
      }
    }

    // 7. Twitter Card
    contributions.push({
      kind: 'meta',
      name: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary',
    });

    if (ogTitle) {
      contributions.push({ kind: 'meta', name: 'twitter:title', content: ogTitle });
    }
    if (description) {
      contributions.push({ kind: 'meta', name: 'twitter:description', content: description });
    }
    if (image) {
      contributions.push({ kind: 'meta', name: 'twitter:image', content: image });
    }
    if (options.twitterSite) {
      contributions.push({ kind: 'meta', name: 'twitter:site', content: options.twitterSite });
    }
    if (options.twitterCreator) {
      contributions.push({ kind: 'meta', name: 'twitter:creator', content: options.twitterCreator });
    }
  }

  // 8. JSON-LD Connected Schema Graph (Omitted on 404)
  if (!is404 && canonical) {
    const schema = buildConnectedSchemaGraph({
      siteUrl,
      siteName,
      canonicalUrl: canonical,
      title: fullTitle,
      description,
      imageUrl: page.image || dataSeo.ogImage || options.defaultOgImage,
      datePublished: page.articleMeta?.publishedTime,
      dateModified: page.articleMeta?.modifiedTime,
      authorName: (author as any)?.name || page.articleMeta?.author || 'Editorial Team',
      author: author as any,
      reviewedBy: reviewedBy as any,
      speakableSelectors,
      howToSteps,
      breadcrumbs,
      pathname: path,
      category,
      toc,
      seo: { focusKeywords: [], noIndex: false, noFollow: false, ...dataSeo, ...(page.seo as any) },
      business: options.business,
      faqs,
      publishingPrinciples: options.publishingPrinciples,
      copyrightYear: options.copyrightYear,
      licenseUrl: options.licenseUrl,
      blogUrl: options.blogUrl,
      blogName: options.blogName,
      navigationItems: options.navigationItems,
      keywords,
      articleSection: taxonomy.articleSection || category,
      customGraphNodes: (page.content?.data as any)?.customGraphNodes || [],
    });

    contributions.push({
      kind: 'jsonld',
      id: 'primary',
      graph: schema,
    });
  }

  // 9. NLWeb Agent Link Discovery
  if (options.nlwebEndpoint && !is404) {
    contributions.push({
      kind: 'link',
      rel: 'nlweb',
      href: options.nlwebEndpoint,
    });
  }

  return contributions;
}
