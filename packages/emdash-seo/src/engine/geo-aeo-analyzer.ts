/**
 * GEO (Generative Engine Optimization) & AEO (Answer Engine Optimization) Engine
 * Optimizes content for AI search engines (ChatGPT Search, Google Gemini/AI Overviews, Perplexity)
 * and Answer Engines / Voice Search (Featured Snippets, Siri, Google Assistant).
 */

import type {
  FaqItem,
  HowToStep,
  GeoMetrics,
  AeoMetrics,
  GeoAeoReport,
  GeoAeoRecommendation,
} from '../types.js';

export interface AuditGeoAeoOptions {
  title?: string;
  focusKeyword?: string;
  excerpt?: string;
}

const QUESTION_HEADING_REGEX = /^(what|how|why|when|where|who|which|can|is|are|does|do|should|could|will|how much|how many)\b|\?$/i;

const STATS_REGEXES = [
  /\b\d+(?:\.\d+)?%/g,
  /(?:[$£€¥]\s*\d+(?:,\d{3})*(?:\.\d+)?|\b\d+\s*(?:USD|GBP|EUR)\b)/gi,
  /\b(?:19|20)\d{2}\b/g,
  /\b\d+(?:\.\d+)?\s*(?:km|miles|meters|kg|lbs|hours|mins|minutes|seconds|x|times|years|months|weeks|days)\b/gi,
  /\b\d+\s*:\s*\d+\b/g,
  /\b\d+\s+(?:samples|items|cases|respondents|products|rugs|carpets|users|clients|studies)\b/gi,
  /\b\d(?:\.\d)?(?:\s*\/\s*5|\s*stars?)\b/gi,
];

const EXPERIENCE_PHRASES = [
  'in our tests',
  'in our testing',
  'we found',
  'our team discovered',
  'in our experience',
  'our study',
  'our research',
  'case study',
  'we recommend',
  'we evaluated',
  'field results',
  'based on our analysis',
  'we measured',
  'we observed',
  'we benchmarked',
];

/**
 * Strips HTML tags while preserving headings and paragraph boundaries
 */
