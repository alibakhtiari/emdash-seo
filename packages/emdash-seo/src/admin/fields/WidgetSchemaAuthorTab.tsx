import * as React from 'react';
import type { AuthorProfile, FaqItem, HowToStep } from '../../types.js';
import { buildConnectedSchemaGraph } from '../../engine/schema-builder.js';
import { IconTag, IconUser, IconShield, IconMic } from '../icons.js';

export interface WidgetSchemaAuthorTabProps {
  title: string;
  excerpt: string;
  author?: AuthorProfile;
  onAuthorChange: (author: AuthorProfile) => void;
  schemaType: string;
  onSchemaTypeChange: (type: string) => void;
  reviewedBy?: AuthorProfile;
  onReviewerChange: (reviewer?: AuthorProfile) => void;
  speakableSelectors?: string[];
  onSpeakableChange: (selectors: string[]) => void;
  faqs?: FaqItem[];
  howToSteps?: HowToStep[];
}

const SCHEMA_TYPE_OPTIONS = [
  { value: 'BlogPosting', label: 'Blog Post (BlogPosting)' },
  { value: 'Article', label: 'Standard Article (Article)' },
  { value: 'TechArticle', label: 'Technical Guide / How-To (TechArticle)' },
  { value: 'NewsArticle', label: 'News Story (NewsArticle)' },
  { value: 'Service', label: 'Service / Commercial Offering (Service)' },
  { value: 'HowTo', label: 'Instructional Guide (HowTo)' },
  { value: 'FAQPage', label: 'Q&A Document (FAQPage)' },
  { value: 'AboutPage', label: 'About Us / Company Page (AboutPage)' },
  { value: 'ContactPage', label: 'Contact Details Page (ContactPage)' },
  { value: 'ProfilePage', label: 'Author / Person Profile (ProfilePage)' },
  { value: 'MedicalWebPage', label: 'Health / Medical Content (MedicalWebPage)' },
  { value: 'None', label: 'Default WebPage only' },
];

