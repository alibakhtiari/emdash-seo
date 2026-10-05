import type { DetectedEntity, EntityGap, ReadabilityMetrics } from './types.js';

export function jsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export async function parseRequestBody(ctx: any): Promise<any> {
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

export function extractMetaParams(ctx: any): { collection?: string; id?: string } {
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

export function extractOpportunityId(ctx: any): string | null {
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

export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 1;
  if (clean.length <= 3) return 1;
  const processed = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');
  const matches = processed.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

export function computeReadability(text: string): ReadabilityMetrics {
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

export function extractEntities(
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

  detected.sort((a, b) => b.salienceScore - a.salienceScore);
  return detected.slice(0, 10);
}

export function detectEntityGaps(
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
