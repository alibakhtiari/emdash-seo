import * as React from 'react';
import { auditReadability } from '../../engine/readability-auditor.js';
import { auditImageAlts } from '../../engine/alt-auditor.js';
import { analyzeContent } from '../../engine/content-analyzer.js';
import { extractEditorDomSnapshot, type EditorDomSnapshot } from './dom-extractor.js';
import { WidgetReadabilityTab } from './WidgetReadabilityTab.js';
import { WidgetAltTab } from './WidgetAltTab.js';
import { WidgetSerpTab } from './WidgetSerpTab.js';
import { WidgetChecklistTab } from './WidgetChecklistTab.js';

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
  const [activeTab, setActiveTab] = React.useState<'readability' | 'alts' | 'serp' | 'checklist'>('readability');

  const [snapshot, setSnapshot] = React.useState<EditorDomSnapshot>({
    title: '',
    excerpt: '',
    content: '',
    headings: [],
    images: [],
  });

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
    window.addEventListener('keyup', handleInput, { passive: true });
    const interval = window.setInterval(refreshSnapshot, 2000);

    return () => {
      window.removeEventListener('input', handleInput);
      window.removeEventListener('keyup', handleInput);
      window.clearInterval(interval);
    };
  }, [refreshSnapshot]);

  // Compute live metrics
  const readability = React.useMemo(() => auditReadability(snapshot.content), [snapshot.content]);

  const altAudit = React.useMemo(() => {
    const htmlSnippet = snapshot.images.map((img) => `<img src="${img.src}" alt="${img.alt}" />`).join('\n');
    return auditImageAlts(htmlSnippet, { targetKeywords: keyword ? [keyword] : [] });
  }, [snapshot.images, keyword]);

  const seoReport = React.useMemo(() => {
    return analyzeContent({
      title: snapshot.title,
      slug: '',
      content: snapshot.content,
      focusKeywords: keyword ? [keyword] : [],
      metaDescription: snapshot.excerpt,
      minWordCount: 300,
    });
  }, [snapshot.title, snapshot.content, snapshot.excerpt, keyword]);

  const easeScore = readability.readingEase;
  const easeColor = easeScore >= 60 ? '#4ade80' : easeScore >= 50 ? '#fbbf24' : '#f87171';
  const easeBg = easeScore >= 60 ? 'rgba(34, 197, 94, 0.12)' : easeScore >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';

  const seoScore = seoReport.score;
  const seoColor = seoScore >= 80 ? '#4ade80' : seoScore >= 50 ? '#fbbf24' : '#f87171';
  const seoBg = seoScore >= 80 ? 'rgba(34, 197, 94, 0.12)' : seoScore >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';

  const hardSentences = readability.sentences?.filter((s) => s.difficulty === 'hard' || s.difficulty === 'very-hard').length || 0;
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
          <span>🎯</span>
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
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Live Readability & SEO Metric Pills Bar */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Readability Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            borderRadius: 4,
            background: easeBg,
            border: `1px solid ${easeColor}`,
            fontSize: '0.6875rem',
            color: easeColor,
            fontWeight: 500,
          }}
        >
          <span>📖</span>
          <span>
            {easeScore}/100 Ease ({readability.readingEaseLevel})
          </span>
        </div>

        {/* Hemingway Sentence Difficulties */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            borderRadius: 4,
            background: hardSentences > 0 ? 'rgba(234, 179, 8, 0.12)' : 'var(--color-kumo-control, #222222)',
            border: `1px solid ${hardSentences > 0 ? '#facc15' : 'var(--color-kumo-line, rgba(255, 255, 255, 0.1))'}`,
            fontSize: '0.6875rem',
            color: hardSentences > 0 ? '#facc15' : 'var(--text-color-kumo-subtle, #9ca3af)',
          }}
        >
          <span>✍️</span>
          <span>{hardSentences === 0 ? 'Clear Sentences' : `${hardSentences} Hard Sentences`}</span>
        </div>

        {/* Keyword Presence */}
        {keyword && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.5rem',
              borderRadius: 4,
              background: kwInTitle ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${kwInTitle ? '#4ade80' : '#f87171'}`,
              fontSize: '0.6875rem',
              color: kwInTitle ? '#4ade80' : '#f87171',
            }}
          >
            <span>{kwInTitle ? '✓' : '✗'}</span>
            <span>{kwInTitle ? 'In Title' : 'Missing in Title'}</span>
          </div>
        )}

        {/* Images Alt Pill */}
        {snapshot.images.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.5rem',
              borderRadius: 4,
              background: altAudit.score >= 80 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${altAudit.score >= 80 ? '#4ade80' : '#f87171'}`,
              fontSize: '0.6875rem',
              color: altAudit.score >= 80 ? '#4ade80' : '#f87171',
            }}
          >
            <span>🖼️</span>
            <span>
              {snapshot.images.length} Image{snapshot.images.length === 1 ? '' : 's'} ({altAudit.score}% Alts)
            </span>
          </div>
        )}

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
          <span>{isExpanded ? '▲ Hide Studio' : '▼ Live SEO & Readability Studio'}</span>
        </button>
      </div>

      {/* Expandable Studio Drawer */}
      {isExpanded && (
        <div
          style={{
            marginTop: '0.25rem',
            paddingTop: '0.625rem',
            borderTop: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {/* Subtabs */}
          <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.375rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('readability')}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 4,
                border: 'none',
                background: activeTab === 'readability' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
                color: activeTab === 'readability' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
                fontSize: '0.6875rem',
                fontWeight: activeTab === 'readability' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              📖 Hemingway Readability
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('alts')}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 4,
                border: 'none',
                background: activeTab === 'alts' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
                color: activeTab === 'alts' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
                fontSize: '0.6875rem',
                fontWeight: activeTab === 'alts' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              🖼️ Image Alts ({snapshot.images.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('serp')}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 4,
                border: 'none',
                background: activeTab === 'serp' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
                color: activeTab === 'serp' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
                fontSize: '0.6875rem',
                fontWeight: activeTab === 'serp' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              🔍 SERP & Social Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 4,
                border: 'none',
                background: activeTab === 'checklist' ? 'var(--color-kumo-control, #2a2a2a)' : 'transparent',
                color: activeTab === 'checklist' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #9ca3af)',
                fontSize: '0.6875rem',
                fontWeight: activeTab === 'checklist' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              ✅ Checklist
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'readability' && <WidgetReadabilityTab readability={readability} />}
          {activeTab === 'alts' && <WidgetAltTab altAudit={altAudit} onRefresh={refreshSnapshot} />}
          {activeTab === 'serp' && (
            <WidgetSerpTab
              title={snapshot.title}
              excerpt={snapshot.excerpt}
              featuredImage={snapshot.images[0]?.src}
            />
          )}
          {activeTab === 'checklist' && (
            <WidgetChecklistTab
              seoReport={seoReport}
              readability={readability}
              altAudit={altAudit}
              title={snapshot.title}
              focusKeyword={keyword}
              headingsCount={snapshot.headings.length}
            />
          )}
        </div>
      )}
    </div>
  );
}
