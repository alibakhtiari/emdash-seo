/**
 * EmDash Unified REST API v1 Implementation
 * Reference: docs/EMDASH_ADMIN_AND_API_INTEGRATION.md
 *
 * Endpoints:
 * - GET  /_emdash/api/seo/v1/meta/:collection/:id
 * - PUT  /_emdash/api/seo/v1/meta/:collection/:id
 * - POST /_emdash/api/seo/v1/analyze
 * - GET  /_emdash/api/seo/v1/links/opportunities/:id
 * - POST /_emdash/api/seo/v1/audit/run
 * - GET  /_emdash/api/seo/v1/audit/latest
 * - GET  /_emdash/api/seo/v1/redirects
 * - POST /_emdash/api/seo/v1/redirects
 * - GET  /_emdash/api/seo/v1/404s
 *
 * Strict zero external runtime dependencies.
 * Cloudflare Workers free-tier compatible (< 10 ms CPU).
 */

import type {
  SeoPluginOptions,
  RedirectRule,
  AuditSnapshot,
  EntrySeoMetadata,
} from '../types.js';
import { handlePageMetadata } from '../engine/metadata-handler.js';
import { analyzeContent } from '../engine/content-analyzer.js';
import {
  findInternalLinkOpportunities,
  type SuggestLinkTarget,
  type LinkOpportunity,
} from '../engine/link-analyzer.js';
import { runSitewideAudit, type AuditEntryInput } from '../engine/audit-runner.js';

/* ========================================================================= */
/* Types & Interfaces                                                        */
/* ========================================================================= */

export interface DetectedEntity {
  name: string;
  salienceScore: number;
  inHeadings: boolean;
}

export interface EntityGap {
  entity: string;
  recommendedCategory: string;
  importance: 'critical' | 'recommended' | 'optional';
}

export interface ReadabilityMetrics {
  fleschReadingEase: number;
  grade: string;
  hardSentencesCount: number;
}

export interface TechnicalChecks {
  h1Valid: boolean;
  imagesWithAlt: boolean;
  metaDescriptionLength: number;
  wordCount?: number;
}

export interface StatelessAnalyzeResponse {
  entityCoverageIndex: number;
  grade: 'Good' | 'OK' | 'Needs Improvement';
  entitiesDetected: DetectedEntity[];
  entityGaps: EntityGap[];
  readability: ReadabilityMetrics;
  technicalChecks: TechnicalChecks;
  metrics?: any;
  recommendations?: string[];
}

export interface NotFoundEntry {
  path: string;
  count: number;
  lastSeen: string;
  topReferrer: string | null;
}

/* ========================================================================= */
/* In-Memory Store & State (Edge worker local memory & KV sync)              */
/* ========================================================================= */

let latestV1AuditSnapshot: AuditSnapshot | null = null;

let v1RedirectRules: RedirectRule[] = [
  {
    id: 'redir-default-1',
    pattern: '/legacy-carpet-care',
    from: '/legacy-carpet-care',
    destination: '/services/carpet-cleaning',
    to: '/services/carpet-cleaning',
    comparison: 'exact',
    matchType: 'exact',
    statusCode: 301,
    status: 'active',
  },
];

let v1NotFoundLogs: NotFoundEntry[] = [
  {
    path: '/old-price-list',
    count: 42,
    lastSeen: new Date().toISOString(),
    topReferrer: 'https://www.google.com/',
  },
  {
    path: '/services/steam-dry-clean',
    count: 24,
    lastSeen: new Date().toISOString(),
    topReferrer: 'https://bing.com/',
  },
  {
    path: '/contact-us-2024',
    count: 8,
    lastSeen: new Date().toISOString(),
    topReferrer: null,
  },
];

/**
 * Reset test/store state (useful for integration tests)
 */
export function resetApiV1State(): void {
  latestV1AuditSnapshot = null;
  v1RedirectRules = [
    {
      id: 'redir-default-1',
      pattern: '/legacy-carpet-care',
      from: '/legacy-carpet-care',
      destination: '/services/carpet-cleaning',
      to: '/services/carpet-cleaning',
      comparison: 'exact',
      matchType: 'exact',
      statusCode: 301,
      status: 'active',
    },
  ];
  v1NotFoundLogs = [
    {
      path: '/old-price-list',
      count: 42,
      lastSeen: new Date().toISOString(),
      topReferrer: 'https://www.google.com/',
    },
  ];
}

