import * as React from 'react';
import type {
  DetailedReadabilityReport,
  SentenceAnalysis,
  SentenceDifficulty,
  SentenceComplexWord,
} from '../types.js';

export interface FilterOptions {
  hardSentences: boolean;
  veryHardSentences: boolean;
  passiveVoice: boolean;
  complexWords: boolean;
}

export interface LiveSentenceHighlighterProps {
  initialContent?: string;
  content?: string;
  onContentChange?: (content: string) => void;
  report?: DetailedReadabilityReport;
  showEditor?: boolean;
  defaultViewMode?: 'split' | 'preview' | 'editor';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Returns CSS color background for sentence difficulty.
 * - 'hard': Yellow (#fef08a)
 * - 'very-hard': Soft Red/Coral (#fecaca)
 */
export function getDifficultyBackgroundColor(difficulty: SentenceDifficulty): string | undefined {
  if (difficulty === 'very-hard') return '#fecaca';
  if (difficulty === 'hard') return '#fef08a';
  return undefined;
}

/**
 * Formats CSS classes and inline style for a sentence segment based on active filters and difficulty.
 */
export function getSentenceHighlightStyle(
  sentence: SentenceAnalysis,
  filters: FilterOptions,
  isFocusMode: boolean = false,
  isSelected: boolean = false
): React.CSSProperties {
  const style: React.CSSProperties = {
    transition: 'all 0.15s ease',
    borderRadius: 3,
    padding: '1px 2px',
    margin: '0 1px',
    cursor: 'pointer',
    display: 'inline',
  };

  const applyHard = filters.hardSentences && sentence.difficulty === 'hard';
  const applyVeryHard = filters.veryHardSentences && sentence.difficulty === 'very-hard';
  const applyPassive = filters.passiveVoice && sentence.isPassive;

  if (applyVeryHard) {
    style.backgroundColor = '#fecaca';
    style.color = '#7f1d1d';
  } else if (applyHard) {
    style.backgroundColor = '#fef08a';
    style.color = '#713f12';
  }

  if (applyPassive) {
    style.textDecoration = 'underline dotted #6366f1';
    style.textDecorationThickness = '2px';
    style.textUnderlineOffset = '3px';
  }

  if (isFocusMode) {
    const hasActiveHighlight = applyHard || applyVeryHard || applyPassive || (filters.complexWords && (sentence.complexWords?.length ?? 0) > 0);
    if (!isSelected && !hasActiveHighlight) {
      style.opacity = 0.35;
    } else if (isSelected) {
      style.outline = '2px solid #3b82f6';
      style.outlineOffset = '1px';
    }
  } else if (isSelected) {
    style.outline = '2px solid #3b82f6';
    style.outlineOffset = '1px';
  }

  return style;
}

/**
 * Maps difficulty to standard human-readable label.
 */
export function getDifficultyLabel(difficulty: SentenceDifficulty): string {
  switch (difficulty) {
    case 'very-hard':
      return 'Very Hard to Read';
    case 'hard':
      return 'Hard to Read';
    default:
      return 'Standard Reading';
  }
}

/**
 * Generates actionable advice/suggestion for a specific sentence.
 */
export function generateSentenceSuggestion(sentence: SentenceAnalysis): string {
  const suggestions: string[] = [];

  if (sentence.difficulty === 'very-hard') {
    suggestions.push(`Split this sentence into 2 or 3 shorter sentences (${sentence.wordCount} words detected, target: < 20).`);
  } else if (sentence.difficulty === 'hard') {
    suggestions.push(`Consider simplifying this sentence (${sentence.wordCount} words detected).`);
  }

  if (sentence.isPassive) {
    const phrases = sentence.passivePhrases?.join(', ');
    suggestions.push(`Passive voice detected${phrases ? ` ("${phrases}")` : ''}. State who or what is performing the action.`);
  }

  if (sentence.complexWords && sentence.complexWords.length > 0) {
    const list = sentence.complexWords
      .map((cw) => `${cw.word}${cw.alternative ? ` → "${cw.alternative}"` : ''}`)
      .join(', ');
    suggestions.push(`Simplify complex word(s): ${list}.`);
  }

  if (sentence.consecutiveStarterWarning && sentence.starterWord) {
    suggestions.push(`Vary sentence openers: several consecutive sentences begin with "${sentence.starterWord}".`);
  }

  if (suggestions.length === 0) {
    return 'Great job! This sentence is clear, active, and easy to read.';
  }

  return suggestions.join(' ');
}

/**
 * Tokenizes sentence text to wrap complex words in interactive spans.
 */
export function tokenizeSentence(
  sentenceText: string,
  complexWords: SentenceComplexWord[] | undefined,
  highlightComplex: boolean,
  onHoverComplex?: (word: SentenceComplexWord | null) => void
): React.ReactNode[] {
  if (!highlightComplex || !complexWords || complexWords.length === 0) {
    return [sentenceText];
  }

  const escapedWords = complexWords
    .map((cw) => cw.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean);

  if (escapedWords.length === 0) {
    return [sentenceText];
  }

  const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sentenceText)) !== null) {
    const matchIndex = match.index;
    const matchedWord = match[0];

    if (matchIndex > lastIndex) {
      parts.push(sentenceText.slice(lastIndex, matchIndex));
    }

    const matchedInfo = complexWords.find(
      (cw) => cw.word.toLowerCase() === matchedWord.toLowerCase()
    );

    parts.push(
      React.createElement(
        'span',
        {
          key: `cw-${matchIndex}`,
          title: matchedInfo?.alternative
            ? `Complex word: "${matchedWord}". Simpler: "${matchedInfo.alternative}"`
            : `Complex word: "${matchedWord}"`,
          onMouseEnter: () => onHoverComplex?.(matchedInfo ?? null),
          onMouseLeave: () => onHoverComplex?.(null),
          style: {
            textDecoration: 'underline wavy #06b6d4',
            textDecorationThickness: '2px',
            textUnderlineOffset: '3px',
            color: '#0e7490',
            fontWeight: 500,
            cursor: 'help',
          },
        },
        matchedWord
      )
    );

    lastIndex = matchIndex + matchedWord.length;
  }

  if (lastIndex < sentenceText.length) {
    parts.push(sentenceText.slice(lastIndex));
  }

  return parts;
}
