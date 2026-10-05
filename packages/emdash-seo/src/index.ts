import { DEFAULT_OPTIONS, DEFAULT_LOCAL_BUSINESS, resolveSeoVariables } from './config.js';
import type { SeoPluginOptions, FaqItem } from './types.js';
import { renderSitemap } from './routes/sitemap.js';
import { renderRobots } from './routes/robots.js';
import { renderLlmsTxt, renderLlmsFullTxt } from './routes/llms-txt.js';
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
  auditGeoAeo,
  extractAutoFaqs,
  extractAutoHowTo,
  extractSpeakableText,
} from './engine/geo-aeo-analyzer.js';
import {
  buildAuthorNode,
  buildHowToNode,
  inferSchemaType,
} from './engine/schema-nodes.js';
import {
  SerpPreviewPage,
  LiveSentenceHighlighter,
  ImageAltAuditorWidget,
} from './admin-preview.js';
import {
  ContentEditorSeoPanel,
  contentEditorPanels,
  FocusKeywordFieldWidget,
  SeoSuiteFieldWidget,
  fields,
} from './admin.js';
import { updateAltInContent } from './components/ImageAltAuditorWidget.js';
import {
  getSentenceHighlightStyle,
  generateSentenceSuggestion,
  tokenizeSentence,
} from './components/LiveSentenceHighlighter.js';
import { defineHook } from './hooks/define-hook.js';
import {
  handleContentBeforeSave,
  handleContentAfterPublish,
  handleContentAfterSave,
  handleContentAfterUnpublish,
  handleContentAfterDelete,
} from './hooks/content-hooks.js';
import { createPluginRoutes } from './routes/plugin-routes.js';

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
  auditGeoAeo,
  extractAutoFaqs,
  extractAutoHowTo,
  extractSpeakableText,
  buildAuthorNode,
  buildHowToNode,
  inferSchemaType,
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
  FocusKeywordFieldWidget,
  SeoSuiteFieldWidget,
  fields,
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

/**
 * Native plugin runtime instantiator
 * Called at runtime by EmDash virtual module generator
 */
export function createPlugin(userOptions: Partial<SeoPluginOptions> = {}) {
  const options: SeoPluginOptions = { ...DEFAULT_OPTIONS, ...userOptions };
  const modIndexNow = options.modules?.indexNow ?? options.enableIndexNow ?? false;
  const routes = createPluginRoutes(options);

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
        async (event: any) => handleContentBeforeSave(event, options),
        { priority: 100 }
      ),
      'content:afterPublish': defineHook(
        async (event: any, ctx: any) => handleContentAfterPublish(event, ctx, options, modIndexNow),
        { priority: 100 }
      ),
      'content:afterSave': defineHook(
        async (event: any, ctx: any) => handleContentAfterSave(event, ctx, options, modIndexNow),
        { priority: 50, errorPolicy: 'continue' }
      ),
      'content:afterUnpublish': defineHook(
        async (event: any, ctx: any) => handleContentAfterUnpublish(event, ctx, options, modIndexNow),
        { priority: 50, errorPolicy: 'continue' }
      ),
      'content:afterDelete': defineHook(
        async (event: any, ctx: any) => handleContentAfterDelete(event, ctx, options, modIndexNow),
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
