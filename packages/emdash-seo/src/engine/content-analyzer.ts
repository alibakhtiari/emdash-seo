import type { AnalysisReport, ContentCheck } from '../types.js';

export interface ContentAnalyzeOptions {
  title: string;
  slug?: string;
  content: string; // HTML or Markdown or raw text
  focusKeywords: string[];
  metaDescription?: string;
  description?: string;
  siteUrl?: string;
  minWordCount?: number;
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

  // Calculate overall score (0-100)
  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.passed).length;
  const rawScore = Math.round((passedChecks / totalChecks) * 100);

  let grade: AnalysisReport['grade'] = 'Needs Improvement';
  if (rawScore >= 80) grade = 'Good';
  else if (rawScore >= 60) grade = 'OK';

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
  };
}