export function WidgetSchemaAuthorTab({
  title,
  excerpt,
  author,
  onAuthorChange,
  schemaType,
  onSchemaTypeChange,
  reviewedBy,
  onReviewerChange,
  speakableSelectors,
  onSpeakableChange,
  faqs = [],
  howToSteps = [],
}: WidgetSchemaAuthorTabProps) {
  const [showJsonLd, setShowJsonLd] = React.useState(false);
  const [hasReviewer, setHasReviewer] = React.useState(Boolean(reviewedBy?.name));

  const currentAuthor: AuthorProfile = author || { name: 'Editorial Team' };

  const handleAuthorField = (key: keyof AuthorProfile, val: string | string[] | undefined) => {
    onAuthorChange({ ...currentAuthor, [key]: val });
  };

  const handleReviewerField = (key: keyof AuthorProfile, val: string | string[] | undefined) => {
    onReviewerChange({ ...(reviewedBy || { name: '' }), [key]: val });
  };

  // Compute live JSON-LD schema preview
  const liveSchema = React.useMemo(() => {
    return buildConnectedSchemaGraph({
      siteUrl: 'https://example.com',
      siteName: 'Modern Service Co',
      canonicalUrl: 'https://example.com/current-entry',
      title: title || 'Draft Title',
      description: excerpt || 'Draft description',
      author: currentAuthor,
      reviewedBy: hasReviewer && reviewedBy?.name ? reviewedBy : undefined,
      speakableSelectors,
      faqs,
      howToSteps,
      seo: {
        focusKeywords: [],
        noIndex: false,
        noFollow: false,
        schemaType,
      },
    });
  }, [title, excerpt, currentAuthor, hasReviewer, reviewedBy, speakableSelectors, faqs, howToSteps, schemaType]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Schema Type Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
          <IconTag size={13} />
          <span>Structured Data Schema Type</span>
        </label>
        <select
          value={schemaType}
          onChange={(e) => onSchemaTypeChange(e.target.value)}
          style={{
            padding: '0.375rem 0.5rem',
            borderRadius: 4,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            background: 'var(--color-kumo-control, #222222)',
            color: 'var(--text-color-kumo-strong, #ffffff)',
            fontSize: '0.75rem',
            outline: 'none',
          }}
        >
          {SCHEMA_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Author & E-E-A-T Credentials */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '0.625rem',
          borderRadius: 6,
          background: 'var(--color-kumo-control, #1a1a1a)',
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color-kumo-strong, #ffffff)' }}>
          <IconUser size={13} />
          <span>Author & E-E-A-T Entity Profile</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
          <div>
            <label style={{ fontSize: '0.6875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Author Name</label>
            <input
              type="text"
              value={currentAuthor.name}
              onChange={(e) => handleAuthorField('name', e.target.value)}
              placeholder="e.g. Dr. Jane Smith"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.25rem 0.375rem',
                fontSize: '0.75rem',
                borderRadius: 4,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
                background: 'rgba(0,0,0,0.2)',
                color: '#ffffff',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.6875rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>Job Title / Credentials</label>
            <input
              type="text"
              value={currentAuthor.jobTitle || ''}
              onChange={(e) => handleAuthorField('jobTitle', e.target.value)}
              placeholder="e.g. Senior Conservator"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.25rem 0.375rem',
                fontSize: '0.75rem',
                borderRadius: 4,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
                background: 'rgba(0,0,0,0.2)',
                color: '#ffffff',
              }}
            />
          </div>
        </div>
      </div>

      {/* E-E-A-T Reviewer / Fact-Checker Toggle */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          padding: '0.5rem 0.625rem',
          borderRadius: 6,
          background: 'var(--color-kumo-control, #1a1a1a)',
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-color-kumo-strong, #ffffff)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={hasReviewer}
            onChange={(e) => {
              setHasReviewer(e.target.checked);
              if (!e.target.checked) onReviewerChange(undefined);
            }}
          />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <IconShield size={13} />
            <span>Fact-Checked / Reviewed by Specialist (E-E-A-T)</span>
          </span>
        </label>

        {hasReviewer && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', marginTop: '0.25rem' }}>
            <input
              type="text"
              value={reviewedBy?.name || ''}
              onChange={(e) => handleReviewerField('name', e.target.value)}
              placeholder="Reviewer Name"
              style={{
                padding: '0.25rem 0.375rem',
                fontSize: '0.75rem',
                borderRadius: 4,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
                background: 'rgba(0,0,0,0.2)',
                color: '#ffffff',
              }}
            />
            <input
              type="text"
              value={reviewedBy?.jobTitle || ''}
              onChange={(e) => handleReviewerField('jobTitle', e.target.value)}
              placeholder="Reviewer Credentials / Title"
              style={{
                padding: '0.25rem 0.375rem',
                fontSize: '0.75rem',
                borderRadius: 4,
                border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
                background: 'rgba(0,0,0,0.2)',
                color: '#ffffff',
              }}
            />
          </div>
        )}
      </div>

      {/* Speakable Voice Search Selectors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-color-kumo-subtle, #a0a0a0)' }}>
          <IconMic size={13} />
          <span>AEO Speakable CSS Selectors (comma-separated)</span>
        </label>
        <input
          type="text"
          value={(speakableSelectors || ['#field-excerpt', '.post-lead', '.aeo-summary']).join(', ')}
          onChange={(e) =>
            onSpeakableChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="#field-excerpt, .post-lead, .aeo-summary"
          style={{
            padding: '0.375rem 0.5rem',
            fontSize: '0.75rem',
            borderRadius: 4,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            background: 'var(--color-kumo-control, #222222)',
            color: '#ffffff',
          }}
        />
      </div>

      {/* Live JSON-LD Preview Button & Drawer */}
      <div>
        <button
          type="button"
          onClick={() => setShowJsonLd((prev) => !prev)}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.6875rem',
            borderRadius: 4,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.2))',
            background: 'transparent',
            color: 'var(--text-color-kumo-strong, #ffffff)',
            cursor: 'pointer',
          }}
        >
          {showJsonLd ? 'Hide JSON-LD Graph' : 'Inspect Connected JSON-LD @graph'}
        </button>

        {showJsonLd && (
          <pre
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              borderRadius: 4,
              background: '#0d1117',
              color: '#58a6ff',
              fontSize: '0.6875rem',
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {JSON.stringify(liveSchema, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
