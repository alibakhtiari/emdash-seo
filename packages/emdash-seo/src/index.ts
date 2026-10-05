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
import {
  compilePrecomputedHead,
  compilePrecomputedSchemaGraph,
  computeContentHash,
  isCacheValid,
  escapeHtml,
} from './engine/head-compiler.js';
import { handlePageMetadata } from './engine/metadata-handler.js';
import { buildPageUrl, type BuildPageUrlInput } from './engine/urls.js';
import { getIndexNowKeyFileContent } from './engine/indexnow.js';
import { buildLlmsTxt, generateLlmsTxtBody } from './routes/llms-txt.js';
import {
  shouldSkipSegment,
  formatSlugToLabel,
  type BreadcrumbRule,
  type BreadcrumbRuleCrumb,
  type BreadcrumbOptions,
} from './engine/breadcrumbs.js';
import {
  extractTopicalNgrams,
  calculateBm25Salience,
  calculateEntityCoverage,
  calculateFleschReadingEase,
  countSyllables,
  getReadingEaseLevel,
  getWorkersAiEmbeddings,
  ENGLISH_STOPWORDS,
  TOPIC_ENTITY_CLUSTERS,
} from './engine/semantic-analyzer.js';
import {
  handlePluginUninstall,
  type UninstallResult,
} from './engine/uninstaller.js';
import {
  handleSeoMetaGet,
  handleSeoMetaPut,
  handleStatelessAnalyze,
  handleLinkOpportunities,
  handleV1AuditRun,
  handleV1AuditLatest,
  handleV1Redirects,
  handleV1404s,
  resetApiV1State,
  record404Hit,
  prune404Logs,
  MAX_404_ENTRIES,
  type DetectedEntity,
  type EntityGap,
  type ReadabilityMetrics,
  type TechnicalChecks,
  type StatelessAnalyzeResponse,
  type NotFoundEntry,
} from './routes/api-v1.js';
import {
  auditReadability,
  segmentSentences,
  TRANSITION_WORDS,
  COMPLEX_WORD_ALTERNATIVES,
  IRREGULAR_PAST_PARTICIPLES,
} from './engine/readability-auditor.js';
import {
  auditImageAlts,
  type AltAuditorOptions,
} from './engine/alt-auditor.js';
import {
  SerpPreviewPage,
  LiveSentenceHighlighter,
  ImageAltAuditorWidget,
} from './admin-preview.js';
import {
  ContentEditorSeoPanel,
  contentEditorPanels,
} from './admin.js';
import { updateAltInContent } from './components/ImageAltAuditorWidget.js';
import {
  getSentenceHighlightStyle,
  generateSentenceSuggestion,
  tokenizeSentence,
} from './components/LiveSentenceHighlighter.js';

export * from './types.js';
export {
  LiveSentenceHighlighter,
  ImageAltAuditorWidget,
  updateAltInContent,
  getSentenceHighlightStyle,
  generateSentenceSuggestion,
  tokenizeSentence,
  auditReadability,
  segmentSentences,
  TRANSITION_WORDS,
  COMPLEX_WORD_ALTERNATIVES,
  IRREGULAR_PAST_PARTICIPLES,
  auditImageAlts,
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
  buildPageUrl,
  getIndexNowKeyFileContent,
  buildLlmsTxt,
  generateLlmsTxtBody,
  shouldSkipSegment,
  formatSlugToLabel,
  handleSeoMetaGet,
  handleSeoMetaPut,
  handleStatelessAnalyze,
  handleLinkOpportunities,
  handleV1AuditRun,
  handleV1AuditLatest,
  handleV1Redirects,
  handleV1404s,
  resetApiV1State,
  record404Hit,
  prune404Logs,
  MAX_404_ENTRIES,
  handlePluginUninstall,
  extractTopicalNgrams,
  calculateBm25Salience,
  calculateEntityCoverage,
  calculateFleschReadingEase,
  countSyllables,
  getReadingEaseLevel,
  getWorkersAiEmbeddings,
  ENGLISH_STOPWORDS,
  TOPIC_ENTITY_CLUSTERS,
  compilePrecomputedHead,
  compilePrecomputedSchemaGraph,
  computeContentHash,
  isCacheValid,
  escapeHtml,
  SerpPreviewPage,
  ContentEditorSeoPanel,
  contentEditorPanels,
  DEFAULT_OPTIONS,
  DEFAULT_LOCAL_BUSINESS,
};
export type {
  BreadcrumbItem,
  BreadcrumbRule,
  BreadcrumbRuleCrumb,
  BreadcrumbOptions,
  TocItem,
  FaqItem,
  RankedMatch,
  FuzzyMatchOptions,
  HreflangEntry,
  AlternateLink,
  BuildPageUrlInput,
  DetectedEntity,
  EntityGap,
  ReadabilityMetrics,
  TechnicalChecks,
  StatelessAnalyzeResponse,
  NotFoundEntry,
  UninstallResult,
  AltAuditorOptions,
};

