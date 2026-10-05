import * as React from 'react';
import type { TOPIC_ENTITY_CLUSTERS } from '../../engine/semantic-analyzer.js';

export interface PreviewInputsFormProps {
  title: string;
  onTitleChange: (val: string) => void;
  slug: string;
  onSlugChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  image: string;
  onImageChange: (val: string) => void;
  content: string;
  onContentChange: (val: string) => void;
  topicCluster: keyof typeof TOPIC_ENTITY_CLUSTERS;
  onTopicClusterChange: (val: keyof typeof TOPIC_ENTITY_CLUSTERS) => void;
}

export function PreviewInputsForm({
  title,
  onTitleChange,
  slug,
  onSlugChange,
  description,
  onDescriptionChange,
  image,
  onImageChange,
  content,
  onContentChange,
  topicCluster,
  onTopicClusterChange,
}: PreviewInputsFormProps) {
  const titleLength = title.length;
  const descLength = description.length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            SEO Title
          </label>
          <span
            style={{
              fontSize: '0.75rem',
              color:
                titleLength > 60
                  ? 'var(--text-color-kumo-danger, #f87171)'
                  : titleLength >= 40
                  ? 'var(--text-color-kumo-success, #4ade80)'
                  : 'var(--text-color-kumo-warning, #fbbf24)',
              fontWeight: 500,
            }}
          >
            {titleLength} / 60 characters {titleLength > 60 ? '(Too long)' : titleLength >= 40 ? '(Optimal)' : '(Short)'}
          </span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-default, #ededed)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            fontSize: '0.875rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: 4,
            color: 'var(--text-color-kumo-strong, #ffffff)',
          }}
        >
          URL Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-default, #ededed)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            fontSize: '0.875rem',
            fontFamily: 'ui-monospace, monospace',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            Meta Description
          </label>
          <span
            style={{
              fontSize: '0.75rem',
              color:
                descLength > 160
                  ? 'var(--text-color-kumo-danger, #f87171)'
                  : descLength >= 120
                  ? 'var(--text-color-kumo-success, #4ade80)'
                  : 'var(--text-color-kumo-warning, #fbbf24)',
              fontWeight: 500,
            }}
          >
            {descLength} / 160 characters {descLength > 160 ? '(Too long)' : descLength >= 120 ? '(Optimal)' : '(Short)'}
          </span>
        </div>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={2}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-default, #ededed)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            fontSize: '0.875rem',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: 4,
            color: 'var(--text-color-kumo-strong, #ffffff)',
          }}
        >
          Social Image URL (OpenGraph / Twitter)
        </label>
        <input
          type="text"
          value={image}
          onChange={(e) => onImageChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-default, #ededed)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            fontSize: '0.875rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            Draft Body Content (for Entity & Readability Analysis)
          </label>
          <select
            value={topicCluster}
            onChange={(e) => onTopicClusterChange(e.target.value as keyof typeof TOPIC_ENTITY_CLUSTERS)}
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--color-kumo-control, #1a1a1a)',
              color: 'var(--text-color-kumo-default, #ededed)',
              border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            }}
          >
            <option value="cleaning">Topic: Cleaning Service</option>
            <option value="local_business">Topic: Local Business</option>
            <option value="technical">Topic: Technical Article</option>
          </select>
        </div>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'var(--color-kumo-control, #1a1a1a)',
            color: 'var(--text-color-kumo-default, #ededed)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            fontSize: '0.875rem',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
