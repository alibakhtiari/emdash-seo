import * as React from 'react';
import { IconSearch, IconGlobe, IconMobile, IconDesktop } from '../icons.js';

export interface WidgetSerpTabProps {
  title: string;
  excerpt: string;
  featuredImage?: string;
  slug?: string;
}

export function WidgetSerpTab({ title, excerpt, featuredImage, slug }: WidgetSerpTabProps) {
  const [device, setDevice] = React.useState<'mobile' | 'desktop'>('mobile');
  const [mode, setMode] = React.useState<'google' | 'social'>('google');

  const displayTitle = title.trim() || 'Untitled Document';
  const displayDesc = excerpt.trim() || 'Add a short excerpt or meta description in the editor to preview search results snippet.';
  const displaySlug = slug ? `/${slug}` : '/new-entry';
  const siteUrl = 'https://example.com';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Switcher Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={() => setMode('google')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.5rem',
              borderRadius: 4,
              fontSize: '0.6875rem',
              border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
              background: mode === 'google' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
              color: 'var(--text-color-kumo-strong, #ffffff)',
              cursor: 'pointer',
            }}
          >
            <IconSearch size={12} />
            <span>Google SERP</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('social')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.5rem',
              borderRadius: 4,
              fontSize: '0.6875rem',
              border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
              background: mode === 'social' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
              color: 'var(--text-color-kumo-strong, #ffffff)',
              cursor: 'pointer',
            }}
          >
            <IconGlobe size={12} />
            <span>Social Card</span>
          </button>
        </div>

        {mode === 'google' && (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.2rem 0.375rem',
                borderRadius: 4,
                fontSize: '0.625rem',
                border: 'none',
                background: device === 'mobile' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <IconMobile size={11} />
              <span>Mobile</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.2rem 0.375rem',
                borderRadius: 4,
                fontSize: '0.625rem',
                border: 'none',
                background: device === 'desktop' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <IconDesktop size={11} />
              <span>Desktop</span>
            </button>
          </div>
        )}
      </div>

      {/* Preview Box */}
      {mode === 'google' ? (
        <div
          style={{
            background: '#ffffff',
            color: '#202124',
            padding: '0.875rem 1rem',
            borderRadius: 8,
            fontFamily: 'arial, sans-serif',
            maxWidth: device === 'mobile' ? 360 : 540,
            boxShadow: '0 1px 6px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#4285f4',
                color: '#ffffff',
                fontSize: '0.625rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              G
            </div>
            <div style={{ fontSize: '0.75rem', color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 500 }}>Modern Service Co</span>
              <span style={{ color: '#5f6368', marginLeft: '0.375rem' }}>{siteUrl}{displaySlug}</span>
            </div>
          </div>
          <div
            style={{
              color: '#1a0dab',
              fontSize: device === 'mobile' ? '1rem' : '1.125rem',
              lineHeight: 1.3,
              fontWeight: 400,
              cursor: 'pointer',
              marginBottom: '0.25rem',
            }}
          >
            {displayTitle}
          </div>
          <div style={{ color: '#4d5156', fontSize: '0.8125rem', lineHeight: 1.5 }}>
            {displayDesc.length > 155 ? `${displayDesc.slice(0, 155)}...` : displayDesc}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: '#18191a',
            border: '1px solid #3a3b3c',
            borderRadius: 8,
            overflow: 'hidden',
            maxWidth: 420,
            color: '#e4e6eb',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {featuredImage ? (
            <img src={featuredImage} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
          ) : (
            <div
              style={{
                height: 120,
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '0.75rem',
              }}
            >
              No Featured Image uploaded
            </div>
          )}
          <div style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.6875rem', color: '#b0b3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              example.com
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.125rem', color: '#ffffff' }}>
              {displayTitle}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b0b3b8', marginTop: '0.25rem', lineHeight: 1.4 }}>
              {displayDesc}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
