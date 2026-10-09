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
  reviewerName?: string;
  speakableSelectors?: string[];
  dateModified?: string;
  authorityDomains?: string[];
  externalDomains: string[];
  wordCount: number;
  h2Count: number;
  h3Count: number;
  readingEase: number;
  longParagraphsCount: number;
  longSectionsCount: number;
}

const TITLE_POWER_WORDS = [
  'ultimate', 'complete', 'proven', 'essential', 'powerful', 'exclusive',
  'guaranteed', 'effortless', 'master', 'definitive', 'professional', 'trusted',
];
const TITLE_SENTIMENT_WORDS = [
  'amazing', 'awesome', 'best', 'excellent', 'outstanding', 'incredible',
  'worst', 'avoid', 'mistakes', 'never', 'stop', 'warning',
];

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
    reviewerName,
    speakableSelectors,
    dateModified,
    authorityDomains,
    externalDomains,
    wordCount,
    h2Count,
    h3Count,
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

  // 26. Title power/sentiment wording (CTR hint)
  const titleLower = title.toLowerCase();
  const hasPowerWord = [...TITLE_POWER_WORDS, ...TITLE_SENTIMENT_WORDS].some((w) => titleLower.includes(w));
  checks.push({
    id: 'title_power_words',
    label: 'Title Power Wording',
    passed: hasPowerWord,
    severity: 'info',
    message: hasPowerWord
      ? 'SEO title uses power or sentiment wording that can lift click-through rate.'
      : 'Consider a power word (ultimate, proven, complete) or sentiment word (best, avoid) in the SEO title.',
  });

  // 27. Long-form TOC presence (>1500 words without subheadings)
  const subCount = h2Count + h3Count;
  const tocOk = wordCount <= 1500 || subCount > 0;
  checks.push({
    id: 'toc_missing',
    label: `Table of Contents (${wordCount} words, ${subCount} subheadings)`,
    passed: tocOk,
    severity: 'warning',
    message: tocOk
      ? 'Long-form content has subheading navigation or is concise enough without it.'
      : 'Content exceeds 1500 words with no H2/H3 subheadings. Add a table of contents with jump links.',
  });

  // 28. Voice-search speakable readiness
  const speakableOk = Array.isArray(speakableSelectors) && speakableSelectors.length > 0;
  checks.push({
    id: 'speakable_readiness',
    label: 'Speakable Voice Readiness',
    passed: speakableOk,
    severity: 'info',
    message: speakableOk
      ? 'Speakable selectors are configured for voice-assistant readout.'
      : 'Configure speakable CSS selectors so voice assistants can read the summary aloud.',
  });

  // 29. E-E-A-T reviewer presence
  const hasReviewer = Boolean((reviewerName || '').trim());
  checks.push({
    id: 'eeat_reviewer',
    label: 'Reviewer Credit (E-E-A-T)',
    passed: hasReviewer,
    severity: 'info',
    message: hasReviewer
      ? 'Content carries reviewer credit.'
      : 'Add reviewer credit for YMYL or advice content to strengthen trust signals.',
  });

  // 30. Content freshness (stale content loses AI citations; skipped when undated)
  if (dateModified) {
    const ageDays = (Date.now() - new Date(dateModified).getTime()) / 86400000;
    const fresh = Number.isFinite(ageDays) && ageDays <= 540;
    checks.push({
      id: 'content_freshness',
      label: 'Content Freshness',
      passed: fresh,
      severity: 'info',
      message: fresh
        ? 'Content was updated within the last 18 months.'
        : 'Content is over 18 months old. Refresh facts, dates, and statistics to protect rankings and AI citations.',
    });
  }

  // 31. Statistic attribution (numbers need named sources for AI trust)
  const hasNumber = /\d/.test(cleanText);
  const hasAttribution = /according to|source:|sources:|study (by|from|shows)|research (by|from|shows)|data (from|shows)|reported by/i.test(cleanText);
  if (hasNumber) {
    checks.push({
      id: 'stat_attribution',
      label: 'Statistic Attribution',
      passed: hasAttribution,
      severity: 'info',
      message: hasAttribution
        ? 'Statistics are attributed to named sources.'
        : 'Attribute statistics to named sources ("according to…") — sourced numbers earn more AI citations.',
    });
  }

  // 32. Outbound-authority citations (gov/edu/reference + configured domains)
  const authorityMatchers: RegExp[] = [
    /\.gov(\.|$)/, /\.edu(\.|$)/, /\.ac\.[a-z]{2}$/, /(^|\.)wikipedia\.org$/,
    /(^|\.)nih\.gov$/, /(^|\.)who\.int$/, /(^|\.)nature\.com$/,
  ];
  for (const d of authorityDomains || []) {
    const esc = d.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (esc) authorityMatchers.push(new RegExp(`(^|\\.)${esc}$`));
  }
  if (externalDomains.length > 0) {
    const cited = externalDomains.some((h) => authorityMatchers.some((re) => re.test(h)));
    checks.push({
      id: 'eeat_citations',
      label: 'Authoritative Citations',
      passed: cited,
      severity: 'info',
      message: cited
        ? 'Content cites at least one authoritative reference domain.'
        : 'Link claims to an authoritative reference (government, academic, or primary source) to strengthen trust.',
    });
  }

  return checks;
}
