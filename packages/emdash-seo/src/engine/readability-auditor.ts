/**
 * Cognitive Readability Linter & Engine for @emdash/plugin-seo
 * Pure TypeScript, zero external dependencies, Cloudflare Workers Free Tier compatible (< 2ms CPU).
 * Implements precise sentence segmentation with character offset preservation,
 * Flesch Reading Ease, Flesch-Kincaid Grade Level, passive voice detection,
 * transition phrase recognition (~100 items), complex word simplification,
 * consecutive sentence starter detection, paragraph/section length checks.
 */

import type {
  SentenceAnalysis,
  DetailedReadabilityReport,
  SentenceDifficulty,
  ComplexWordMetric,
  ConsecutiveSentenceStarter,
} from '../types.js';
import { countSyllables, getReadingEaseLevel } from './semantic-analyzer.js';

import {
  ABBREVIATIONS_NO_TERMINATE,
  IRREGULAR_PAST_PARTICIPLES,
  NON_PARTICIPLES_ENDING_IN_ED,
  TRANSITION_WORDS,
  COMPLEX_WORD_ALTERNATIVES,
} from './readability-dictionaries.js';

export {
  ABBREVIATIONS_NO_TERMINATE,
  IRREGULAR_PAST_PARTICIPLES,
  NON_PARTICIPLES_ENDING_IN_ED,
  TRANSITION_WORDS,
  COMPLEX_WORD_ALTERNATIVES,
};

/**
 * Escapes regex special characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tests whether a word token is a past participle.
 */
function isPastParticiple(word: string): boolean {
  const lower = word.toLowerCase();
  if (IRREGULAR_PAST_PARTICIPLES.has(lower)) {
    return true;
  }
  if (lower.endsWith('ed') && lower.length > 3 && !NON_PARTICIPLES_ENDING_IN_ED.has(lower)) {
    return true;
  }
  return false;
}

/**
 * Extracts raw sentences with exact startIndex and endIndex offsets in original text.
 * Correctly preserves offsets even when abbreviations containing periods are present.
 */