export const MAX_404_ENTRIES = 1000;

/**
 * Record a 404 hit in the store with automatic rolling retention cap (max 1,000 URLs).
 * Reference: docs/EDGE_PERFORMANCE_AND_STORAGE_SPEC.md Section 3.3
 */
export function record404Hit(path: string, referrer: string | null = null): void {
  const normPath = path.startsWith('/') ? path : `/${path}`;
  const existing = v1NotFoundLogs.find((entry) => entry.path === normPath);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = new Date().toISOString();
    if (referrer && !existing.topReferrer) {
      existing.topReferrer = referrer;
    }
  } else {
    v1NotFoundLogs.push({
      path: normPath,
      count: 1,
      lastSeen: new Date().toISOString(),
      topReferrer: referrer,
    });
    // Rolling cap: prune lowest hit counts when exceeding limit
    if (v1NotFoundLogs.length > MAX_404_ENTRIES) {
      v1NotFoundLogs.sort((a, b) => b.count - a.count);
      v1NotFoundLogs.length = MAX_404_ENTRIES;
    }
  }
}

/**
 * Prune 404 logs older than the specified retention window (default 30 days).
 * Reference: docs/EDGE_PERFORMANCE_AND_STORAGE_SPEC.md Section 3.3
 */
export function prune404Logs(retentionDays = 30): number {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const initialCount = v1NotFoundLogs.length;
  v1NotFoundLogs = v1NotFoundLogs.filter((entry) => entry.lastSeen >= cutoff);
  return initialCount - v1NotFoundLogs.length;
}

/* ========================================================================= */
/* Helper Functions                                                          */
/* ========================================================================= */

function jsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

async function parseRequestBody(ctx: any): Promise<any> {
  if (ctx?.input !== undefined && ctx.input !== null) {
    return ctx.input;
  }
  const req = ctx?.request || ctx?.req;
  if (!req) return {};
  try {
    if (typeof req.json === 'function') {
      return await req.json();
    }
  } catch {
    // Ignore JSON parsing errors
  }
  return {};
}

