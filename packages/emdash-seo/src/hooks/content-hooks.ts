import type { SeoPluginOptions } from '../types.js';
import { resolveSeoVariables } from '../config.js';
import {
  detectRankMathToc,
  stripRankMathTocBlock,
  extractFaqsFromContent,
} from '../importers/rankmath-importer.js';
import {
  compilePrecomputedHead,
  compilePrecomputedSchemaGraph,
  computeContentHash,
} from '../engine/head-compiler.js';
import {
  handleIndexNowPublished,
  handleIndexNowTransition,
  handleIndexNowDelete,
} from '../engine/indexnow.js';
import {
  extractAutoFaqs,
  extractAutoHowTo,
  auditGeoAeo,
} from '../engine/geo-aeo-analyzer.js';
import { inferSchemaType } from '../engine/schema-nodes.js';

/**
 * Intercepts content before saving to SQLite/D1.
 * Auto-syncs custom collection fields, resolves template tokens, migrates Gutenberg blocks,
 * and compiles pre-computed edge caches for sub-millisecond delivery.
 */
export async function handleContentBeforeSave(
  event: any,
  options: SeoPluginOptions
) {
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

  // Auto-resolve Author E-E-A-T credentials
  if (!content.data.seo.author || !content.data.seo.author.name) {
    const rawAuthor = content.author || content.data.author || options.defaultAuthor?.name;
    if (typeof rawAuthor === 'string' && rawAuthor.trim()) {
      content.data.seo.author = {
        ...(options.defaultAuthor || {}),
        name: rawAuthor.trim(),
      };
    } else if (typeof rawAuthor === 'object' && rawAuthor !== null && rawAuthor.name) {
      content.data.seo.author = {
        ...(options.defaultAuthor || {}),
        ...rawAuthor,
      };
    } else if (options.defaultAuthor) {
      content.data.seo.author = { ...options.defaultAuthor };
    }
  }

  // Auto-infer Schema Type per page / collection
  const entryPath = `/${content.slug || content.data?.slug || ''}`;
  content.data.seo.schemaType = inferSchemaType(
    entryPath,
    content.data.seo.schemaType || content.data.schema_type
  ) as any;

  // Auto-assign Speakable CSS Selectors for Voice & AEO
  if (!content.data.seo.speakableSelectors || content.data.seo.speakableSelectors.length === 0) {
    content.data.seo.speakableSelectors = options.defaultSpeakableSelectors || [
      '#field-excerpt',
      '.post-lead',
      '.aeo-summary',
    ];
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
    const rawContent =
      typeof content.data.content === 'string'
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
    } else if (!content.data.seo.faqs || content.data.seo.faqs.length === 0) {
      // Natural language Q&A extraction for Google FAQ rich snippet
      const autoFaqs = extractAutoFaqs(rawContent);
      if (autoFaqs.length > 0) {
        content.data.seo.faqs = autoFaqs;
      }
    }

    // 3. Auto-extract HowTo Steps
    if (!content.data.seo.howToSteps || content.data.seo.howToSteps.length === 0) {
      const autoSteps = extractAutoHowTo(rawContent);
      if (autoSteps.length > 0) {
        content.data.seo.howToSteps = autoSteps;
      }
    }

    // 4. Auto-compute GEO & AEO AI search engine metrics
    const geoAeo = auditGeoAeo(rawContent, {
      title: content.data.title || content.title || '',
      focusKeyword: content.data.seo.focusKeywords?.[0] || '',
      excerpt: content.data.excerpt || '',
    });
    content.data.seo.geoOptimization = {
      score: geoAeo.geo.score,
      quotableQuotes: geoAeo.geo.quotableQuotes,
      hasStatistics: geoAeo.geo.statisticalEvidenceScore > 40,
      hasAuthoritativeVoice: geoAeo.geo.firstPartyExperienceScore > 40,
    };
    content.data.seo.aeoOptimization = {
      score: geoAeo.aeo.score,
      directAnswerText: geoAeo.aeo.directAnswerCandidate,
      speakableText: geoAeo.aeo.speakableCandidate,
    };
  }

  // Pre-computed Edge Delivery Compilation (< 0.1ms TTFB on Cloudflare Workers)
  content.data.seo = content.data.seo || { focusKeywords: [], noIndex: false, noFollow: false };
  const bodyContent =
    typeof content.data.content === 'string'
      ? content.data.content
      : JSON.stringify(content.data.content || '');
  content.data.seo._cachedHead = compilePrecomputedHead(content, options);
  content.data.seo._cachedSchemaGraph = compilePrecomputedSchemaGraph(content, options);
  content.data.seo._cachedAt = new Date().toISOString();
  content.data.seo._cachedHash = computeContentHash(bodyContent);

  return content;
}

export async function handleContentAfterPublish(
  event: any,
  ctx: any,
  options: SeoPluginOptions,
  modIndexNow: boolean
) {
  if (ctx?.log?.info) {
    ctx.log.info('SEO Suite: Indexed published entry', { id: event.id, collection: event.collection });
  }
  if (modIndexNow) {
    await handleIndexNowPublished(event, ctx, options);
  }
}

export async function handleContentAfterSave(
  event: any,
  ctx: any,
  options: SeoPluginOptions,
  modIndexNow: boolean
) {
  if (modIndexNow) {
    await handleIndexNowPublished(event, ctx, options);
  }
}

export async function handleContentAfterUnpublish(
  event: any,
  ctx: any,
  options: SeoPluginOptions,
  modIndexNow: boolean
) {
  if (modIndexNow) {
    await handleIndexNowTransition(event, ctx, options);
  }
}

export async function handleContentAfterDelete(
  event: any,
  ctx: any,
  options: SeoPluginOptions,
  modIndexNow: boolean
) {
  if (modIndexNow) {
    await handleIndexNowDelete(event, ctx, options);
  }
}
