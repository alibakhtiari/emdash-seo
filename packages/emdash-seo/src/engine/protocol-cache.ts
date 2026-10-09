/**
 * Edge KV cache for protocol endpoints (sitemap/robots/llms). Stale TTL of
 * one hour with purge-on-publish keeps p99 <10ms on large catalogs without
 * risking stale discovery data. Memory-unsafe environments simply skip it.
 */
const CACHE_TTL_MS = 3600_000;

const CACHE_KEYS = [
  'seo:cache:sitemap.xml',
  'seo:cache:sitemap-index.xml',
  'seo:cache:sitemap-news.xml',
  'seo:cache:robots.txt',
  'seo:cache:llms.txt',
  'seo:cache:llms-full.txt',
];

export async function cachedProtocol(
  ctx: any,
  key: string,
  render: () => Promise<Response>
): Promise<Response> {
  try {
    const hit = await ctx?.kv?.get?.(key);
    const snap = typeof hit === 'string' ? JSON.parse(hit) : hit;
    if (snap?.body && typeof snap.at === 'number' && Date.now() - snap.at < CACHE_TTL_MS) {
      return new Response(snap.body, {
        status: 200,
        headers: {
          'Content-Type': snap.ct || 'application/xml',
          'X-Seo-Cache': 'HIT',
        },
      });
    }
  } catch {
    // Cache miss or KV unavailable: render fresh
  }
  const res = await render();
  try {
    const body = await res.clone().text();
    await ctx?.kv?.set?.(key, JSON.stringify({ body, ct: res.headers.get('Content-Type'), at: Date.now() }));
  } catch {
    // Serve fresh response regardless
  }
  return res;
}

export async function purgeProtocolCache(ctx: any): Promise<void> {
  if (!ctx?.kv) return;
  await Promise.allSettled(CACHE_KEYS.map((k) => ctx.kv.delete(k).catch(() => false)));
}
