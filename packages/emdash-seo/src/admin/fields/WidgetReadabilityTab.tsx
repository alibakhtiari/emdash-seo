import * as React from 'react';
import type { DetailedReadabilityReport } from '../../types.js';

export interface WidgetReadabilityTabProps {
  readability: DetailedReadabilityReport;
}

export function WidgetReadabilityTab({ readability }: WidgetReadabilityTabProps) {
  const [filter, setFilter] = React.useState<'all' | 'hard' | 'very-hard' | 'passive' | 'complex'>('all');

  const sentences = readability.sentences || [];
  const hardCount = sentences.filter((s) => s.difficulty === 'hard').length;
  const veryHardCount = sentences.filter((s) => s.difficulty === 'very-hard').length;
  const passiveCount = sentences.filter((s) => s.isPassive).length;
  const complexCount = sentences.filter((s) => s.complexWords && s.complexWords.length > 0).length;

  const filteredSentences = React.useMemo(() => {
    switch (filter) {
      case 'hard':
        return sentences.filter((s) => s.difficulty === 'hard');
      case 'very-hard':
        return sentences.filter((s) => s.difficulty === 'very-hard');
      case 'passive':
        return sentences.filter((s) => s.isPassive);
      case 'complex':
        return sentences.filter((s) => s.complexWords && s.complexWords.length > 0);
      default:
        return sentences;
    }
  }, [sentences, filter]);

  if (sentences.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-color-kumo-subtle, #9ca3af)', fontSize: '0.8125rem' }}>
        Start typing in the document editor above to view real-time sentence readability and Hemingway analysis.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            fontSize: '0.6875rem',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            background: filter === 'all' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            color: 'var(--text-color-kumo-strong, #ffffff)',
            cursor: 'pointer',
          }}
        >
          All ({sentences.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('hard')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            fontSize: '0.6875rem',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            background: filter === 'hard' ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
            color: '#facc15',
            cursor: 'pointer',
          }}
        >
          Hard ({hardCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('very-hard')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            fontSize: '0.6875rem',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: filter === 'very-hard' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            color: '#f87171',
            cursor: 'pointer',
          }}
        >
          Very Hard ({veryHardCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('passive')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            fontSize: '0.6875rem',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            background: filter === 'passive' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: '#818cf8',
            cursor: 'pointer',
          }}
        >
          Passive Voice ({passiveCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('complex')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            fontSize: '0.6875rem',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            background: filter === 'complex' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
            color: '#22d3ee',
            cursor: 'pointer',
          }}
        >
          Complex Words ({complexCount})
        </button>
      </div>

      {/* Sentences List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
        {filteredSentences.map((s, idx) => {
          const isHard = s.difficulty === 'hard';
          const isVeryHard = s.difficulty === 'very-hard';
          const bg = isVeryHard
            ? 'rgba(239, 68, 68, 0.12)'
            : isHard
            ? 'rgba(234, 179, 8, 0.12)'
            : 'var(--color-kumo-control, #1e1e1e)';
          const borderColor = isVeryHard
            ? 'rgba(239, 68, 68, 0.3)'
            : isHard
            ? 'rgba(234, 179, 8, 0.3)'
            : 'var(--color-kumo-line, rgba(255, 255, 255, 0.08))';

          return (
            <div
              key={idx}
              style={{
                padding: '0.5rem 0.625rem',
                borderRadius: 4,
                background: bg,
                border: `1px solid ${borderColor}`,
                fontSize: '0.75rem',
                lineHeight: 1.4,
              }}
            >
              <div style={{ color: 'var(--text-color-kumo-strong, #ffffff)' }}>{s.text}</div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                  fontSize: '0.6875rem',
                  color: 'var(--text-color-kumo-subtle, #a0a0a0)',
                  flexWrap: 'wrap',
                }}
              >
                <span>{s.wordCount} words</span>
                {isVeryHard && <span style={{ color: '#f87171' }}>• Very Hard to read</span>}
                {isHard && <span style={{ color: '#facc15' }}>• Hard to read</span>}
                {s.isPassive && s.passivePhrases && s.passivePhrases.length > 0 && (
                  <span style={{ color: '#818cf8' }}>
                    • Passive: &quot;{s.passivePhrases.join(', ')}&quot;
                  </span>
                )}
                {s.complexWords && s.complexWords.length > 0 && (
                  <span style={{ color: '#22d3ee' }}>
                    • Complex: {s.complexWords.map((cw) => cw.alternative ? `${cw.word} → ${cw.alternative}` : cw.word).join(', ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
