import * as React from 'react';
import type {
  DetailedReadabilityReport,
  SentenceAnalysis,
  SentenceComplexWord,
} from '../types.js';
import { auditReadability } from '../engine/readability-auditor.js';
import {
  type FilterOptions,
  type LiveSentenceHighlighterProps,
  getDifficultyBackgroundColor,
  getSentenceHighlightStyle,
  getDifficultyLabel,
  generateSentenceSuggestion,
  tokenizeSentence,
} from './highlighter-utils.js';
import { SentenceDetailCard } from './SentenceDetailCard.js';
import { ReadabilityMetricsBar } from './ReadabilityMetricsBar.js';

export {
  type FilterOptions,
  type LiveSentenceHighlighterProps,
  getDifficultyBackgroundColor,
  getSentenceHighlightStyle,
  getDifficultyLabel,
  generateSentenceSuggestion,
  tokenizeSentence,
  SentenceDetailCard,
  ReadabilityMetricsBar,
};

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
      <ReadabilityMetricsBar report={report} />

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
        <SentenceDetailCard
          sentence={activeSentence}
          index={activeSentenceIndex!}
          hoveredComplexWord={hoveredComplexWord}
        />
      )}
    </div>
  );
}

export default LiveSentenceHighlighter;
