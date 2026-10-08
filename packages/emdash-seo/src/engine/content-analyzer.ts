import type { AnalysisReport, ContentCheck } from '../types.js';
import {
  calculateEntityCoverage,
  calculateFleschReadingEase,
  TOPIC_ENTITY_CLUSTERS,
} from './semantic-analyzer.js';
import { auditReadability } from './readability-auditor.js';
import { auditImageAlts } from './alt-auditor.js';

export interface ContentAnalyzeOptions {
  title: string;
  slug?: string;
  content?: string; // HTML or Markdown or raw text
  contentHtml?: string; // Alias for content
  focusKeywords: string[];
  metaDescription?: string;
  description?: string;
  siteUrl?: string;
  minWordCount?: number;
  expectedEntities?: string[];
}

export function analyzeContent(options: ContentAnalyzeOptions): AnalysisReport {
  const {
    title,
    slug = '',
    content: rawContent,
    focusKeywords,
    metaDescription: rawMetaDesc = '',
    minWordCount = 600,
  } = options;

  const content = rawContent || (options as any).contentHtml || '';
  const metaDescription = rawMetaDesc || options.description || '';
  const checks: ContentCheck[] = [];
  const primaryKw = (focusKeywords[0] || '').trim().toLowerCase();

  // Strip HTML tags for clean text analysis
  const cleanText = content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Heading counts
  const h1Matches = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h2Matches = content.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  const h3Matches = content.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || [];

  // Image counts
  const imgMatches = content.match(/<img[^>]*>/gi) || [];
  const imgWithoutAlt = imgMatches.filter((img: string) => !img.includes('alt=') || /alt=["']\s*["']/i.test(img)).length;

  // Links
  const linkMatches = content.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
  let internalLinks = 0;
  let externalLinks = 0;
  const siteHostname = options.siteUrl ? new URL(options.siteUrl).hostname : '';

  for (const link of linkMatches) {
    const hrefMatch = link.match(/href=["']([^"']+)["']/i);
    const href = hrefMatch ? hrefMatch[1] : '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }
    if (href.startsWith('/') || !href.includes('://')) {
      internalLinks++;
    } else if (siteHostname && href.includes(siteHostname)) {
      internalLinks++;
    } else {
      externalLinks++;
    }
  }

  // If no focus keyword set
  if (!primaryKw) {
    checks.push({
      id: 'no_keyword',
      label: 'Focus Keyword',
      passed: false,
      severity: 'warning',
      message: 'Set at least one focus keyword to calculate an accurate SEO content score.',
    });

    const readability = calculateFleschReadingEase(content);
    const detailedReadability = auditReadability(content);
    const altAudit = auditImageAlts(content, { targetKeywords: focusKeywords });
    const expectedEntities = options.expectedEntities || [];
    const coverage = calculateEntityCoverage(content, expectedEntities);

    return {
      score: 40,
      grade: 'Needs Improvement',
      checks,
      metrics: {
        wordCount,
        keywordDensity: 0,
        keywordMatches: 0,
        h1Count: h1Matches.length,
        h2Count: h2Matches.length,
        h3Count: h3Matches.length,
        internalLinkCount: internalLinks,
        externalLinkCount: externalLinks,
        imageCount: imgMatches.length,
        imagesWithoutAlt: imgWithoutAlt,
      },
      keywordInTitle: false,
      keywordInSlug: false,
      keywordInDescription: false,
      keywordInFirstParagraph: false,
      keywordInSubheadings: false,
      hasImagesWithAlt: imgWithoutAlt === 0 && imgMatches.length > 0,
      recommendations: checks.map((c) => c.message),
      eciScore: coverage.score,
      detectedEntities: coverage.detected,
      topicalGaps: coverage.missing,
      readability,
      detailedReadability,
      altAudit,
    };
  }

  // 1. Keyword in SEO Title
  const inTitle = title.toLowerCase().includes(primaryKw);
  checks.push({
    id: 'kw_in_title',
    label: 'Focus Keyword in Title',
    passed: inTitle,
    severity: 'error',
    message: inTitle
      ? `Title contains focus keyword "${primaryKw}".`
      : `Add your focus keyword "${primaryKw}" to the SEO title.`,
  });

  // 2. Keyword near start of Title (first 60%)
  const titleStartPassed = inTitle && title.toLowerCase().indexOf(primaryKw) < Math.ceil(title.length * 0.6);
  checks.push({
    id: 'kw_title_start',
    label: 'Focus Keyword Near Start of Title',
    passed: titleStartPassed,
    severity: 'info',
    message: titleStartPassed
      ? 'Focus keyword is positioned near the front of the title.'
      : 'Move the focus keyword closer to the beginning of the title for higher SERP prominence.',
  });

  // 3. Keyword in Meta Description
  const inDesc = metaDescription.toLowerCase().includes(primaryKw);
  checks.push({
    id: 'kw_in_desc',
    label: 'Focus Keyword in Meta Description',
    passed: inDesc,
    severity: 'error',
    message: inDesc
      ? 'Meta description contains focus keyword.'
      : 'Include the focus keyword in your meta description.',
  });

  // 4. Keyword in URL Slug
  const cleanSlug = slug.toLowerCase().replace(/[-_]/g, ' ');
  const inSlug = cleanSlug.includes(primaryKw) || primaryKw.split(' ').every((token) => cleanSlug.includes(token));
  checks.push({
    id: 'kw_in_slug',
    label: 'Focus Keyword in URL Slug',
    passed: inSlug,
    severity: 'warning',
    message: inSlug ? 'Focus keyword is present in URL slug.' : 'Include focus keyword terms in your URL slug.',
  });

  // 5. Keyword in first 100 words of content
  const first100Words = words.slice(0, 100).join(' ');
  const inIntro = first100Words.includes(primaryKw);
  checks.push({
    id: 'kw_in_intro',
    label: 'Focus Keyword in Introduction (First 100 words)',
    passed: inIntro,
    severity: 'warning',
    message: inIntro
      ? 'Focus keyword appears in the first 100 words.'
      : 'Introduce your focus keyword within the first paragraph / 100 words.',
  });

  // 6. Keyword in Subheadings (H2 or H3)
  const allSubheadings = [...h2Matches, ...h3Matches].join(' ').toLowerCase();
  const inSubheading = allSubheadings.includes(primaryKw);
  checks.push({
    id: 'kw_in_headings',
    label: 'Focus Keyword in Subheadings (H2/H3)',
    passed: inSubheading,
    severity: 'warning',
    message: inSubheading
      ? 'Focus keyword appears in at least one subheading.'
      : 'Use your focus keyword or close variation in an H2 or H3 subheading.',
  });

  // 7. Keyword Density (Optimal: 0.8% - 2.5%)
  const escapedKw = primaryKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const kwMatches = (cleanText.match(new RegExp(`\\b${escapedKw}\\b`, 'gi')) || []).length;
  const density = wordCount > 0 ? (kwMatches / wordCount) * 100 : 0;
  const densityPassed = density >= 0.8 && density <= 2.5;
  checks.push({
    id: 'kw_density',
    label: `Keyword Density (${density.toFixed(1)}%)`,
    passed: densityPassed,
    severity: density < 0.8 ? 'warning' : 'error',
    message: densityPassed
      ? `Optimal keyword density of ${density.toFixed(1)}% (${kwMatches} occurrences).`
      : density < 0.8
        ? `Keyword density (${density.toFixed(1)}%) is low. Recommended range is 0.8% - 2.5%.`
        : `Keyword density (${density.toFixed(1)}%) is too high. Avoid keyword stuffing.`,
  });

  // 8. Word Count Check
  const wordCountPassed = wordCount >= minWordCount;
  checks.push({
    id: 'word_count',
    label: `Content Length (${wordCount} words)`,
    passed: wordCountPassed,
    severity: wordCount < 300 ? 'error' : 'warning',
    message: wordCountPassed
      ? `Content length (${wordCount} words) satisfies the ${minWordCount}-word benchmark.`
      : `Content length (${wordCount} words) is below the recommended ${minWordCount} words for comprehensive coverage.`,
  });

  // 9. Single H1 Tag Check
  const h1Passed = h1Matches.length === 1;
  checks.push({
    id: 'heading_h1',
    label: 'Single H1 Heading',
    passed: h1Passed,
    severity: 'error',
    message: h1Passed
      ? 'Document has exactly one H1 heading.'
      : h1Matches.length === 0
        ? 'Missing H1 heading on page.'
        : `Found ${h1Matches.length} H1 headings. A page must have exactly one main H1.`,
  });

  // 10. Image Alt Attributes
  const imgAltPassed = imgWithoutAlt === 0;
  checks.push({
    id: 'img_alt',
    label: 'Image Alt Attributes',
    passed: imgAltPassed,
    severity: 'warning',
    message: imgAltPassed
      ? `All ${imgMatches.length} images have alt attributes.`
      : `${imgWithoutAlt} of ${imgMatches.length} images are missing descriptive alt text.`,
  });

  // 11. Internal & External Linking
  const hasInternal = internalLinks > 0;
  checks.push({
    id: 'internal_links',
    label: `Internal Links (${internalLinks})`,
    passed: hasInternal,
    severity: 'info',
    message: hasInternal
      ? `Page includes ${internalLinks} internal link(s).`
      : 'Add contextual internal links to related cleaning services or guides.',
  });

  // Readability signals wired into the score (warning-level checks)
  const detailedReadabilityEarly = auditReadability(content);
  const passivePct = detailedReadabilityEarly.passiveVoicePercentage;
  const transitionPct = detailedReadabilityEarly.transitionPercentage;
  const hardPct = detailedReadabilityEarly.hardSentencesPercentage;
  checks.push({
    id: 'readability_passive_voice',
    label: `Passive Voice (${passivePct}%)`,
    passed: passivePct <= 10,
    severity: 'warning',
    message: passivePct <= 10
      ? `Passive voice usage is low (${passivePct}% of sentences).`
      : `${passivePct}% of sentences use passive voice (recommended: 10% or less). Prefer active voice.`,
  });
  checks.push({
    id: 'readability_transitions',
    label: `Transition Words (${transitionPct}%)`,
    passed: transitionPct >= 30,
    severity: 'warning',
    message: transitionPct >= 30
      ? `${transitionPct}% of sentences contain transition words.`
      : `Only ${transitionPct}% of sentences contain transition words (recommended: 30% or more).`,
  });
  checks.push({
    id: 'readability_sentence_length',
    label: `Hard Sentences (${hardPct}%)`,
    passed: hardPct <= 25,
    severity: 'warning',
    message: hardPct <= 25
      ? `Hard-to-read sentences are within limits (${hardPct}%).`
      : `${hardPct}% of sentences are hard or very hard to read (recommended: 25% or less). Shorten long sentences.`,
  });

  // 12. External (outbound) links
  const hasExternal = externalLinks >= 1;
  checks.push({
    id: 'external_links',
    label: `External Links (${externalLinks})`,
    passed: hasExternal,
    severity: 'warning',
    message: hasExternal
      ? `Page includes ${externalLinks} outbound link(s) to external sources.`
      : 'Add at least one outbound link to an authoritative external source.',
  });

  // 13. Meta description length (120-156 characters)
  const metaDescLen = metaDescription.length;
  const metaDescLenPassed = metaDescLen >= 120 && metaDescLen <= 156;
  checks.push({
    id: 'meta_desc_length',
    label: `Meta Description Length (${metaDescLen} chars)`,
    passed: metaDescLenPassed,
    severity: 'warning',
    message: metaDescLenPassed
      ? `Meta description length (${metaDescLen} chars) is within the 120-156 character target.`
      : `Meta description is ${metaDescLen} characters. Target 120-156 characters for full SERP display.`,
  });

  // 14. SEO title width (30-60 characters)
  const titleLen = title.length;
  const titleWidthPassed = titleLen >= 30 && titleLen <= 60;
  checks.push({
    id: 'title_width',
    label: `SEO Title Width (${titleLen} chars)`,
    passed: titleWidthPassed,
    severity: 'warning',
    message: titleWidthPassed
      ? `SEO title width (${titleLen} chars) fits the 30-60 character SERP target.`
      : `SEO title is ${titleLen} characters. Target 30-60 characters to avoid SERP truncation.`,
  });

  // 15. Focus keyword in at least one image alt text
  const altTexts: string[] = [];
  const htmlAltRegex = /<img[^>]*\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let altMatch: RegExpExecArray | null;
  while ((altMatch = htmlAltRegex.exec(content)) !== null) {
    altTexts.push(altMatch[1] ?? altMatch[2] ?? altMatch[3] ?? '');
  }
  const mdAltRegex = /!\[([^\]]*?)\]\([^)]*\)/g;
  while ((altMatch = mdAltRegex.exec(content)) !== null) {
    altTexts.push(altMatch[1] ?? '');
  }
  const imageKwPassed = altTexts.some((a) => a.toLowerCase().includes(primaryKw));
  checks.push({
    id: 'image_keyphrase',
    label: 'Keyphrase in Image Alt Text',
    passed: imageKwPassed,
    severity: 'warning',
    message: imageKwPassed
      ? 'At least one image alt text contains the focus keyword.'
      : 'Include the focus keyword in at least one image alt text.',
  });

  // 16. Keyphrase distribution across 100-word content sections
  const chunkSize = 100;
  const chunkCount = Math.max(1, Math.ceil(wordCount / chunkSize));
  let chunksWithKw = 0;
  for (let i = 0; i < chunkCount; i++) {
    const chunk = words.slice(i * chunkSize, (i + 1) * chunkSize).join(' ');
    if (chunk.includes(primaryKw)) {
      chunksWithKw++;
    }
  }
  const distPassed = chunksWithKw / chunkCount > 0.5;
  checks.push({
    id: 'keyphrase_distribution',
    label: `Keyphrase Distribution (${chunksWithKw}/${chunkCount} sections)`,
    passed: distPassed,
    severity: 'warning',
    message: distPassed
      ? `Focus keyword appears in ${chunksWithKw} of ${chunkCount} content sections (even distribution).`
      : 'Distribute the focus keyword more evenly: it should appear in over half of all 100-word content sections.',
  });

  // Severity-weighted overall score (error=3, warning=2, info=1)
  const SEVERITY_WEIGHTS: Record<ContentCheck['severity'], number> = { error: 3, warning: 2, info: 1 };
  const totalWeight = checks.reduce((acc, c) => acc + SEVERITY_WEIGHTS[c.severity], 0);
  const passedWeight = checks
    .filter((c) => c.passed)
    .reduce((acc, c) => acc + SEVERITY_WEIGHTS[c.severity], 0);
  const rawScore = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  let grade: AnalysisReport['grade'] = 'Needs Improvement';
  if (rawScore >= 80) grade = 'Good';
  else if (rawScore >= 60) grade = 'OK';

  const keywordInTitle = checks.find(c => c.id === 'kw_in_title')?.passed ?? false;
  const keywordInSlug = checks.find(c => c.id === 'kw_in_slug')?.passed ?? false;
  const keywordInDescription = checks.find(c => c.id === 'kw_in_desc')?.passed ?? false;
  const keywordInFirstParagraph = checks.find(c => c.id === 'kw_in_intro')?.passed ?? false;
  const keywordInSubheadings = checks.find(c => c.id === 'kw_in_headings')?.passed ?? false;
  const hasImagesWithAlt = checks.find(c => c.id === 'img_alt')?.passed ?? false;
  // Semantic analysis
  let expectedEntities = options.expectedEntities;
  if (!expectedEntities || expectedEntities.length === 0) {
    const combinedContext = `${title} ${primaryKw} ${focusKeywords.join(' ')}`.toLowerCase();
    if (combinedContext.includes('clean') || combinedContext.includes('carpet')) {
      expectedEntities = TOPIC_ENTITY_CLUSTERS.cleaning;
    } else if (
      combinedContext.includes('code') ||
      combinedContext.includes('api') ||
      combinedContext.includes('performance') ||
      combinedContext.includes('architecture') ||
      combinedContext.includes('technical')
    ) {
      expectedEntities = TOPIC_ENTITY_CLUSTERS.technical;
    } else if (
      combinedContext.includes('service') ||
      combinedContext.includes('repair') ||
      combinedContext.includes('plumber') ||
      combinedContext.includes('electrician') ||
      combinedContext.includes('business')
    ) {
      expectedEntities = TOPIC_ENTITY_CLUSTERS.local_business;
    } else {
      expectedEntities = focusKeywords.filter((k) => Boolean(k?.trim()));
    }
  }

  const coverage = calculateEntityCoverage(content, expectedEntities);
  const readability = calculateFleschReadingEase(content);
  const detailedReadability = detailedReadabilityEarly;
  const altAudit = auditImageAlts(content, { targetKeywords: focusKeywords });
  const recommendations = checks.filter((c) => !c.passed).map((c) => c.message);

  return {
    score: rawScore,
    grade,
    checks,
    metrics: {
      wordCount,
      keywordDensity: Number(density.toFixed(2)),
      keywordMatches: kwMatches,
      h1Count: h1Matches.length,
      h2Count: h2Matches.length,
      h3Count: h3Matches.length,
      internalLinkCount: internalLinks,
      externalLinkCount: externalLinks,
      imageCount: imgMatches.length,
      imagesWithoutAlt: imgWithoutAlt,
    },
    keywordInTitle,
    keywordInSlug,
    keywordInDescription,
    keywordInFirstParagraph,
    keywordInSubheadings,
    hasImagesWithAlt,
    recommendations,
    eciScore: coverage.score,
    detectedEntities: coverage.detected,
    topicalGaps: coverage.missing,
    readability,
    detailedReadability,
    altAudit,
  };
}
