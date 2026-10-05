import * as React from 'react';

export interface SerpDesktopPreviewProps {
  siteUrl: string;
  cleanSlug: string;
  title: string;
  description: string;
}

export function SerpDesktopPreview({
  siteUrl,
  cleanSlug,
  title,
  description,
}: SerpDesktopPreviewProps) {
  return (
    <div style={{ maxWidth: 600, textAlign: 'left' }}>
      <div style={{ fontSize: '0.8125rem', color: '#202124', marginBottom: 2 }}>
        {siteUrl} › {cleanSlug}
      </div>
      <div
        style={{
          fontSize: '1.25rem',
          color: '#1a0dab',
          cursor: 'pointer',
          lineHeight: 1.3,
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title || 'Untitled Page'}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#4d5156', lineHeight: 1.5 }}>
        {description || 'No description provided.'}
      </div>
    </div>
  );
}

export interface SerpMobilePreviewProps {
  siteName: string;
  pageUrl: string;
  title: string;
  description: string;
  image?: string;
}

export function SerpMobilePreview({
  siteName,
  pageUrl,
  title,
  description,
  image,
}: SerpMobilePreviewProps) {
  return (
    <div
      style={{
        maxWidth: 380,
        border: '1px solid #dadce0',
        borderRadius: 16,
        padding: '1rem',
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#555',
          }}
        >
          ★
        </div>
        <div style={{ fontSize: '0.75rem', color: '#202124', lineHeight: 1.2 }}>
          <strong>{siteName}</strong>
          <div style={{ color: '#5f6368', fontSize: '0.7rem' }}>{pageUrl}</div>
        </div>
      </div>
      <div
        style={{
          fontSize: '1rem',
          color: '#1a0dab',
          fontWeight: 500,
          lineHeight: 1.3,
          marginBottom: 6,
        }}
      >
        {title || 'Untitled Page'}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ fontSize: '0.8125rem', color: '#4d5156', lineHeight: 1.4, flex: 1 }}>
          {description || 'No description provided.'}
        </div>
        {image && (
          <img
            src={image}
            alt="Snippet thumbnail"
            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }}
          />
        )}
      </div>
    </div>
  );
}
