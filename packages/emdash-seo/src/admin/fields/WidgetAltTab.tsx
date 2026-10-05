import * as React from 'react';
import type { AltAuditReport } from '../../types.js';
import { updateDomImageAlt } from './dom-extractor.js';

export interface WidgetAltTabProps {
  altAudit: AltAuditReport;
  onRefresh?: () => void;
}

export function WidgetAltTab({ altAudit, onRefresh }: WidgetAltTabProps) {
  const [altValues, setAltValues] = React.useState<Record<string, string>>({});
  const [savedStatus, setSavedStatus] = React.useState<Record<string, boolean>>({});

  const items = altAudit.images || [];

  const handleAltChange = (src: string, val: string) => {
    setAltValues((prev) => ({ ...prev, [src]: val }));
  };

  const handleSave = (src: string) => {
    const newAlt = altValues[src];
    if (newAlt !== undefined) {
      const updated = updateDomImageAlt(src, newAlt);
      if (updated) {
        setSavedStatus((prev) => ({ ...prev, [src]: true }));
        setTimeout(() => {
          setSavedStatus((prev) => ({ ...prev, [src]: false }));
        }, 2000);
        onRefresh?.();
      }
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-color-kumo-subtle, #9ca3af)', fontSize: '0.8125rem' }}>
        No images detected in this document yet. Add images in the editor or upload a Featured Image above to audit accessibility and alt tags.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-color-kumo-strong, #ffffff)' }}>
          {items.length} image{items.length === 1 ? '' : 's'} detected in draft
        </span>
        <span
          style={{
            fontWeight: 600,
            color: altAudit.score >= 80 ? '#4ade80' : altAudit.score >= 50 ? '#fbbf24' : '#f87171',
          }}
        >
          Alt Health: {altAudit.score}/100
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '280px', overflowY: 'auto' }}>
        {items.map((img, idx) => {
          const currentInputVal = altValues[img.src] ?? img.alt ?? '';
          const hasSaved = savedStatus[img.src];
          const isCritical = img.status === 'critical';
          const isWarning = img.status === 'warning';

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '0.625rem',
                alignItems: 'flex-start',
                padding: '0.5rem 0.625rem',
                borderRadius: 4,
                background: 'var(--color-kumo-control, #1e1e1e)',
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: '#111',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {img.src ? (
                  <img src={img.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.25rem' }}>🖼️</span>
                )}
              </div>

              {/* Alt Editor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: isCritical ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80',
                    }}
                  >
                    {isCritical ? '🔴 Missing Alt' : isWarning ? '🟡 Needs Improvement' : '🟢 Good Alt'}
                  </span>
                  {img.charCount > 0 && (
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
                      {img.charCount}/125 chars
                    </span>
                  )}
                </div>

                {img.issues && img.issues.length > 0 && (
                  <div style={{ fontSize: '0.6875rem', color: '#f87171' }}>
                    {img.issues.join(' • ')}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.125rem' }}>
                  <input
                    type="text"
                    value={currentInputVal}
                    onChange={(e) => handleAltChange(img.src, e.target.value)}
                    placeholder="Enter descriptive alt text..."
                    style={{
                      flex: 1,
                      padding: '0.25rem 0.375rem',
                      fontSize: '0.75rem',
                      borderRadius: 4,
                      border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
                      background: 'rgba(0,0,0,0.2)',
                      color: '#ffffff',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSave(img.src)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.6875rem',
                      borderRadius: 4,
                      border: 'none',
                      background: hasSaved ? '#22c55e' : 'var(--color-kumo-tint, #3b82f6)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {hasSaved ? '✓ Saved' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