function defineHook<T>(
  handler: T,
  overrides: Partial<{
    priority: number;
    timeout: number;
    dependencies: string[];
    errorPolicy: 'continue' | 'abort';
    exclusive: boolean;
  }> = {}
) {
  return {
    priority: overrides.priority ?? 100,
    timeout: overrides.timeout ?? 5000,
    dependencies: overrides.dependencies ?? [],
    errorPolicy: overrides.errorPolicy ?? ('abort' as const),
    exclusive: overrides.exclusive ?? false,
    pluginId: 'emdash-seo',
    handler,
  };
}

/**
 * Native plugin runtime instantiator
 * Called at runtime by EmDash virtual module generator
 */
export function createPlugin(userOptions: Partial<SeoPluginOptions> = {}) {
  const options: SeoPluginOptions = { ...DEFAULT_OPTIONS, ...userOptions };

  // Modular feature flags with backward-compatible fallback to legacy enable* flags
  const modSitemaps = options.modules?.sitemaps ?? options.enableSitemap ?? true;
  const modRobots = options.modules?.robots ?? options.enableRobots ?? true;
  const modRedirects = options.modules?.redirects ?? options.enableRedirects ?? true;
  const modLlmsTxt = options.modules?.llmsTxt ?? options.enableLlmsTxt ?? true;
  const modSchemaMap = options.modules?.schemaMap ?? options.enableSchemaMap ?? true;
  const modIndexNow = options.modules?.indexNow ?? options.enableIndexNow ?? false;
  const modAuditApi = options.modules?.auditApi ?? true;
  const modFuzzy = options.modules?.fuzzyRedirects ?? true;

  const routes: Record<string, any> = {};

  const registerRoute = (
    path: string,
    handler: (ctx: any) => Promise<any>,
    meta: { public?: boolean; permission?: string } = {}
  ) => {
    const routeObj: any = async (ctx: any) => handler(ctx);
    routeObj.handler = handler;
    routeObj.public = meta.public ?? false;
    if (meta.permission) routeObj.permission = meta.permission;

    const clean = path.replace(/^\/+/, '');
    routes[clean] = routeObj;
    routes[`/${clean}`] = routeObj;
  };

  if (modSitemaps) {
    registerRoute('sitemap.xml', async (ctx: any) => renderSitemap(ctx, options), { public: true });
    registerRoute('sitemap_index.xml', async (ctx: any) => renderSitemap(ctx, options), { public: true });
  }

  if (modRobots) {
    registerRoute('robots.txt', async (ctx: any) => renderRobots(ctx, options), { public: true });
  }

  if (modLlmsTxt) {
    registerRoute('llms.txt', async (ctx: any) => renderLlmsTxt(ctx, options), { public: true });
    registerRoute('llms-full.txt', async (ctx: any) => renderLlmsFullTxt(ctx, options), { public: true });
    registerRoute('llms/txt', async (ctx: any) => {
      const body = await generateLlmsTxtBody(ctx, options);
      return { enabled: true, body };
    }, { public: true });
  }

  if (modSchemaMap) {
    registerRoute('schemamap.xml', async (ctx: any) => renderSchemaMap(ctx, options), { public: true });
    registerRoute('_emdash/api/seo/schema-map', async (ctx: any) => renderSchemaMap(ctx, options), { public: true });
    registerRoute('schema/map', async (ctx: any) => {
      const items = await listPublishedSchemaUrls(ctx, options);
      return { items };
    }, { public: true });
  }

  if (modFuzzy) {
    registerRoute('_emdash/api/seo/fuzzy-redirects', async (ctx: any) => handleFuzzyRedirects(ctx, options));
  }

  if (modIndexNow) {
    registerRoute('_emdash/api/seo/indexnow/key', async (ctx: any) => {
      const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
      return new Response(JSON.stringify({ key, endpoint: INDEXNOW_ENDPOINT, keyFile: getIndexNowKeyFileContent(key) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }, { public: true });
    registerRoute('_emdash/api/seo/indexnow/submit', async (ctx: any) => {
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
    });
    registerRoute('indexnow/key', async (ctx: any) => {
      const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
      return { key, keyFile: getIndexNowKeyFileContent(key) };
    }, { public: true });
  }

  if (modAuditApi) {
    registerRoute('_emdash/api/seo/audit', async (ctx: any) => handleRunAudit(ctx));
    registerRoute('_emdash/api/seo/audit/latest', async (ctx: any) => handleGetAudit(ctx));
    registerRoute('_emdash/api/seo/v1/audit/run', async (ctx: any) => handleV1AuditRun(ctx, options));
    registerRoute('_emdash/api/seo/v1/audit/latest', async (ctx: any) => handleV1AuditLatest(ctx, options));
  }

  // Unified Typed REST API v1 routes
  registerRoute('_emdash/api/seo/v1/analyze', async (ctx: any) => handleStatelessAnalyze(ctx, options));
  if (modRedirects) {
    registerRoute('_emdash/api/seo/v1/redirects', async (ctx: any) => handleV1Redirects(ctx, options));
    registerRoute('_emdash/api/seo/v1/404s', async (ctx: any) => handleV1404s(ctx, options));
  }

  // Native EmDash Plugin Settings Routes
  registerRoute('settings', async (ctx: any) => {
    const settings: Record<string, string> = {};
    try {
      if (ctx?.settings?.list) {
        const entries = await ctx.settings.list();
        for (const { key, value } of entries) {
          settings[key] = typeof value === 'string' ? value : String(value);
        }
      } else if (ctx?.kv?.list) {
        const entries = (await ctx.kv.list('settings:')) || [];
        for (const { key, value } of entries) {
          const k = key.replace('settings:', '');
          settings[k] = typeof value === 'string' ? value : String(value);
        }
      }
    } catch {
      // Fallback
    }
    return { settings };
  });

  registerRoute('settings/save', async (ctx: any) => {
    const body = ctx?.input || (await ctx?.request?.json?.().catch(() => ({}))) || {};
    const settings = body.settings || {};
    try {
      if (ctx?.settings?.set) {
        for (const [key, value] of Object.entries(settings)) {
          await ctx.settings.set(key, value);
        }
      } else if (ctx?.kv?.set) {
        for (const [key, value] of Object.entries(settings)) {
          await ctx.kv.set(`settings:${key}`, value);
        }
      }
    } catch {
      // Fallback
    }
    return { ok: true };
  });

  return {
    id: 'emdash-seo',
    version: '1.2.0',
    capabilities: ['content:read', 'content:write', 'page:inject', 'network:fetch'],
    allowedHosts: ['api.indexnow.org'],
    storage: {},
    admin: {
      pages: [
        { path: '/settings', label: 'SEO Settings', icon: 'settings' },
        { path: '/preview', label: 'SERP & Social Preview', icon: 'search' },
        { path: '/fuzzy-redirects', label: 'Fuzzy Redirects', icon: 'arrow-right' },
        { path: '/readability', label: 'Readability Checker', icon: 'file-text' },
        { path: '/alt-auditor', label: 'Alt Image Auditor', icon: 'image' },
      ],
    },
    hooks: {
      'page:metadata': defineHook(
        async (event: any, ctx: any) => handlePageMetadata(event, ctx, options),
        { priority: 10, errorPolicy: 'continue' }
      ),
      'plugin:uninstall': defineHook(
        async (event: any, ctx: any) => handlePluginUninstall(event, ctx),
        { priority: 100 }
      ),
      'content:beforeSave': defineHook(
        async (event: any, _ctx?: any) => {
          const content = event.content;
          if (!content || !content.data) return content;

          // Auto-sync custom collection fields (focus_keyword, schema_type, cornerstone) into seo metadata
          content.data.seo = content.data.seo || { focusKeywords: [], noIndex: false, noFollow: false };
          if (content.data.focus_keyword && typeof content.data.focus_keyword === 'string') {
            const kw = content.data.focus_keyword.trim();
            if (kw) {
              if (!content.data.seo.focusKeywords || content.data.seo.focusKeywords.length === 0) {
                content.data.seo.focusKeywords = [kw];
              } else if (!content.data.seo.focusKeywords.includes(kw)) {
                content.data.seo.focusKeywords = [kw, ...content.data.seo.focusKeywords];
              }
            }
          }
          if (content.data.schema_type && typeof content.data.schema_type === 'string') {
            content.data.seo.schemaType = content.data.schema_type;
          }
          if (content.data.cornerstone !== undefined) {
            content.data.seo.cornerstone = Boolean(content.data.cornerstone);
          }

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

          // Pre-computed Edge Delivery Compilation (< 0.1ms TTFB on Cloudflare Workers)
          content.data.seo = content.data.seo || { focusKeywords: [], noIndex: false, noFollow: false };
          const bodyContent = typeof content.data.content === 'string'
            ? content.data.content
            : JSON.stringify(content.data.content || '');
          content.data.seo._cachedHead = compilePrecomputedHead(content, options);
          content.data.seo._cachedSchemaGraph = compilePrecomputedSchemaGraph(content, options);
          content.data.seo._cachedAt = new Date().toISOString();
          content.data.seo._cachedHash = computeContentHash(bodyContent);

          return content;
        },
        { priority: 100 }
      ),
      'content:afterPublish': defineHook(
        async (event: any, ctx: any) => {
          if (ctx?.log?.info) {
            ctx.log.info('SEO Suite: Indexed published entry', { id: event.id, collection: event.collection });
          }
          if (modIndexNow) {
            await handleIndexNowPublished(event, ctx, options);
          }
        },
        { priority: 100 }
      ),
      'content:afterSave': defineHook(
        async (event: any, ctx: any) => {
          if (modIndexNow) {
            await handleIndexNowPublished(event, ctx, options);
          }
        },
        { priority: 50, errorPolicy: 'continue' }
      ),
      'content:afterUnpublish': defineHook(
        async (event: any, ctx: any) => {
          if (modIndexNow) {
            await handleIndexNowTransition(event, ctx, options);
          }
        },
        { priority: 50, errorPolicy: 'continue' }
      ),
      'content:afterDelete': defineHook(
        async (event: any, ctx: any) => {
          if (modIndexNow) {
            await handleIndexNowDelete(event, ctx, options);
          }
        },
        { priority: 50, errorPolicy: 'continue' }
      ),
    },
    routes,
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
    version: '1.2.0',
    entrypoint: '@emdash/plugin-seo',
    format: 'native' as const,
    capabilities: ['content:read', 'content:write', 'page:inject', 'network:fetch'],
    adminEntry: new URL('./admin.tsx', import.meta.url).pathname,
    adminPages: [
      { path: '/settings', label: 'SEO Settings', icon: 'settings' },
      { path: '/preview', label: 'SERP & Social Preview', icon: 'search' },
      { path: '/fuzzy-redirects', label: 'Fuzzy Redirects', icon: 'arrow-right' },
      { path: '/readability', label: 'Readability Checker', icon: 'file-text' },
      { path: '/alt-auditor', label: 'Alt Image Auditor', icon: 'image' },
    ],
    storage: {},
    options,
  };
}

export default seoPlugin;
