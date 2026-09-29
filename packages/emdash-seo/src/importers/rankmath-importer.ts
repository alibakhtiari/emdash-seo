import type { EntrySeoMetadata, FaqItem } from '../types.js';

export function parseRankMathMeta(rawMeta: Record<string, any>, postContent = ''): EntrySeoMetadata {
  const metaTitle = rawMeta['rank_math_title'] || rawMeta['_yoast_wpseo_title'] || '';
  const metaDescription = rawMeta['rank_math_description'] || rawMeta['_yoast_wpseo_metadesc'] || '';

  // Focus keywords (comma-separated or single string or array)
  let focusKeywords: string[] = [];
  const rawKw = rawMeta['rank_math_focus_keyword'] || rawMeta['_yoast_wpseo_focuskw'] || '';
  if (Array.isArray(rawKw)) {
    focusKeywords = rawKw.map((k) => String(k).trim()).filter(Boolean);
  } else if (typeof rawKw === 'string' && rawKw.trim()) {
    focusKeywords = rawKw.split(',').map((k) => k.trim()).filter(Boolean);
  }

  // Robots directives
  const rawRobots = rawMeta['rank_math_robots'] || [];
  const robotsArray = Array.isArray(rawRobots)
    ? rawRobots
    : typeof rawRobots === 'string'
      ? rawRobots.split(',').map((s) => s.trim())
      : [];

  const noIndex = robotsArray.includes('noindex') || rawMeta['_yoast_wpseo_meta-robots-noindex'] === '1';
  const noFollow = robotsArray.includes('nofollow') || rawMeta['_yoast_wpseo_meta-robots-nofollow'] === '1';
  const noArchive = robotsArray.includes('noarchive');
  const noSnippet = robotsArray.includes('nosnippet');

  let maxImagePreview: EntrySeoMetadata['maxImagePreview'] = 'large';
  if (robotsArray.includes('max-image-preview:none')) maxImagePreview = 'none';
  else if (robotsArray.includes('max-image-preview:standard')) maxImagePreview = 'standard';

  // Canonical URL
  const canonicalUrl = rawMeta['rank_math_canonical_url'] || rawMeta['_yoast_wpseo_canonical'] || undefined;

  // OpenGraph & Social
  const ogTitle = rawMeta['rank_math_facebook_title'] || rawMeta['_yoast_wpseo_opengraph-title'] || undefined;
  const ogDescription = rawMeta['rank_math_facebook_description'] || rawMeta['_yoast_wpseo_opengraph-description'] || undefined;
  const ogImage = rawMeta['rank_math_facebook_image'] || rawMeta['_yoast_wpseo_opengraph-image'] || undefined;

  // Twitter
  const twitterTitle = rawMeta['rank_math_twitter_title'] || rawMeta['_yoast_wpseo_twitter-title'] || undefined;
  const twitterDescription = rawMeta['rank_math_twitter_description'] || rawMeta['_yoast_wpseo_twitter-description'] || undefined;
  const twitterImage = rawMeta['rank_math_twitter_image'] || rawMeta['_yoast_wpseo_twitter-image'] || undefined;

  // Schema Type
  let schemaType: EntrySeoMetadata['schemaType'] = 'CleaningService';
  if (rawMeta['rank_math_schema_Article'] || rawMeta['rank_math_schema_BlogPosting']) {
    schemaType = 'Article';
  } else if (rawMeta['rank_math_schema_Service']) {
    schemaType = 'Service';
  } else if (rawMeta['rank_math_schema_LocalBusiness']) {
    schemaType = 'LocalBusiness';
  }

  // Extract FAQ items from HTML (<div id="rank-math-faq">...</div>)
  const faqs = extractFaqsFromContent(postContent);

  return {
    metaTitle: metaTitle || undefined,
    metaDescription: metaDescription || undefined,
    canonicalUrl,
    focusKeywords,
    noIndex,
    noFollow,
    noArchive,
    noSnippet,
    maxImagePreview,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard: 'summary_large_image',
    twitterTitle,
    twitterDescription,
    twitterImage,
    schemaType,
    faqs: faqs.length > 0 ? faqs : undefined,
  };
}

/**
 * Extracts FAQ questions and answers from Rank Math FAQ blocks
 */
export function extractFaqsFromContent(content: string): FaqItem[] {
  const faqs: FaqItem[] = [];
  if (!content || !content.includes('rank-math')) {
    return faqs;
  }

  const qRegex = /<h3[^>]*class=["'][^"']*rank-math-question[^"']*["'][^>]*>([\s\S]*?)<\/h3>\s*<div[^>]*class=["'][^"']*rank-math-answer[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;

  while ((match = qRegex.exec(content)) !== null) {
    const question = match[1].replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    const answer = match[2].replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

    if (question && answer) {
      faqs.push({ question, answer });
    }
  }

  return faqs;
}
