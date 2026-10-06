import * as React from 'react';
import type { AnalysisReport, DetailedReadabilityReport, AltAuditReport } from '../../types.js';
import { IconCheck, IconAlertTriangle, IconCross } from '../icons.js';

export interface WidgetChecklistTabProps {
  seoReport: AnalysisReport;
  readability: DetailedReadabilityReport;
  altAudit: AltAuditReport;
  title: string;
  focusKeyword: string;
  headingsCount: number;
}

export function WidgetChecklistTab({
  seoReport,
  readability,
  altAudit,
  title,
  focusKeyword,
  headingsCount,
}: WidgetChecklistTabProps) {
  const kw = focusKeyword.trim().toLowerCase();
  const kwInTitle = kw ? title.toLowerCase().includes(kw) : false;
  const kwInContent = Boolean(seoReport.metrics?.keywordMatches && seoReport.metrics.keywordMatches > 0);
  const titleLength = title.length;
  const titleOptimal = titleLength >= 40 && titleLength <= 65;
  const wordCount = seoReport.metrics?.wordCount || 0;
  const wordCountGood = wordCount >= 300;
  const hasHeadings = headingsCount > 0;
  const easeGood = readability.readingEase >= 60;
  const altsGood = altAudit.score >= 80;

  const checks = [
    {
      label: 'Focus Keyword Defined',
      status: kw ? 'pass' : 'fail',
      detail: kw ? `"${focusKeyword}"` : 'Enter a focus keyword above',
    },
    {
      label: 'Keyword in Title',
      status: kwInTitle ? 'pass' : kw ? 'warn' : 'fail',
      detail: kwInTitle ? 'Appears in title' : 'Include focus keyword in document title',
    },
    {
      label: 'Optimal Title Length',
      status: titleOptimal ? 'pass' : titleLength > 0 ? 'warn' : 'fail',
      detail: `${titleLength}/60 characters (recommended 40-65)`,
    },
    {
      label: 'Keyword in Content Body',
      status: kwInContent ? 'pass' : kw ? 'warn' : 'fail',
      detail: kwInContent
        ? `Found (${seoReport.metrics?.keywordDensity?.toFixed(1) || '0'}% density)`
        : 'Use keyword in the opening paragraphs and body',
    },
    {
      label: 'Content Word Count',
      status: wordCountGood ? 'pass' : wordCount > 0 ? 'warn' : 'fail',
      detail: `${wordCount} words (minimum 300 for drafts, 600+ for guides)`,
    },
    {
      label: 'Subheadings (H2/H3)',
      status: hasHeadings ? 'pass' : 'warn',
      detail: hasHeadings ? `${headingsCount} headings detected` : 'Break up content with H2 and H3 headings',
    },
    {
      label: 'Flesch Reading Ease (Plain English)',
      status: easeGood ? 'pass' : 'warn',
      detail: `${readability.readingEase}/100 (${readability.readingEaseLevel})`,
    },
    {
      label: 'Image Alt Tags',
      status: altsGood ? 'pass' : altAudit.images.length > 0 ? 'warn' : 'pass',
      detail: `${altAudit.images.length} images (${altAudit.score}/100 accessibility score)`,
    },
  ];

  const passCount = checks.filter((c) => c.status === 'pass').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-color-kumo-strong, #ffffff)' }}>SEO & Content Readiness</span>
        <span style={{ fontWeight: 600, color: passCount >= 6 ? '#4ade80' : '#fbbf24' }}>
          {passCount}/{checks.length} Criteria Passed
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '280px', overflowY: 'auto' }}>
        {checks.map((c, idx) => {
          const color = c.status === 'pass' ? '#4ade80' : c.status === 'warn' ? '#fbbf24' : '#f87171';

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.375rem 0.5rem',
                borderRadius: 4,
                background: 'var(--color-kumo-control, #1e1e1e)',
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.08))',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {c.status === 'pass' ? (
                    <IconCheck size={13} color="#4ade80" />
                  ) : c.status === 'warn' ? (
                    <IconAlertTriangle size={13} color="#fbbf24" />
                  ) : (
                    <IconCross size={13} color="#f87171" />
                  )}
                </span>
                <span style={{ color: 'var(--text-color-kumo-strong, #ffffff)', fontWeight: 500 }}>{c.label}</span>
              </div>
              <span style={{ fontSize: '0.6875rem', color }}>{c.detail}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
