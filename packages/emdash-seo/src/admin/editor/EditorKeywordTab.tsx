import * as React from 'react';
import type { AnalysisReport } from '../../types.js';

export interface EditorKeywordTabProps {
  focusKeyword: string;
  onFocusKeywordChange: (keyword: string) => void;
  isCornerstone: boolean;
  seoReport: AnalysisReport;
}

export function EditorKeywordTab({
  focusKeyword,
  onFocusKeywordChange,
  isCornerstone,
  seoReport,
}: EditorKeywordTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Target Keyword Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <label
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-color-kumo-strong, #ffffff)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>🎯 Target Focus Keyword</span>
          {isCornerstone && <span style={{ fontSize: '0.6875rem', color: '#facc15' }}>⭐ Pillar: 1,200+ words</span>}
        </label>
        <input
          type="text"
          value={focusKeyword}
          onChange={(e) => onFocusKeywordChange(e.target.value)}
          placeholder="e.g. carpet cleaning london"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '0.375rem 0.5rem',
            borderRadius: 4,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            background: 'var(--color-kumo-control, #2a2a2a)',
            color: 'var(--text-color-kumo-strong, #ffffff)',
            fontSize: '0.8125rem',
            outline: 'none',
          }}
        />
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
          Type to simulate live content optimization scores and density checks.
        </div>
      </div>

      {/* Density Gauge */}
      {focusKeyword ? (
        <div
          style={{
            padding: '0.5rem',
            borderRadius: 6,
            background: 'var(--color-kumo-recessed, #141414)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
              Keyword Density:
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color:
                  seoReport.metrics.keywordDensity >= 0.5 && seoReport.metrics.keywordDensity <= 2.5
                    ? 'var(--text-color-kumo-success, #4ade80)'
                    : seoReport.metrics.keywordDensity > 2.5
                    ? 'var(--text-color-kumo-danger, #f87171)'
                    : 'var(--text-color-kumo-warning, #fbbf24)',
              }}
            >
              {seoReport.metrics.keywordDensity.toFixed(1)}% ({seoReport.metrics.keywordMatches} times)
            </span>
          </div>

          {/* Progress meter bar */}
          <div
            style={{
              width: '100%',
              height: 6,
              background: 'var(--color-kumo-control, #2a2a2a)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (seoReport.metrics.keywordDensity / 3.0) * 100)}%`,
                background:
                  seoReport.metrics.keywordDensity >= 0.5 && seoReport.metrics.keywordDensity <= 2.5
                    ? 'var(--text-color-kumo-success, #4ade80)'
                    : seoReport.metrics.keywordDensity > 2.5
                    ? 'var(--text-color-kumo-danger, #f87171)'
                    : 'var(--text-color-kumo-warning, #fbbf24)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
            <span>0%</span>
            <span>Target: 0.5% – 2.5%</span>
            <span>3.0%+</span>
          </div>
        </div>
      ) : null}

      {/* SEO Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase' }}>
          Content SEO Checklist ({seoReport.checks.filter((c) => c.passed).length}/{seoReport.checks.length})
        </div>
        {seoReport.checks.map((chk) => {
          const icon = chk.passed ? '🟢' : chk.severity === 'error' ? '🔴' : '🟡';
          const textColor = chk.passed
            ? 'var(--text-color-kumo-default, #ededed)'
            : chk.severity === 'error'
            ? 'var(--text-color-kumo-danger, #f87171)'
            : 'var(--text-color-kumo-warning, #fbbf24)';
          return (
            <div
              key={chk.id}
              style={{
                padding: '0.375rem 0.5rem',
                borderRadius: 4,
                background: 'var(--color-kumo-recessed, #141414)',
                border: `1px solid ${
                  chk.passed
                    ? 'var(--color-kumo-line, rgba(255, 255, 255, 0.08))'
                    : chk.severity === 'error'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(245, 158, 11, 0.2)'
                }`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.375rem',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ fontSize: '0.6875rem', marginTop: 1 }}>{icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
                  {chk.label}
                </div>
                <div style={{ color: textColor, fontSize: '0.6875rem', lineHeight: 1.3 }}>
                  {chk.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {seoReport.recommendations.length > 0 && (
        <div
          style={{
            padding: '0.5rem',
            borderRadius: 6,
            background: 'var(--color-kumo-recessed, #141414)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase' }}>
            💡 Optimization Opportunities
          </div>
          <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.6875rem', color: 'var(--text-color-kumo-default, #ededed)', lineHeight: 1.4 }}>
            {seoReport.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
