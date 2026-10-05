import * as React from 'react';
import type { GeoAeoReport, FaqItem, HowToStep } from '../../types.js';

export interface WidgetGeoAeoTabProps {
  geoAeoReport: GeoAeoReport;
  onApplyFaqs?: (faqs: FaqItem[]) => void;
  onApplyHowTo?: (steps: HowToStep[]) => void;
}

export function WidgetGeoAeoTab({ geoAeoReport, onApplyFaqs, onApplyHowTo }: WidgetGeoAeoTabProps) {
  const [faqsApplied, setFaqsApplied] = React.useState(false);
  const [howToApplied, setHowToApplied] = React.useState(false);

  const {
    geoScore,
    aeoScore,
    overallAiScore,
    geoMetrics,
    aeoMetrics,
    recommendations,
  } = geoAeoReport;

  const getScoreColor = (s: number) => (s >= 80 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171');
  const getScoreBg = (s: number) =>
    s >= 80
      ? 'rgba(34, 197, 94, 0.12)'
      : s >= 50
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(239, 68, 68, 0.12)';

  const handleApplyFaqs = () => {
    if (onApplyFaqs && geoAeoReport.faqCandidates.length > 0) {
      onApplyFaqs(geoAeoReport.faqCandidates);
      setFaqsApplied(true);
      setTimeout(() => setFaqsApplied(false), 2500);
    }
  };

  const handleApplyHowTo = () => {
    if (onApplyHowTo && aeoMetrics.howToSteps.length > 0) {
      onApplyHowTo(aeoMetrics.howToSteps);
      setHowToApplied(true);
      setTimeout(() => setHowToApplied(false), 2500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Top AI Readiness Score Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        {/* GEO Score */}
        <div
          style={{
            padding: '0.5rem',
            borderRadius: 6,
            background: getScoreBg(geoScore),
            border: `1px solid ${getScoreColor(geoScore)}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
            GEO (Generative AI)
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: getScoreColor(geoScore), marginTop: 2 }}>
            {geoScore}/100
          </div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
            ChatGPT & Gemini Citability
          </div>
        </div>

        {/* AEO Score */}
        <div
          style={{
            padding: '0.5rem',
            borderRadius: 6,
            background: getScoreBg(aeoScore),
            border: `1px solid ${getScoreColor(aeoScore)}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
            AEO (Answer Engine)
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: getScoreColor(aeoScore), marginTop: 2 }}>
            {aeoScore}/100
          </div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
            Voice & Snippet Answers
          </div>
        </div>

        {/* Overall AI Score */}
        <div
          style={{
            padding: '0.5rem',
            borderRadius: 6,
            background: getScoreBg(overallAiScore),
            border: `1px solid ${getScoreColor(overallAiScore)}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
            Overall AI Citability
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: getScoreColor(overallAiScore), marginTop: 2 }}>
            {overallAiScore}/100
          </div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
            LLM Knowledge Graph
          </div>
        </div>
      </div>

      {/* Automated Extraction Quick-Actions */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          background: 'var(--color-kumo-control, #1e1e1e)',
          padding: '0.5rem 0.625rem',
          borderRadius: 6,
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
          <strong>Automated AI Signals:</strong> {geoAeoReport.faqCandidates.length} FAQs • {aeoMetrics.howToSteps.length} Steps • {geoMetrics.statisticsCount} Data Points
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {geoAeoReport.faqCandidates.length > 0 && onApplyFaqs && (
            <button
              type="button"
              onClick={handleApplyFaqs}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.6875rem',
                borderRadius: 4,
                border: 'none',
                background: faqsApplied ? '#22c55e' : 'var(--color-kumo-tint, #3b82f6)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {faqsApplied ? '✓ FAQs Applied' : `+ Add ${geoAeoReport.faqCandidates.length} FAQs to Schema`}
            </button>
          )}

          {aeoMetrics.howToSteps.length > 0 && onApplyHowTo && (
            <button
              type="button"
              onClick={handleApplyHowTo}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.6875rem',
                borderRadius: 4,
                border: 'none',
                background: howToApplied ? '#22c55e' : 'var(--color-kumo-tint, #3b82f6)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {howToApplied ? '✓ HowTo Applied' : `+ Add ${aeoMetrics.howToSteps.length} Steps to Schema`}
            </button>
          )}
        </div>
      </div>

      {/* Speakable Voice Search Preview */}
      {aeoMetrics.speakableCandidate && (
        <div
          style={{
            padding: '0.5rem 0.625rem',
            borderRadius: 6,
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.25rem' }}>
            <span>🎙️</span>
            <span>AEO Voice Search Summary (SpeakableSpecification):</span>
          </div>
          <div style={{ color: 'var(--text-color-kumo-strong, #ffffff)', fontStyle: 'italic', lineHeight: 1.4 }}>
            &quot;{aeoMetrics.speakableCandidate}&quot;
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '200px', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
          AI Search Optimization Recommendations
        </div>
        {recommendations.map((rec, idx) => {
          const isGood = rec.type === 'good';
          const isCrit = rec.type === 'critical';
          const borderColor = isGood ? 'rgba(34, 197, 94, 0.3)' : isCrit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)';
          const badgeColor = isGood ? '#4ade80' : isCrit ? '#f87171' : '#fbbf24';

          return (
            <div
              key={idx}
              style={{
                padding: '0.375rem 0.5rem',
                borderRadius: 4,
                background: 'var(--color-kumo-control, #1a1a1a)',
                border: `1px solid ${borderColor}`,
                fontSize: '0.6875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
                  [{rec.category}] {rec.title}
                </span>
                <span style={{ color: badgeColor, fontSize: '0.625rem', fontWeight: 600 }}>
                  {isGood ? '✓ GOOD' : isCrit ? '⚠️ CRITICAL' : '⚡ TIP'}
                </span>
              </div>
              <div style={{ color: 'var(--text-color-kumo-subtle, #a0a0a0)', lineHeight: 1.35 }}>
                {rec.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
