import * as React from 'react';
import { auditReadability } from '../engine/readability-auditor.js';
import { auditImageAlts } from '../engine/alt-auditor.js';
import { analyzeContent } from '../engine/content-analyzer.js';
import { LiveSentenceHighlighter } from '../components/LiveSentenceHighlighter.js';
import { ImageAltAuditorWidget } from '../components/ImageAltAuditorWidget.js';
import {
  extractTextFromContent,
  extractAllImagesFromContent,
  inferSchemaType,
  SCHEMA_TYPE_OPTIONS,
  type ContentEditorPanelProps,
} from './content-helpers.js';
import { EditorOverviewTab } from './editor/EditorOverviewTab.js';
import { EditorKeywordTab } from './editor/EditorKeywordTab.js';
import { IconTarget, IconStar, IconSparkles } from './icons.js';

export function ContentEditorSeoPanel(props: ContentEditorPanelProps) {
  const { entry } = props;
  const [activeTab, setActiveTab] = React.useState<'overview' | 'keyword' | 'highlighter' | 'alts'>('overview');

  const data = (entry?.data || {}) as Record<string, unknown>;
  const seoData = (data.seo || entry?.seo || {}) as Record<string, unknown>;
  const initialKeyword = (data.focus_keyword as string) || (seoData.focusKeyword as string) || '';
  const [focusKeyword, setFocusKeyword] = React.useState<string>(initialKeyword);

  // Sync keyword if data updates externally
  React.useEffect(() => {
    const nextKw = (data.focus_keyword as string) || (seoData.focusKeyword as string) || '';
    if (nextKw && nextKw !== focusKeyword) {
      setFocusKeyword(nextKw);
    }
  }, [data.focus_keyword, seoData.focusKeyword]);

  const isCornerstone = Boolean(data.cornerstone ?? seoData.cornerstone ?? false);

  const rawContent = data.content || data.body || data.text || data.excerpt || '';
  const textContent = React.useMemo(() => extractTextFromContent(rawContent), [rawContent]);
  const imageContent = React.useMemo(() => extractAllImagesFromContent(rawContent, data), [rawContent, data]);

  const postTitle = (typeof data.title === 'string' ? data.title : '') || entry?.slug || '';
  const postSlug = entry?.slug || (typeof data.slug === 'string' ? data.slug : '');
  const metaDesc =
    (typeof seoData.description === 'string' ? seoData.description : '') ||
    (typeof data.excerpt === 'string' ? data.excerpt : '');

  const autoInferredType = React.useMemo(
    () => inferSchemaType(postTitle, postSlug, props.collection, textContent),
    [postTitle, postSlug, props.collection, textContent]
  );

  const initialSchema = String(data.schema_type ?? seoData.schemaType ?? 'auto');
  const [selectedSchema, setSelectedSchema] = React.useState<string>(initialSchema);
  const effectiveSchemaType = selectedSchema === 'auto' ? autoInferredType : selectedSchema;

  const readability = React.useMemo(() => auditReadability(textContent), [textContent]);
  const altAudit = React.useMemo(
    () => auditImageAlts(imageContent, { targetKeywords: focusKeyword ? [focusKeyword] : [] }),
    [imageContent, focusKeyword]
  );

  const seoReport = React.useMemo(() => {
    return analyzeContent({
      title: postTitle,
      slug: postSlug,
      content: textContent,
      focusKeywords: focusKeyword ? [focusKeyword] : [],
      metaDescription: metaDesc,
      minWordCount: isCornerstone ? 1200 : 600,
    });
  }, [postTitle, postSlug, textContent, focusKeyword, metaDesc, isCornerstone]);

  const seoScore = seoReport.score;
  const hasContent = textContent.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-color-kumo-default, #ededed)' }}>
      {/* Top Badges / Context Pills */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {focusKeyword ? (
          <button
            type="button"
            onClick={() => setActiveTab('keyword')}
            style={{
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
              background: 'var(--color-kumo-control, #2a2a2a)',
              border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
              fontSize: '0.6875rem',
              color: 'var(--text-color-kumo-strong, #ffffff)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <IconTarget size={12} color="#fbbf24" />
            <strong>{focusKeyword}</strong>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('keyword')}
            style={{
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
              background: 'var(--color-kumo-warning-tint, rgba(245, 158, 11, 0.12))',
              border: '1px dashed var(--text-color-kumo-warning, #fbbf24)',
              fontSize: '0.6875rem',
              color: 'var(--text-color-kumo-warning, #fbbf24)',
              cursor: 'pointer',
            }}
          >
            + Set Focus Keyword
          </button>
        )}

        {isCornerstone && (
          <span
            style={{
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
              background: 'rgba(234, 179, 8, 0.15)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              fontSize: '0.6875rem',
              color: '#facc15',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <IconStar size={11} color="#facc15" />
            <span>Pillar Post</span>
          </span>
        )}

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <select
            value={selectedSchema}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSchema(val);
              if (data.seo && typeof data.seo === 'object') {
                (data.seo as Record<string, unknown>).schemaType = val === 'auto' ? autoInferredType : val;
              }
              if (typeof data === 'object') {
                data.schema_type = val === 'auto' ? autoInferredType : val;
              }
            }}
            title={selectedSchema === 'auto' ? `Auto-inferred: ${effectiveSchemaType}` : `Selected Schema: ${effectiveSchemaType}`}
            style={{
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
              background: 'var(--color-kumo-control, #222222)',
              border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))',
              color: 'var(--text-color-kumo-strong, #ffffff)',
              fontSize: '0.6875rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {SCHEMA_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === 'auto' ? `Auto (${effectiveSchemaType})` : opt.label}
              </option>
            ))}
          </select>
          {selectedSchema === 'auto' && (
            <span title={`Auto-inferred Schema: ${effectiveSchemaType}`} style={{ display: 'flex', alignItems: 'center', color: '#60a5fa' }}>
              <IconSparkles size={11} />
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--color-kumo-recessed, #141414)',
          borderRadius: 6,
          padding: '0.1875rem',
          border: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: activeTab === 'overview' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))' : '1px solid transparent',
            background: activeTab === 'overview' ? 'var(--color-kumo-tint, #2e2e2e)' : 'transparent',
            color: activeTab === 'overview' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            fontWeight: activeTab === 'overview' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('keyword')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: activeTab === 'keyword' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))' : '1px solid transparent',
            background: activeTab === 'keyword' ? 'var(--color-kumo-tint, #2e2e2e)' : 'transparent',
            color: activeTab === 'keyword' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            fontWeight: activeTab === 'keyword' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Keyword {focusKeyword ? `(${seoScore}/100)` : ''}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('highlighter')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: activeTab === 'highlighter' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))' : '1px solid transparent',
            background: activeTab === 'highlighter' ? 'var(--color-kumo-tint, #2e2e2e)' : 'transparent',
            color: activeTab === 'highlighter' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            fontWeight: activeTab === 'highlighter' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Sentences ({readability.hardSentencesCount + readability.veryHardSentencesCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alts')}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            border: activeTab === 'alts' ? '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.15))' : '1px solid transparent',
            background: activeTab === 'alts' ? 'var(--color-kumo-tint, #2e2e2e)' : 'transparent',
            color: activeTab === 'alts' ? 'var(--text-color-kumo-strong, #ffffff)' : 'var(--text-color-kumo-subtle, #a0a0a0)',
            fontWeight: activeTab === 'alts' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Images ({altAudit.totalImages})
        </button>
      </div>

      {!hasContent ? (
        <div style={{ padding: '0.75rem', borderRadius: 6, background: 'var(--color-kumo-recessed, #141414)', border: '1px dashed var(--color-kumo-line, rgba(255, 255, 255, 0.15))', color: 'var(--text-color-kumo-subtle, #a0a0a0)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-color-kumo-strong, #ffffff)' }}>No article body detected</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>Add content to your post to calculate live SEO checklist, readability scores, and image alt audits.</p>
        </div>
      ) : activeTab === 'overview' ? (
        <EditorOverviewTab
          seoReport={seoReport}
          readability={readability}
          altAudit={altAudit}
          focusKeyword={focusKeyword}
          isCornerstone={isCornerstone}
          onTabChange={setActiveTab}
        />
      ) : activeTab === 'keyword' ? (
        <EditorKeywordTab
          focusKeyword={focusKeyword}
          onFocusKeywordChange={setFocusKeyword}
          isCornerstone={isCornerstone}
          seoReport={seoReport}
        />
      ) : activeTab === 'highlighter' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <LiveSentenceHighlighter
            content={textContent}
            showEditor={false}
            defaultViewMode="preview"
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <ImageAltAuditorWidget
            content={imageContent}
          />
        </div>
      )}

      {/* Standalone Tool Links */}
      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-kumo-line, rgba(255, 255, 255, 0.1))', display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
        <a
          href="/_emdash/admin/plugins/emdash-seo/readability"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-kumo-brand, #f6821f)', textDecoration: 'none', fontWeight: 500 }}
        >
          Full Readability Editor ↗
        </a>
        <a
          href="/_emdash/admin/plugins/emdash-seo/alt-auditor"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-kumo-brand, #f6821f)', textDecoration: 'none', fontWeight: 500 }}
        >
          Full Alt Auditor ↗
        </a>
      </div>
    </div>
  );
}

export const contentEditorPanels = [
  {
    id: 'seo-readability-panel',
    title: 'SEO & Readability Suite',
    component: ContentEditorSeoPanel,
    order: 15,
  },
];
