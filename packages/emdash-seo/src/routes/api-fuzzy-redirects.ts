/**
 * API route for Fuzzy 404 Redirect Suggestions.
 * Route: /_emdash/api/seo/fuzzy-redirects
 * Takes a 404 target path and returns ranked candidate URLs scored by similarity.
 */

import type { SeoPluginOptions } from '../types.js';
import { rankCandidates, type RankedMatch } from '../engine/fuzzy-matcher.js';
import { listPublishedSchemaUrls } from './schema-map.js';

export async function handleFuzzyRedirects(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const req = ctx?.request || ctx?.req;
  let target = '';
  let minScore = 0.45;
  let limit = 5;

  if (req) {
    try {
      const url = new URL(req.url);
      target = url.searchParams.get('target') || '';
      if (url.searchParams.has('minScore')) {
        minScore = parseFloat(url.searchParams.get('minScore')!) || minScore;
      }
      if (url.searchParams.has('limit')) {
        limit = parseInt(url.searchParams.get('limit')!, 10) || limit;
      }

      if (req.method === 'POST') {
        const body = ctx?.input || (await req.json?.().catch(() => ({}))) || {};
        if (body.target) target = body.target;
        if (typeof body.minScore === 'number') minScore = body.minScore;
        if (typeof body.limit === 'number') limit = body.limit;
      }
    } catch {
      // Continue with defaults
    }
  }

  if (!target) {
    return new Response(
      JSON.stringify({ error: 'Missing target path parameter (e.g. ?target=/blog/old-slug)' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Get candidate URLs
  const publishedItems = await listPublishedSchemaUrls(ctx, options);
  const candidates = publishedItems.map((item) => {
    try {
      return new URL(item.url).pathname;
    } catch {
      return item.url;
    }
  });

  const suggestions: RankedMatch[] = rankCandidates(target, candidates, { limit, minScore });

  return new Response(
    JSON.stringify(
      {
        target,
        minScore,
        count: suggestions.length,
        suggestions,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
}
