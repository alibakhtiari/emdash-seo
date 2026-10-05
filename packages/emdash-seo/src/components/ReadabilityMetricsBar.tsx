import * as React from 'react';
import type { DetailedReadabilityReport } from '../types.js';

export interface ReadabilityMetricsBarProps {
  report: DetailedReadabilityReport;
}

export function ReadabilityMetricsBar({ report }: ReadabilityMetricsBarProps) {
  // Grade badge styling
  const gradeColor =
    report.gradeLevel <= 8 ? '#15803d' : report.gradeLevel <= 11 ? '#a16207' : '#b91c1c';
  const gradeBg =
    report.gradeLevel <= 8 ? '#dcfce7' : report.gradeLevel <= 11 ? '#fef9c3' : '#fee2e2';

  // Ease score styling
  const easeColor =
    report.readingEase >= 60
      ? 'var(--text-color-kumo-success, #34d399)'
      : report.readingEase >= 50
      ? 'var(--text-color-kumo-warning, #fbbf24)'
      : 'var(--text-color-kumo-danger, #f87171)';
  const easeBg =
    report.readingEase >= 60
      ? 'var(--color-kumo-success-tint, rgba(16, 185, 129, 0.15))'
      : report.readingEase >= 50
      ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.15))'
      : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.15))';

  return (
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
          background:
            report.passiveVoicePercentage > 10
              ? 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.15))'
              : 'var(--color-kumo-tint, #262626)',
          color:
            report.passiveVoicePercentage > 10
              ? 'var(--text-color-kumo-danger, #f87171)'
              : 'var(--text-color-kumo-subtle, #a0a0a0)',
          padding: '4px 10px',
          borderRadius: 16,
          fontSize: '0.8125rem',
          fontWeight: 600,
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
        }}
      >
        <span>{report.passiveVoicePercentage}% Passive</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>
          ({report.passiveVoiceCount} of {report.sentenceCount})
        </span>
      </div>

      {/* Transition Words Pill */}
      <div
        title="Transition Words percentage: Connectors like 'however', 'furthermore', 'because'. Target >= 30%."
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background:
            report.transitionPercentage >= 30
              ? 'var(--color-kumo-success-tint, rgba(16, 185, 129, 0.15))'
              : 'var(--color-kumo-tint, #262626)',
          color:
            report.transitionPercentage >= 30
              ? 'var(--text-color-kumo-success, #34d399)'
              : 'var(--text-color-kumo-subtle, #a0a0a0)',
          padding: '4px 10px',
          borderRadius: 16,
          fontSize: '0.8125rem',
          fontWeight: 600,
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
        }}
      >
        <span>{report.transitionPercentage}% Transitions</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>
          ({report.transitionWordsCount})
        </span>
      </div>

      {/* Total Words & Sentence Count */}
      <div style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
        <strong style={{ color: 'var(--text-color-kumo-strong, #ffffff)' }}>{report.wordCount}</strong> words ·{' '}
        <strong style={{ color: 'var(--text-color-kumo-strong, #ffffff)' }}>{report.sentenceCount}</strong> sentences
      </div>
    </div>
  );
}
