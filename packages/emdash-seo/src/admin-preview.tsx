import * as React from 'react';
import { calculateEntityCoverage, calculateFleschReadingEase, TOPIC_ENTITY_CLUSTERS } from './engine/semantic-analyzer.js';
import { LiveSentenceHighlighter } from './components/LiveSentenceHighlighter.js';
import { ImageAltAuditorWidget } from './components/ImageAltAuditorWidget.js';

interface SerpPreviewProps {
  initialTitle?: string;
  initialSlug?: string;
  initialDescription?: string;
  initialImage?: string;
  initialContent?: string;
  siteUrl?: string;
  siteName?: string;
}

export function SerpPreviewPage({
  initialTitle = 'Professional Carpet Cleaning London | Eco Steam Care',
  initialSlug = 'carpet-cleaning-london',
  initialDescription = 'Book certified 5.0-star professional carpet cleaning in London. Eco-friendly steam extraction, rapid drying times, and pet odor removal.',
  initialImage = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&h=630&q=80',
  initialContent = 'Our hot water extraction and steam cleaning process removes deep stains, pet odors, and allergens. Drying time is under 2 hours. Eco-friendly and fully insured with transparent pricing and guarantee. Additionally, we utilize advanced methods that were implemented by our certified specialists.\n\n<img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80" alt="Professional technician cleaning carpet with steam extraction equipment" />\n\n<img src="/images/IMG_5021.jpg" alt="photo of rug" />',
  siteUrl = 'https://example.com',
  siteName = 'Modern Service Co',
}: SerpPreviewProps) {
  const [tab, setTab] = React.useState<
    'desktop' | 'mobile' | 'facebook' | 'twitter' | 'semantic' | 'readability' | 'alt-auditor'
  >('desktop');
  const [title, setTitle] = React.useState(initialTitle);
  const [slug, setSlug] = React.useState(initialSlug);
  const [description, setDescription] = React.useState(initialDescription);
  const [image, setImage] = React.useState(initialImage);
  const [content, setContent] = React.useState(initialContent);
  const [topicCluster, setTopicCluster] = React.useState<keyof typeof TOPIC_ENTITY_CLUSTERS>('cleaning');

  const cleanSlug = slug.replace(/^\/+|\/+$/g, '');
  const pageUrl = `${siteUrl.replace(/\/+$/, '')}/${cleanSlug}/`;

  // Semantic and readability evaluations
  const expectedEntities = TOPIC_ENTITY_CLUSTERS[topicCluster] || [];
  const coverage = React.useMemo(() => {
    return calculateEntityCoverage(content, expectedEntities);
  }, [content, expectedEntities]);

  const readability = React.useMemo(() => {
    return calculateFleschReadingEase(content);
  }, [content]);

  const titleLength = title.length;
  const descLength = description.length;

  const tabButtonStyle = (current: string): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: 6,
    background: tab === current ? 'var(--color-kumo-brand, #f6821f)' : 'var(--color-kumo-control, #1a1a1a)',
    color: tab === current ? 'var(--color-kumo-contrast, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
    border: tab === current ? '1px solid var(--color-kumo-brand, #f6821f)' : '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: tab === current ? 600 : 400,
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ maxWidth: 840, padding: '1.5rem 0', fontFamily: 'inherit', color: 'var(--text-color-kumo-default, #ededed)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-color-kumo-strong, #ffffff)' }}>
        SERP & Social Preview
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', marginBottom: '1.5rem' }}>
        Live pixel-accurate preview for Google Desktop/Mobile search results, Social Cards (OpenGraph & X/Twitter), and live Entity Coverage Index.
      </p>

      {/* Target Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setTab('desktop')} style={tabButtonStyle('desktop')}>
          Google Desktop
        </button>
        <button type="button" onClick={() => setTab('mobile')} style={tabButtonStyle('mobile')}>
          Google Mobile
        </button>
        <button type="button" onClick={() => setTab('facebook')} style={tabButtonStyle('facebook')}>
          Facebook (OG Card)
        </button>
        <button type="button" onClick={() => setTab('twitter')} style={tabButtonStyle('twitter')}>
          X / Twitter Card
        </button>
        <button type="button" onClick={() => setTab('semantic')} style={tabButtonStyle('semantic')}>
          Entity Coverage
        </button>
        <button type="button" onClick={() => setTab('readability')} style={tabButtonStyle('readability')}>
          Live Readability
        </button>
        <button type="button" onClick={() => setTab('alt-auditor')} style={tabButtonStyle('alt-auditor')}>
          Image Alt Auditor
        </button>
      </div>

      {/* Live Preview Display Box */}
      <div
        style={{
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
          borderRadius: 8,
          padding: '1.5rem',
          background: tab === 'semantic' || tab === 'readability' || tab === 'alt-auditor' ? 'var(--color-kumo-base, #181818)' : '#ffffff',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* 1. Google Desktop Preview */}
        {tab === 'desktop' && (
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
        )}

        {/* 2. Google Mobile Preview */}
        {tab === 'mobile' && (
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
        )}

        {/* 3. Facebook OpenGraph Card */}
        {tab === 'facebook' && (
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
                {new URL(siteUrl).hostname}
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
        )}

        {/* 4. X (Twitter) Card */}
        {tab === 'twitter' && (
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
              <div style={{ fontSize: '0.75rem', color: '#536471' }}>{new URL(siteUrl).hostname}</div>
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
        )}

        {/* 5. Entity Coverage & Readability Breakdown */}
        {tab === 'semantic' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: coverage.score >= 70 ? 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.15))' : coverage.score >= 50 ? 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.15))' : 'var(--color-kumo-danger-tint, rgba(239, 68, 68, 0.15))',
                  color: coverage.score >= 70 ? 'var(--text-color-kumo-success, #4ade80)' : coverage.score >= 50 ? 'var(--text-color-kumo-warning, #fbbf24)' : 'var(--text-color-kumo-danger, #f87171)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  border: `2px solid ${coverage.score >= 70 ? 'var(--text-color-kumo-success, #4ade80)' : coverage.score >= 50 ? 'var(--text-color-kumo-warning, #fbbf24)' : 'var(--text-color-kumo-danger, #f87171)'}`,
                }}
              >
                {coverage.score}
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>Entity Coverage Index (ECI)</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
                  Flesch-Kincaid: <strong>{readability.score}</strong> ({readability.level}) ·{' '}
                  {readability.hardSentencesCount} complex sentence{readability.hardSentencesCount === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-color-kumo-success, #4ade80)', marginBottom: 6 }}>
                Detected Entities ({coverage.detected.length}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {coverage.detected.map((e) => (
                  <span
                    key={e}
                    style={{
                      background: 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.15))',
                      color: 'var(--text-color-kumo-success, #4ade80)',
                      border: '1px solid var(--color-kumo-success-tint, rgba(34, 197, 94, 0.3))',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    ✓ {e}
                  </span>
                ))}
                {coverage.detected.length === 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)', fontStyle: 'italic' }}>
                    No topic entities detected in draft content.
                  </span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-color-kumo-warning, #fbbf24)', marginBottom: 6 }}>
                Topical Gaps ({coverage.missing.length}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {coverage.missing.map((e) => (
                  <span
                    key={e}
                    style={{
                      background: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.15))',
                      color: 'var(--text-color-kumo-warning, #fbbf24)',
                      border: '1px solid var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    + {e}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Navigation to Readability & Alt Auditor */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setTab('readability')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.15))',
                  color: 'var(--text-color-kumo-warning, #fbbf24)',
                  border: '1px solid var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.3))',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Launch Hemingway Readability Auditor →
              </button>
              <button
                type="button"
                onClick={() => setTab('alt-auditor')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'var(--color-kumo-success-tint, rgba(34, 197, 94, 0.15))',
                  color: 'var(--text-color-kumo-success, #4ade80)',
                  border: '1px solid var(--color-kumo-success-tint, rgba(34, 197, 94, 0.3))',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Launch Image Alt Auditor →
              </button>
            </div>
          </div>
        )}

        {/* 6. Live Readability (Hemingway) */}
        {tab === 'readability' && (
          <LiveSentenceHighlighter
            content={content}
            onContentChange={setContent}
            showEditor={true}
            defaultViewMode="split"
          />
        )}

        {/* 7. Image Alt Auditor */}
        {tab === 'alt-auditor' && (
          <ImageAltAuditorWidget
            content={content}
            onContentChange={setContent}
            targetKeywords={expectedEntities}
          />
        )}
      </div>

      {/* Interactive Controls & Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>SEO Title</label>
            <span
              style={{
                fontSize: '0.75rem',
                color: titleLength > 60 ? 'var(--text-color-kumo-danger, #f87171)' : titleLength >= 40 ? 'var(--text-color-kumo-success, #4ade80)' : 'var(--text-color-kumo-warning, #fbbf24)',
                fontWeight: 500,
              }}
            >
              {titleLength} / 60 characters {titleLength > 60 ? '(Too long)' : titleLength >= 40 ? '(Optimal)' : '(Short)'}
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            URL Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
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
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>Meta Description</label>
            <span
              style={{
                fontSize: '0.75rem',
                color: descLength > 160 ? 'var(--text-color-kumo-danger, #f87171)' : descLength >= 120 ? 'var(--text-color-kumo-success, #4ade80)' : 'var(--text-color-kumo-warning, #fbbf24)',
                fontWeight: 500,
              }}
            >
              {descLength} / 160 characters {descLength > 160 ? '(Too long)' : descLength >= 120 ? '(Optimal)' : '(Short)'}
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
            Social Image URL (OpenGraph / Twitter)
          </label>
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
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
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>Draft Body Content (for Entity & Readability Analysis)</label>
            <select
              value={topicCluster}
              onChange={(e) => setTopicCluster(e.target.value as keyof typeof TOPIC_ENTITY_CLUSTERS)}
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
            onChange={(e) => setContent(e.target.value)}
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
    </div>
  );
}

export { LiveSentenceHighlighter, ImageAltAuditorWidget };
export default SerpPreviewPage;
