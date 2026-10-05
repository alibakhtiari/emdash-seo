import * as React from 'react';

export interface SemanticCoverageCardProps {
  coverage: {
    score: number;
    detected: string[];
    missing: string[];
  };
  readability: {
    score: number;
    level: string;
    hardSentencesCount: number;
  };
  onNavigateToReadability: () => void;
  onNavigateToAltAuditor: () => void;
}

export function SemanticCoverageCard({
  coverage,
  readability,
  onNavigateToReadability,
  onNavigateToAltAuditor,
}: SemanticCoverageCardProps) {
  const scoreColor =
    coverage.score >= 70
      ? 'var(--text-color-kumo-success, #4ade80)'
      : coverage.score >= 50
      ? 'var(--text-color-kumo-warning, #fbbf24)'
      : 'var(--text-color-kumo-danger, #f87171)';
  const scoreBg =
    coverage.score >= 70
      ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.15))'
      : coverage.score >= 50
      ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.15))'
      : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.15))';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.25rem' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: scoreBg,
            color: scoreColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 800,
            border: `2px solid ${scoreColor}`,
          }}
        >
          {coverage.score}
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            Entity Coverage Index (ECI)
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
            Flesch-Kincaid: <strong>{readability.score}</strong> ({readability.level}) ·{' '}
            {readability.hardSentencesCount} complex sentence{readability.hardSentencesCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-color-kumo-success, #4ade80)',
            marginBottom: 6,
          }}
        >
          Detected Entities ({coverage.detected.length}):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {coverage.detected.map((e) => (
            <span
              key={e}
              style={{
                background: 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.15))',
                color: 'var(--text-color-kumo-success, #4ade80)',
                border: '1px solid var(--color-kumo-success-tint, rgba(34, 197, 94, 0.3))',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              ✓ {e}
            </span>
          ))}
          {coverage.detected.length === 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', fontStyle: 'italic' }}>
              No topic entities detected in draft content.
            </span>
          )}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-color-kumo-warning, #fbbf24)',
            marginBottom: 6,
          }}
        >
          Topical Gaps ({coverage.missing.length}):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {coverage.missing.map((e) => (
            <span
              key={e}
              style={{
                background: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.15))',
                color: 'var(--text-color-kumo-warning, #fbbf24)',
                border: '1px solid var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              + {e}
            </span>
          ))}
        </div>
      </div>

      {/* Quick Navigation to Readability & Alt Auditor */}
      <div
        style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={onNavigateToReadability}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.15))',
            color: 'var(--text-color-kumo-warning, #fbbf24)',
            border: '1px solid var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Launch Hemingway Readability Auditor →
        </button>
        <button
          type="button"
          onClick={onNavigateToAltAuditor}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.15))',
            color: 'var(--text-color-kumo-success, #4ade80)',
            border: '1px solid var(--color-kumo-success-tint, rgba(34, 197, 94, 0.3))',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Launch Image Alt Auditor →
        </button>
      </div>
    </div>
  );
}
