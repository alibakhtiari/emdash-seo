import * as React from 'react';
import type {
  AltAuditReport,
  AltIssueType,
} from '../types.js';
import { auditImageAlts } from '../engine/alt-auditor.js';

export interface ImageAltAuditorWidgetProps {
  content?: string;
  onContentChange?: (newContent: string) => void;
  onUpdateAlt?: (imageIndex: number, newAlt: string) => void;
  targetKeywords?: string[];
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Replaces the alt attribute of the N-th image in the content string,
 * supporting both HTML <img ...> tags and Markdown ![alt](url) syntax.
 */
export function updateAltInContent(
  content: string,
  imageIndex: number,
  newAlt: string
): string {
  if (!content) return content;

  // Pattern matching HTML <img> tags OR Markdown ![alt](url) images
  // Group 1: HTML img, Group 2: Markdown img alt, Group 3: Markdown img url
  const combinedRegex = /(<img\s+[^>]*?>)|(!\[(.*?)\]\(([^)\s]+(?:\s+["'][^"']*["'])?)\))/gi;

  let currentIndex = 0;
  return content.replace(combinedRegex, (match, htmlTag, _mdTag, _mdAlt, mdRest) => {
    if (currentIndex === imageIndex) {
      currentIndex++;

      if (htmlTag) {
        // Handle HTML <img>
        const hasAltAttr = /\balt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(match);
        const safeAlt = newAlt.replace(/"/g, '&quot;');

        if (hasAltAttr) {
          // Replace existing alt attribute
          return match.replace(
            /\balt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
            `alt="${safeAlt}"`
          );
        } else {
          // Insert alt attribute before closing >
          return match.replace(
            /<img\s+/i,
            `<img alt="${safeAlt}" `
          );
        }
      } else {
        // Handle Markdown ![alt](url)
        return `![${newAlt}](${mdRest})`;
      }
    }

    currentIndex++;
    return match;
  });
}

/**
 * Maps status to user-friendly label and color schema.
 */
export function getAltStatusBadge(status: 'good' | 'warning' | 'critical'): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
} {
  switch (status) {
    case 'good':
      return {
        label: 'Good',
        color: 'var(--text-color-kumo-success, #4ade80)',
        bg: 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))',
        border: 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.3))',
        icon: '🟢',
      };
    case 'warning':
      return {
        label: 'Warning',
        color: 'var(--text-color-kumo-warning, #fbbf24)',
        bg: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))',
        border: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))',
        icon: '🟡',
      };
    case 'critical':
      return {
        label: 'Missing / Critical',
        color: 'var(--text-color-kumo-danger, #f87171)',
        bg: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))',
        border: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.3))',
        icon: '🔴',
      };
  }
}

/**
 * Returns progress bar color based on alt text character count (target: 5-125 chars).
 */
export function getAltProgressColor(charCount: number): string {
  if (charCount === 0) return '#ef4444';
  if (charCount > 125) return '#f59e0b';
  if (charCount < 5) return '#f59e0b';
  return '#10b981';
}

/**
 * Formats issue types into human-friendly explanations.
 */
export function formatAltIssueLabel(issue: AltIssueType): string {
  switch (issue) {
    case 'alt_missing':
      return 'Missing alt attribute';
    case 'alt_empty':
      return 'Empty alt text';
    case 'alt_filename':
      return 'Filename used as alt text';
    case 'alt_redundant':
      return 'Starts with "image of" / "photo of"';
    case 'alt_length':
      return 'Suboptimal length (< 5 or > 125 chars)';
    case 'alt_kw_stuffing':
      return 'Target keyword stuffing';
    default:
      return issue;
  }
}

/**
 * Interactive Alt Image Auditor Widget component for EmDash Admin / Editor.
 */
