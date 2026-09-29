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
 * Extracts FAQ questions and answers from Rank Math FAQ blocks and Kadence accordions
 */
export function extractFaqsFromContent(content: string): FaqItem[] {
  const faqs: FaqItem[] = [];
  if (!content) return faqs;

  // 1. Gutenberg comment JSON attributes (<!-- wp:rank-math/faq-block {"questions":[...]} -->)
  const blockJsonRegex = /<!--\s*wp:rank-math\/faq-block\s+(\{[\s\S]*?\})\s*-->/gi;
  let jsonMatch: RegExpExecArray | null;
  while ((jsonMatch = blockJsonRegex.exec(content)) !== null) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (Array.isArray(data.questions)) {
        for (const q of data.questions) {
          const question = (q.title || '').replace(/<[^>]*>?/gm, '').trim();
          const answer = (q.content || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
          if (question && answer && !faqs.some((f) => f.question === question)) {
            faqs.push({ question, answer });
          }
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 2. Rank Math FAQ HTML tags (<div class="rank-math-faq-item">...)
  const qRegex = /<h3[^>]*class=["'][^"']*rank-math-question[^"']*["'][^>]*>([\s\S]*?)<\/h3>\s*<div[^>]*class=["'][^"']*rank-math-answer[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = qRegex.exec(content)) !== null) {
    const question = match[1].replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    const answer = match[2].replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

    if (question && answer && !faqs.some((f) => f.question === question)) {
      faqs.push({ question, answer });
    }
  }

  // 3. Kadence Accordion / FAQ blocks
  const kadenceRegex = /<div[^>]*class=["'][^"']*kt-accordion-inner-wrap[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*kt-blocks-accordion-title[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<div[^>]*class=["'][^"']*kt-accordion-panel-inner[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let kadMatch: RegExpExecArray | null;
  while ((kadMatch = kadenceRegex.exec(content)) !== null) {
    const question = kadMatch[1].replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    const answer = kadMatch[2].replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    if (question && answer && !faqs.some((f) => f.question === question)) {
      faqs.push({ question, answer });
    }
  }

  return faqs;
}

/**
 * Detects whether content contains a Rank Math Table of Contents block
 */
export function detectRankMathToc(content: string): boolean {
  if (!content) return false;
  return (
    content.includes('wp:rank-math/toc-block') ||
    content.includes('rank-math-toc') ||
    content.includes('wp-block-rank-math-toc-block')
  );
}

/**
 * Removes raw static Rank Math TOC block HTML from post content
 * so Astro's dynamic, accessible <TableOfContents /> component can render it.
 */
export function stripRankMathTocBlock(content: string): string {
  if (!content) return content;
  return content
    .replace(/<!--\s*wp:rank-math\/toc-block[\s\S]*?-->([\s\S]*?<!--\s*\/wp:rank-math\/toc-block\s*-->)?/gi, '')
    .replace(/<div[^>]*id=["']rank-math-toc["'][^>]*>[\s\S]*?<\/div>\s*(<\/div>)?/gi, '')
    .trim();
}