function cleanHtmlStructure(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n### $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

interface ContentBlock {
  type: 'heading' | 'paragraph';
  text: string;
  level?: number;
}

/**
 * Extracts paragraphs and headings from text with heading level detection
 */
function parseBlocks(text: string): ContentBlock[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const blocks: ContentBlock[] = [];

  for (const line of lines) {
    if (line.startsWith('#')) {
      const match = line.match(/^(#+)\s*(.*)$/);
      const level = match ? match[1].length : 1;
      const hText = match ? match[2].trim() : line.replace(/^#+\s*/, '').trim();
      if (hText) blocks.push({ type: 'heading', text: hText, level });
    } else {
      blocks.push({ type: 'paragraph', text: line });
    }
  }

  return blocks;
}

/**
 * Audits content for Generative Engine (GEO) and Answer Engine (AEO) readiness
 */
export function auditGeoAeo(content: string, options: AuditGeoAeoOptions = {}): GeoAeoReport {
  const { title = '', focusKeyword = '', excerpt = '' } = options;
  const rawText = content.includes('<') ? cleanHtmlStructure(content) : content;
  const blocks = parseBlocks(rawText);

  // ---------------------------------------------------------------------------
  // 1. GEO Analysis (Generative Engine Optimization)
  // ---------------------------------------------------------------------------
  const quotableSnippets: string[] = [];
  const statisticsFound: string[] = [];
  const experienceSignalsFound: string[] = [];
  let tableCount = 0;

  if (content.includes('<table') || /\|[^\n]+\|[^\n]+\|/.test(content)) {
    tableCount = (content.match(/<table/gi) || []).length || 1;
  }

  // Detect quotable definition / answer blocks (35 to 65 words)
  const kwLower = focusKeyword.trim().toLowerCase();
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      const words = block.text.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      if (wordCount >= 18 && wordCount <= 75) {
        const lower = block.text.toLowerCase();
        const hasKw = kwLower
          ? lower.includes(kwLower) || kwLower.split(/\s+/).some((w) => w.length > 3 && lower.includes(w))
          : true;
        const isDefinitive =
          /\b(is|are|refers to|means|defined as|consists of|involves|requires|recommend)\b/i.test(block.text) ||
          block.text.endsWith('.');
        if (hasKw && isDefinitive) {
          quotableSnippets.push(block.text);
        }
      }
    }
  }

  // Detect Statistical / Numerical Data Points
  for (const regex of STATS_REGEXES) {
    const matches = rawText.match(regex);
    if (matches) {
      for (const m of matches) {
        const trimmed = m.trim();
        if (!statisticsFound.includes(trimmed)) {
          statisticsFound.push(trimmed);
        }
      }
    }
  }

  // Detect First-Party Experience / Information Gain signals
  const lowerContent = rawText.toLowerCase();
  for (const phrase of EXPERIENCE_PHRASES) {
    if (lowerContent.includes(phrase)) {
      experienceSignalsFound.push(phrase);
    }
  }

  // Compute GEO Score (0-100)
  let geoScore = 20; // baseline
  if (quotableSnippets.length > 0) geoScore += 30;
  if (statisticsFound.length >= 3) geoScore += 25;
  else if (statisticsFound.length > 0) geoScore += 15;
  if (experienceSignalsFound.length > 0) geoScore += 15;
  if (tableCount > 0) geoScore += 10;
  geoScore = Math.min(100, geoScore);

  const geoMetrics: GeoMetrics = {
    geoScore,
    quotableSnippetsCount: quotableSnippets.length,
    statisticsCount: statisticsFound.length,
    experienceSignalsCount: experienceSignalsFound.length,
    comparativeTablesCount: tableCount,
    quotableSnippets: quotableSnippets.slice(0, 5),
    statistics: statisticsFound.slice(0, 10),
    experienceSignals: experienceSignalsFound,
  };

  // ---------------------------------------------------------------------------
  // 2. AEO Analysis (Answer Engine Optimization & Voice Search)
  // ---------------------------------------------------------------------------
  const questionHeadings: string[] = [];
  const directAnswers: Array<{ question: string; answer: string }> = [];
  const faqCandidates: FaqItem[] = [];
  const howToSteps: HowToStep[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isMainTitle = block.level === 1 || (title && block.text.toLowerCase() === title.toLowerCase());

    if (block.type === 'heading' && !isMainTitle) {
      if (QUESTION_HEADING_REGEX.test(block.text)) {
        questionHeadings.push(block.text);

        // Check if immediately followed by a concise answer paragraph
        const next = blocks[i + 1];
        if (next && next.type === 'paragraph') {
          const ansWords = next.text.split(/\s+/).filter(Boolean);
          if (ansWords.length >= 8 && ansWords.length <= 65) {
            directAnswers.push({ question: block.text, answer: next.text });
            faqCandidates.push({ question: block.text, answer: next.text });
          }
        }
      }
    }

    // Step detection (supports heading steps "### Step 1: ..." and numbered paragraphs "1. ...")
    const stepMatch = block.text.match(/^(?:Step\s*(\d+)[:.]?|(\d+)[.)])\s*(.*)$/i);
    if (stepMatch) {
      const stepNum = Number(stepMatch[1] || stepMatch[2] || howToSteps.length + 1);
      const stepName = stepMatch[3] ? stepMatch[3].trim() : `Step ${stepNum}`;

      const next = blocks[i + 1];
      const stepText =
        next && next.type === 'paragraph' && !next.text.match(/^(?:Step\s*\d+|\d+[.)])/i)
          ? next.text
          : stepMatch[3] || block.text;

      howToSteps.push({
        position: stepNum,
        name: stepName || `Step ${stepNum}`,
        text: stepText,
      });
    }
  }

  // Determine ideal speakable candidate for voice assistants
  let speakableCandidate = excerpt;
  if (!speakableCandidate && directAnswers.length > 0) {
    speakableCandidate = directAnswers[0].answer;
  } else if (!speakableCandidate) {
    const firstP = blocks.find((b) => b.type === 'paragraph');
    if (firstP && firstP.text.length <= 250) {
      speakableCandidate = firstP.text;
    }
  }

  // Compute AEO Score (0-100)
  let aeoScore = 20; // baseline
  if (questionHeadings.length > 0) aeoScore += 25;
  if (directAnswers.length > 0) aeoScore += 30;
  if (howToSteps.length >= 3) aeoScore += 15;
  if (faqCandidates.length >= 2) aeoScore += 10;
  
  if (speakableCandidate) aeoScore += 10;
  aeoScore = Math.min(100, aeoScore);

  const aeoMetrics: AeoMetrics = {
    aeoScore,
    questionHeadingsCount: questionHeadings.length,
    directAnswersCount: directAnswers.length,
    howToStepsCount: howToSteps.length,
    faqCandidatesCount: faqCandidates.length,
    questionHeadings,
    directAnswers,
    howToSteps,
    speakableCandidate,
  };

  const overallAiScore = Math.round((geoScore + aeoScore) / 2);

  // ---------------------------------------------------------------------------
  // 3. Actionable Recommendations Generation
  // ---------------------------------------------------------------------------
  const recommendations: GeoAeoRecommendation[] = [];

  // GEO Recommendations
  if (quotableSnippets.length === 0) {
    recommendations.push({
      category: 'GEO',
      dimension: 'GEO',
      type: 'critical',
      title: 'Add a Definitive Quotable Paragraph',
      message: 'Generative engines (ChatGPT, Gemini) quote clear 35-55 word definition or summary passages. Add a concise summary block answering the main user intent.',
    });
  } else {
    recommendations.push({
      category: 'GEO',
      dimension: 'GEO',
      type: 'good',
      title: 'AI-Quotable Summary Found',
      message: `Detected ${quotableSnippets.length} passage(s) highly suited for verbatim AI search overview citations.`,
    });
  }

  if (statisticsFound.length < 2) {
    recommendations.push({
      category: 'GEO',
      dimension: 'GEO',
      type: 'improvement',
      title: 'Increase Data Points & Statistics',
      message: 'Pages featuring verifiable numbers, percentages, benchmark dates, or prices receive up to 3.2x more generative citations.',
    });
  } else {
    recommendations.push({
      category: 'GEO',
      dimension: 'GEO',
      type: 'good',
      title: 'Rich Statistical Density',
      message: `Found ${statisticsFound.length} verifiable data points (${statisticsFound.slice(0, 3).join(', ')}).`,
    });
  }

  if (experienceSignalsFound.length === 0) {
    recommendations.push({
      category: 'GEO',
      dimension: 'GEO',
      type: 'improvement',
      title: 'Inject First-Party Experience (E-E-A-T)',
      message: 'Include first-person phrases ("in our tests", "we observed", "our team discovered") to prove authentic primary-source experience.',
    });
  }

  // AEO Recommendations
  if (questionHeadings.length === 0) {
    recommendations.push({
      category: 'AEO',
      dimension: 'AEO',
      type: 'critical',
      title: 'Add Question-Targeted Headings',
      message: 'Frame key H2/H3 headings as natural questions ("What is...", "How to...", "Why does...") to capture voice search and featured snippets.',
    });
  }

  if (questionHeadings.length > 0 && directAnswers.length === 0) {
    recommendations.push({
      category: 'AEO',
      dimension: 'AEO',
      type: 'critical',
      title: 'Provide Direct Answers After Questions',
      message: 'Keep the paragraph immediately following a question heading between 25-50 words for optimal featured snippet selection.',
    });
  }

  if (howToSteps.length >= 3) {
    recommendations.push({
      category: 'AEO',
      dimension: 'AEO',
      type: 'good',
      title: 'Step-by-Step Instructions Detected',
      message: `Extracted ${howToSteps.length} numbered steps eligible for Google HowTo rich snippets.`,
    });
  }

  return {
    geoScore,
    aeoScore,
    overallAiScore,
    geo: {
      score: geoScore,
      quotableQuotes: quotableSnippets,
      hasQuotableDefinitions: quotableSnippets.length > 0,
      statisticalEvidenceScore: Math.min(100, statisticsFound.length * 25),
      firstPartyExperienceScore: Math.min(100, experienceSignalsFound.length * 35),
    },
    aeo: {
      score: aeoScore,
      questionHeadingsCount: questionHeadings.length,
      directAnswersCount: directAnswers.length,
      directAnswerCandidate: directAnswers[0]?.answer,
      speakableCandidate,
      hasVoiceSearchReadiness: Boolean(speakableCandidate && directAnswers.length > 0),
    },
    geoMetrics,
    aeoMetrics,
    faqCandidates,
    recommendations,
  };
}

/**
 * Automatically extracts FAQs from content structure
 */
export function extractAutoFaqs(content: string): FaqItem[] {
  const report = auditGeoAeo(content);
  return report.faqCandidates;
}

/**
 * Automatically extracts HowTo steps from content structure
 */
export function extractAutoHowTo(content: string): HowToStep[] {
  const report = auditGeoAeo(content);
  return report.aeoMetrics.howToSteps;
}

/**
 * Extracts ideal speakable text for voice search
 */
export function extractSpeakableText(content: string, excerpt?: string): string {
  const report = auditGeoAeo(content, { excerpt });
  return report.aeoMetrics.speakableCandidate || excerpt || '';
}
