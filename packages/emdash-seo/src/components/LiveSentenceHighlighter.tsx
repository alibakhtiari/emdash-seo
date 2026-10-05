import * as React from 'react';
import type {
  DetailedReadabilityReport,
  SentenceAnalysis,
  SentenceDifficulty,
  SentenceComplexWord,
} from '../types.js';
import {
  auditReadability,
} from '../engine/readability-auditor.js';

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

  // Create a regex matching all complex words for this sentence
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
      <span
        key={`cw-${matchIndex}`}
        title={
          matchedInfo?.alternative
            ? `Complex word: "${matchedWord}". Simpler: "${matchedInfo.alternative}"`
            : `Complex word: "${matchedWord}"`
        }
        onMouseEnter={() => onHoverComplex?.(matchedInfo ?? null)}
        onMouseLeave={() => onHoverComplex?.(null)}
        style={{
          textDecoration: 'underline wavy #06b6d4',
          textDecorationThickness: '2px',
          textUnderlineOffset: '3px',
          color: '#0e7490',
          fontWeight: 500,
          cursor: 'help',
        }}
      >
        {matchedWord}
      </span>
    );

    lastIndex = matchIndex + matchedWord.length;
  }

  if (lastIndex < sentenceText.length) {
    parts.push(sentenceText.slice(lastIndex));
  }

  return parts;
}

/**
 * Interactive Live Sentence Highlighter component with Hemingway-style color highlighting,
 * dual-mode debounced textarea, filter toggles, focus mode, and live readability stat pills.
 */
