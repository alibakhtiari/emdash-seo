import * as React from 'react';

export interface SocialCardProps {
  siteUrl: string;
  title: string;
  description: string;
  image?: string;
}

export function FacebookOgCard({
  siteUrl,
  title,
  description,
  image,
}: SocialCardProps) {
  let hostname = siteUrl;
  try {
    hostname = new URL(siteUrl).hostname;
  } catch {
    // keep siteUrl as fallback
  }

  return (
    <div
      style={{
        maxWidth: 520,
        border: '1px solid #dadde1',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#f2f3f5',
      }}
    >
      {image ? (
        <img
          src={image}
          alt="OpenGraph"
          style={{ width: '100%', height: 260, objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: 200,
            background: '#e4e6eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#65676b',
          }}
        >
          No Image Specified
        </div>
      )}
      <div style={{ padding: '0.75rem 1rem', background: '#f0f2f5' }}>
        <div style={{ fontSize: '0.75rem', color: '#65676b', textTransform: 'uppercase' }}>
          {hostname}
        </div>
        <div
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1c1e21',
            margin: '4px 0',
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '0.8125rem',
            color: '#606770',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

export function TwitterCard({
  siteUrl,
  title,
  description,
  image,
}: SocialCardProps) {
  let hostname = siteUrl;
  try {
    hostname = new URL(siteUrl).hostname;
  } catch {
    // keep siteUrl as fallback
  }

  return (
    <div
      style={{
        maxWidth: 500,
        border: '1px solid #cfd9de',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#ffffff',
      }}
    >
      {image && (
        <img
          src={image}
          alt="Twitter Card"
          style={{ width: '100%', height: 250, objectFit: 'cover' }}
        />
      )}
      <div style={{ padding: '0.75rem 1rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#536471' }}>{hostname}</div>
        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f1419', margin: '2px 0 4px' }}>
          {title}
        </div>
        <div
          style={{
            fontSize: '0.8125rem',
            color: '#536471',
            lineHeight: 1.3,
            maxHeight: '2.6em',
            overflow: 'hidden',
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}
