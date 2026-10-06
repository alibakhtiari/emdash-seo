import * as React from 'react';
import type { ImageAltAuditItem } from '../types.js';
import {
  getAltStatusBadge,
  getAltProgressColor,
  formatAltIssueLabel,
} from './alt-auditor-utils.js';
import {
  IconImage,
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconLightbulb,
} from '../admin/icons.js';

export interface ImageItemCardProps {
  image: ImageAltAuditItem;
  globalIndex: number;
  isEditing: boolean;
  onFocus: () => void;
  onAltChange: (newAlt: string) => void;
}

export function ImageItemCard({
  image: img,
  globalIndex,
  isEditing,
  onFocus,
  onAltChange,
}: ImageItemCardProps) {
  const badge = getAltStatusBadge(img.status);
  const progressColor = getAltProgressColor(img.charCount);
  const progressPercent = Math.min(100, Math.round((img.charCount / 125) * 100));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '1rem',
        borderRadius: 6,
        border: `1px solid ${
          img.status === 'critical'
            ? 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.3))'
            : img.status === 'warning'
            ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))'
            : 'var(--color-kumo-line, rgba(255, 255, 255, 0.1))'
        }`,
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
            <IconImage size={20} color="var(--text-color-kumo-subtle, #a0a0a0)" />
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
              {img.status === 'good' ? (
                <IconCheck size={11} color="#4ade80" />
              ) : img.status === 'warning' ? (
                <IconAlertTriangle size={11} color="#fbbf24" />
              ) : (
                <IconAlertCircle size={11} color="#f87171" />
              )}
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
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <IconAlertTriangle size={11} color="#f87171" />
                  <span>{formatAltIssueLabel(iss)}</span>
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
              color:
                img.charCount > 125
                  ? 'var(--text-color-kumo-danger, #f87171)'
                  : img.charCount >= 5
                  ? 'var(--text-color-kumo-success, #4ade80)'
                  : 'var(--text-color-kumo-warning, #fbbf24)',
            }}
          >
            {img.charCount} / 125 chars{' '}
            {img.charCount > 125 ? '(Too long)' : img.charCount === 0 ? '(Missing)' : ''}
          </span>
        </div>

        <input
          type="text"
          value={img.alt}
          onFocus={onFocus}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Describe image subject and context (e.g. 'Technician performing steam cleaning on wool rug')..."
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-default, #ededed)',
            border: `1px solid ${
              isEditing
                ? 'var(--color-kumo-brand, #f6821f)'
                : 'var(--color-kumo-line, rgba(255, 255, 255, 0.15))'
            }`,
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
        <div style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {img.suggestions.map((sug, sIdx) => (
            <div key={`sug-${sIdx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <IconLightbulb size={12} color="#fbbf24" />
              <span>{sug}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
