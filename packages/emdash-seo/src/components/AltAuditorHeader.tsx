import * as React from 'react';
import type { AltAuditReport } from '../types.js';
import { IconAlertCircle, IconAlertTriangle, IconCheck } from '../admin/icons.js';

export interface AltAuditorHeaderProps {
  report: AltAuditReport;
  filter: 'all' | 'critical' | 'warning' | 'good';
  onFilterChange: (filter: 'all' | 'critical' | 'warning' | 'good') => void;
}

export function AltAuditorHeader({
  report,
  filter,
  onFilterChange,
}: AltAuditorHeaderProps) {
  // Overall Health Score color
  const scoreColor =
    report.score >= 80
      ? 'var(--text-color-kumo-success, #4ade80)'
      : report.score >= 60
      ? 'var(--text-color-kumo-warning, #fbbf24)'
      : 'var(--text-color-kumo-danger, #f87171)';
  const scoreBg =
    report.score >= 80
      ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))'
      : report.score >= 60
      ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))'
      : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))';

  return (
    <>
      {/* Top Header & Health Score Gauge */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.08))',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--text-color-kumo-strong, #ffffff)',
            }}
          >
            Image Alt Text Auditor
          </h2>
          <span
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-color-kumo-subtle, #a0a0a0)',
            }}
          >
            Audits accessibility compliance, screen reader compatibility, and SEO image signals in real time.
          </span>
        </div>

        {/* Health Score Gauge Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            title="Alt Text Health Score (0-100)"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: scoreBg,
              color: scoreColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.125rem',
              fontWeight: 800,
              border: `2px solid ${scoreColor}`,
            }}
          >
            {report.score}
          </div>
          <div>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-color-kumo-strong, #ffffff)',
              }}
            >
              Alt Health Score
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-color-kumo-subtle, #a0a0a0)',
              }}
            >
              {report.totalImages} image{report.totalImages === 1 ? '' : 's'} detected
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Pills & Filter Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: '1.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          style={{
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            background:
              filter === 'all'
                ? 'var(--color-kumo-tint, #333333)'
                : 'var(--color-kumo-control, #1a1a1a)',
            color:
              filter === 'all'
                ? 'var(--text-color-kumo-strong, #ffffff)'
                : 'var(--text-color-kumo-subtle, #a0a0a0)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          All ({report.totalImages})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('critical')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            border: '1px solid var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.3))',
            background:
              filter === 'critical'
                ? 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.25))'
                : 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-danger, #f87171)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <IconAlertCircle size={12} color="#f87171" />
          <span>Missing / Critical ({report.criticalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('warning')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            border: '1px solid var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))',
            background:
              filter === 'warning'
                ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.25))'
                : 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-warning, #fbbf24)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <IconAlertTriangle size={12} color="#fbbf24" />
          <span>Warnings ({report.warningCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('good')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            border: '1px solid var(--color-kumo-success-tint, rgba(34, 197, 94, 0.3))',
            background:
              filter === 'good'
                ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.25))'
                : 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-success, #4ade80)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <IconCheck size={12} color="#4ade80" />
          <span>Good ({report.goodCount})</span>
        </button>
      </div>

      {/* Issues Summary List Banner */}
      {report.issues.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 6,
            background: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))',
            border: '1px solid var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.25))',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: 'var(--text-color-kumo-warning, #fbbf24)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Audit Findings:</div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {report.issues.map((issue, idx) => (
              <li key={`summary-issue-${idx}`}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
