/**
 * EmDash Native page:metadata Hook Handler.
 * Intercepts page rendering to automatically generate and inject complete SEO metadata into <head>.
 * Outputs PageMetadataContribution[] with meta, links, Open Graph, Twitter, and connected JSON-LD graph.
 */

import type { SeoPluginOptions, PageMetadataEvent, PageMetadataContribution } from '../types.js';
import { cleanOgTitle, normalizeOgLocale, generateRobotsDirective, extractTaxonomyTerms } from './metadata-utils.js';
import { buildConnectedSchemaGraph } from './schema-builder.js';
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
  const locale = page.locale || 'en';

  const contributions: PageMetadataContribution[] = [];

  // 1. Titles
  const rawTitle = page.title || page.seo?.metaTitle || siteName;
  const ogTitle = is404 ? 'Page not found' : cleanOgTitle(rawTitle, siteName, options.defaultSeparator);

  // 2. Meta Description
  const description = page.seo?.ogDescription || page.description || '';
  if (description && !is404) {
    contributions.push({ kind: 'meta', name: 'description', content: description });
  }

  // 3. Robots Directives (Strict 404 suppression)
  const robots = generateRobotsDirective({
    noIndex: page.seo?.noIndex,
    noFollow: page.seo?.noFollow,
    path,
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
    contributions.push({
      kind: 'property',
      property: 'og:type',
      content: page.kind === 'content' ? 'article' : 'website',
    });

    if (ogTitle) {
      contributions.push({ kind: 'property', property: 'og:title', content: ogTitle });
    }

    if (description) {
      contributions.push({ kind: 'property', property: 'og:description', content: description });
    }

    if (canonical) {
      contributions.push({ kind: 'property', property: 'og:url', content: canonical });
    }

    const image = page.image || options.defaultOgImage;
    if (image) {
      contributions.push({ kind: 'property', property: 'og:image', content: image });
    }

    // Article published / author
    if (page.kind === 'content' && page.articleMeta) {
      if (page.articleMeta.publishedTime) {
        contributions.push({
          kind: 'property',
          property: 'article:published_time',
          content: page.articleMeta.publishedTime,
        });
      }
      if (page.articleMeta.modifiedTime) {
        contributions.push({
          kind: 'property',
          property: 'article:modified_time',
          content: page.articleMeta.modifiedTime,
        });
      }
      if (page.articleMeta.author) {
        contributions.push({
          kind: 'property',
          property: 'article:author',
          content: page.articleMeta.author,
        });
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
  }

  // 8. JSON-LD Connected Schema Graph (Omitted on 404)
  if (!is404 && canonical) {
    const taxonomy = extractTaxonomyTerms(page.content?.data);
    const schema = buildConnectedSchemaGraph({
      siteUrl,
      siteName,
      canonicalUrl: canonical,
      title: ogTitle,
      description,
      imageUrl: page.image || options.defaultOgImage,
      datePublished: page.articleMeta?.publishedTime,
      dateModified: page.articleMeta?.modifiedTime,
      authorName: page.articleMeta?.author || 'Editorial Team',
      category: taxonomy.articleSection,
      articleSection: taxonomy.articleSection,
      keywords: taxonomy.keywords,
      publishingPrinciples: options.publishingPrinciples,
      copyrightYear: options.copyrightYear,
      licenseUrl: options.licenseUrl,
      blogUrl: options.blogUrl,
      blogName: options.blogName,
      navigationItems: options.navigationItems,
      business: options.business,
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
