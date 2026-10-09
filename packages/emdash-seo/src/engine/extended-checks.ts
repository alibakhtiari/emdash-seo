import type { ContentCheck } from '../types.js';
import { auditGeoAeo } from './geo-aeo-analyzer.js';

export interface ExtendedChecksInput {
  title: string;
  slug: string;
  content: string;
  cleanText: string;
  primaryKw: string;
  focusKeywords: string[];
  metaDescription: string;
  authorName?: string;
  readingEase: number;
  longParagraphsCount: number;
  longSectionsCount: number;
}

/**
 * Extended parity checks (17-25): secondary keywords, keyphrase/URL/title
 * hygiene, computed readability promoted into the score, E-E-A-T byline,
 * and AI citability fused at info weight. Split from content-analyzer.ts
 * to honor the 500-line file cap.
 */
export function extendedContentChecks(input: ExtendedChecksInput): ContentCheck[] {
  const {
    title,
    slug,
    content,
    cleanText,
    primaryKw,
    focusKeywords,
    metaDescription,
    authorName,
    readingEase,
    longParagraphsCount,
    longSectionsCount,
  } = input;
  const checks: ContentCheck[] = [];

  // 17. Secondary keywords (all focusKeywords beyond the primary appear at least once)
  const secondaries = focusKeywords.slice(1).map((k) => (k || '').trim().toLowerCase()).filter(Boolean);
  if (secondaries.length > 0) {
    const missing = secondaries.filter((kw) => {
      const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return !(new RegExp(`\\b${esc}\\b`, 'i').test(cleanText));
    });
    checks.push({
      id: 'secondary_keywords',
      label: `Secondary Keywords (${secondaries.length - missing.length}/${secondaries.length} used)`,
      passed: missing.length === 0,
      severity: 'info',
      message: missing.length === 0
        ? 'All secondary keywords appear in the content.'
        : `Secondary keywords missing from content: ${missing.join(', ')}.`,
    });
  }

  // 18. Keyphrase length (over-long keyphrases are hard to rank verbatim)
  const kwWords = primaryKw.split(/\s+/).filter(Boolean).length;
  checks.push({
    id: 'keyphrase_length',
    label: `Keyphrase Length (${kwWords} words)`,
    passed: kwWords <= 4,
    severity: 'info',
    message: kwWords <= 4
      ? 'Focus keyword is a rankable length.'
      : 'Focus keyword is over 4 words; consider a shorter primary keyphrase with the long tail as secondary.',
  });

  // 19. Slug length (short URLs click and rank better)
  const slugLen = slug.length;
  checks.push({
    id: 'slug_length',
    label: `URL Slug Length (${slugLen} chars)`,
    passed: slugLen <= 75,
    severity: 'info',
    message: slugLen <= 75
      ? 'URL slug is within the 75-character target.'
      : 'Shorten the URL slug to 75 characters or fewer.',
  });

  // 20. Title engagement (numbers lift CTR)
  const titleHasNumber = /\d/.test(title);
  checks.push({
    id: 'title_engagement',
    label: 'Title Engagement',
    passed: titleHasNumber,
    severity: 'info',
    message: titleHasNumber
      ? 'SEO title contains a number, which can lift click-through rate.'
      : 'Consider adding a number (year, count, rating) to the SEO title for click-through rate.',
  });

  // 21-23. Computed readability signals promoted into the score
  checks.push({
    id: 'readability_flesch',
    label: `Flesch Reading Ease (${readingEase})`,
    passed: readingEase >= 60,
    severity: 'warning',
    message: readingEase >= 60
      ? `Reading ease ${readingEase} meets the 60+ target for standard web content.`
      : `Reading ease ${readingEase} is below 60. Shorten sentences and swap complex words for plain ones.`,
  });
  checks.push({
    id: 'readability_paragraphs',
    label: `Paragraph Length (${longParagraphsCount} long)`,
    passed: longParagraphsCount === 0,
    severity: 'warning',
    message: longParagraphsCount === 0
      ? 'No over-long paragraphs.'
      : `${longParagraphsCount} paragraph(s) exceed 150 words. Break them up for skimmability.`,
  });
  checks.push({
    id: 'readability_subheadings',
    label: `Subheading Distribution (${longSectionsCount} long sections)`,
    passed: longSectionsCount === 0,
    severity: 'warning',
    message: longSectionsCount === 0
      ? 'Subheadings distribute the content well.'
      : `${longSectionsCount} section(s) exceed 300 words without a subheading. Add H2/H3 breaks.`,
  });

  // 24. E-E-A-T authorship (byline presence)
  const hasAuthor = Boolean((authorName || '').trim());
  checks.push({
    id: 'eeat_author',
    label: 'Author Byline (E-E-A-T)',
    passed: hasAuthor,
    severity: 'warning',
    message: hasAuthor
      ? 'Content carries an author byline.'
      : 'Add an author byline with credentials to strengthen E-E-A-T trust signals.',
  });

  // 25. AI citability fused into the grade (info weight)
  const aiScore = auditGeoAeo(content, {
    title,
    focusKeyword: primaryKw,
    excerpt: metaDescription,
  }).overallAiScore;
  checks.push({
    id: 'ai_citability',
    label: `AI Citability (${aiScore}/100)`,
    passed: aiScore >= 60,
    severity: 'info',
    message: aiScore >= 60
      ? `AI citation readiness ${aiScore} meets the 60+ target (quotable passages, stats, direct answers).`
      : `AI citation readiness ${aiScore} is below 60. Add a quotable definition, statistics, and a direct answer near the top.`,
  });

  return checks;
}
