/**
 * IndexNow Real-Time Search Engine Push Protocol.
 * Instantly pings Bing, Yandex, Seznam, Naver, and Yep when content is published, edited, or deleted.
 * Features 60-second autosave debounce and KV tombstone caching for deleted content.
 * Sub-millisecond execution, zero runtime dependencies.
 */

import type { SeoPluginOptions } from '../types.js';

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const KEY_KV = 'indexnow:key';
export const URLMAP_PREFIX = 'indexnow:urlmap:';
export const LASTPING_PREFIX = 'indexnow:lastping:';
export const PING_DEBOUNCE_MS = 60_000;

/**
 * Generate a random hexadecimal IndexNow key of specified length (default 32).
 */
export function generateIndexNowKey(length = 32): string {
  const chars = '0123456789abcdef';
  let result = '';
  // Use crypto.getRandomValues if available in Workers / Node
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

/**
 * Validate that an IndexNow key meets specification (8-128 alphanumeric/hex characters).
 */
export function validateIndexNowKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  return /^[a-zA-Z0-9-]{8,128}$/.test(key);
}

export function urlMapKey(collection: string, id: string): string {
  return `${URLMAP_PREFIX}${collection}:${id}`;
}

/**
 * Retrieve the active IndexNow key or lazily generate and persist one in KV.
 */
export async function getOrCreateIndexNowKey(
  kv?: { get(key: string): Promise<any>; set(key: string, val: any): Promise<any> },
  configuredKey?: string
): Promise<string> {
  if (configuredKey && validateIndexNowKey(configuredKey)) {
    return configuredKey;
  }

  if (kv) {
    try {
      const existing = await kv.get(KEY_KV);
      if (typeof existing === 'string' && validateIndexNowKey(existing)) {
        return existing;
      }
      const newKey = generateIndexNowKey(32);
      await kv.set(KEY_KV, newKey);
      return newKey;
    } catch {
      // Fall through on KV error
    }
  }

  return generateIndexNowKey(32);
}

export interface IndexNowSubmissionResult {
  ok: boolean;
  status: number;
  message?: string;
  urls: string[];
}

/**
 * Submit URLs directly to IndexNow endpoint.
 */
export async function submitToIndexNow(params: {
  host: string;
  key: string;
  keyLocation?: string;
  urls: string[];
  fetchFn?: typeof fetch;
}): Promise<IndexNowSubmissionResult> {
  const { host, key, keyLocation, urls, fetchFn = fetch } = params;

  if (!urls.length) {
    return { ok: true, status: 200, message: 'No URLs provided', urls: [] };
  }

  const payload: Record<string, any> = {
    host,
    key,
    urlList: urls,
  };

  if (keyLocation) {
    payload.keyLocation = keyLocation;
  }

  try {
    const res = await fetchFn(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'EmDash-SEO-Suite/1.0',
      },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    // IndexNow specs: 200 = OK, 202 = Accepted
    const ok = status === 200 || status === 202;
    return {
      ok,
      status,
      message: ok ? 'Submitted successfully' : `HTTP error: ${status}`,
      urls,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      message: error?.message || 'Network error during IndexNow submission',
      urls,
    };
  }
}

/**
 * Build canonical URL for a content item given siteUrl and item slug.
 */
export function buildContentUrl(
  siteUrl: string,
  slug: string,
  collection?: string,
  urlPattern?: string
): string {
  const origin = siteUrl.replace(/\/+$/, '');
  let path: string;

  if (urlPattern && urlPattern.includes('{slug}')) {
    path = urlPattern.replace('{slug}', slug);
  } else if (collection && collection !== 'pages') {
    path = `/${collection}/${slug}/`;
  } else {
    path = `/${slug}/`;
  }

  path = path.replace(/\/+/g, '/');
  if (!path.endsWith('/')) path += '/';
  return `${origin}${path}`;
}

