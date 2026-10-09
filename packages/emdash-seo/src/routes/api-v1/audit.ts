import type { SeoPluginOptions, AuditSnapshot } from '../../types.js';
import { runSitewideAudit, type AuditEntryInput } from '../../engine/audit-runner.js';
import { jsonResponse, parseRequestBody } from './helpers.js';
import { latestV1AuditSnapshot, setLatestV1AuditSnapshot, appendAuditHistory, getAuditHistory } from './state.js';

export async function handleV1AuditRun(ctx: any, _options: SeoPluginOptions): Promise<Response> {
  let entries: AuditEntryInput[] = [];
  const body = await parseRequestBody(ctx);

  if (Array.isArray(body?.entries) && body.entries.length > 0) {
    entries = body.entries;
  } else if (Array.isArray(ctx?.entries) && ctx.entries.length > 0) {
    entries = ctx.entries;
  } else if (ctx?.content?.list) {
    for (const col of ['posts', 'services', 'pages']) {
      let cursor: string | undefined;
      let offset = 0;
      try {
        for (;;) {
          const page = await ctx.content.list(col, {
            limit: 100,
            cursor,
            offset,
            where: { status: 'published' },
          });
          const items = page?.items;
          if (!items || items.length === 0) break;
          for (const item of items) {
            if (entries.length >= 2000) break;
            entries.push({
              id: item.id,
              slug: item.slug || item.data?.slug || '',
              title: item.title || item.data?.title || '',
              content: item.content || item.data?.content || '',
              metaTitle: item.data?.seo?.metaTitle || item.metaTitle,
              metaDescription: item.data?.seo?.metaDescription || item.metaDescription,
              focusKeywords: item.data?.seo?.focusKeywords || item.focusKeywords || [],
              noIndex: item.data?.seo?.noIndex || item.noIndex,
              schemaType: item.data?.seo?.schemaType || item.data?.schema_type || item.schemaType,
              cornerstone: item.data?.seo?.cornerstone ?? item.data?.cornerstone ?? item.cornerstone,
            });
          }
          if (entries.length >= 2000) break;
          const nextCursor = page?.cursor ?? page?.nextCursor ?? null;
          if (nextCursor && nextCursor !== cursor) {
            cursor = nextCursor;
            offset += items.length;
          } else if (page?.hasMore && items.length > 0) {
            offset += items.length;
          } else {
            break;
          }
        }
      } catch {
        // Skip failing collections; zero usable entries surfaces as a 500 below.
      }
      if (entries.length >= 2000) break;
    }
    if (entries.length === 0) {
      return jsonResponse(
        { success: false, error: 'Failed to load content entries for audit.' },
        500,
      );
    }
  }

  if (entries.length === 0) {
    return jsonResponse(
      { success: false, error: 'No published entries available for audit.' },
      500,
    );
  }

  const snapshot: AuditSnapshot = runSitewideAudit(entries);
  setLatestV1AuditSnapshot(snapshot);
  await appendAuditHistory(ctx, snapshot);

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
      history: await getAuditHistory(ctx),
      message: 'No sitewide audit has been executed yet.',
    });
  }

  return jsonResponse({
    success: true,
    audit,
    history: await getAuditHistory(ctx),
  });
}
