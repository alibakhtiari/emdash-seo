import { DEFAULT_OPTIONS, DEFAULT_LOCAL_BUSINESS, resolveSeoVariables } from './config.js';
import type { SeoPluginOptions, FaqItem } from './types.js';
import { renderSitemap } from './routes/sitemap.js';
import { renderRobots } from './routes/robots.js';
import { renderLlmsTxt, renderLlmsFullTxt } from './routes/llms-txt.js';
import { handleRunAudit, handleGetAudit } from './routes/api-audit.js';
import { renderSchemaMap, listPublishedSchemaUrls } from './routes/schema-map.js';
import { handleFuzzyRedirects } from './routes/api-fuzzy-redirects.js';
import { analyzeContent } from './engine/content-analyzer.js';
import { buildConnectedSchemaGraph } from './engine/schema-builder.js';
import { extractLinksFromContent, findInternalLinkOpportunities, detectOrphanPages } from './engine/link-analyzer.js';
import { parseRankMathMeta, extractFaqsFromContent, detectRankMathToc, stripRankMathTocBlock } from './importers/rankmath-importer.js';
import { parseYoastMeta } from './importers/yoast-importer.js';
import { matchRedirect, createRedirectResponse } from './routes/redirects.js';
import { generateAutoBreadcrumbs, type BreadcrumbItem } from './engine/breadcrumbs.js';
import { extractTableOfContents, slugifyHeading, type TocItem } from './engine/toc-extractor.js';
import {
  scoreSlugMatch,
  rankCandidates,
  levenshtein,
  lastSegmentKey,
  normalizePath,
  type RankedMatch,
  type FuzzyMatchOptions,
} from './engine/fuzzy-matcher.js';
import {
  handleIndexNowPublished,
  handleIndexNowTransition,
  handleIndexNowDelete,
  getOrCreateIndexNowKey,
  submitToIndexNow,
  validateIndexNowKey,
  generateIndexNowKey,
  INDEXNOW_ENDPOINT,
} from './engine/indexnow.js';
import { buildAlternateLinks, normalizeBcp47, type HreflangEntry, type AlternateLink } from './engine/hreflang.js';
import {
  cleanOgTitle,
  normalizeOgLocale,
  generateRobotsDirective,
  extractTaxonomyTerms,
} from './engine/metadata-utils.js';
import { handlePageMetadata } from './engine/metadata-handler.js';

export * from './types.js';
export {
  analyzeContent,
  buildConnectedSchemaGraph,
  extractLinksFromContent,
  findInternalLinkOpportunities,
  detectOrphanPages,
  parseRankMathMeta,
  extractFaqsFromContent,
  detectRankMathToc,
  stripRankMathTocBlock,
  parseYoastMeta,
  matchRedirect,
  createRedirectResponse,
  resolveSeoVariables,
  generateAutoBreadcrumbs,
  extractTableOfContents,
  slugifyHeading,
  renderLlmsTxt,
  renderLlmsFullTxt,
  renderSitemap,
  renderRobots,
  renderSchemaMap,
  listPublishedSchemaUrls,
  handleFuzzyRedirects,
  scoreSlugMatch,
  rankCandidates,
  levenshtein,
  lastSegmentKey,
  normalizePath,
  handleIndexNowPublished,
  handleIndexNowTransition,
  handleIndexNowDelete,
  getOrCreateIndexNowKey,
  submitToIndexNow,
  validateIndexNowKey,
  generateIndexNowKey,
  buildAlternateLinks,
  normalizeBcp47,
  cleanOgTitle,
  normalizeOgLocale,
  generateRobotsDirective,
  extractTaxonomyTerms,
  handlePageMetadata,
  DEFAULT_OPTIONS,
  DEFAULT_LOCAL_BUSINESS,
};
export type { BreadcrumbItem, TocItem, FaqItem, RankedMatch, FuzzyMatchOptions, HreflangEntry, AlternateLink };

/**
 * Native plugin runtime instantiator
 * Called at runtime by EmDash virtual module generator
 */
