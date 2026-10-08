import type { EntrySeoMetadata } from '../types.js';

function isOffFlag(v: unknown): boolean {
  return v === '1' || v === 1 || v === true || v === 'on' || v === 'yes';
}

function splitKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((k) => String(k).trim()).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

export function parseAioseoMeta(rawMeta: Record<string, any>): EntrySeoMetadata {
  const metaTitle = rawMeta['_aioseo_title'] || '';
  const metaDescription = rawMeta['_aioseo_description'] || '';
  const focusKeywords = splitKeywords(rawMeta['_aioseo_keywords']);
  const canonicalUrl = rawMeta['_aioseo_canonical_url'] || undefined;

  const noIndex = isOffFlag(rawMeta['_aioseo_robots_noindex']) || isOffFlag(rawMeta['_aioseo_noindex']);
  const noFollow = isOffFlag(rawMeta['_aioseo_robots_nofollow']) || isOffFlag(rawMeta['_aioseo_nofollow']);

  const ogTitle = rawMeta['_aioseo_og_title'] || undefined;
  const ogDescription = rawMeta['_aioseo_og_description'] || undefined;
  const ogImage = rawMeta['_aioseo_og_image_url'] || rawMeta['_aioseo_og_image'] || undefined;

  const twitterTitle = rawMeta['_aioseo_twitter_title'] || undefined;
  const twitterDescription = rawMeta['_aioseo_twitter_description'] || undefined;
  const twitterImage = rawMeta['_aioseo_twitter_image_url'] || rawMeta['_aioseo_twitter_image'] || undefined;

  return {
    metaTitle: metaTitle || undefined,
    metaDescription: metaDescription || undefined,
    canonicalUrl,
    focusKeywords,
    noIndex,
    noFollow,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard: 'summary_large_image',
    twitterTitle,
    twitterDescription,
    twitterImage,
  };
}
