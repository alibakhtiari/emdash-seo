import type { SeoPluginOptions, AuditSnapshot } from '../../types.js';
import { runSitewideAudit, type AuditEntryInput } from '../../engine/audit-runner.js';
import { jsonResponse, parseRequestBody } from './helpers.js';
import { latestV1AuditSnapshot, setLatestV1AuditSnapshot } from './state.js';

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
  setLatestV1AuditSnapshot(snapshot);

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
      message: 'No sitewide audit has been executed yet.',
    });
  }

  return jsonResponse({
    success: true,
    audit,
  });
}
