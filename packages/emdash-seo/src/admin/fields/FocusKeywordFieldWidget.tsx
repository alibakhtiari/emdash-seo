import * as React from 'react';
import { auditReadability } from '../../engine/readability-auditor.js';
import { auditImageAlts } from '../../engine/alt-auditor.js';
import { analyzeContent } from '../../engine/content-analyzer.js';
import { auditGeoAeo } from '../../engine/geo-aeo-analyzer.js';
import { inferSchemaType } from '../../engine/schema-nodes.js';
import type { AuthorProfile, FaqItem, HowToStep } from '../../types.js';
import { extractEditorDomSnapshot, type EditorDomSnapshot } from './dom-extractor.js';
import { WidgetMetricBar } from './WidgetMetricBar.js';
import { WidgetStudioDrawer } from './WidgetStudioDrawer.js';
import {
  IconTarget,
  IconClose,
  IconChevronUp,
  IconChevronDown,
  IconSparkles,
  IconTag,
} from '../icons.js';

export interface FocusKeywordFieldWidgetProps {
  value?: string | null;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  required?: boolean;
  options?: unknown;
  validation?: unknown;
  minimal?: boolean;
}

export function FocusKeywordFieldWidget({
  value,
  onChange,
  label = 'Focus Keyword',
  id = 'field-focus_keyword',
  required = false,
  minimal = false,
}: FocusKeywordFieldWidgetProps) {
  const currentKeyword = typeof value === 'string' ? value : '';
  const [keyword, setKeyword] = React.useState<string>(currentKeyword);
  const [isExpanded, setIsExpanded] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<
    'readability' | 'geo-aeo' | 'schema-author' | 'alts' | 'serp' | 'checklist'
  >('readability');

  const [author, setAuthor] = React.useState<AuthorProfile>({ name: 'Editorial Team' });
  const [reviewedBy, setReviewedBy] = React.useState<AuthorProfile | undefined>(undefined);
  const [isAutoSchema, setIsAutoSchema] = React.useState<boolean>(true);
  const [customSchemaType, setCustomSchemaType] = React.useState<string>('Article');

  const [speakableSelectors, setSpeakableSelectors] = React.useState<string[]>([
    '#field-excerpt',
    '.post-lead',
    '.aeo-summary',
  ]);
  const [faqs, setFaqs] = React.useState<FaqItem[]>([]);
  const [howToSteps, setHowToSteps] = React.useState<HowToStep[]>([]);

  const [snapshot, setSnapshot] = React.useState<EditorDomSnapshot>({
    title: '',
    excerpt: '',
    content: '',
    headings: [],
    images: [],
  });

  // Dynamic semi-automatic Schema Type inference
  const autoInferredType = React.useMemo(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (/^how\s+to\b/i.test(snapshot.title)) return 'HowTo';
    return inferSchemaType(path, 'Article');
  }, [snapshot.title]);

  const effectiveSchemaType = isAutoSchema ? autoInferredType : customSchemaType;

  // Sync external value
  React.useEffect(() => {
    if (currentKeyword !== keyword) {
      setKeyword(currentKeyword);
    }
  }, [currentKeyword]);

  // Handle keyword typing
  const handleKeywordChange = (newVal: string) => {
    setKeyword(newVal);
    onChange(newVal);
  };

  // Poll / Listen to editor DOM updates
  const refreshSnapshot = React.useCallback(() => {
    const nextSnapshot = extractEditorDomSnapshot();
    setSnapshot((prev) => {
      if (
        prev.title === nextSnapshot.title &&
        prev.content === nextSnapshot.content &&
        prev.excerpt === nextSnapshot.excerpt &&
        prev.images.length === nextSnapshot.images.length &&
        prev.headings.length === nextSnapshot.headings.length
      ) {
        return prev;
      }
      return nextSnapshot;
    });
  }, []);

  React.useEffect(() => {
    refreshSnapshot();

    const handleInput = () => {
      refreshSnapshot();
    };

    window.addEventListener('input', handleInput, { passive: true });
    const interval = setInterval(refreshSnapshot, 2500);

    return () => {
      window.removeEventListener('input', handleInput);
      clearInterval(interval);
    };
  }, [refreshSnapshot]);

  // Run SEO Content Analysis
  const seoReport = React.useMemo(() => {
    return analyzeContent({
      focusKeywords: keyword ? [keyword] : [],
      title: snapshot.title,
      content: snapshot.content,
      metaDescription: snapshot.excerpt,
    });
  }, [keyword, snapshot.title, snapshot.content, snapshot.excerpt]);

  // Run Realtime Readability Audit
  const readability = React.useMemo(() => {
    return auditReadability(snapshot.content || snapshot.excerpt || snapshot.title || '');
  }, [snapshot.content, snapshot.excerpt, snapshot.title]);

  // Run Realtime Image Alt Audit
  const altAudit = React.useMemo(() => {
    return auditImageAlts(snapshot.content || '', {
      targetKeywords: keyword ? [keyword] : [],
    });
  }, [snapshot.content, keyword]);

  // Run Realtime GEO & AEO AI Engine Audit
  const geoAeoReport = React.useMemo(() => {
    return auditGeoAeo(snapshot.content, {
      title: snapshot.title,
      focusKeyword: keyword,
      excerpt: snapshot.excerpt,
    });
  }, [snapshot.content, snapshot.title, snapshot.excerpt, keyword]);

  const seoScore = seoReport.score;
  const seoColor = seoScore >= 80 ? '#4ade80' : seoScore >= 50 ? '#fbbf24' : '#f87171';
  const seoBg = seoScore >= 80 ? 'rgba(34, 197, 94, 0.12)' : seoScore >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';

  const kwInTitle = keyword && snapshot.title ? snapshot.title.toLowerCase().includes(keyword.toLowerCase()) : false;

  return (
    <div
      id={id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        padding: minimal ? '0.375rem 0.5rem' : '0.75rem',
        borderRadius: minimal ? 4 : 8,
        background: 'var(--color-kumo-surface, #141414)',
        border: minimal ? 'none' : '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.12))',
      }}
    >
      {/* Field Label & Focus Mode Pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label
          htmlFor={`${id}-input`}
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-color-kumo-strong, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <IconTarget size={14} color="var(--color-kumo-brand, #f6821f)" />
          <span>{label}</span>
          {required && <span style={{ color: '#f87171' }}>*</span>}
        </label>

        {/* Live SEO Readiness Score Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.125rem 0.5rem',
            borderRadius: 999,
            background: seoBg,
            border: `1px solid ${seoColor}`,
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: seoColor,
          }}
        >
          <span>SEO Score</span>
          <span>{seoScore}/100</span>
        </div>
      </div>

      {/* Target Keyword Input Box */}
      <div style={{ display: 'flex', gap: '0.375rem', position: 'relative' }}>
        <input
          id={`${id}-input`}
          type="text"
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          placeholder="e.g. persian rug cleaning london"
          style={{
            flex: 1,
            padding: '0.5rem 0.625rem',
            borderRadius: 6,
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            background: 'var(--color-kumo-control, #222222)',
            color: 'var(--text-color-kumo-strong, #ffffff)',
            fontSize: '0.8125rem',
            outline: 'none',
          }}
        />
        {keyword && (
          <button
            type="button"
            onClick={() => handleKeywordChange('')}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color-kumo-subtle, #9ca3af)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconClose size={12} />
          </button>
        )}
      </div>

      {/* Semi-Automatic Schema Selector Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.35rem 0.625rem',
          borderRadius: 6,
          background: 'var(--color-kumo-control, #1a1a1a)',
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
          fontSize: '0.75rem',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-color-kumo-subtle, #9ca3af)' }}>
          {isAutoSchema ? <IconSparkles size={13} color="#c084fc" /> : <IconTag size={13} color="#60a5fa" />}
          <span style={{ fontWeight: 500, color: 'var(--text-color-kumo-strong, #ffffff)' }}>Schema:</span>
          <span
            style={{
              fontSize: '0.6875rem',
              padding: '0.1rem 0.375rem',
              borderRadius: 4,
              background: isAutoSchema ? 'rgba(168, 85, 247, 0.15)' : 'rgba(96, 165, 250, 0.15)',
              color: isAutoSchema ? '#c084fc' : '#60a5fa',
              border: `1px solid ${isAutoSchema ? 'rgba(168, 85, 247, 0.3)' : 'rgba(96, 165, 250, 0.3)'}`,
            }}
          >
            {isAutoSchema ? `Auto: ${autoInferredType}` : effectiveSchemaType}
          </span>
        </div>

        <select
          value={isAutoSchema ? 'auto' : effectiveSchemaType}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'auto') {
              setIsAutoSchema(true);
            } else {
              setIsAutoSchema(false);
              setCustomSchemaType(val);
            }
          }}
          style={{
            padding: '0.2rem 0.5rem',
            borderRadius: 4,
            background: 'var(--color-kumo-surface, #141414)',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            color: 'var(--text-color-kumo-strong, #ffffff)',
            fontSize: '0.6875rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="auto">Auto (Inferred: {autoInferredType})</option>
          <option value="BlogPosting">Blog Post (BlogPosting)</option>
          <option value="Article">General Article (Article)</option>
          <option value="TechArticle">Technical / How-To (TechArticle)</option>
          <option value="NewsArticle">News Article (NewsArticle)</option>
          <option value="Service">Service / Commercial (Service)</option>
          <option value="HowTo">Step-by-Step Instructions (HowTo)</option>
          <option value="FAQPage">FAQ Page (FAQPage)</option>
          <option value="AboutPage">About Page (AboutPage)</option>
          <option value="ContactPage">Contact Page (ContactPage)</option>
          <option value="ProfilePage">Profile / Author (ProfilePage)</option>
        </select>
      </div>

      {/* Live Readability & SEO Metric Pills Bar */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <WidgetMetricBar
          readability={readability}
          altAudit={altAudit}
          geoAeoReport={geoAeoReport}
          keyword={keyword}
          kwInTitle={kwInTitle}
          imagesCount={snapshot.images.length}
        />

        {/* Expand / Collapse Studio Button */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{
            marginLeft: 'auto',
            padding: '0.2rem 0.5rem',
            borderRadius: 4,
            background: isExpanded ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
            border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
            color: 'var(--text-color-kumo-strong, #ffffff)',
            fontSize: '0.6875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
          <span>{isExpanded ? 'Hide Studio' : 'WebABC Studio'}</span>
        </button>
      </div>

      {/* Expandable Studio Drawer */}
      {isExpanded && (
        <WidgetStudioDrawer
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          readability={readability}
          altAudit={altAudit}
          geoAeoReport={geoAeoReport}
          snapshot={snapshot}
          author={author}
          setAuthor={setAuthor}
          effectiveSchemaType={effectiveSchemaType}
          onSelectCustomSchemaType={(st) => {
            setIsAutoSchema(false);
            setCustomSchemaType(st);
          }}
          reviewedBy={reviewedBy}
          setReviewedBy={setReviewedBy}
          speakableSelectors={speakableSelectors}
          setSpeakableSelectors={setSpeakableSelectors}
          faqs={faqs}
          setFaqs={setFaqs}
          howToSteps={howToSteps}
          setHowToSteps={setHowToSteps}
          seoReport={seoReport}
          keyword={keyword}
          refreshSnapshot={refreshSnapshot}
        />
      )}
    </div>
  );
}