function extractMetaParams(ctx: any): { collection?: string; id?: string } {
  if (ctx?.params?.collection && ctx?.params?.id) {
    return { collection: ctx.params.collection, id: ctx.params.id };
  }
  const req = ctx?.request || ctx?.req;
  if (req?.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const match = url.pathname.match(/\/_emdash\/api\/seo\/v1\/meta\/([^/]+)\/([^/?#]+)/);
      if (match) {
        return {
          collection: decodeURIComponent(match[1]),
          id: decodeURIComponent(match[2]),
        };
      }
      const col = url.searchParams.get('collection');
      const id = url.searchParams.get('id');
      if (col && id) {
        return { collection: col, id };
      }
    } catch {
      // Ignore
    }
  }
  return {};
}

function extractOpportunityId(ctx: any): string | null {
  if (ctx?.params?.id) return ctx.params.id;
  const req = ctx?.request || ctx?.req;
  if (req?.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const match = url.pathname.match(/\/_emdash\/api\/seo\/v1\/links\/opportunities\/([^/?#]+)/);
      if (match) return decodeURIComponent(match[1]);
      const id = url.searchParams.get('id');
      if (id) return id;
    } catch {
      // Ignore
    }
  }
  return null;
}

/* ========================================================================= */
/* Readability & Entity Analysis Utilities                                   */
/* ========================================================================= */

function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 1;
  if (clean.length <= 3) return 1;
  const processed = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');
  const matches = processed.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

function computeReadability(text: string): ReadabilityMetrics {
  const sentences = text
    .split(/[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return {
      fleschReadingEase: 100,
      grade: 'Very Easy',
      hardSentencesCount: 0,
    };
  }

  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = words.length;
  const syllableCount = words.reduce((acc, w) => acc + countSyllables(w), 0);

  // Flesch Reading Ease standard formula
  const rawScore = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);
  const fleschReadingEase = Math.round(Math.min(100, Math.max(0, rawScore)) * 10) / 10;

  let grade: string;
  if (fleschReadingEase >= 90) grade = 'Very Easy';
  else if (fleschReadingEase >= 80) grade = 'Easy';
  else if (fleschReadingEase >= 70) grade = 'Fairly Easy';
  else if (fleschReadingEase >= 60) grade = 'Standard (Plain English)';
  else if (fleschReadingEase >= 50) grade = 'Fairly Difficult';
  else if (fleschReadingEase >= 30) grade = 'Difficult';
  else grade = 'Very Confusing';

  let hardSentencesCount = 0;
  for (const s of sentences) {
    const sWords = s.split(/\s+/).filter(Boolean);
    if (sWords.length >= 22) {
      hardSentencesCount++;
    }
  }

  return {
    fleschReadingEase,
    grade,
    hardSentencesCount,
  };
}

function extractEntities(
  contentHtml: string,
  cleanText: string,
  focusKeywords: string[]
): DetectedEntity[] {
  const detected: DetectedEntity[] = [];
  const seen = new Set<string>();

  const headingMatches = contentHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi) || [];
  const headingText = headingMatches
    .map((h) => h.replace(/<[^>]*>?/gm, '').toLowerCase().trim())
    .join(' ');

  // 1. Tag-emphasized terms (e.g. <strong>, <b>, <em>, <h2>, <h3>)
  const tagMatches = contentHtml.match(/<(strong|b|em|h[2-4])[^>]*>([\s\S]*?)<\/\1>/gi) || [];
  for (const match of tagMatches) {
    const term = match.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').toLowerCase().trim();
    if (term.length >= 3 && term.length <= 40 && !seen.has(term)) {
      seen.add(term);
      const inHeadings = headingText.includes(term);
      detected.push({
        name: term,
        salienceScore: inHeadings ? 0.92 : 0.88,
        inHeadings,
      });
    }
  }

  // 2. Focus keywords & variations
  for (const kw of focusKeywords) {
    const term = kw.toLowerCase().trim();
    if (term && cleanText.toLowerCase().includes(term) && !seen.has(term)) {
      seen.add(term);
      const inHeadings = headingText.includes(term);
      detected.push({
        name: term,
        salienceScore: inHeadings ? 0.95 : 0.90,
        inHeadings,
      });
    }
  }

  // 3. Domain keyphrases and prominent n-grams (2-3 words)
  const stopwords = new Set([
    'the', 'and', 'or', 'a', 'an', 'in', 'on', 'with', 'for', 'to', 'of', 'at', 'by', 'from',
    'is', 'are', 'was', 'were', 'our', 'your', 'their', 'we', 'you', 'it', 'this', 'that',
    'out', 'all', 'as', 'well', 'can', 'be', 'has', 'have', 'had', 'do', 'does', 'did',
  ]);

  const words = cleanText.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length - 1; i++) {
    if (stopwords.has(words[i]) || stopwords.has(words[i + 1])) continue;
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (!seen.has(bigram) && bigram.length >= 6) {
      const regex = new RegExp(`\\b${bigram}\\b`, 'gi');
      const matches = cleanText.match(regex);
      if (matches && matches.length >= 1) {
        seen.add(bigram);
        const inHeadings = headingText.includes(bigram);
        const baseScore = Math.min(0.88, 0.70 + matches.length * 0.04);
        detected.push({
          name: bigram,
          salienceScore: Math.round((inHeadings ? baseScore + 0.08 : baseScore) * 100) / 100,
          inHeadings,
        });
      }
    }
  }

  // Sort by salience descending
  detected.sort((a, b) => b.salienceScore - a.salienceScore);
  return detected.slice(0, 10);
}

function detectEntityGaps(
  cleanText: string,
  focusKeywords: string[],
  detected: DetectedEntity[]
): EntityGap[] {
  const gaps: EntityGap[] = [];
  const textLower = cleanText.toLowerCase();

  const domainAssociations: Record<string, Array<{ entity: string; recommendedCategory: string; importance: 'critical' | 'recommended' | 'optional' }>> = {
    cleaning: [
      { entity: 'drying time', recommendedCategory: 'service details', importance: 'recommended' },
      { entity: 'upholstery cleaning', recommendedCategory: 'related services', importance: 'optional' },
      { entity: 'stain removal', recommendedCategory: 'service capabilities', importance: 'recommended' },
      { entity: 'eco-friendly detergents', recommendedCategory: 'products & safety', importance: 'optional' },
      { entity: 'satisfaction guarantee', recommendedCategory: 'trust & policy', importance: 'recommended' },
    ],
    service: [
      { entity: 'customer reviews', recommendedCategory: 'social proof', importance: 'recommended' },
      { entity: 'pricing details', recommendedCategory: 'commercial', importance: 'recommended' },
      { entity: 'service area', recommendedCategory: 'local coverage', importance: 'recommended' },
      { entity: 'satisfaction guarantee', recommendedCategory: 'trust & policy', importance: 'optional' },
    ],
    default: [
      { entity: 'key benefits', recommendedCategory: 'overview', importance: 'recommended' },
      { entity: 'step-by-step process', recommendedCategory: 'methodology', importance: 'optional' },
      { entity: 'frequently asked questions', recommendedCategory: 'faqs', importance: 'optional' },
    ],
  };

  const allTerms = `${focusKeywords.join(' ')} ${textLower}`;
  let pool = domainAssociations.default;
  if (/clean|carpet|rug|sofa|upholstery|wash/i.test(allTerms)) {
    pool = domainAssociations.cleaning;
  } else if (/service|repair|install|maintenance|consult/i.test(allTerms)) {
    pool = domainAssociations.service;
  }

  for (const item of pool) {
    if (!textLower.includes(item.entity.toLowerCase()) && !detected.some((d) => d.name === item.entity.toLowerCase())) {
      gaps.push(item);
    }
  }

  return gaps.slice(0, 5);
}

/* ========================================================================= */
/* 1. handleSeoMetaGet: GET /_emdash/api/seo/v1/meta/:collection/:id          */
/* ========================================================================= */

export async function handleSeoMetaGet(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const { collection, id } = extractMetaParams(ctx);

  if (!collection || !id) {
    return jsonResponse(
      { error: 'Missing required route parameters: collection and id' },
      400
    );
  }

  let entry: any = null;

  if (ctx?.content?.get) {
    try {
      entry = await ctx.content.get(collection, id);
    } catch {
      // Ignore error, treat as not found
    }
  } else if (Array.isArray(ctx?.entries)) {
    entry = ctx.entries.find(
      (e: any) =>
        (e.id === id || e._id === id) &&
        (!e.collection || e.collection === collection)
    );
  }

  if (!entry) {
    return jsonResponse(
      { error: `Entry not found: ${collection}/${id}` },
      404
    );
  }

  const rawSeo: EntrySeoMetadata = entry.data?.seo || entry.seo || {
    focusKeywords: [],
    noIndex: false,
    noFollow: false,
  };

  const slug = entry.slug || entry.data?.slug || id;
  const siteUrl = options.siteUrl.replace(/\/+$/, '');

  const contributions = await handlePageMetadata(
    {
      page: {
        url: `${siteUrl}/${slug.replace(/^\/+/, '')}`,
        path: `/${slug.replace(/^\/+/, '')}`,
        title: rawSeo.metaTitle || entry.title || entry.data?.title || options.siteName,
        description: rawSeo.metaDescription || entry.data?.description || '',
        canonical: rawSeo.canonicalUrl,
        siteName: options.siteName,
        kind: 'content',
        seo: rawSeo,
        content: {
          id,
          collection,
          slug,
          data: entry.data || {},
        },
        articleMeta: {
          publishedTime: entry.createdAt || entry.publishedAt,
          modifiedTime: entry.updatedAt,
          author: entry.data?.author || entry.author,
        },
      },
    },
    ctx,
    options
  );

  const jsonLdContrib = contributions.find((c) => c.kind === 'jsonld') as any;

  return jsonResponse({
    success: true,
    collection,
    id,
    seo: rawSeo,
    head: contributions,
    schemaGraph: jsonLdContrib?.graph || null,
  });
}

/* ========================================================================= */
/* 2. handleSeoMetaPut: PUT /_emdash/api/seo/v1/meta/:collection/:id          */
/* ========================================================================= */

export async function handleSeoMetaPut(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const { collection, id } = extractMetaParams(ctx);

  if (!collection || !id) {
    return jsonResponse(
      { error: 'Missing required route parameters: collection and id' },
      400
    );
  }

  const body = await parseRequestBody(ctx);
  const newSeoPatch = body.seo !== undefined ? body.seo : body;

  let entry: any = null;
  if (ctx?.content?.get) {
    try {
      entry = await ctx.content.get(collection, id);
    } catch {
      // Ignore
    }
  } else if (Array.isArray(ctx?.entries)) {
    entry = ctx.entries.find(
      (e: any) =>
        (e.id === id || e._id === id) &&
        (!e.collection || e.collection === collection)
    );
  }

  if (!entry && !ctx?.allowCreate) {
    return jsonResponse(
      { error: `Entry not found: ${collection}/${id}` },
      404
    );
  }

  const existingData = entry?.data || {};
  const currentSeo = existingData.seo || entry?.seo || {
    focusKeywords: [],
    noIndex: false,
    noFollow: false,
  };

  const updatedSeo: EntrySeoMetadata = {
    ...currentSeo,
    ...newSeoPatch,
  };

  const updatedData = {
    ...existingData,
    seo: updatedSeo,
  };

  let updatedEntry: any = {
    ...(entry || { id, collection }),
    data: updatedData,
    updatedAt: new Date().toISOString(),
  };

  if (ctx?.content?.update) {
    try {
      updatedEntry = await ctx.content.update(collection, id, { data: updatedData });
    } catch {
      // Fallback to local updatedEntry
    }
  } else if (Array.isArray(ctx?.entries)) {
    const idx = ctx.entries.indexOf(entry);
    if (idx !== -1) {
      ctx.entries[idx] = updatedEntry;
    } else {
      ctx.entries.push(updatedEntry);
    }
  }

  const slug = updatedEntry.slug || updatedEntry.data?.slug || id;
  const siteUrl = options.siteUrl.replace(/\/+$/, '');

  const contributions = await handlePageMetadata(
    {
      page: {
        url: `${siteUrl}/${slug.replace(/^\/+/, '')}`,
        path: `/${slug.replace(/^\/+/, '')}`,
        title: updatedSeo.metaTitle || updatedEntry.title || updatedEntry.data?.title || options.siteName,
        description: updatedSeo.metaDescription || updatedEntry.data?.description || '',
        canonical: updatedSeo.canonicalUrl,
        siteName: options.siteName,
        kind: 'content',
        seo: updatedSeo,
        content: {
          id,
          collection,
          slug,
          data: updatedEntry.data || {},
        },
        articleMeta: {
          publishedTime: updatedEntry.createdAt || updatedEntry.publishedAt,
          modifiedTime: updatedEntry.updatedAt,
          author: updatedEntry.data?.author || updatedEntry.author,
        },
      },
    },
    ctx,
    options
  );

  const jsonLdContrib = contributions.find((c) => c.kind === 'jsonld') as any;

  return jsonResponse({
    success: true,
    collection,
    id,
    seo: updatedSeo,
    head: contributions,
    schemaGraph: jsonLdContrib?.graph || null,
  });
}

/* ========================================================================= */
/* 3. handleStatelessAnalyze: POST /_emdash/api/seo/v1/analyze               */
/* ========================================================================= */

export async function handleStatelessAnalyze(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const body = await parseRequestBody(ctx);

  const title = (body.title || '').trim();
  const slug = (body.slug || '').trim();
  const contentHtml = (body.contentHtml || body.content || '').trim();
  const metaDescription = (body.metaDescription || body.description || '').trim();
  const focusKeywords: string[] = Array.isArray(body.focusKeywords)
    ? body.focusKeywords.map((k: any) => String(k))
    : body.focusKeywords
      ? [String(body.focusKeywords)]
      : [];

  if (!title && !contentHtml) {
    return jsonResponse(
      { error: 'Missing required fields: at least title or contentHtml must be provided' },
      400
    );
  }

  // 1. Strip HTML tags for clean text analysis
  const cleanText = contentHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

  // 2. Readability metrics (Flesch-Kincaid)
  const readability = computeReadability(cleanText);

  // 3. Technical check evaluations
  const h1Matches = contentHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const imgMatches = contentHtml.match(/<img[^>]*>/gi) || [];
  const imgWithoutAlt = imgMatches.filter((img: string) => !img.includes('alt=') || /alt=["']\s*["']/i.test(img)).length;

  const technicalChecks: TechnicalChecks = {
    h1Valid: h1Matches.length === 1,
    imagesWithAlt: imgWithoutAlt === 0,
    metaDescriptionLength: metaDescription.length,
    wordCount: cleanText.split(/\s+/).filter(Boolean).length,
  };

  // 4. Detected Entities and Entity Gaps
  const entitiesDetected = extractEntities(contentHtml, cleanText, focusKeywords);
  const entityGaps = detectEntityGaps(cleanText, focusKeywords, entitiesDetected);

  // 5. Run full content analyzer for metrics & checks
  const analysis = analyzeContent({
    title,
    slug,
    contentHtml,
    focusKeywords,
    metaDescription,
    siteUrl: options.siteUrl,
  });

  // Calculate Entity Coverage Index (0-100)
  // ECI measures semantic topic coverage based on detected entities, their salience, and gap ratio
  const totalTopicEntities = entitiesDetected.length + entityGaps.length;
  const coverageRatio = totalTopicEntities > 0 ? entitiesDetected.length / totalTopicEntities : 1;
  const avgSalience = entitiesDetected.length > 0
    ? entitiesDetected.reduce((acc, e) => acc + e.salienceScore, 0) / entitiesDetected.length
    : 0.5;
  const primaryKwFound = focusKeywords.some((kw: string) =>
    cleanText.toLowerCase().includes(kw.toLowerCase()) || title.toLowerCase().includes(kw.toLowerCase())
  );
  const titleKw = focusKeywords.some((kw: string) => title.toLowerCase().includes(kw.toLowerCase()));
  const slugKw = Boolean(slug && focusKeywords.some((kw: string) => slug.toLowerCase().includes(kw.toLowerCase().replace(/\s+/g, '-'))));

  const rawEci = Math.round(
    coverageRatio * 45 +
    avgSalience * 30 +
    (primaryKwFound ? 10 : 0) +
    (titleKw ? 5 : 0) +
    (slugKw ? 5 : 0) +
    (entitiesDetected.length >= 2 ? 10 : 0)
  );
  const entityCoverageIndex = Math.min(100, Math.max(10, rawEci));

  let grade: StatelessAnalyzeResponse['grade'] = 'Needs Improvement';
  if (entityCoverageIndex >= 80) grade = 'Good';
  else if (entityCoverageIndex >= 60) grade = 'OK';

  const responsePayload: StatelessAnalyzeResponse = {
    entityCoverageIndex,
    grade,
    entitiesDetected,
    entityGaps,
    readability,
    technicalChecks,
    metrics: analysis.metrics,
    recommendations: analysis.recommendations,
  };

  return jsonResponse(responsePayload, 200);
}

/* ========================================================================= */
/* 4. handleLinkOpportunities: GET /_emdash/api/seo/v1/links/opportunities/:id*/
/* ========================================================================= */

export async function handleLinkOpportunities(ctx: any, _options: SeoPluginOptions): Promise<Response> {
  const id = extractOpportunityId(ctx);

  if (!id) {
    return jsonResponse(
      { error: 'Missing required route parameter: id' },
      400
    );
  }

  let currentEntry: any = ctx?.currentEntry || null;
  const candidates: SuggestLinkTarget[] = ctx?.candidates ? [...ctx.candidates] : [];

  if (!currentEntry && ctx?.content) {
    const req = ctx?.request || ctx?.req;
    const url = req?.url ? new URL(req.url, 'http://localhost') : null;
    const colParam = url?.searchParams.get('collection');
    const colsToTry = colParam ? [colParam] : ['posts', 'services', 'pages'];

    for (const c of colsToTry) {
      try {
        const found = await ctx.content.get(c, id);
        if (found) {
          currentEntry = found;
          break;
        }
      } catch {
        // Continue
      }
    }
  } else if (!currentEntry && Array.isArray(ctx?.entries)) {
    currentEntry = ctx.entries.find((e: any) => e.id === id || e._id === id);
  }

  // Populate candidate targets if not passed explicitly in ctx
  if (candidates.length === 0) {
    if (ctx?.content?.list) {
      for (const col of ['posts', 'services', 'pages']) {
        try {
          const listRes = await ctx.content.list(col, {
            limit: 100,
            where: { status: 'published' },
          });
          if (listRes?.items) {
            for (const item of listRes.items) {
              if (item.id === id) continue;
              candidates.push({
                id: item.id,
                collection: col,
                title: item.title || item.data?.title || '',
                slug: item.slug || item.data?.slug || '',
                focusKeywords: item.data?.seo?.focusKeywords || item.focusKeywords || [],
              });
            }
          }
        } catch {
          // Ignore
        }
      }
    } else if (Array.isArray(ctx?.entries)) {
      for (const item of ctx.entries) {
        if (item.id === id) continue;
        candidates.push({
          id: item.id,
          collection: item.collection || 'posts',
          title: item.title || item.data?.title || '',
          slug: item.slug || item.data?.slug || '',
          focusKeywords: item.data?.seo?.focusKeywords || item.focusKeywords || [],
        });
      }
    }
  }

  if (!currentEntry) {
    return jsonResponse(
      { error: `Entry not found: ${id}` },
      404
    );
  }

  const contentText =
    currentEntry.content ||
    currentEntry.data?.content ||
    currentEntry.contentHtml ||
    '';

  const opportunities: LinkOpportunity[] = findInternalLinkOpportunities(
    contentText,
    id,
    candidates
  );

  return jsonResponse({
    success: true,
    id,
    total: opportunities.length,
    opportunities,
  });
}

/* ========================================================================= */
/* 5. handleV1AuditRun: POST /_emdash/api/seo/v1/audit/run                    */
/* ========================================================================= */

export async function handleV1AuditRun(ctx: any, options: SeoPluginOptions): Promise<Response> {
  let entries: AuditEntryInput[] = [];
  const body = await parseRequestBody(ctx);

  if (Array.isArray(body?.entries) && body.entries.length > 0) {
    entries = body.entries;
  } else if (Array.isArray(ctx?.entries) && ctx.entries.length > 0) {
    entries = ctx.entries;
  } else if (ctx?.content?.list) {
    for (const col of ['posts', 'services', 'pages']) {
      try {
        const listRes = await ctx.content.list(col, {
          limit: 100,
          where: { status: 'published' },
        });
        if (listRes?.items) {
          for (const item of listRes.items) {
            entries.push({
              id: item.id,
              slug: item.slug || item.data?.slug || '',
              title: item.title || item.data?.title || '',
              content: item.content || item.data?.content || '',
              metaTitle: item.data?.seo?.metaTitle || item.metaTitle,
              metaDescription: item.data?.seo?.metaDescription || item.metaDescription,
              focusKeywords: item.data?.seo?.focusKeywords || item.focusKeywords || [],
              noIndex: item.data?.seo?.noIndex || item.noIndex,
            });
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  // Fallback sample if no entries exist
  if (entries.length === 0) {
    entries = [
      {
        id: 'home',
        slug: '',
        title: `${options.siteName} | Professional Services`,
        content: 'Welcome to our website. We provide top-tier professional services with comprehensive guarantees.',
        metaTitle: `${options.siteName} | Professional Services`,
        metaDescription: `Discover high-quality professional services at ${options.siteName}. Contact our specialists today.`,
        focusKeywords: ['professional services'],
      },
    ];
  }

  const snapshot: AuditSnapshot = runSitewideAudit(entries);
  latestV1AuditSnapshot = snapshot;

  if (ctx?.kv?.set) {
    try {
      await ctx.kv.set('seo:audit:latest', JSON.stringify(snapshot));
    } catch {
      // Ignore KV error
    }
  }

  return jsonResponse({
    success: true,
    audit: snapshot,
  });
}

/* ========================================================================= */
/* 6. handleV1AuditLatest: GET /_emdash/api/seo/v1/audit/latest               */
/* ========================================================================= */

export async function handleV1AuditLatest(ctx: any, _options: SeoPluginOptions): Promise<Response> {
  let audit = latestV1AuditSnapshot;

  if (!audit && ctx?.kv?.get) {
    try {
      const raw = await ctx.kv.get('seo:audit:latest');
      if (raw) {
        audit = typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    } catch {
      // Ignore
    }
  }

  if (!audit) {
    return jsonResponse({
      success: true,
      audit: null,
      message: 'No sitewide audit has been executed yet.',
    });
  }

  return jsonResponse({
    success: true,
    audit,
  });
}

/* ========================================================================= */
/* 7. handleV1Redirects: GET / POST /_emdash/api/seo/v1/redirects             */
/* ========================================================================= */

export async function handleV1Redirects(ctx: any, _options: SeoPluginOptions): Promise<Response> {
  const req = ctx?.request || ctx?.req;
  const method = (req?.method || ctx?.method || 'GET').toUpperCase();

  // GET: List configured redirects with pagination
  if (method === 'GET') {
    const url = req?.url ? new URL(req.url, 'http://localhost') : null;
    const page = Math.max(1, parseInt(url?.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(url?.searchParams.get('limit') || '20', 10)));
    const statusFilter = url?.searchParams.get('status');

    let rules = [...v1RedirectRules];

    if (Array.isArray(ctx?.redirects)) {
      rules = ctx.redirects;
    } else if (ctx?.redirects?.list) {
      try {
        const customRules = await ctx.redirects.list();
        if (Array.isArray(customRules)) rules = customRules;
      } catch {
        // Ignore
      }
    }

    if (statusFilter) {
      rules = rules.filter((r) => (r.status || 'active') === statusFilter);
    }

    const total = rules.length;
    const startIndex = (page - 1) * limit;
    const items = rules.slice(startIndex, startIndex + limit);

    return jsonResponse({
      success: true,
      page,
      limit,
      total,
      items,
    });
  }

  // POST: Create or batch-import redirect rules
  if (method === 'POST') {
    const body = await parseRequestBody(ctx);
    let incomingRules: any[] = [];

    if (Array.isArray(body)) {
      incomingRules = body;
    } else if (Array.isArray(body?.rules)) {
      incomingRules = body.rules;
    } else if (body && typeof body === 'object') {
      incomingRules = [body];
    }

    if (incomingRules.length === 0) {
      return jsonResponse(
        { error: 'No redirect rule or rules array provided in request body.' },
        400
      );
    }

    const createdRules: RedirectRule[] = [];

    for (const raw of incomingRules) {
      const pattern = (raw.pattern || raw.from || raw.source || '').trim();
      const destination = (raw.destination || raw.to || raw.target || '').trim();

      if (!pattern || !destination) {
        return jsonResponse(
          {
            error: 'Each redirect rule must define a source pattern (pattern/from/source) and destination (destination/to/target).',
            invalidRule: raw,
          },
          400
        );
      }

      const rule: RedirectRule = {
        id: raw.id || `redir_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        pattern,
        from: pattern,
        destination,
        to: destination,
        comparison: raw.comparison || raw.matchType || 'exact',
        matchType: raw.comparison || raw.matchType || 'exact',
        statusCode: Number(raw.statusCode || raw.type || 301),
        status: raw.status || (raw.enabled === false ? 'inactive' : 'active'),
      };

      createdRules.push(rule);
    }

    // Persist into store / ctx
    for (const rule of createdRules) {
      v1RedirectRules.unshift(rule);
      if (Array.isArray(ctx?.redirects)) {
        ctx.redirects.unshift(rule);
      }
    }

    return jsonResponse(
      {
        success: true,
        count: createdRules.length,
        rules: createdRules,
      },
      201
    );
  }

  return jsonResponse({ error: `Method ${method} not allowed` }, 405);
}

/* ========================================================================= */
/* 8. handleV1404s: GET /_emdash/api/seo/v1/404s                              */
/* ========================================================================= */

export async function handleV1404s(ctx: any, _options: SeoPluginOptions): Promise<Response> {
  const req = ctx?.request || ctx?.req;
  const url = req?.url ? new URL(req.url, 'http://localhost') : null;
  const limit = Math.max(1, Math.min(200, parseInt(url?.searchParams.get('limit') || '50', 10)));
  const orderBy = url?.searchParams.get('orderBy') || 'count';

  let logs: NotFoundEntry[] = [...v1NotFoundLogs];

  if (Array.isArray(ctx?.notFoundLog)) {
    logs = ctx.notFoundLog;
  } else if (ctx?.redirects?.get404s) {
    try {
      const dbLogs = await ctx.redirects.get404s();
      if (Array.isArray(dbLogs)) logs = dbLogs;
    } catch {
      // Ignore
    }
  }

  if (orderBy === 'lastSeen') {
    logs.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  } else {
    logs.sort((a, b) => b.count - a.count);
  }

  const items = logs.slice(0, limit);

  return jsonResponse({
    success: true,
    total: logs.length,
    items,
  });
}