export function LiveSentenceHighlighter({
  initialContent = '',
  content: controlledContent,
  onContentChange,
  report: controlledReport,
  showEditor = true,
  defaultViewMode = 'split',
  className = '',
  style,
}: LiveSentenceHighlighterProps) {
  const isControlled = controlledContent !== undefined;
  const [localText, setLocalText] = React.useState(controlledContent ?? initialContent);
  const [debouncedText, setDebouncedText] = React.useState(localText);
  const [viewMode, setViewMode] = React.useState<'split' | 'preview' | 'editor'>(defaultViewMode);

  // Filters state
  const [focusMode, setFocusMode] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterOptions>({
    hardSentences: true,
    veryHardSentences: true,
    passiveVoice: true,
    complexWords: true,
  });

  const [selectedSentenceIndex, setSelectedSentenceIndex] = React.useState<number | null>(null);
  const [hoveredSentenceIndex, setHoveredSentenceIndex] = React.useState<number | null>(null);
  const [hoveredComplexWord, setHoveredComplexWord] = React.useState<SentenceComplexWord | null>(null);

  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize localText when controlledContent changes externally
  React.useEffect(() => {
    if (isControlled && controlledContent !== localText) {
      setLocalText(controlledContent);
      setDebouncedText(controlledContent);
    }
  }, [controlledContent, isControlled]);

  // Handle typing with 150ms debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setLocalText(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedText(nextVal);
      if (onContentChange) {
        onContentChange(nextVal);
      }
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Compute readability report from debounced text or use controlledReport
  const report: DetailedReadabilityReport = React.useMemo(() => {
    if (controlledReport && controlledContent === debouncedText) {
      return controlledReport;
    }
    return auditReadability(debouncedText);
  }, [debouncedText, controlledReport, controlledContent]);

  const activeSentenceIndex = hoveredSentenceIndex ?? selectedSentenceIndex;
  const activeSentence: SentenceAnalysis | undefined =
    activeSentenceIndex !== null ? report.sentences[activeSentenceIndex] : undefined;

  const toggleAllHighlights = () => {
    if (focusMode) {
      setFocusMode(false);
      setFilters({
        hardSentences: true,
        veryHardSentences: true,
        passiveVoice: true,
        complexWords: true,
      });
    } else {
      setFocusMode(true);
    }
  };

  const handleFilterToggle = (key: keyof FilterOptions) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Grade badge styling
  const gradeColor =
    report.gradeLevel <= 8 ? '#15803d' : report.gradeLevel <= 11 ? '#a16207' : '#b91c1c';
  const gradeBg =
    report.gradeLevel <= 8 ? '#dcfce7' : report.gradeLevel <= 11 ? '#fef9c3' : '#fee2e2';

  // Ease score styling
  const easeColor =
    report.readingEase >= 60 ? 'var(--text-color-kumo-success, #34d399)' : report.readingEase >= 50 ? 'var(--text-color-kumo-warning, #fbbf24)' : 'var(--text-color-kumo-danger, #f87171)';
  const easeBg =
    report.readingEase >= 60 ? 'var(--color-kumo-success-tint, rgba(16, 185, 129, 0.15))' : report.readingEase >= 50 ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.15))' : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.15))';

  return (
    <div
      className={className}
      style={{
        fontFamily: 'inherit',
        background: 'var(--color-kumo-base, #181818)',
        borderRadius: 8,
        border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
        color: 'var(--text-color-kumo-default, #ededed)',
        padding: '1.25rem',
        boxShadow: 'var(--color-kumo-shadow-drop, 0 1px 3px rgba(0,0,0,0.2))',
        ...style,
      }}
    >
      {/* Top Header & Readability Stat Badges */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            Live Hemingway Readability Analyzer
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
            Real-time sentence rhythm, cognitive load, and passive voice auditing (debounced 150ms).
          </span>
        </div>

        {/* View Mode Switcher */}
        {showEditor && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-kumo-recessed, #141414)', padding: 3, borderRadius: 6, border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))' }}>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              style={{
                border: 'none',
                background: viewMode === 'split' ? 'var(--color-kumo-contrast, #ffffff)' : 'transparent',
                color: viewMode === 'split' ? 'var(--color-kumo-canvas, #000000)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
                fontWeight: viewMode === 'split' ? 600 : 400,
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              style={{
                border: 'none',
                background: viewMode === 'editor' ? 'var(--color-kumo-contrast, #ffffff)' : 'transparent',
                color: viewMode === 'editor' ? 'var(--color-kumo-canvas, #000000)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
                fontWeight: viewMode === 'editor' ? 600 : 400,
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Editor Only
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              style={{
                border: 'none',
                background: viewMode === 'preview' ? 'var(--color-kumo-contrast, #ffffff)' : 'transparent',
                color: viewMode === 'preview' ? 'var(--color-kumo-canvas, #000000)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
                fontWeight: viewMode === 'preview' ? 600 : 400,
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Highlights Only
            </button>
          </div>
        )}
      </div>

      {/* Readability Gauge & Stat Pills Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          marginBottom: '1.25rem',
          padding: '0.75rem 1rem',
          background: 'var(--color-kumo-recessed, #141414)',
          borderRadius: 8,
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.08))',
        }}
      >
        {/* Flesch Reading Ease Badge */}
        <div
          title="Flesch Reading Ease: 0 (hardest) to 100 (easiest). Standard web target: 60+."
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: easeBg,
            color: easeColor,
            padding: '4px 10px',
            borderRadius: 16,
            fontSize: '0.8125rem',
            fontWeight: 700,
            border: '1px solid currentColor',
          }}
        >
          <span>Ease: {report.readingEase}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>({report.readingEaseLevel})</span>
        </div>

        {/* Grade Level Badge */}
        <div
          title="Flesch-Kincaid Grade Level: Represents US school grade. Grade 7-8 is ideal for mass digital audiences."
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: gradeBg,
            color: gradeColor,
            padding: '4px 10px',
            borderRadius: 16,
            fontSize: '0.8125rem',
            fontWeight: 700,
            border: '1px solid currentColor',
          }}
        >
          <span>Grade: {report.gradeLevel}</span>
        </div>

        {/* Passive Voice Pill */}
        <div
          title="Passive Voice percentage: Target < 10% for strong, direct web copywriting."
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: report.passiveVoicePercentage > 10 ? 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.15))' : 'var(--color-kumo-tint, #262626)',
            color: report.passiveVoicePercentage > 10 ? 'var(--text-color-kumo-danger, #f87171)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            padding: '4px 10px',
            borderRadius: 16,
            fontSize: '0.8125rem',
            fontWeight: 600,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
          }}
        >
          <span>{report.passiveVoicePercentage}% Passive</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>({report.passiveVoiceCount} of {report.sentenceCount})</span>
        </div>

        {/* Transition Words Pill */}
        <div
          title="Transition Words percentage: Connectors like 'however', 'furthermore', 'because'. Target >= 30%."
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: report.transitionPercentage >= 30 ? 'var(--color-kumo-success-tint, rgba(16, 185, 129, 0.15))' : 'var(--color-kumo-tint, #262626)',
            color: report.transitionPercentage >= 30 ? 'var(--text-color-kumo-success, #34d399)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            padding: '4px 10px',
            borderRadius: 16,
            fontSize: '0.8125rem',
            fontWeight: 600,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
          }}
        >
          <span>{report.transitionPercentage}% Transitions</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>({report.transitionWordsCount})</span>
        </div>

        {/* Total Words & Sentence Count */}
        <div style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
          <strong style={{ color: 'var(--text-color-kumo-strong, #ffffff)' }}>{report.wordCount}</strong> words · <strong style={{ color: 'var(--text-color-kumo-strong, #ffffff)' }}>{report.sentenceCount}</strong> sentences
        </div>
      </div>

      {/* Filter Toggles & Focus Mode Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          padding: '0.625rem 0.75rem',
          background: 'var(--color-kumo-recessed, #141414)',
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.08))',
          borderRadius: 6,
          marginBottom: '1rem',
          fontSize: '0.8125rem',
        }}
      >
        <button
          type="button"
          onClick={toggleAllHighlights}
          style={{
            background: focusMode ? 'var(--color-kumo-brand, #f6821f)' : 'var(--color-kumo-tint, #262626)',
            color: focusMode ? '#ffffff' : 'var(--text-color-kumo-default, #ededed)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.12))',
            borderRadius: 4,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {focusMode ? '🎯 Focus Mode (On)' : '👁️ All Highlights'}
        </button>

        <span style={{ color: 'var(--color-kumo-line, rgba(255, 255, 255, 0.2))' }}>|</span>

        {/* Hard Sentences Checkbox */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-color-kumo-default, #ededed)' }}>
          <input
            type="checkbox"
            checked={filters.hardSentences}
            onChange={() => handleFilterToggle('hardSentences')}
          />
          <span
            style={{
              background: '#fef08a',
              color: '#854d0e',
              padding: '1px 6px',
              borderRadius: 3,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            Hard ({report.hardSentencesCount})
          </span>
        </label>

        {/* Very Hard Sentences Checkbox */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-color-kumo-default, #ededed)' }}>
          <input
            type="checkbox"
            checked={filters.veryHardSentences}
            onChange={() => handleFilterToggle('veryHardSentences')}
          />
          <span
            style={{
              background: '#fecaca',
              color: '#991b1b',
              padding: '1px 6px',
              borderRadius: 3,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            Very Hard ({report.veryHardSentencesCount})
          </span>
        </label>

        {/* Passive Voice Checkbox */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-color-kumo-default, #ededed)' }}>
          <input
            type="checkbox"
            checked={filters.passiveVoice}
            onChange={() => handleFilterToggle('passiveVoice')}
          />
          <span
            style={{
              textDecoration: 'underline dotted #6366f1',
              textDecorationThickness: '2px',
              color: 'var(--text-color-kumo-info, #818cf8)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            Passive Voice ({report.passiveVoiceCount})
          </span>
        </label>

        {/* Complex Words Checkbox */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-color-kumo-default, #ededed)' }}>
          <input
            type="checkbox"
            checked={filters.complexWords}
            onChange={() => handleFilterToggle('complexWords')}
          />
          <span
            style={{
              textDecoration: 'underline wavy #06b6d4',
              textDecorationThickness: '2px',
              color: '#38bdf8',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            Complex Words ({report.complexWordsCount})
          </span>
        </label>
      </div>

      {/* Main Content Workspace: Editor & Live Highlighted Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            viewMode === 'split' ? '1fr 1fr' : '1fr',
          gap: 16,
          minHeight: 260,
        }}
      >
        {/* Editable Mode Textarea */}
        {showEditor && (viewMode === 'split' || viewMode === 'editor') && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-color-kumo-subtle, #a0a0a0)',
                marginBottom: 6,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>DRAFT CONTENT (TYPE TO AUDIT)</span>
              <span>150ms debounce</span>
            </div>
            <textarea
              value={localText}
              onChange={handleTextChange}
              placeholder="Paste or write draft article content here. The sentence highlighter will analyze readability in real time..."
              rows={12}
              style={{
                width: '100%',
                flex: 1,
                minHeight: 260,
                padding: '0.875rem',
                borderRadius: 6,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
                background: 'var(--color-kumo-control, var(--color-kumo-recessed, #141414))',
                color: 'var(--text-color-kumo-default, #ededed)',
                fontSize: '0.9375rem',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Hemingway Highlighted Preview Container */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-color-kumo-subtle, #a0a0a0)',
                marginBottom: 6,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>LIVE HIGHLIGHTED PREVIEW</span>
              <span>Click sentence for suggestions</span>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 260,
                padding: '0.875rem',
                borderRadius: 6,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
                background: 'var(--color-kumo-recessed, #141414)',
                color: 'var(--text-color-kumo-default, #ededed)',
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            >
              {report.sentences.length === 0 ? (
                <div style={{ color: 'var(--text-color-kumo-placeholder, #666)', fontStyle: 'italic', padding: '1rem 0' }}>
                  No sentences detected yet. Start typing to see live Hemingway-style highlights!
                </div>
              ) : (
                report.sentences.map((sent, index) => {
                  const isSelected = selectedSentenceIndex === index;
                  const sentenceStyle = getSentenceHighlightStyle(
                    sent,
                    filters,
                    focusMode,
                    isSelected
                  );

                  return (
                    <span
                      key={`sentence-${sent.startIndex}-${index}`}
                      onClick={() => setSelectedSentenceIndex(index === selectedSentenceIndex ? null : index)}
                      onMouseEnter={() => setHoveredSentenceIndex(index)}
                      onMouseLeave={() => setHoveredSentenceIndex(null)}
                      style={sentenceStyle}
                    >
                      {tokenizeSentence(
                        sent.text,
                        sent.complexWords,
                        filters.complexWords,
                        setHoveredComplexWord
                      )}
                      {' '}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Sentence Inspector Card / Tooltip Display */}
      {activeSentence && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.875rem 1rem',
            background: 'var(--color-kumo-elevated, #202020)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            borderRadius: 6,
            fontSize: '0.8125rem',
            color: 'var(--text-color-kumo-default, #ededed)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
              Sentence Inspector · #{activeSentenceIndex! + 1}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: activeSentence.difficulty === 'very-hard' ? 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.2))' : activeSentence.difficulty === 'hard' ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.2))' : 'var(--color-kumo-success-tint, rgba(16, 185, 129, 0.2))',
                  color: activeSentence.difficulty === 'very-hard' ? 'var(--text-color-kumo-danger, #f87171)' : activeSentence.difficulty === 'hard' ? 'var(--text-color-kumo-warning, #fbbf24)' : 'var(--text-color-kumo-success, #34d399)',
                }}
              >
                {getDifficultyLabel(activeSentence.difficulty)} ({activeSentence.wordCount} words)
              </span>

              {activeSentence.isPassive && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'var(--color-kumo-info-tint, rgba(99, 102, 241, 0.2))',
                    color: 'var(--text-color-kumo-info, #818cf8)',
                  }}
                >
                  Passive Voice
                </span>
              )}
            </div>
          </div>

          <div style={{ fontStyle: 'italic', color: 'var(--text-color-kumo-default, #ededed)', marginBottom: 8, padding: '6px 10px', background: 'var(--color-kumo-recessed, #141414)', borderRadius: 4, border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.08))' }}>
            "{activeSentence.text}"
          </div>

          <div style={{ color: 'var(--text-color-kumo-default, #ededed)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--color-kumo-brand, #f6821f)' }}>💡 Suggestion: </strong>
            {generateSentenceSuggestion(activeSentence)}
          </div>

          {hoveredComplexWord && (
            <div style={{ marginTop: 6, padding: '4px 8px', background: 'var(--color-kumo-info-tint, rgba(6, 182, 212, 0.15))', borderRadius: 4, color: '#38bdf8', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <strong>Complex Word: </strong>"{hoveredComplexWord.word}" ({hoveredComplexWord.syllables} syllables)
              {hoveredComplexWord.alternative && (
                <span> — Try replacing with: <strong style={{ color: '#ffffff' }}>"{hoveredComplexWord.alternative}"</strong></span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LiveSentenceHighlighter;
