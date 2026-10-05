import * as React from 'react';
import type { AnalysisReport, DetailedReadabilityReport, AltAuditReport } from '../../types.js';

export interface EditorOverviewTabProps {
  seoReport: AnalysisReport;
  readability: DetailedReadabilityReport;
  altAudit: AltAuditReport;
  focusKeyword: string;
  isCornerstone: boolean;
  onTabChange: (tab: 'overview' | 'keyword' | 'highlighter' | 'alts') => void;
}

export function EditorOverviewTab({
  seoReport,
  readability,
  altAudit,
  focusKeyword,
  isCornerstone,
  onTabChange,
}: EditorOverviewTabProps) {
  const seoScore = seoReport.score;
  const seoColor =
    seoScore >= 80
      ? 'var(--text-color-kumo-success, #4ade80)'
      : seoScore >= 50
      ? 'var(--text-color-kumo-warning, #fbbf24)'
      : 'var(--text-color-kumo-danger, #f87171)';
  const seoBg =
    seoScore >= 80
      ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))'
      : seoScore >= 50
      ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))'
      : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))';

  const easeScore = readability.readingEase;
  const easeColor =
    easeScore >= 60
      ? 'var(--text-color-kumo-success, #4ade80)'
      : easeScore >= 50
      ? 'var(--text-color-kumo-warning, #fbbf24)'
      : 'var(--text-color-kumo-danger, #f87171)';
  const easeBg =
    easeScore >= 60
      ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))'
      : easeScore >= 50
      ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))'
      : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))';

  const altScore = altAudit.score;
  const altColor =
    altScore >= 80
      ? 'var(--text-color-kumo-success, #4ade80)'
      : altScore >= 50
      ? 'var(--text-color-kumo-warning, #fbbf24)'
      : 'var(--text-color-kumo-danger, #f87171)';
  const altBg =
    altScore >= 80
      ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))'
      : altScore >= 50
      ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))'
      : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* 3 Score Badges Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
        <div
          onClick={() => onTabChange('keyword')}
          style={{
            padding: '0.5rem 0.375rem',
            borderRadius: 6,
            background: seoBg,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase', fontWeight: 600 }}>
            SEO Content
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: seoColor, margin: '2px 0' }}>
            {seoScore} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.625rem', color: seoColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {seoReport.grade}
          </div>
        </div>

        <div
          onClick={() => onTabChange('highlighter')}
          style={{
            padding: '0.5rem 0.375rem',
            borderRadius: 6,
            background: easeBg,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase', fontWeight: 600 }}>
            Reading Ease
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: easeColor, margin: '2px 0' }}>
            {easeScore} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.625rem', color: easeColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Gr. {readability.gradeLevel}
          </div>
        </div>

        <div
          onClick={() => onTabChange('alts')}
          style={{
            padding: '0.5rem 0.375rem',
            borderRadius: 6,
            background: altBg,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', textTransform: 'uppercase', fontWeight: 600 }}>
            Alt Health
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: altColor, margin: '2px 0' }}>
            {altScore} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.625rem', color: altColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {altAudit.missingAltCount > 0 ? `${altAudit.missingAltCount} Missing` : 'All OK'}
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', background: 'var(--color-kumo-recessed, #141414)', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Word count:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            {readability.wordCount} words {isCornerstone ? '(Target: 1,200+)' : '(Target: 600+)'}
          </span>
        </div>
        {focusKeyword && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Keyword density:</span>
            <span
              style={{
                fontWeight: 600,
                color:
                  seoReport.metrics.keywordDensity >= 0.5 && seoReport.metrics.keywordDensity <= 2.5
                    ? 'var(--text-color-kumo-success, #4ade80)'
                    : 'var(--text-color-kumo-warning, #fbbf24)',
              }}
            >
              {seoReport.metrics.keywordDensity.toFixed(1)}% ({seoReport.metrics.keywordMatches} matches)
            </span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Headings:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            H1: {seoReport.metrics.h1Count} · H2: {seoReport.metrics.h2Count} · H3: {seoReport.metrics.h3Count}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Sentences:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            {readability.sentenceCount} ({readability.hardSentencesCount} hard, {readability.veryHardSentencesCount} very hard)
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Passive voice:</span>
          <span
            style={{
              fontWeight: 600,
              color:
                readability.passiveVoicePercentage > 10
                  ? 'var(--text-color-kumo-danger, #f87171)'
                  : 'var(--text-color-kumo-success, #4ade80)',
            }}
          >
            {readability.passiveVoicePercentage}% ({readability.passiveVoiceCount})
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Transition words:</span>
          <span
            style={{
              fontWeight: 600,
              color:
                readability.transitionPercentage < 30
                  ? 'var(--text-color-kumo-warning, #fbbf24)'
                  : 'var(--text-color-kumo-success, #4ade80)',
            }}
          >
            {readability.transitionPercentage}%
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Links:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            {seoReport.metrics.internalLinkCount} internal · {seoReport.metrics.externalLinkCount} external
          </span>
        </div>
      </div>

      {/* Key Findings / Actionable Alerts */}
      {!focusKeyword && (
        <div
          onClick={() => onTabChange('keyword')}
          style={{
            padding: '0.5rem',
            borderRadius: 6,
            background: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))',
            border: '1px solid var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.25))',
            fontSize: '0.75rem',
            color: 'var(--text-color-kumo-warning, #fbbf24)',
            cursor: 'pointer',
          }}
        >
          🎯 <strong>No Focus Keyword Set:</strong> Click here to define a target keyword and evaluate ranking criteria.
        </div>
      )}

      {readability.veryHardSentencesCount > 0 && (
        <div
          onClick={() => onTabChange('highlighter')}
          style={{
            padding: '0.5rem',
            borderRadius: 6,
            background: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))',
            border: '1px solid var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.25))',
            fontSize: '0.75rem',
            color: 'var(--text-color-kumo-danger, #f87171)',
            cursor: 'pointer',
          }}
        >
          ⚠️ <strong>{readability.veryHardSentencesCount} sentence(s) are very hard to read.</strong> Click to inspect in Sentences highlighter.
        </div>
      )}

      {altAudit.missingAltCount > 0 && (
        <div
          onClick={() => onTabChange('alts')}
          style={{
            padding: '0.5rem',
            borderRadius: 6,
            background: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))',
            border: '1px solid var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.25))',
            fontSize: '0.75rem',
            color: 'var(--text-color-kumo-danger, #f87171)',
            cursor: 'pointer',
          }}
        >
          🖼️ <strong>{altAudit.missingAltCount} image(s) missing alt text.</strong> Click to inspect and edit inline in Images tab.
        </div>
      )}

      {seoReport.recommendations.length > 0 && (
        <div style={{ padding: '0.5rem', borderRadius: 6, background: 'var(--color-kumo-recessed, #141414)', border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', fontSize: '0.75rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)', marginBottom: '0.25rem' }}>
            💡 Top Recommendation
          </div>
          <div style={{ color: 'var(--text-color-kumo-default, #ededed)', fontSize: '0.6875rem', lineHeight: 1.4 }}>
            {seoReport.recommendations[0]}
          </div>
        </div>
      )}
    </div>
  );
}
