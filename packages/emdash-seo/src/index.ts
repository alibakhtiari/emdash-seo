import { DEFAULT_OPTIONS, resolveSeoVariables } from './config.js';
import type { SeoPluginOptions, EntrySeoMetadata, FaqItem } from './types.js';
import { renderSitemap } from './routes/sitemap.js';
import { renderRobots } from './routes/robots.js';
import { renderLlmsTxt } from './routes/llms-txt.js';
import { handleRunAudit, handleGetAudit } from './routes/api-audit.js';
import { analyzeContent } from './engine/content-analyzer.js';
import { buildConnectedSchemaGraph } from './engine/schema-builder.js';
import { extractLinksFromContent, findInternalLinkOpportunities, detectOrphanPages } from './engine/link-analyzer.js';
import { parseRankMathMeta, extractFaqsFromContent } from './importers/rankmath-importer.js';
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
  parseYoastMeta,
  matchRedirect,
  createRedirectResponse,
  resolveSeoVariables,
  generateAutoBreadcrumbs,
  extractTableOfContents,
  slugifyHeading,
  DEFAULT_OPTIONS,
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
    hooks: {
      'content:beforeSave': async (event: any, ctx: any) => {
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

        // Auto-extract FAQs if present in content and not yet structured in data.seo.faqs
        if (content.data.content) {
          const rawHtml = typeof content.data.content === 'string'
            ? content.data.content
            : JSON.stringify(content.data.content);

          const faqs = extractFaqsFromContent(rawHtml);
          if (faqs.length > 0) {
            content.data.seo = content.data.seo || { focusKeywords: [], noIndex: false, noFollow: false };
            if (!content.data.seo.faqs || content.data.seo.faqs.length === 0) {
              content.data.seo.faqs = faqs;
            }
          }
        }

        return content;
      },
      'content:afterPublish': async (event: any, ctx: any) => {
        if (ctx?.log?.info) {
          ctx.log.info('SEO Suite: Indexed published entry', { id: event.id, collection: event.collection });
        }
      },
    },
    routes: {
      '/sitemap.xml': async (ctx: any) => renderSitemap(ctx, options),
      '/sitemap_index.xml': async (ctx: any) => renderSitemap(ctx, options),
      '/robots.txt': async (ctx: any) => renderRobots(ctx, options),
      ...(options.enableLlmsTxt ? {
        '/llms.txt': async (ctx: any) => renderLlmsTxt(ctx, options),
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
    options,
  };
}

export default seoPlugin;
