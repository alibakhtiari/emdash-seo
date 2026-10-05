/**
 * Next-Gen Semantic SEO & Entity Intelligence Engine
 * Pure TypeScript, zero external dependencies, Cloudflare Workers Free Tier compatible (< 2ms CPU).
 * Implements N-gram extraction, Okapi BM25 term salience, Entity Coverage Index (ECI),
 * and Flesch-Kincaid Reading Ease scoring.
 */

export const ENGLISH_STOPWORDS: ReadonlySet<string> = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren', 'arent', 'as', 'at', 'be', 'because', 'been', 'before',
  'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'couldn', 'couldnt', 'did', 'didn', 'didnt', 'do', 'does', 'doesn', 'doesnt',
  'doing', 'don', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'hadn', 'hadnt', 'has', 'hasn', 'hasnt', 'have', 'haven',
  'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id',
  'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isn', 'isnt', 'it', 'its',
  'itself', 'just', 'let', 'lets', 'me', 'more', 'most', 'mustn', 'mustnt',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only',
  'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan', 'shant', 'she', 'shed', 'shell', 'shes', 'should',
  'shouldn', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres',
  'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn',
  'wasnt', 'we', 'wed', 'well', 'were', 'weren', 'werent', 'weve', 'what',
  'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who',
  'whos', 'whom', 'why', 'whys', 'with', 'won', 'wont', 'would', 'wouldn',
  'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours',
  'yourself', 'yourselves', 'also', 'will',
]);

/**
 * Predefined domain entity topic clusters for automated gap analysis
 */
export const TOPIC_ENTITY_CLUSTERS: Record<string, string[]> = {
  cleaning: [
    'hot water extraction',
    'steam cleaning',
    'stain removal',
    'drying time',
    'eco-friendly',
    'upholstery',
    'pet odors',
    'quote',
  ],
  local_business: [
    'opening hours',
    'service area',
    'insured',
    'guarantee',
    'reviews',
    'telephone',
    'booking',
    'pricing',
  ],
  technical: [
    'architecture',
    'performance',
    'benchmarks',
    'configuration',
    'prerequisites',
    'troubleshooting',
  ],
};

export interface SemanticEntity {
  name: string;
  category: 'primary' | 'secondary' | 'contextual';
  salienceScore: number;
  occurrences: number;
  inHeadings: boolean;
  inFirstParagraph: boolean;
}

export interface EntityGap {
  entity: string;
  recommendedCategory: string;
  importance: 'critical' | 'recommended' | 'optional';
  exampleSnippet?: string;
}

export interface ReadabilityMetrics {
  score: number;
  level: string;
  fleschReadingEase: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  hardSentencesCount: number;
}

export interface EntityCoverageResult {
  score: number;
  detected: string[];
  missing: string[];
}

/**
 * Escapes special regex characters in a literal string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tests whether an entity appears in the provided content with word/boundary awareness
 */
