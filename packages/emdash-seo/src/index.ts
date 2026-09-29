import { DEFAULT_OPTIONS, DEFAULT_LOCAL_BUSINESS, resolveSeoVariables } from './config.js';
import type { SeoPluginOptions, FaqItem } from './types.js';
import { renderSitemap } from './routes/sitemap.js';
import { renderRobots } from './routes/robots.js';
import { renderLlmsTxt, renderLlmsFullTxt } from './routes/llms-txt.js';
import { handleRunAudit, handleGetAudit } from './routes/api-audit.js';
import { analyzeContent } from './engine/content-analyzer.js';
import { buildConnectedSchemaGraph } from './engine/schema-builder.js';
import { extractLinksFromContent, findInternalLinkOpportunities, detectOrphanPages } from './engine/link-analyzer.js';
import { parseRankMathMeta, extractFaqsFromContent, detectRankMathToc, stripRankMathTocBlock } from './importers/rankmath-importer.js';
import { parseYoastMeta } from './importers/yoast-importer.js';
import { matchRedirect, createRedirectResponse } from './routes/redirects.js';
import { generateAutoBreadcrumbs, type BreadcrumbItem } from './engine/breadcrumbs.js';
import { extractTableOfContents, slugifyHeading, type TocItem } from './engine/toc-extractor.js';

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
  DEFAULT_OPTIONS,
  DEFAULT_LOCAL_BUSINESS,
};
export type { BreadcrumbItem, TocItem, FaqItem };

/**
 * Native plugin runtime instantiator
 * Called at runtime by EmDash virtual module generator
 */
export function createPlugin(userOptions: Partial<SeoPluginOptions> = {}) {
  const options: SeoPluginOptions = { ...DEFAULT_OPTIONS, ...userOptions };

  return {
    id: 'emdash-seo',
    version: '1.0.0',
    capabilities: ['content:read', 'content:write'],
    allowedHosts: [],
    storage: { collections: [] },
    admin: {},
    hooks: {
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
    version: '1.0.0',
    entrypoint: '@emdash/plugin-seo',
    format: 'native' as const,
    capabilities: ['content:read', 'content:write'],
    options,
  };
}

export default seoPlugin;
