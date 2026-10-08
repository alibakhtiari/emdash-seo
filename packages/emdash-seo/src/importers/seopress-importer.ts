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

export function parseSeopressMeta(rawMeta: Record<string, any>): EntrySeoMetadata {
  const metaTitle = rawMeta['_seopress_titles_title'] || rawMeta['_seopress_title'] || '';
  const metaDescription = rawMeta['_seopress_titles_desc'] || rawMeta['_seopress_description'] || '';
  const focusKeywords = splitKeywords(
    rawMeta['_seopress_analysis_target_kw'] || rawMeta['_seopress_target_kw']
  );
  const canonicalUrl = rawMeta['_seopress_titles_canonical'] || rawMeta['_seopress_canonical'] || undefined;

  const noIndex = isOffFlag(rawMeta['_seopress_robots_index']) || isOffFlag(rawMeta['_seopress_noindex']);
  const noFollow = isOffFlag(rawMeta['_seopress_robots_follow']) || isOffFlag(rawMeta['_seopress_nofollow']);

  const ogTitle = rawMeta['_seopress_social_og_title'] || undefined;
  const ogDescription = rawMeta['_seopress_social_og_desc'] || undefined;
  const ogImage = rawMeta['_seopress_social_og_img'] || undefined;

  const twitterTitle = rawMeta['_seopress_social_twitter_title'] || undefined;
  const twitterDescription = rawMeta['_seopress_social_twitter_desc'] || undefined;
  const twitterImage = rawMeta['_seopress_social_twitter_img'] || undefined;

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