function matchesEntity(content: string, entity: string): boolean {
  const norm = entity.trim().toLowerCase();
  if (!norm) return false;
  const escaped = escapeRegex(norm);

  let pattern: string;
  if (norm.endsWith('s')) {
    const singular = escapeRegex(norm.slice(0, -1));
    pattern = `(?:${escaped}|${singular})`;
  } else {
    pattern = `${escaped}(?:s|es)?`;
  }

  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}(?=[^\\p{L}\\p{N}]|$)`, 'iu');
  return regex.test(content);
}

/**
 * 3.1 N-Gram Topical Extraction & Stopword Filtering
 * Normalizes text, filters stopwords and short words (< 3 chars),
 * and generates n-grams from unigrams up to maxN (default: 3).
 */
export function extractTopicalNgrams(text: string, maxN: number = 3): Map<string, number> {
  const ngrams = new Map<string, number>();
  if (!text || maxN < 1) return ngrams;

  // Strip HTML tags before tokenizing
  const clean = text.replace(/<[^>]*>/g, ' ');
  const words = clean
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 2 && !ENGLISH_STOPWORDS.has(w));

  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      ngrams.set(phrase, (ngrams.get(phrase) || 0) + 1);
    }
  }

  return ngrams;
}

/**
 * 3.2 BM25 / TF-IDF Term Salience Scoring
 * Calculates term salience relative to document length and domain saturation
 * using the Okapi BM25 formula (k1 = 1.2, b = 0.75, avgdl = 800).
 */
export function calculateBm25Salience(
  termFreq: number,
  docWordCount: number,
  idf: number = 1.0
): number {
  if (termFreq <= 0 || docWordCount <= 0) return 0;
  const k1 = 1.2;
  const b = 0.75;
  const avgdl = 800;

  const numerator = termFreq * (k1 + 1);
  const denominator = termFreq + k1 * (1 - b + b * (docWordCount / avgdl));
  const score = idf * (numerator / denominator);

  return Number(score.toFixed(4));
}

/**
 * 3.3 Entity Coverage Index (ECI) & Gap Analysis
 * Evaluates document text against an expected list of semantic entities.
 * ECI = (Entities Found / Total Expected Entities) * 70 + (Heading Entity Distribution / Total Subheadings) * 30
 */
export function calculateEntityCoverage(
  text: string,
  expectedEntities: string[]
): EntityCoverageResult {
  if (!expectedEntities || expectedEntities.length === 0) {
    return { score: 100, detected: [], missing: [] };
  }

  if (!text || text.trim().length === 0) {
    return { score: 0, detected: [], missing: [...expectedEntities] };
  }

  // Strip HTML tags for clean body text searching
  const cleanBody = text.replace(/<[^>]*>/g, ' ');

  const detected: string[] = [];
  const missing: string[] = [];

  for (const entity of expectedEntities) {
    if (matchesEntity(cleanBody, entity)) {
      detected.push(entity);
    } else {
      missing.push(entity);
    }
  }

  // Extract subheadings (HTML <h2>-<h6> and Markdown ##-######)
  const subheadings: string[] = [];

  const htmlHeadings = text.match(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi) || [];
  for (const h of htmlHeadings) {
    const cleanH = h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanH) subheadings.push(cleanH);
  }

  const lines = text.split('\n');
  for (const line of lines) {
    const mdMatch = line.match(/^#{2,6}\s+(.+)$/);
    if (mdMatch && mdMatch[1]) {
      const cleanH = mdMatch[1].trim();
      if (cleanH) subheadings.push(cleanH);
    }
  }

  const totalSubheadings = subheadings.length;
  let subheadingsWithEntity = 0;

  if (totalSubheadings > 0) {
    for (const sh of subheadings) {
      const hasEntity = expectedEntities.some((entity) => matchesEntity(sh, entity));
      if (hasEntity) {
        subheadingsWithEntity++;
      }
    }
  }

  const entityRatio = detected.length / expectedEntities.length;
  const headingWeight = totalSubheadings > 0 ? (subheadingsWithEntity / totalSubheadings) * 30 : 0;
  const rawScore = Math.round(entityRatio * 70 + headingWeight);
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    score,
    detected,
    missing,
  };
}

/**
 * Counts syllables in an English word using deterministic linguistic heuristics
 */
export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length === 0) return 0;
  if (clean.length <= 3) return 1;

  let text = clean;

  // Handle common suffixes affecting syllables
  // 1. Silent 'ed' (e.g., 'jumped', 'walked') vs pronounced after 't'/'d' ('wanted', 'needed')
  if (text.endsWith('ed') && text.length > 3) {
    const beforeEd = text[text.length - 3];
    if (beforeEd !== 't' && beforeEd !== 'd') {
      text = text.slice(0, -2);
    }
  }

  // 2. Trailing 'es' (e.g., 'games') vs pronounced after sibilants ('watches', 'boxes', 'dishes')
  if (text.endsWith('es') && text.length > 3) {
    const beforeEs = text.slice(0, -2);
    if (!/(?:[sxz]|ch|sh)$/.test(beforeEs)) {
      text = text.slice(0, -2);
    }
  }

  // 3. Silent 'e' at end (e.g., 'make', 'game'), preserving 'le' after consonant ('table', 'little')
  if (text.endsWith('le') && text.length > 2 && !/[aeiouy]/.test(text[text.length - 3])) {
    // Preserve 'le'
  } else if (text.endsWith('e') && !text.endsWith('ee')) {
    text = text.slice(0, -1);
  }

  // Count contiguous vowel groups [aeiouy]+
  const matches = text.match(/[aeiouy]+/g);
  const count = matches ? matches.length : 0;

  return Math.max(1, count);
}

/**
 * Maps Flesch Reading Ease score to human-readable standard difficulty level
 */
export function getReadingEaseLevel(score: number): string {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

/**
 * 3.4 Cognitive Readability Architecture
 * Calculates Flesch-Kincaid Reading Ease score adapted for edge execution:
 * Reading Ease = 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
 * Detects excessively long sentences (> 28 words).
 */
export function calculateFleschReadingEase(text: string): ReadabilityMetrics {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      level: 'N/A',
      fleschReadingEase: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      hardSentencesCount: 0,
    };
  }

  // Strip HTML tags for clean text analysis
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length === 0) {
    return {
      score: 0,
      level: 'N/A',
      fleschReadingEase: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      hardSentencesCount: 0,
    };
  }

  // Split into sentences using standard punctuation delimiters
  const rawSentences = clean
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(1, rawSentences.length);

  // Extract individual words
  const words = clean
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 0);

  const wordCount = words.length;
  if (wordCount === 0) {
    return {
      score: 0,
      level: 'N/A',
      fleschReadingEase: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      hardSentencesCount: 0,
    };
  }

  // Compute syllables
  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  // Hard sentences: sentences exceeding 28 words
  let hardSentencesCount = 0;
  for (const s of rawSentences) {
    const sWords = s.split(/\s+/).filter((w) => w.length > 0).length;
    if (sWords > 28) {
      hardSentencesCount++;
    }
  }

  const asl = wordCount / sentenceCount;
  const asw = totalSyllables / wordCount;
  const rawScore = 206.835 - 1.015 * asl - 84.6 * asw;
  const score = Number(Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10)).toFixed(1));
  const level = getReadingEaseLevel(score);
  const avgWordsPerSentence = Number((wordCount / sentenceCount).toFixed(1));

  return {
    score,
    level,
    fleschReadingEase: score,
    sentenceCount,
    avgWordsPerSentence,
    hardSentencesCount,
  };
}

/**
 * 5.2 Paid Tier Progressive Enhancement: Cloudflare Workers AI Bridge
 * Generates 384-dimensional dense vector embeddings using @cf/baai/bge-small-en-v1.5.
 * Safely degrades and returns an empty array when env.AI is not available (Free Tier).
 */
export async function getWorkersAiEmbeddings(text: string, env: any): Promise<number[]> {
  if (!env?.AI || !text || text.trim().length === 0) {
    return [];
  }
  try {
    const response = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [text] });
    if (Array.isArray(response?.data?.[0])) {
      return response.data[0];
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    return [];
  } catch {
    return [];
  }
}

