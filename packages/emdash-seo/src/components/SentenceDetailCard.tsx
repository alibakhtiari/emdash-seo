import * as React from 'react';
import type { SentenceAnalysis, SentenceComplexWord } from '../types.js';
import { getDifficultyLabel, generateSentenceSuggestion } from './highlighter-utils.js';
import { IconLightbulb } from '../admin/icons.js';

export interface SentenceDetailCardProps {
  sentence: SentenceAnalysis;
  index: number;
  hoveredComplexWord?: SentenceComplexWord | null;
}

export function SentenceDetailCard({
  sentence,
  index,
  hoveredComplexWord,
}: SentenceDetailCardProps) {
  return (
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
          Sentence Inspector · #{index + 1}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: '0.75rem',
              fontWeight: 600,
              background:
                sentence.difficulty === 'very-hard'
                  ? 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.2))'
                  : sentence.difficulty === 'hard'
                  ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.2))'
                  : 'var(--color-kumo-success-tint, rgba(16, 185, 129, 0.2))',
              color:
                sentence.difficulty === 'very-hard'
                  ? 'var(--text-color-kumo-danger, #f87171)'
                  : sentence.difficulty === 'hard'
                  ? 'var(--text-color-kumo-warning, #fbbf24)'
                  : 'var(--text-color-kumo-success, #34d399)',
            }}
          >
            {getDifficultyLabel(sentence.difficulty)} ({sentence.wordCount} words)
          </span>

          {sentence.isPassive && (
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

      <div
        style={{
          fontStyle: 'italic',
          color: 'var(--text-color-kumo-default, #ededed)',
          marginBottom: 8,
          padding: '6px 10px',
          background: 'var(--color-kumo-recessed, #141414)',
          borderRadius: 4,
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.08))',
        }}
      >
        "{sentence.text}"
      </div>

      <div style={{ color: 'var(--text-color-kumo-default, #ededed)', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--color-kumo-brand, #f6821f)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.25rem' }}>
          <IconLightbulb size={12} color="var(--color-kumo-brand, #f6821f)" />
          <span>Suggestion:</span>
        </strong>
        {generateSentenceSuggestion(sentence)}
      </div>

      {hoveredComplexWord && (
        <div
          style={{
            marginTop: 6,
            padding: '4px 8px',
            background: 'var(--color-kumo-info-tint, rgba(6, 182, 212, 0.15))',
            borderRadius: 4,
            color: '#38bdf8',
            border: '1px solid rgba(6, 182, 212, 0.3)',
          }}
        >
          <strong>Complex Word: </strong>"{hoveredComplexWord.word}" ({hoveredComplexWord.syllables} syllables)
          {hoveredComplexWord.alternative && (
            <span>
              {' '}
              — Try replacing with: <strong style={{ color: '#ffffff' }}>"{hoveredComplexWord.alternative}"</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
