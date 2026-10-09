import type { SeoPluginOptions } from '../../types.js';
import { jsonResponse } from './helpers.js';
import { requireSeoCapFor } from '../../engine/auth.js';
import { collectSitemapEntries } from '../sitemap.js';
import { getOrCreateIndexNowKey, submitToIndexNow } from '../../engine/indexnow.js';

const FANOUT_SNAPSHOT_KV = 'seo:sitemap:lastmods';
const FANOUT_MAX_URLS = 200;

/**
 * POST /_emdash/api/seo/indexnow/fanout — diff sitemap <lastmod> values
 * against a KV snapshot and batch-submit changed URLs to IndexNow.
 * No plugin cron hook exists in the host, so this is designed for an
 * external scheduler (or manual trigger); without KV it 501s honestly
 * instead of fabricating a diff.
 */
export async function handleIndexNowFanout(ctx: any, options: SeoPluginOptions): Promise<Response> {
  const denied = await requireSeoCapFor(ctx, 'indexnow');
  if (denied) {
    return jsonResponse({ error: 'Forbidden: editor role cannot manage indexnow.' }, denied.status);
  }
  if (!ctx?.kv?.get || !ctx?.kv?.set) {
    return jsonResponse({ error: 'Fan-out requires KV storage for the lastmod snapshot.' }, 501);
  }
  let snapshot: Record<string, string> = {};
  try {
    const raw = await ctx.kv.get(FANOUT_SNAPSHOT_KV);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') snapshot = parsed;
  } catch {
    snapshot = {};
  }

  const collected = await collectSitemapEntries(ctx, options);
  const changed: string[] = [];
  const next: Record<string, string> = {};
  for (const group of collected) {
    for (const entry of group.entries) {
      if (!entry.loc || !entry.loc.startsWith('http')) continue;
      next[entry.loc] = entry.lastmod || '';
      if (snapshot[entry.loc] !== (entry.lastmod || '') && changed.length < FANOUT_MAX_URLS) {
        changed.push(entry.loc);
      }
    }
  }

  let host: string;
  try {
    host = new URL(options.siteUrl).hostname;
  } catch {
    return jsonResponse({ error: 'Invalid siteUrl.' }, 500);
  }
  const key = await getOrCreateIndexNowKey(ctx.kv, options.indexnowKey);
  const result = await submitToIndexNow({ host, key, urls: changed });
  try {
    await ctx.kv.set(FANOUT_SNAPSHOT_KV, next);
  } catch {
    // Submission already happened; snapshot retry next run
  }
  return jsonResponse({ success: result.ok, submitted: changed.length, total: Object.keys(next).length });
}