/**
 * Lifecycle hook for content:afterPublish and content:afterSave.
 * Pings IndexNow when content is live, with a 60-second debounce.
 */
export async function handleIndexNowPublished(
  event: any,
  ctx: any,
  options: SeoPluginOptions
): Promise<void> {
  if (!options.enableIndexNow) return;

  const content = event?.content || event;
  const collection = event?.collection || content?.collection || 'posts';
  const status = content?.status || content?.data?.status;

  if (status !== 'published') return;

  const slug = content?.slug || content?.data?.slug;
  if (!slug) return;

  const url = buildContentUrl(options.siteUrl, slug, collection);
  const id = content?.id || content?.data?.id;

  // 1. Cache id -> url map in KV so permanent deletion can resolve the URL
  if (ctx?.kv && id) {
    try {
      await ctx.kv.set(urlMapKey(collection, String(id)), url);
    } catch {
      // Ignore KV cache write error
    }
  }

  // 2. Debounce rapid autosaves (60 seconds)
  const now = Date.now();
  if (ctx?.kv) {
    try {
      const lastKey = `${LASTPING_PREFIX}${url}`;
      const lastPing = await ctx.kv.get(lastKey);
      if (typeof lastPing === 'number' && now - lastPing < PING_DEBOUNCE_MS) {
        return;
      }
      await ctx.kv.set(lastKey, now);
    } catch {
      // Continue if debounce cache fails
    }
  }

  // 3. Submit URL to IndexNow
  let host: string;
  try {
    host = new URL(options.siteUrl).hostname;
  } catch {
    return;
  }

  const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
  const result = await submitToIndexNow({ host, key, urls: [url] });

  if (ctx?.log) {
    if (result.ok) {
      ctx.log.info?.('IndexNow: Submitted URL', { url, status: result.status });
    } else {
      ctx.log.warn?.('IndexNow: Submission warning', { url, status: result.status, message: result.message });
    }
  }
}

/**
 * Lifecycle hook for content:afterUnpublish.
 * Pings IndexNow with the now-unlisted URL so engines recrawl and update index.
 */
export async function handleIndexNowTransition(
  event: any,
  ctx: any,
  options: SeoPluginOptions
): Promise<void> {
  if (!options.enableIndexNow) return;

  const content = event?.content || event;
  const collection = event?.collection || content?.collection || 'posts';
  const slug = content?.slug || content?.data?.slug;
  if (!slug) return;

  const url = buildContentUrl(options.siteUrl, slug, collection);
  let host: string;
  try {
    host = new URL(options.siteUrl).hostname;
  } catch {
    return;
  }

  const key = await getOrCreateIndexNowKey(ctx?.kv, options.indexnowKey);
  await submitToIndexNow({ host, key, urls: [url] });
}

/**
 * Lifecycle hook for content:afterDelete.
 * Uses cached URL map to ping IndexNow when an item is permanently deleted.
 */
export async function handleIndexNowDelete(
  event: any,
  ctx: any,
  options: SeoPluginOptions
): Promise<void> {
  if (!options.enableIndexNow) return;
  if (event?.permanent === false) return; // Soft trash, not permanent deletion

  const collection = event?.collection || 'posts';
  const id = event?.id;
  if (!id || !ctx?.kv) return;

  const mapKey = urlMapKey(collection, String(id));
  try {
    const url = await ctx.kv.get(mapKey);
    if (typeof url !== 'string' || !url) return;

    let host: string;
    try {
      host = new URL(options.siteUrl).hostname;
    } catch {
      return;
    }

    const key = await getOrCreateIndexNowKey(ctx.kv, options.indexnowKey);
    await submitToIndexNow({ host, key, urls: [url] });

    // Clean up tombstone & ping cache
    await ctx.kv.delete(mapKey);
    await ctx.kv.delete(`${LASTPING_PREFIX}${url}`);
  } catch {
    // Ignore cleanup error
  }
}
