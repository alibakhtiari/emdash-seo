import type { EntrySeoMetadata } from '../types.js';

export function parseYoastMeta(rawMeta: Record<string, any>): EntrySeoMetadata {
  const metaTitle = rawMeta['_yoast_wpseo_title'] || '';
  const metaDescription = rawMeta['_yoast_wpseo_metadesc'] || '';
  const focusKeyword = rawMeta['_yoast_wpseo_focuskw'] || '';
  const canonicalUrl = rawMeta['_yoast_wpseo_canonical'] || undefined;

  const noIndex =
    rawMeta['_yoast_wpseo_meta-robots-noindex'] === '1' ||
    rawMeta['_yoast_wpseo_meta-robots-noindex'] === 1 ||
    rawMeta['_yoast_wpseo_meta_robots_noindex'] === '1' ||
    rawMeta['_yoast_wpseo_meta_robots_noindex'] === 1;

  const noFollow =
    rawMeta['_yoast_wpseo_meta-robots-nofollow'] === '1' ||
    rawMeta['_yoast_wpseo_meta-robots-nofollow'] === 1 ||
    rawMeta['_yoast_wpseo_meta_robots_nofollow'] === '1' ||
    rawMeta['_yoast_wpseo_meta_robots_nofollow'] === 1;

  const ogTitle = rawMeta['_yoast_wpseo_opengraph-title'] || rawMeta['_yoast_wpseo_opengraph_title'] || undefined;
  const ogDescription = rawMeta['_yoast_wpseo_opengraph-description'] || rawMeta['_yoast_wpseo_opengraph_description'] || undefined;
  const ogImage = rawMeta['_yoast_wpseo_opengraph-image'] || rawMeta['_yoast_wpseo_opengraph_image'] || undefined;

  const twitterTitle = rawMeta['_yoast_wpseo_twitter-title'] || rawMeta['_yoast_wpseo_twitter_title'] || undefined;
  const twitterDescription = rawMeta['_yoast_wpseo_twitter-description'] || rawMeta['_yoast_wpseo_twitter_description'] || undefined;
  const twitterImage = rawMeta['_yoast_wpseo_twitter-image'] || rawMeta['_yoast_wpseo_twitter_image'] || undefined;

  return {
    metaTitle: metaTitle || undefined,
    metaDescription: metaDescription || undefined,
    canonicalUrl,
    focusKeywords: focusKeyword ? [focusKeyword.trim()] : [],
    noIndex,
    noFollow,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard: 'summary_large_image',
    twitterTitle,
    twitterDescription,
    twitterImage,
    schemaType: 'CleaningService',
  };
}