export function createPlugin(userOptions: Partial<SeoPluginOptions> = {}) {
  const options: SeoPluginOptions = { ...DEFAULT_OPTIONS, ...userOptions };

  return {
    id: 'emdash-seo',
    version: '1.1.0',
    capabilities: ['content:read', 'content:write', 'page:inject', 'network:fetch'],
    allowedHosts: ['api.indexnow.org'],
    storage: { collections: [] },
    admin: {},
    hooks: {
      'page:metadata': {
        priority: 10,
        handler: async (event: any, ctx: any) => handlePageMetadata(event, ctx, options),
      },
      'content:beforeSave': {
        priority: 100,
        timeout: 5000,
        dependencies: [],
        errorPolicy: 'abort' as const,
        exclusive: false,
        pluginId: 'emdash-seo',
        handler: async (event: any, _ctx?: any) => {
          const content = event.content;
          if (!content || !content.data) return content;

          // Auto-sanitize and resolve template variables if metaTitle contains % tokens
          if (content.data.seo && content.data.seo.metaTitle) {
            content.data.seo.metaTitle = resolveSeoVariables(
              content.data.seo.metaTitle,
              {
                title: content.data.title,
                excerpt: content.data.excerpt,
                date: content.createdAt,
              },
              options
            );
          }

          // Auto-migrate Rank Math TOC and FAQ blocks if present in content
          if (content.data.content) {
            const rawContent = typeof content.data.content === 'string'
              ? content.data.content
              : JSON.stringify(content.data.content);

            // 1. Auto-detect Rank Math TOC block
            if (detectRankMathToc(rawContent)) {
              content.data.seo = content.data.seo || { focusKeywords: [], noIndex: false, noFollow: false };
              content.data.seo.hasToc = true;
              if (typeof content.data.content === 'string') {
                content.data.content = stripRankMathTocBlock(content.data.content);
              }
            }

            // 2. Auto-extract FAQs (Rank Math & Kadence)
            const faqs = extractFaqsFromContent(rawContent);
            if (faqs.length > 0) {
              content.data.seo = content.data.seo || { focusKeywords: [], noIndex: false, noFollow: false };
              if (!content.data.seo.faqs || content.data.seo.faqs.length === 0) {
                content.data.seo.faqs = faqs;
              }
            }
          }

          return content;
        },
      },
      'content:afterPublish': {
        priority: 100,
        timeout: 5000,
        dependencies: [],
        errorPolicy: 'abort' as const,
        exclusive: false,
        pluginId: 'emdash-seo',
        handler: async (event: any, ctx: any) => {
          if (ctx?.log?.info) {
            ctx.log.info('SEO Suite: Indexed published entry', { id: event.id, collection: event.collection });
          }
          if (options.enableIndexNow) {
            await handleIndexNowPublished(event, ctx, options);
          }
        },
      },
      'content:afterSave': {
        priority: 50,
        handler: async (event: any, ctx: any) => {
          if (options.enableIndexNow) {
            await handleIndexNowPublished(event, ctx, options);
          }
        },
      },
      'content:afterUnpublish': {
        priority: 50,
        handler: async (event: any, ctx: any) => {
          if (options.enableIndexNow) {
            await handleIndexNowTransition(event, ctx, options);
          }
        },
      },
      'content:afterDelete': {
        priority: 50,
        handler: async (event: any, ctx: any) => {
          if (options.enableIndexNow) {
            await handleIndexNowDelete(event, ctx, options);
          }
        },
      },
    },
    routes: {
      '/sitemap.xml': async (ctx: any) => renderSitemap(ctx, options),
      '/sitemap_index.xml': async (ctx: any) => renderSitemap(ctx, options),
      '/robots.txt': async (ctx: any) => renderRobots(ctx, options),
      ...(options.enableLlmsTxt ? {
        '/llms.txt': async (ctx: any) => renderLlmsTxt(ctx, options),
        '/llms-full.txt': async (ctx: any) => renderLlmsFullTxt(ctx, options),
      } : {}),
      ...(options.enableSchemaMap ? {
        '/schemamap.xml': async (ctx: any) => renderSchemaMap(ctx, options),
        '/_emdash/api/seo/schema-map': async (ctx: any) => renderSchemaMap(ctx, options),
      } : {}),
      '/_emdash/api/seo/fuzzy-redirects': async (ctx: any) => handleFuzzyRedirects(ctx, options),
      '/_emdash/api/seo/indexnow/key': async (ctx: any) => {
        const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
        return new Response(JSON.stringify({ key, endpoint: INDEXNOW_ENDPOINT }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
      '/_emdash/api/seo/indexnow/submit': async (ctx: any) => {
        const req = ctx?.request || ctx?.req;
        const body = ctx?.input || (await req?.json?.().catch(() => ({}))) || {};
        const urls = body.urls || [];
        const host = body.host || new URL(options.siteUrl).hostname;
        const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
        const res = await submitToIndexNow({ host, key, urls });
        return new Response(JSON.stringify(res), {
          status: res.ok ? 200 : 502,
          headers: { 'Content-Type': 'application/json' },
        });
      },
      '/_emdash/api/seo/audit': async (ctx: any) => handleRunAudit(ctx),
      '/_emdash/api/seo/audit/latest': async (ctx: any) => handleGetAudit(ctx),
    },
  };
}

/**
 * EmDash Plugin Descriptor Factory
 * Returned in astro.config.mjs emdash({ plugins: [seoPlugin(...)] })
 */
export function seoPlugin(userOptions: Partial<SeoPluginOptions> = {}) {
  const options: SeoPluginOptions = { ...DEFAULT_OPTIONS, ...userOptions };

  return {
    id: 'emdash-seo',
    version: '1.1.0',
    entrypoint: '@emdash/plugin-seo',
    format: 'native' as const,
    capabilities: ['content:read', 'content:write', 'page:inject', 'network:fetch'],
    options,
  };
}

export default seoPlugin;
