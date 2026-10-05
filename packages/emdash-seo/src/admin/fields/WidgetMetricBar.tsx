import * as React from 'react';
import type { DetailedReadabilityReport, AltAuditReport, GeoAeoReport } from '../../types.js';

export interface WidgetMetricBarProps {
  readability: DetailedReadabilityReport;
  altAudit: AltAuditReport;
  geoAeoReport: GeoAeoReport;
  keyword: string;
  kwInTitle: boolean;
  imagesCount: number;
}

export function WidgetMetricBar({
  readability,
  altAudit,
  geoAeoReport,
  keyword,
  kwInTitle,
  imagesCount,
}: WidgetMetricBarProps) {
  const easeScore = Math.round(readability.readingEase);
  const easeColor = easeScore >= 60 ? '#4ade80' : easeScore >= 45 ? '#facc15' : '#f87171';
  const easeBg =
    easeScore >= 60
      ? 'rgba(34, 197, 94, 0.12)'
      : easeScore >= 45
        ? 'rgba(234, 179, 8, 0.12)'
        : 'rgba(239, 68, 68, 0.12)';

  const hardSentences = readability.hardSentencesCount + readability.veryHardSentencesCount;

  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Readability Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.5rem',
          borderRadius: 4,
          background: easeBg,
          border: `1px solid ${easeColor}`,
          fontSize: '0.6875rem',
          color: easeColor,
          fontWeight: 500,
        }}
      >
        <span>📖</span>
        <span>
          {easeScore}/100 Ease ({readability.readingEaseLevel})
        </span>
      </div>

      {/* Hemingway Sentence Difficulties */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.5rem',
          borderRadius: 4,
          background: hardSentences > 0 ? 'rgba(234, 179, 8, 0.12)' : 'var(--color-kumo-control, #222222)',
          border: `1px solid ${hardSentences > 0 ? '#facc15' : 'var(--color-kumo-line, rgba(255, 255, 255, 0.1))'}`,
          fontSize: '0.6875rem',
          color: hardSentences > 0 ? '#facc15' : 'var(--text-color-kumo-subtle, #9ca3af)',
        }}
      >
        <span>✍️</span>
        <span>{hardSentences === 0 ? 'Clear Sentences' : `${hardSentences} Hard Sentences`}</span>
      </div>

      {/* Keyword Presence */}
      {keyword && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            borderRadius: 4,
            background: kwInTitle ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${kwInTitle ? '#4ade80' : '#f87171'}`,
            fontSize: '0.6875rem',
            color: kwInTitle ? '#4ade80' : '#f87171',
          }}
        >
          <span>{kwInTitle ? '✓' : '✗'}</span>
          <span>{kwInTitle ? 'In Title' : 'Missing in Title'}</span>
        </div>
      )}

      {/* Images Alt Pill */}
      {imagesCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            borderRadius: 4,
            background: altAudit.score >= 80 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${altAudit.score >= 80 ? '#4ade80' : '#f87171'}`,
            fontSize: '0.6875rem',
            color: altAudit.score >= 80 ? '#4ade80' : '#f87171',
          }}
        >
          <span>🖼️</span>
          <span>
            {imagesCount} Image{imagesCount === 1 ? '' : 's'} ({altAudit.score}% Alts)
          </span>
        </div>
      )}

      {/* GEO AI Citability Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.5rem',
          borderRadius: 4,
          background:
            geoAeoReport.overallAiScore >= 70
              ? 'rgba(168, 85, 247, 0.15)'
              : 'rgba(168, 85, 247, 0.08)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          fontSize: '0.6875rem',
          color: '#c084fc',
          fontWeight: 500,
        }}
      >
        <span>🤖</span>
        <span>{geoAeoReport.overallAiScore}/100 AI Citability</span>
      </div>
    </div>
  );
}
