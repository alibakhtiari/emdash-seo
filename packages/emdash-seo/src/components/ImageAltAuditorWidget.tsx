import * as React from 'react';
import type { AltAuditReport } from '../types.js';
import { auditImageAlts } from '../engine/alt-auditor.js';
import {
  updateAltInContent,
  getAltStatusBadge,
  getAltProgressColor,
  formatAltIssueLabel,
} from './alt-auditor-utils.js';
import { AltAuditorHeader } from './AltAuditorHeader.js';
import { ImageItemCard } from './ImageItemCard.js';

export {
  updateAltInContent,
  getAltStatusBadge,
  getAltProgressColor,
  formatAltIssueLabel,
  AltAuditorHeader,
  ImageItemCard,
};

export interface ImageAltAuditorWidgetProps {
  content?: string;
  onContentChange?: (newContent: string) => void;
  onUpdateAlt?: (imageIndex: number, newAlt: string) => void;
  targetKeywords?: string[];
  className?: string;
  style?: React.CSSProperties;
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
      {/* Top Header, Health Score Gauge, and Filter Tabs */}
      <AltAuditorHeader
        report={report}
        filter={filter}
        onFilterChange={setFilter}
      />

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
            const globalIndex = report.images.indexOf(img);
            return (
              <ImageItemCard
                key={`img-item-${globalIndex}`}
                image={img}
                globalIndex={globalIndex}
                isEditing={editingIndex === globalIndex}
                onFocus={() => setEditingIndex(globalIndex)}
                onAltChange={(newAlt) => handleAltChange(globalIndex, newAlt)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default ImageAltAuditorWidget;
