import type { SeoPluginOptions } from '../../types.js';
import {
  findInternalLinkOpportunities,
  type SuggestLinkTarget,
  type LinkOpportunity,
} from '../../engine/link-analyzer.js';
import { jsonResponse, extractOpportunityId } from './helpers.js';

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