export function segmentSentences(text: string): { text: string; startIndex: number; endIndex: number }[] {
  const sentences: { text: string; startIndex: number; endIndex: number }[] = [];
  if (!text || text.trim().length === 0) {
    return sentences;
  }

  // Mask HTML tags with spaces of identical length so character offsets are strictly preserved
  const masked = text.replace(/<[^>]*>/g, (tag) => ' '.repeat(tag.length));
  const len = masked.length;
  let i = 0;

  while (i < len) {
    // Skip leading whitespace
    while (i < len && /\s/.test(masked[i])) {
      i++;
    }
    if (i >= len) break;

    const sentenceStart = i;
    let sentenceEnd = -1;

    while (i < len) {
      const ch = masked[i];

      // Check for paragraph break (two consecutive newlines)
      if (ch === '\n') {
        const remaining = masked.slice(i);
        const doubleNewlineMatch = remaining.match(/^\n\s*\n/);
        if (doubleNewlineMatch) {
          sentenceEnd = i;
          i += doubleNewlineMatch[0].length;
          break;
        }
      }

      // Check for terminal punctuation: ! or ?
      if (ch === '!' || ch === '?') {
        let punctEnd = i + 1;
        while (punctEnd < len && (masked[punctEnd] === '!' || masked[punctEnd] === '?')) {
          punctEnd++;
        }
        while (punctEnd < len && /["'”’)\]]/.test(masked[punctEnd])) {
          punctEnd++;
        }
        if (punctEnd >= len || /\s/.test(masked[punctEnd])) {
          sentenceEnd = punctEnd;
          i = punctEnd;
          break;
        }
        i = punctEnd;
        continue;
      }

      // Check for period: .
      if (ch === '.') {
        // Decimal numbers (e.g. 3.14)
        if (i > 0 && /\d/.test(masked[i - 1]) && i + 1 < len && /\d/.test(masked[i + 1])) {
          i++;
          continue;
        }

        // Ellipsis (e.g. ... or ..)
        if (i + 1 < len && masked[i + 1] === '.') {
          let dotEnd = i + 1;
          while (dotEnd < len && masked[dotEnd] === '.') {
            dotEnd++;
          }
          while (dotEnd < len && /["'”’)\]]/.test(masked[dotEnd])) {
            dotEnd++;
          }
          if (dotEnd >= len || (/\s/.test(masked[dotEnd]) && dotEnd + 1 < len && /[A-Z]/.test(masked[dotEnd + 1]))) {
            sentenceEnd = dotEnd;
            i = dotEnd;
            break;
          }
          i = dotEnd;
          continue;
        }

        // Check if preceded by an abbreviation
        const sliceBefore = masked.slice(sentenceStart, i);
        const lastWordMatch = sliceBefore.match(/([a-zA-Z]+(?:\.[a-zA-Z]+)*)$/);
        const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase() : '';

        // Single letter initial (e.g. "J. K." or "A.")
        const isSingleInitial = /^[a-zA-Z]$/.test(lastWord);
        // Multi-part abbreviation like "u.s" or "e.g"
        const isAbbrev = ABBREVIATIONS_NO_TERMINATE.has(lastWord) || isSingleInitial;

        if (isAbbrev) {
          // If followed immediately by double newline, allow sentence break
          if (i + 1 < len && /^\s*\n\s*\n/.test(masked.slice(i + 1))) {
            let punctEnd = i + 1;
            while (punctEnd < len && /["'”’)\]]/.test(masked[punctEnd])) {
              punctEnd++;
            }
            sentenceEnd = punctEnd;
            i = punctEnd;
            break;
          }
          i++;
          continue;
        }

        // Potential sentence boundary
        let punctEnd = i + 1;
        while (punctEnd < len && /["'”’)\]]/.test(masked[punctEnd])) {
          punctEnd++;
        }

        if (punctEnd >= len || /\s/.test(masked[punctEnd])) {
          sentenceEnd = punctEnd;
          i = punctEnd;
          break;
        }
      }

      i++;
    }

    if (sentenceEnd === -1) {
      sentenceEnd = i;
    }

    // Trim trailing whitespace from the sentence boundary
    while (sentenceEnd > sentenceStart && /\s/.test(text[sentenceEnd - 1])) {
      sentenceEnd--;
    }

    if (sentenceEnd > sentenceStart) {
      const sentenceText = text.slice(sentenceStart, sentenceEnd);
      sentences.push({
        text: sentenceText,
        startIndex: sentenceStart,
        endIndex: sentenceEnd,
      });
    }
  }

  return sentences;
}

/**
 * Passive voice detector
 * Flags auxiliary forms of 'to be' + optional adverb(s) + past participle.
 */
function detectPassiveVoice(text: string): { isPassive: boolean; phrases: string[] } {
  const passivePhrases: string[] = [];

  // Auxiliary forms of 'to be' (including contractions)
  const auxRegex = /\b(am|is|are|was|were|be|been|being|'m|'s|'re)\s+((?:[a-zA-Z]+ly|not|never|also|already|always|often|currently|widely|properly|well|thoroughly)\s+)*([a-zA-Z]+)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = auxRegex.exec(text)) !== null) {
    const fullPhrase = match[0];
    const candidateParticiple = match[3];

    if (isPastParticiple(candidateParticiple)) {
      passivePhrases.push(fullPhrase.trim());
    }
  }

  return {
    isPassive: passivePhrases.length > 0,
    phrases: passivePhrases,
  };
}

/**
 * Pre-compiled regular expressions for transition words and phrases.
 * Sorted by phrase word-length descending so multi-word phrases match first.
 */
const SORTED_TRANSITIONS = [...TRANSITION_WORDS].sort((a, b) => b.length - a.length);
const TRANSITION_PATTERNS = SORTED_TRANSITIONS.map((phrase) => ({
  phrase,
  regex: new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(phrase)}(?=[^\\p{L}\\p{N}]|$)`, 'iu'),
}));

/**
 * Transition words detector
 */
function detectTransitions(text: string): { hasTransition: boolean; words: string[] } {
  const matched: string[] = [];
  const textLower = text.toLowerCase();

  for (const { phrase, regex } of TRANSITION_PATTERNS) {
    if (regex.test(textLower)) {
      matched.push(phrase);
    }
  }

  return {
    hasTransition: matched.length > 0,
    words: matched,
  };
}

/**
 * Complex words detector (>= 3 syllables) with plain language alternatives.
 */
function detectComplexWords(words: string[]): {
  sentenceComplex: { word: string; syllables: number; alternative?: string }[];
} {
  const sentenceComplex: { word: string; syllables: number; alternative?: string }[] = [];

  for (const w of words) {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.length < 3) continue;

    const syllables = countSyllables(clean);
    const alt = COMPLEX_WORD_ALTERNATIVES[clean];
    if (syllables >= 3 || alt) {
      sentenceComplex.push({
        word: w,
        syllables,
        ...(alt ? { alternative: alt } : {}),
      });
    }
  }

  return { sentenceComplex };
}

/**
 * Paragraph length checker (> 150 words)
 */
function checkParagraphLengths(text: string): { longCount: number; issues: string[] } {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  let longCount = 0;
  const issues: string[] = [];

  for (let idx = 0; idx < paragraphs.length; idx++) {
    const pClean = paragraphs[idx].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const pWords = pClean.split(/\s+/).filter(Boolean);
    if (pWords.length > 150) {
      longCount++;
      issues.push(`Paragraph ${idx + 1} contains ${pWords.length} words (recommended max: 150 words).`);
    }
  }

  return { longCount, issues };
}

/**
 * Long sections check (> 300 words without a heading)
 */
function checkSectionLengths(text: string): { longCount: number; issues: string[] } {
  // Split on HTML headings <h1>-<h6> or Markdown ##+
  const sectionSplit = text.split(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|^#{1,6}\s+.+$/gim);
  let longCount = 0;
  const issues: string[] = [];

  for (let idx = 0; idx < sectionSplit.length; idx++) {
    const sClean = sectionSplit[idx].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const sWords = sClean.split(/\s+/).filter(Boolean);
    if (sWords.length > 300) {
      longCount++;
      issues.push(`Section contains ${sWords.length} words without a subheading (recommended max: 300 words).`);
    }
  }

  return { longCount, issues };
}

/**
 * Implements comprehensive readability auditing:
 * - Flesch Reading Ease score (0-100) & Flesch-Kincaid Grade Level
 * - Categorizes sentences: 'normal' (<= 20 words), 'hard' (21-28 words or > 2.0 syl/w), 'very-hard' (> 28 words)
 * - Passive voice detector (auxiliary + optional adverb + past participle)
 * - Transition words detector (~100 common phrases)
 * - Complex words detector (>= 3 syllables) with simpler alternatives
 * - Consecutive sentence starters check (flags 3+ consecutive sentences starting with the same word)
 * - Paragraph length check (> 150 words) and long sections check (> 300 words)
 * - Preserves exact character offsets in original text
 */
export function auditReadability(text: string): DetailedReadabilityReport {
  if (!text || text.trim().length === 0) {
    return {
      score: 100,
      readingEase: 100,
      gradeLevel: 0,
      readingEaseLevel: 'Very Easy',
      sentenceCount: 0,
      wordCount: 0,
      hardSentencesCount: 0,
      veryHardSentencesCount: 0,
      hardSentencesPercentage: 0,
      passiveVoiceCount: 0,
      passiveVoicePercentage: 0,
      transitionWordsCount: 0,
      transitionPercentage: 0,
      complexWordsCount: 0,
      complexWords: [],
      consecutiveSentenceStarters: [],
      longParagraphsCount: 0,
      longSectionsCount: 0,
      sentences: [],
      issues: [],
    };
  }

  const rawSentences = segmentSentences(text);
  const sentenceAnalyses: SentenceAnalysis[] = [];

  let totalWords = 0;
  let totalSyllables = 0;
  let hardCount = 0;
  let veryHardCount = 0;
  let passiveSentenceCount = 0;
  let transitionSentenceCount = 0;

  const complexWordMap = new Map<string, { count: number; syllables: number; alternative?: string }>();

  for (const raw of rawSentences) {
    // Strip HTML tags for clean word parsing
    const cleanSentence = raw.text.replace(/<[^>]*>/g, ' ').trim();
    const words = cleanSentence
      .replace(/[^\p{L}\p{N}'-]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/^[-']+|[-']+$/g, ''))
      .filter((w) => w.length > 0);

    const wordCount = words.length;
    let sentenceSyllables = 0;
    for (const w of words) {
      sentenceSyllables += countSyllables(w);
    }

    const avgSyllablesPerWord = wordCount > 0 ? Number((sentenceSyllables / wordCount).toFixed(2)) : 0;
    totalWords += wordCount;
    totalSyllables += sentenceSyllables;

    // Difficulty categorization
    let difficulty: SentenceDifficulty = 'normal';
    if (wordCount > 28) {
      difficulty = 'very-hard';
      veryHardCount++;
    } else if (wordCount > 20 || avgSyllablesPerWord > 2.0) {
      difficulty = 'hard';
      hardCount++;
    }

    // Passive voice detection
    const passiveResult = detectPassiveVoice(cleanSentence);
    if (passiveResult.isPassive) {
      passiveSentenceCount++;
    }

    // Transition detection
    const transResult = detectTransitions(cleanSentence);
    if (transResult.hasTransition) {
      transitionSentenceCount++;
    }

    // Complex words detection
    const { sentenceComplex } = detectComplexWords(words);
    for (const item of sentenceComplex) {
      const lower = item.word.toLowerCase();
      const existing = complexWordMap.get(lower);
      if (existing) {
        existing.count++;
      } else {
        complexWordMap.set(lower, {
          count: 1,
          syllables: item.syllables,
          alternative: item.alternative,
        });
      }
    }

    // Starter word (first word)
    const starterWord = words.length > 0 ? words[0].toLowerCase() : undefined;

    sentenceAnalyses.push({
      text: raw.text,
      startIndex: raw.startIndex,
      endIndex: raw.endIndex,
      wordCount,
      syllableCount: sentenceSyllables,
      avgSyllablesPerWord,
      difficulty,
      isPassive: passiveResult.isPassive,
      passivePhrases: passiveResult.phrases.length > 0 ? passiveResult.phrases : undefined,
      hasTransition: transResult.hasTransition,
      transitionWords: transResult.words.length > 0 ? transResult.words : undefined,
      complexWords: sentenceComplex.length > 0 ? sentenceComplex : undefined,
      starterWord,
    });
  }

  // Consecutive sentence starter detection (3 or more consecutive sentences starting with the same word)
  const consecutiveStarters: ConsecutiveSentenceStarter[] = [];
  let i = 0;
  while (i < sentenceAnalyses.length) {
    const currentStarter = sentenceAnalyses[i].starterWord;
    if (!currentStarter) {
      i++;
      continue;
    }

    let j = i + 1;
    while (j < sentenceAnalyses.length && sentenceAnalyses[j].starterWord === currentStarter) {
      j++;
    }

    const streak = j - i;
    if (streak >= 3) {
      const indices: number[] = [];
      for (let k = i; k < j; k++) {
        indices.push(k);
        sentenceAnalyses[k].consecutiveStarterWarning = true;
      }
      consecutiveStarters.push({
        word: currentStarter,
        count: streak,
        sentenceIndices: indices,
      });
      i = j;
    } else {
      i++;
    }
  }

  // Aggregate metrics
  const sentenceCount = sentenceAnalyses.length;
  const asl = sentenceCount > 0 ? totalWords / sentenceCount : 0;
  const asw = totalWords > 0 ? totalSyllables / totalWords : 0;

  // Flesch Reading Ease = 206.835 - 1.015 * ASL - 84.6 * ASW
  const rawEase = sentenceCount > 0 && totalWords > 0 ? 206.835 - 1.015 * asl - 84.6 * asw : 100;
  const readingEase = Number(Math.max(0, Math.min(100, Math.round(rawEase * 10) / 10)).toFixed(1));
  const readingEaseLevel = getReadingEaseLevel(readingEase);

  // Flesch-Kincaid Grade Level = 0.39 * ASL + 11.8 * ASW - 15.59
  const rawGrade = sentenceCount > 0 && totalWords > 0 ? 0.39 * asl + 11.8 * asw - 15.59 : 0;
  const gradeLevel = Number(Math.max(0, Math.round(rawGrade * 10) / 10).toFixed(1));

  const hardSentencesPercentage =
    sentenceCount > 0 ? Number((((hardCount + veryHardCount) / sentenceCount) * 100).toFixed(1)) : 0;
  const passiveVoicePercentage =
    sentenceCount > 0 ? Number(((passiveSentenceCount / sentenceCount) * 100).toFixed(1)) : 0;
  const transitionPercentage =
    sentenceCount > 0 ? Number(((transitionSentenceCount / sentenceCount) * 100).toFixed(1)) : 0;

  // Paragraph & section length checks
  const { longCount: longParagraphsCount, issues: paraIssues } = checkParagraphLengths(text);
  const { longCount: longSectionsCount, issues: secIssues } = checkSectionLengths(text);

  // Complex words list
  const complexWords: ComplexWordMetric[] = Array.from(complexWordMap.entries())
    .map(([word, data]) => ({
      word,
      count: data.count,
      syllables: data.syllables,
      alternative: data.alternative,
    }))
    .sort((a, b) => b.count - a.count);

  const complexWordsCount = complexWords.reduce((acc, cw) => acc + cw.count, 0);

  // Consolidated issues/recommendations
  const issues: string[] = [];
  if (readingEase < 60) {
    issues.push(`Reading ease score is low (${readingEase}/100 - ${readingEaseLevel}). Aim for 60+ for standard web readability.`);
  }
  if (hardSentencesPercentage > 25) {
    issues.push(`${hardSentencesPercentage}% of sentences are hard or very hard to read (recommended: < 25%).`);
  }
  if (passiveVoicePercentage > 10) {
    issues.push(`${passiveVoicePercentage}% of sentences use passive voice (recommended: < 10%).`);
  }
  if (transitionPercentage < 30) {
    issues.push(`Only ${transitionPercentage}% of sentences contain transition words (recommended: >= 30%).`);
  }
  if (consecutiveStarters.length > 0) {
    for (const cs of consecutiveStarters) {
      issues.push(`Detected ${cs.count} consecutive sentences starting with "${cs.word}". Vary your sentence openers.`);
    }
  }
  issues.push(...paraIssues);
  issues.push(...secIssues);

  return {
    score: readingEase,
    readingEase,
    gradeLevel,
    readingEaseLevel,
    sentenceCount,
    wordCount: totalWords,
    hardSentencesCount: hardCount,
    veryHardSentencesCount: veryHardCount,
    hardSentencesPercentage,
    passiveVoiceCount: passiveSentenceCount,
    passiveVoicePercentage,
    transitionWordsCount: transitionSentenceCount,
    transitionPercentage,
    complexWordsCount,
    complexWords,
    consecutiveSentenceStarters: consecutiveStarters,
    longParagraphsCount,
    longSectionsCount,
    sentences: sentenceAnalyses,
    issues,
  };
}