export function ImageAltAuditorWidget({
  content = '',
  onContentChange,
  onUpdateAlt,
  targetKeywords = [],
  className = '',
  style,
}: ImageAltAuditorWidgetProps) {
  const [filter, setFilter] = React.useState<'all' | 'critical' | 'warning' | 'good'>('all');
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);

  // Compute Alt Audit Report
  const report: AltAuditReport = React.useMemo(() => {
    return auditImageAlts(content, { targetKeywords });
  }, [content, targetKeywords]);

  const handleAltChange = (imageIndex: number, newAlt: string) => {
    if (onUpdateAlt) {
      onUpdateAlt(imageIndex, newAlt);
    }
    if (onContentChange) {
      const updated = updateAltInContent(content, imageIndex, newAlt);
      onContentChange(updated);
    }
  };

  const filteredImages = React.useMemo(() => {
    if (filter === 'all') return report.images;
    return report.images.filter((img) => img.status === filter);
  }, [report.images, filter]);

  // Overall Health Score color
  const scoreColor =
    report.score >= 80 ? 'var(--text-color-kumo-success, #4ade80)' : report.score >= 60 ? 'var(--text-color-kumo-warning, #fbbf24)' : 'var(--text-color-kumo-danger, #f87171)';
  const scoreBg =
    report.score >= 80 ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.12))' : report.score >= 60 ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))' : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.12))';

  return (
    <div
      className={className}
      style={{
        fontFamily: 'inherit',
        background: 'var(--color-kumo-base, #181818)',
        borderRadius: 8,
        border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
        padding: '1.25rem',
        color: 'var(--text-color-kumo-default, #ededed)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        ...style,
      }}
    >
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
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            Image Alt Text Auditor
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
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
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
              Alt Health Score
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
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
          onClick={() => setFilter('all')}
          style={{
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            background: filter === 'all' ? 'var(--color-kumo-tint, #333333)' : 'var(--color-kumo-control, #1a1a1a)',
            color: filter === 'all' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
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
          onClick={() => setFilter('critical')}
          style={{
            border: '1px solid var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.3))',
            background: filter === 'critical' ? 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.25))' : 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-danger, #f87171)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔴 Missing / Critical ({report.criticalCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter('warning')}
          style={{
            border: '1px solid var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))',
            background: filter === 'warning' ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.25))' : 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-warning, #fbbf24)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🟡 Warnings ({report.warningCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter('good')}
          style={{
            border: '1px solid var(--color-kumo-success-tint, rgba(34, 197, 94, 0.3))',
            background: filter === 'good' ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.25))' : 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-success, #4ade80)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🟢 Good ({report.goodCount})
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

      {/* Image Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {report.totalImages === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-color-kumo-subtle, #a0a0a0)',
              background: 'var(--color-kumo-recessed, #141414)',
              borderRadius: 6,
              border: '1px dashed var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
              fontSize: '0.875rem',
            }}
          >
            No images detected in draft content. Add HTML &lt;img&gt; or Markdown images to audit them.
          </div>
        ) : filteredImages.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              color: 'var(--text-color-kumo-subtle, #a0a0a0)',
              background: 'var(--color-kumo-recessed, #141414)',
              borderRadius: 6,
              fontSize: '0.875rem',
            }}
          >
            No images match the selected filter.
          </div>
        ) : (
          filteredImages.map((img) => {
            // Find global index in report.images
            const globalIndex = report.images.indexOf(img);
            const badge = getAltStatusBadge(img.status);
            const progressColor = getAltProgressColor(img.charCount);
            const progressPercent = Math.min(100, Math.round((img.charCount / 125) * 100));

            return (
              <div
                key={`img-item-${globalIndex}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '1rem',
                  borderRadius: 6,
                  border: `1px solid ${img.status === 'critical' ? 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.3))' : img.status === 'warning' ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))' : 'var(--color-kumo-line, rgba(255, 255, 255, 0.1))'}`,
                  background: 'var(--color-kumo-recessed, #141414)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {/* Thumbnail Preview */}
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 6,
                      background: 'var(--color-kumo-control, #1a1a1a)',
                      border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {img.src ? (
                      <img
                        src={img.src}
                        alt={img.alt || 'Thumbnail preview'}
                        onError={(e) => {
                          // Hide image and show fallback icon
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.25rem' }}>🖼️</span>
                    )}
                  </div>

                  {/* Image Details & Status */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--text-color-kumo-strong, #ffffff)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={img.src}
                      >
                        Image #{globalIndex + 1}: {img.src.split('/').pop() || img.src || 'Embedded Image'}
                      </div>

                      {/* Status Badge */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          flexShrink: 0,
                        }}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* Source URL Preview */}
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-color-kumo-subtle, #888888)',
                        fontFamily: 'ui-monospace, monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 8,
                      }}
                    >
                      {img.src || '(No source URL)'}
                    </div>

                    {/* Issues List */}
                    {img.issues.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {img.issues.map((iss) => (
                          <span
                            key={iss}
                            style={{
                              background: 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.15))',
                              color: 'var(--text-color-kumo-danger, #f87171)',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                            }}
                          >
                            ⚠️ {formatAltIssueLabel(iss)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Quick-Edit Alt Input */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                      fontSize: '0.75rem',
                    }}
                  >
                    <label style={{ fontWeight: 600, color: 'var(--text-color-kumo-default, #ededed)' }}>
                      Alt Text (Click or type to edit live):
                    </label>

                    {/* Char Count Progress indicator */}
                    <span
                      style={{
                        fontWeight: 600,
                        color: img.charCount > 125 ? 'var(--text-color-kumo-danger, #f87171)' : img.charCount >= 5 ? 'var(--text-color-kumo-success, #4ade80)' : 'var(--text-color-kumo-warning, #fbbf24)',
                      }}
                    >
                      {img.charCount} / 125 chars {img.charCount > 125 ? '(Too long)' : img.charCount === 0 ? '(Missing)' : ''}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={img.alt}
                    onFocus={() => setEditingIndex(globalIndex)}
                    onChange={(e) => handleAltChange(globalIndex, e.target.value)}
                    placeholder="Describe image subject and context (e.g. 'Technician performing steam cleaning on wool rug')..."
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 6,
                      background: 'var(--color-kumo-control, #1a1a1a)',
                      color: 'var(--text-color-kumo-default, #ededed)',
                      border: `1px solid ${editingIndex === globalIndex ? 'var(--color-kumo-brand, #f6821f)' : 'var(--color-kumo-line, rgba(255, 255, 255, 0.15))'}`,
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />

                  {/* 125 Chars Progress Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: 4,
                      background: 'var(--color-kumo-tint, #2a2a2a)',
                      borderRadius: 2,
                      marginTop: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: progressColor,
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Suggestions List */}
                {img.suggestions.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', lineHeight: 1.4 }}>
                    {img.suggestions.map((sug, sIdx) => (
                      <div key={`sug-${sIdx}`}>💡 {sug}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ImageAltAuditorWidget;
